package repositories

import (
	"context"
	"errors"
	"log"
	"strconv"
	"strings"

	"github.com/romainrodriguez/cooking_server/internal/dto"
	ormerrors "github.com/romainrodriguez/cooking_server/internal/services/orm/errors"
	"gorm.io/gorm"
)

type recipeRepository struct {
	db *gorm.DB
}

// NewRecipeRepository crée une nouvelle instance du repository recette
func NewRecipeRepository(db *gorm.DB) *recipeRepository {
	return &recipeRepository{db: db}
}

// Create crée une nouvelle recette
func (r *recipeRepository) Create(ctx context.Context, recipe *dto.Recipe) error {
	// Calculer le temps total
	recipe.TotalTime = recipe.PrepTime + recipe.CookTime

	if err := r.db.WithContext(ctx).Create(recipe).Error; err != nil {
		return ormerrors.NewDatabaseError("create recipe", err)
	}
	return nil
}

// GetByID récupère une recette par son ID avec toutes ses relations
func (r *recipeRepository) GetByID(ctx context.Context, id uint) (*dto.Recipe, error) {
	var recipe dto.Recipe
	if err := r.db.WithContext(ctx).
		Preload("Author").
		Preload("OriginalRecipe").
		Preload("Ingredients.Ingredient").
		Preload("Equipments.Equipment").
		Preload("Tags").
		Preload("Categories").
		Preload("Comments.User").
		First(&recipe, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ormerrors.NewNotFoundError("recipe", id)
		}
		return nil, ormerrors.NewDatabaseError("get recipe by id", err)
	}

	// Charger les informations des recettes référencées dans les étapes
	if err := r.loadReferencedRecipesInSteps(ctx, &recipe); err != nil {
		return nil, err
	}

	return &recipe, nil
}

// loadReferencedRecipesInSteps charge les informations des recettes référencées dans les étapes
func (r *recipeRepository) loadReferencedRecipesInSteps(ctx context.Context, recipe *dto.Recipe) error {
	return r.loadReferencedRecipesInMultipleRecipes(ctx, []*dto.Recipe{recipe})
}

// loadReferencedRecipesInMultipleRecipes charge les informations des recettes référencées pour plusieurs recettes
func (r *recipeRepository) loadReferencedRecipesInMultipleRecipes(ctx context.Context, recipes []*dto.Recipe) error {
	// Collecter tous les IDs de recettes référencées
	referencedIDs := make(map[uint]bool)
	for _, recipe := range recipes {
		for _, step := range recipe.Instructions {
			if step.ReferencedRecipeID != nil {
				referencedIDs[*step.ReferencedRecipeID] = true
			}
		}
	}

	if len(referencedIDs) == 0 {
		return nil
	}

	// Convertir en slice d'IDs
	ids := make([]uint, 0, len(referencedIDs))
	for id := range referencedIDs {
		ids = append(ids, id)
	}

	// Charger toutes les recettes référencées en une fois
	var referencedRecipes []dto.Recipe
	if err := r.db.WithContext(ctx).
		Select("id, title, description, prep_time, cook_time, servings, difficulty, image_url, author_id").
		Preload("Author", func(db *gorm.DB) *gorm.DB {
			return db.Select("id, username, email")
		}).
		Where("id IN ?", ids).
		Find(&referencedRecipes).Error; err != nil {
		return ormerrors.NewDatabaseError("load referenced recipes", err)
	}

	// Créer une map pour un accès rapide
	recipeMap := make(map[uint]*dto.Recipe)
	for i := range referencedRecipes {
		recipeMap[referencedRecipes[i].ID] = &referencedRecipes[i]
	}

	// Assigner les données aux étapes
	for _, recipe := range recipes {
		for i := range recipe.Instructions {
			step := &recipe.Instructions[i]
			if step.ReferencedRecipeID != nil {
				if referencedRecipe, exists := recipeMap[*step.ReferencedRecipeID]; exists {
					step.ReferencedRecipeData = referencedRecipe
				} else {
					// Si la recette référencée n'existe plus, on supprime la référence
					step.ReferencedRecipeID = nil
				}
			}
		}
	}

	return nil
}

// GetByAuthor récupère les recettes d'un auteur spécifique
func (r *recipeRepository) GetByAuthor(ctx context.Context, authorID uint, limit, offset int) ([]*dto.Recipe, int64, error) {
	var recipes []*dto.Recipe
	var total int64

	// Compter le total
	if err := r.db.WithContext(ctx).
		Model(&dto.Recipe{}).
		Where("author_id = ?", authorID).
		Count(&total).Error; err != nil {
		return nil, 0, ormerrors.NewDatabaseError("count recipes by author", err)
	}

	// Récupérer les recettes paginées
	if err := r.db.WithContext(ctx).
		Preload("Author").
		Preload("Categories").
		Preload("Tags").
		Where("author_id = ?", authorID).
		Limit(limit).
		Offset(offset).
		Order("created_at DESC").
		Find(&recipes).Error; err != nil {
		return nil, 0, ormerrors.NewDatabaseError("list recipes by author", err)
	}

	return recipes, total, nil
}

// Update met à jour une recette
func (r *recipeRepository) Update(ctx context.Context, recipe *dto.Recipe) error {
	// Calculer le temps total
	recipe.TotalTime = recipe.PrepTime + recipe.CookTime

	if err := r.db.WithContext(ctx).Save(recipe).Error; err != nil {
		return ormerrors.NewDatabaseError("update recipe", err)
	}
	return nil
}

// Delete supprime une recette et gère les recettes copiées
func (r *recipeRepository) Delete(ctx context.Context, id uint) error {
	log.Printf("Starting recipe deletion for ID: %d", id)

	// Démarrer une transaction
	tx := r.db.WithContext(ctx).Begin()
	if tx.Error != nil {
		log.Printf("Error starting transaction: %v", tx.Error)
		return ormerrors.NewDatabaseError("begin transaction", tx.Error)
	}
	defer func() {
		if r := recover(); r != nil {
			log.Printf("Panic during recipe deletion: %v", r)
			tx.Rollback()
		}
	}()

	log.Printf("Checking for copied recipes with original_recipe_id: %d", id)

	// Vérifier si cette recette est l'originale de certaines copies
	var copiedRecipes []dto.Recipe
	if err := tx.Where("original_recipe_id = ?", id).Find(&copiedRecipes).Error; err != nil {
		log.Printf("Error finding copied recipes: %v", err)
		tx.Rollback()
		return ormerrors.NewDatabaseError("find copied recipes", err)
	}

	log.Printf("Found %d copied recipes", len(copiedRecipes))

	// Si cette recette a des copies, transformer la première copie en originale
	if len(copiedRecipes) > 0 {
		firstCopy := copiedRecipes[0]
		log.Printf("Converting first copy (ID: %d) to original", firstCopy.ID)

		// Mettre à jour la première copie pour en faire l'originale
		if err := tx.Model(&firstCopy).Updates(map[string]interface{}{
			"is_original":        true,
			"original_recipe_id": nil,
		}).Error; err != nil {
			log.Printf("Error updating first copy to original: %v", err)
			tx.Rollback()
			return ormerrors.NewDatabaseError("update first copy to original", err)
		}

		// Mettre à jour toutes les autres copies pour pointer vers la nouvelle originale
		if len(copiedRecipes) > 1 {
			log.Printf("Updating %d other copies to point to new original (ID: %d)", len(copiedRecipes)-1, firstCopy.ID)
			if err := tx.Model(&dto.Recipe{}).
				Where("original_recipe_id = ? AND id != ?", id, firstCopy.ID).
				Update("original_recipe_id", firstCopy.ID).Error; err != nil {
				log.Printf("Error updating other copies: %v", err)
				tx.Rollback()
				return ormerrors.NewDatabaseError("update other copies", err)
			}
		}
	}

	log.Printf("Deleting associated records for recipe ID: %d", id)

	// Supprimer toutes les associations avant de supprimer la recette
	// 1. Supprimer les associations de catégories (many2many)
	if err := tx.Exec("DELETE FROM recipe_category_associations WHERE recipe_id = ?", id).Error; err != nil {
		log.Printf("Error deleting recipe category associations: %v", err)
		tx.Rollback()
		return ormerrors.NewDatabaseError("delete recipe category associations", err)
	}

	// 2. Supprimer les ingrédients
	if err := tx.Where("recipe_id = ?", id).Delete(&dto.RecipeIngredient{}).Error; err != nil {
		log.Printf("Error deleting recipe ingredients: %v", err)
		tx.Rollback()
		return ormerrors.NewDatabaseError("delete recipe ingredients", err)
	}

	// 3. Supprimer les équipements
	if err := tx.Where("recipe_id = ?", id).Delete(&dto.RecipeEquipment{}).Error; err != nil {
		log.Printf("Error deleting recipe equipments: %v", err)
		tx.Rollback()
		return ormerrors.NewDatabaseError("delete recipe equipments", err)
	}

	// 4. Supprimer les tags
	if err := tx.Where("recipe_id = ?", id).Delete(&dto.RecipeTag{}).Error; err != nil {
		log.Printf("Error deleting recipe tags: %v", err)
		tx.Rollback()
		return ormerrors.NewDatabaseError("delete recipe tags", err)
	}

	// 5. Supprimer les commentaires
	if err := tx.Where("recipe_id = ?", id).Delete(&dto.Comment{}).Error; err != nil {
		log.Printf("Error deleting recipe comments: %v", err)
		tx.Rollback()
		return ormerrors.NewDatabaseError("delete recipe comments", err)
	}

	// 6. Supprimer des favoris
	if err := tx.Where("recipe_id = ?", id).Delete(&dto.UserFavoriteRecipe{}).Error; err != nil {
		log.Printf("Error deleting user favorite recipes: %v", err)
		tx.Rollback()
		return ormerrors.NewDatabaseError("delete user favorite recipes", err)
	}

	// 7. Supprimer des listes de recettes
	if err := tx.Where("recipe_id = ?", id).Delete(&dto.RecipeListItem{}).Error; err != nil {
		log.Printf("Error deleting recipe list items: %v", err)
		tx.Rollback()
		return ormerrors.NewDatabaseError("delete recipe list items", err)
	}

	// 8. Supprimer des planifications de repas
	if err := tx.Where("recipe_id = ?", id).Delete(&dto.MealPlan{}).Error; err != nil {
		log.Printf("Error deleting meal plans: %v", err)
		tx.Rollback()
		return ormerrors.NewDatabaseError("delete meal plans", err)
	}

	log.Printf("All associations deleted, now deleting recipe with ID: %d", id)

	// Finalement, supprimer la recette
	result := tx.Delete(&dto.Recipe{}, id)
	if result.Error != nil {
		log.Printf("Error deleting recipe: %v", result.Error)
		tx.Rollback()
		return ormerrors.NewDatabaseError("delete recipe", result.Error)
	}
	if result.RowsAffected == 0 {
		log.Printf("No recipe found with ID: %d", id)
		tx.Rollback()
		return ormerrors.NewNotFoundError("recipe", id)
	}

	log.Printf("Successfully deleted recipe, affected rows: %d", result.RowsAffected)

	// Valider la transaction
	if err := tx.Commit().Error; err != nil {
		log.Printf("Error committing transaction: %v", err)
		return ormerrors.NewDatabaseError("commit transaction", err)
	}

	log.Printf("Recipe deletion completed successfully for ID: %d", id)
	return nil
}

// List récupère une liste de recettes avec pagination
func (r *recipeRepository) List(ctx context.Context, limit, offset int) ([]*dto.Recipe, int64, error) {
	var recipes []*dto.Recipe
	var total int64

	// Compter le total
	if err := r.db.WithContext(ctx).Model(&dto.Recipe{}).Count(&total).Error; err != nil {
		return nil, 0, ormerrors.NewDatabaseError("count recipes", err)
	}

	// Récupérer les recettes paginées
	if err := r.db.WithContext(ctx).
		Preload("Author").
		Preload("Categories").
		Preload("Tags").
		Limit(limit).
		Offset(offset).
		Order("created_at DESC").
		Find(&recipes).Error; err != nil {
		return nil, 0, ormerrors.NewDatabaseError("list recipes", err)
	}

	return recipes, total, nil
}

// Search effectue une recherche avancée de recettes
func (r *recipeRepository) Search(ctx context.Context, searchReq *dto.SearchQuery) ([]*dto.Recipe, int64, error) {
	log.Printf("Search starting with query: %+v", searchReq)

	query := r.db.WithContext(ctx).Model(&dto.Recipe{})

	// Recherche textuelle
	if searchReq.Query != "" {
		searchTerm := "%" + strings.ToLower(searchReq.Query) + "%"
		log.Printf("Adding text search for term: %s", searchTerm)
		query = query.Where("LOWER(title) LIKE ? OR LOWER(description) LIKE ?", searchTerm, searchTerm)
	}

	// Filtrage par temps
	if searchReq.MaxPrepTime > 0 {
		query = query.Where("prep_time <= ?", searchReq.MaxPrepTime)
	}
	if searchReq.MaxCookTime > 0 {
		query = query.Where("cook_time <= ?", searchReq.MaxCookTime)
	}
	if searchReq.MaxTotalTime > 0 {
		query = query.Where("total_time <= ?", searchReq.MaxTotalTime)
	}

	// Filtrage par difficulté
	if searchReq.Difficulty != "" {
		query = query.Where("difficulty = ?", searchReq.Difficulty)
	}

	// Filtrage par note minimale
	if searchReq.MinRating > 0 {
		query = query.Where("average_rating >= ?", searchReq.MinRating)
	}

	// Filtrage par auteur
	if searchReq.AuthorID > 0 {
		query = query.Where("author_id = ?", searchReq.AuthorID)
	}

	// Filtrage par ingrédients
	if len(searchReq.Ingredients) > 0 {
		query = query.Joins("JOIN recipe_ingredients ON recipes.id = recipe_ingredients.recipe_id").
			Where("recipe_ingredients.ingredient_id IN ?", toUintSlice(searchReq.Ingredients))
	}

	// Filtrage par équipements
	if len(searchReq.Equipments) > 0 {
		query = query.Joins("JOIN recipe_equipments ON recipes.id = recipe_equipments.recipe_id").
			Where("recipe_equipments.equipment_id IN ?", toUintSlice(searchReq.Equipments))
	}

	// Filtrage par catégories
	if len(searchReq.Categories) > 0 {
		query = query.Joins("JOIN recipe_category_associations ON recipes.id = recipe_category_associations.recipe_id").
			Where("recipe_category_associations.category_id IN ?", toUintSlice(searchReq.Categories))
	}

	// Filtrage par tags
	if len(searchReq.Tags) > 0 {
		query = query.Joins("JOIN recipe_tags ON recipes.id = recipe_tags.recipe_id").
			Where("recipe_tags.tag_id IN ?", toUintSlice(searchReq.Tags))
	}

	// Seules les recettes publiques sont cherchables (sauf si c'est l'auteur)
	query = query.Where("is_public = ?", true)

	log.Printf("About to count results...")
	// Compter le total (distinct pour éviter les doublons)
	var total int64
	// Utiliser Select pour éviter le problème avec les colonnes JSON
	countQuery := r.db.WithContext(ctx).Model(&dto.Recipe{}).Select("DISTINCT recipes.id")

	// Appliquer les mêmes filtres que la requête principale
	if searchReq.Query != "" {
		searchTerm := "%" + strings.ToLower(searchReq.Query) + "%"
		countQuery = countQuery.Where("LOWER(title) LIKE ? OR LOWER(description) LIKE ?", searchTerm, searchTerm)
	}

	if searchReq.MaxPrepTime > 0 {
		countQuery = countQuery.Where("prep_time <= ?", searchReq.MaxPrepTime)
	}
	if searchReq.MaxCookTime > 0 {
		countQuery = countQuery.Where("cook_time <= ?", searchReq.MaxCookTime)
	}
	if searchReq.MaxTotalTime > 0 {
		countQuery = countQuery.Where("total_time <= ?", searchReq.MaxTotalTime)
	}

	if searchReq.Difficulty != "" {
		countQuery = countQuery.Where("difficulty = ?", searchReq.Difficulty)
	}

	if searchReq.MinRating > 0 {
		countQuery = countQuery.Where("average_rating >= ?", searchReq.MinRating)
	}

	if searchReq.AuthorID > 0 {
		countQuery = countQuery.Where("author_id = ?", searchReq.AuthorID)
	}

	if len(searchReq.Ingredients) > 0 {
		countQuery = countQuery.Joins("JOIN recipe_ingredients ON recipes.id = recipe_ingredients.recipe_id").
			Where("recipe_ingredients.ingredient_id IN ?", toUintSlice(searchReq.Ingredients))
	}

	if len(searchReq.Equipments) > 0 {
		countQuery = countQuery.Joins("JOIN recipe_equipments ON recipes.id = recipe_equipments.recipe_id").
			Where("recipe_equipments.equipment_id IN ?", toUintSlice(searchReq.Equipments))
	}

	if len(searchReq.Categories) > 0 {
		countQuery = countQuery.Joins("JOIN recipe_category_associations ON recipes.id = recipe_category_associations.recipe_id").
			Where("recipe_category_associations.category_id IN ?", toUintSlice(searchReq.Categories))
	}

	if len(searchReq.Tags) > 0 {
		countQuery = countQuery.Joins("JOIN recipe_tags ON recipes.id = recipe_tags.recipe_id").
			Where("recipe_tags.tag_id IN ?", toUintSlice(searchReq.Tags))
	}

	countQuery = countQuery.Where("is_public = ?", true)

	if err := countQuery.Count(&total).Error; err != nil {
		log.Printf("Error counting results: %v", err)
		return nil, 0, ormerrors.NewDatabaseError("count search results", err)
	}
	log.Printf("Found %d total results", total)

	// Tri
	orderClause := "created_at DESC" // Tri par défaut
	if searchReq.SortBy != "" {
		orderClause = searchReq.SortBy
		if searchReq.SortOrder == "asc" {
			orderClause += " ASC"
		} else {
			orderClause += " DESC"
		}
	}

	// Récupérer les résultats
	var recipes []*dto.Recipe
	log.Printf("About to fetch results with order: %s, limit: %d, offset: %d", orderClause, searchReq.Limit, (searchReq.Page-1)*searchReq.Limit)

	// Créer une requête finale sans DISTINCT pour éviter les problèmes PostgreSQL
	finalQuery := r.db.WithContext(ctx).Model(&dto.Recipe{})

	// Appliquer tous les filtres
	if searchReq.Query != "" {
		searchTerm := "%" + strings.ToLower(searchReq.Query) + "%"
		finalQuery = finalQuery.Where("LOWER(title) LIKE ? OR LOWER(description) LIKE ?", searchTerm, searchTerm)
	}

	if searchReq.MaxPrepTime > 0 {
		finalQuery = finalQuery.Where("prep_time <= ?", searchReq.MaxPrepTime)
	}
	if searchReq.MaxCookTime > 0 {
		finalQuery = finalQuery.Where("cook_time <= ?", searchReq.MaxCookTime)
	}
	if searchReq.MaxTotalTime > 0 {
		finalQuery = finalQuery.Where("(prep_time + cook_time) <= ?", searchReq.MaxTotalTime)
	}
	if searchReq.Difficulty != "" {
		finalQuery = finalQuery.Where("difficulty = ?", searchReq.Difficulty)
	}
	if searchReq.MinRating > 0 {
		finalQuery = finalQuery.Where("average_rating >= ?", searchReq.MinRating)
	}
	if searchReq.AuthorID > 0 {
		finalQuery = finalQuery.Where("author_id = ?", searchReq.AuthorID)
	}

	// Pour les relations many-to-many, utilisons GROUP BY au lieu de DISTINCT
	hasJoins := false

	if len(searchReq.Ingredients) > 0 {
		finalQuery = finalQuery.Joins("JOIN recipe_ingredients ON recipes.id = recipe_ingredients.recipe_id").
			Where("recipe_ingredients.ingredient_id IN ?", toUintSlice(searchReq.Ingredients))
		hasJoins = true
	}

	if len(searchReq.Equipments) > 0 {
		finalQuery = finalQuery.Joins("JOIN recipe_equipments ON recipes.id = recipe_equipments.recipe_id").
			Where("recipe_equipments.equipment_id IN ?", toUintSlice(searchReq.Equipments))
		hasJoins = true
	}

	if len(searchReq.Categories) > 0 {
		finalQuery = finalQuery.Joins("JOIN recipe_category_associations ON recipes.id = recipe_category_associations.recipe_id").
			Where("recipe_category_associations.category_id IN ?", toUintSlice(searchReq.Categories))
		hasJoins = true
	}

	if len(searchReq.Tags) > 0 {
		finalQuery = finalQuery.Joins("JOIN recipe_tags ON recipes.id = recipe_tags.recipe_id").
			Where("recipe_tags.tag_id IN ?", toUintSlice(searchReq.Tags))
		hasJoins = true
	}

	finalQuery = finalQuery.Where("is_public = ?", true)

	// Si on a des joins, utiliser GROUP BY pour éviter les doublons
	if hasJoins {
		finalQuery = finalQuery.Group("recipes.id")
	}

	if err := finalQuery.
		Preload("Author").
		Preload("Categories").
		Preload("Tags").
		Order(orderClause).
		Limit(searchReq.Limit).
		Offset((searchReq.Page - 1) * searchReq.Limit).
		Find(&recipes).Error; err != nil {
		log.Printf("Error fetching full recipes: %v", err)
		return nil, 0, ormerrors.NewDatabaseError("search recipes", err)
	}

	// Charger les recettes référencées dans les étapes
	if err := r.loadReferencedRecipesInMultipleRecipes(ctx, recipes); err != nil {
		return nil, 0, err
	}

	log.Printf("Successfully found %d recipes", len(recipes))
	return recipes, total, nil
}

// Copy copie une recette existante pour un nouvel auteur
func (r *recipeRepository) Copy(ctx context.Context, originalRecipeID, newAuthorID uint) (*dto.Recipe, error) {
	// Récupérer la recette originale
	originalRecipe, err := r.GetByID(ctx, originalRecipeID)
	if err != nil {
		return nil, err
	}

	// Créer une nouvelle recette basée sur l'originale
	newRecipe := &dto.Recipe{
		Title:            originalRecipe.Title + " (Copie)",
		Description:      originalRecipe.Description,
		Instructions:     originalRecipe.Instructions,
		PrepTime:         originalRecipe.PrepTime,
		CookTime:         originalRecipe.CookTime,
		TotalTime:        originalRecipe.TotalTime,
		Servings:         originalRecipe.Servings,
		Difficulty:       originalRecipe.Difficulty,
		ImageURL:         originalRecipe.ImageURL,
		IsPublic:         false, // Les copies sont privées par défaut
		IsOriginal:       false,
		OriginalRecipeID: &originalRecipeID,
		AuthorID:         newAuthorID,
	}

	if err := r.db.WithContext(ctx).Create(newRecipe).Error; err != nil {
		return nil, ormerrors.NewDatabaseError("copy recipe", err)
	}

	// Copier les ingrédients
	for _, ingredient := range originalRecipe.Ingredients {
		newIngredient := &dto.RecipeIngredient{
			RecipeID:     newRecipe.ID,
			IngredientID: ingredient.IngredientID,
			Quantity:     ingredient.Quantity,
			Unit:         ingredient.Unit,
			Notes:        ingredient.Notes,
			IsOptional:   ingredient.IsOptional,
		}
		if err := r.db.WithContext(ctx).Create(newIngredient).Error; err != nil {
			return nil, ormerrors.NewDatabaseError("copy recipe ingredients", err)
		}
	}

	// Copier les équipements
	for _, equipment := range originalRecipe.Equipments {
		newEquipment := &dto.RecipeEquipment{
			RecipeID:    newRecipe.ID,
			EquipmentID: equipment.EquipmentID,
			IsOptional:  equipment.IsOptional,
			Notes:       equipment.Notes,
		}
		if err := r.db.WithContext(ctx).Create(newEquipment).Error; err != nil {
			return nil, ormerrors.NewDatabaseError("copy recipe equipment", err)
		}
	}

	// Associer les mêmes catégories et tags
	if err := r.db.WithContext(ctx).Model(newRecipe).Association("Categories").Append(originalRecipe.Categories); err != nil {
		return nil, ormerrors.NewDatabaseError("copy recipe categories", err)
	}

	if err := r.db.WithContext(ctx).Model(newRecipe).Association("Tags").Append(originalRecipe.Tags); err != nil {
		return nil, ormerrors.NewDatabaseError("copy recipe tags", err)
	}

	return r.GetByID(ctx, newRecipe.ID)
}

// GetPublicRecipes récupère les recettes publiques
func (r *recipeRepository) GetPublicRecipes(ctx context.Context, limit, offset int) ([]*dto.Recipe, int64, error) {
	var recipes []*dto.Recipe
	var total int64

	// Compter le total
	if err := r.db.WithContext(ctx).
		Model(&dto.Recipe{}).
		Where("is_public = ?", true).
		Count(&total).Error; err != nil {
		return nil, 0, ormerrors.NewDatabaseError("count public recipes", err)
	}

	// Récupérer les recettes paginées
	if err := r.db.WithContext(ctx).
		Preload("Author").
		Preload("Categories").
		Preload("Tags").
		Where("is_public = ?", true).
		Limit(limit).
		Offset(offset).
		Order("created_at DESC").
		Find(&recipes).Error; err != nil {
		return nil, 0, ormerrors.NewDatabaseError("list public recipes", err)
	}

	return recipes, total, nil
}

// GetPublicRecipesByRating récupère les recettes publiques triées par note
func (r *recipeRepository) GetPublicRecipesByRating(ctx context.Context, limit, offset int) ([]*dto.Recipe, int64, error) {
	var recipes []*dto.Recipe
	var total int64

	// Compter le total
	if err := r.db.WithContext(ctx).
		Model(&dto.Recipe{}).
		Where("is_public = ?", true).
		Count(&total).Error; err != nil {
		return nil, 0, ormerrors.NewDatabaseError("count public recipes", err)
	}

	// Récupérer les recettes paginées triées par note (DESC) puis par nombre d'évaluations
	if err := r.db.WithContext(ctx).
		Preload("Author").
		Preload("Categories").
		Preload("Tags").
		Where("is_public = ?", true).
		Limit(limit).
		Offset(offset).
		Order("average_rating DESC, rating_count DESC, created_at DESC").
		Find(&recipes).Error; err != nil {
		return nil, 0, ormerrors.NewDatabaseError("list public recipes by rating", err)
	}

	return recipes, total, nil
}

// Helper function pour convertir un slice de strings en lowercase
func toLowerSlice(slice []string) []string {
	result := make([]string, len(slice))
	for i, s := range slice {
		result[i] = strings.ToLower(s)
	}
	return result
}

// Helper function pour convertir un slice de strings en uints
func toUintSlice(slice []string) []uint {
	result := make([]uint, 0, len(slice))
	for _, s := range slice {
		if id, err := strconv.ParseUint(s, 10, 32); err == nil {
			result = append(result, uint(id))
		}
	}
	return result
}

// UpdateRecipeRating recalcule et met à jour la note moyenne d'une recette
func (r *recipeRepository) UpdateRecipeRating(ctx context.Context, recipeID uint) error {
	var result struct {
		AverageRating float64 `gorm:"column:avg_rating"`
		Count         int64   `gorm:"column:count"`
	}

	// Calculer la note moyenne et le nombre total de commentaires avec note
	err := r.db.WithContext(ctx).
		Model(&dto.Comment{}).
		Select("AVG(rating) as avg_rating, COUNT(*) as count").
		Where("recipe_id = ? AND rating > 0", recipeID).
		Scan(&result).Error

	if err != nil {
		return ormerrors.NewDatabaseError("calculate recipe rating", err)
	}

	// Mettre à jour la recette avec les nouvelles valeurs
	err = r.db.WithContext(ctx).
		Model(&dto.Recipe{}).
		Where("id = ?", recipeID).
		Updates(map[string]interface{}{
			"average_rating": result.AverageRating,
			"rating_count":   result.Count,
		}).Error

	if err != nil {
		return ormerrors.NewDatabaseError("update recipe rating", err)
	}

	return nil
}
