package repositories

import (
	"context"
	"errors"
	"log"
	"time"

	"github.com/romainrodriguez/cooking_server/internal/dto"
	ormerrors "github.com/romainrodriguez/cooking_server/internal/services/orm/errors"
	"gorm.io/gorm"
)

const MaxNestedRecipeDepth = 3 // Profondeur maximale pour les recettes imbriquées

type mealPlanRepository struct {
	db *gorm.DB
}

// NewMealPlanRepository crée une nouvelle instance du repository meal plan
func NewMealPlanRepository(db *gorm.DB) *mealPlanRepository {
	return &mealPlanRepository{db: db}
}

// Create crée un nouveau planning de repas
func (r *mealPlanRepository) Create(ctx context.Context, mealPlan *dto.MealPlan) error {
	if err := r.db.WithContext(ctx).Create(mealPlan).Error; err != nil {
		return ormerrors.NewDatabaseError("create meal plan", err)
	}
	return nil
}

// GetByID récupère un planning de repas par son ID avec ses relations
func (r *mealPlanRepository) GetByID(ctx context.Context, id uint) (*dto.MealPlan, error) {
	var mealPlan dto.MealPlan
	if err := r.db.WithContext(ctx).
		Preload("User").
		Preload("Recipe").
		Preload("Recipe.Author").
		Preload("Recipe.Categories").
		Preload("Recipe.Tags").
		First(&mealPlan, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ormerrors.NewNotFoundError("meal plan", id)
		}
		return nil, ormerrors.NewDatabaseError("get meal plan by id", err)
	}
	return &mealPlan, nil
}

// GetByUser récupère les plannings de repas d'un utilisateur avec pagination
func (r *mealPlanRepository) GetByUser(ctx context.Context, userID uint, limit, offset int) ([]*dto.MealPlan, int64, error) {
	var mealPlans []*dto.MealPlan
	var total int64

	// Compter le total
	if err := r.db.WithContext(ctx).
		Model(&dto.MealPlan{}).
		Where("user_id = ?", userID).
		Count(&total).Error; err != nil {
		return nil, 0, ormerrors.NewDatabaseError("count meal plans by user", err)
	}

	// Récupérer les plannings paginés
	if err := r.db.WithContext(ctx).
		Preload("Recipe").
		Preload("Recipe.Author").
		Preload("Recipe.Categories").
		Preload("Recipe.Tags").
		Where("user_id = ?", userID).
		Limit(limit).
		Offset(offset).
		Order("planned_date ASC, meal_type").
		Find(&mealPlans).Error; err != nil {
		return nil, 0, ormerrors.NewDatabaseError("list meal plans by user", err)
	}

	return mealPlans, total, nil
}

// GetByUserAndDateRange récupère les plannings d'un utilisateur pour une période donnée
func (r *mealPlanRepository) GetByUserAndDateRange(ctx context.Context, userID uint, startDate, endDate time.Time) ([]*dto.MealPlan, error) {
	var mealPlans []*dto.MealPlan

	if err := r.db.WithContext(ctx).
		Preload("Recipe").
		Preload("Recipe.Author").
		Preload("Recipe.Categories").
		Preload("Recipe.Tags").
		Where("user_id = ? AND planned_date >= ? AND planned_date <= ?", userID, startDate, endDate).
		Order("planned_date ASC, meal_type").
		Find(&mealPlans).Error; err != nil {
		return nil, ormerrors.NewDatabaseError("get meal plans by date range", err)
	}

	return mealPlans, nil
}

// GetByUserAndDate récupère les plannings d'un utilisateur pour une date donnée
func (r *mealPlanRepository) GetByUserAndDate(ctx context.Context, userID uint, date time.Time) ([]*dto.MealPlan, error) {
	var mealPlans []*dto.MealPlan

	// Récupérer tous les repas planifiés pour cette date (en ignorant l'heure)
	startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	endOfDay := startOfDay.Add(24 * time.Hour)

	if err := r.db.WithContext(ctx).
		Preload("Recipe").
		Preload("Recipe.Author").
		Preload("Recipe.Categories").
		Preload("Recipe.Tags").
		Where("user_id = ? AND planned_date >= ? AND planned_date < ?", userID, startOfDay, endOfDay).
		Order("meal_type, planned_date").
		Find(&mealPlans).Error; err != nil {
		return nil, ormerrors.NewDatabaseError("get meal plans by date", err)
	}

	return mealPlans, nil
}

// Update met à jour un planning de repas
func (r *mealPlanRepository) Update(ctx context.Context, mealPlan *dto.MealPlan) error {
	log.Printf("Repository Update: About to update meal plan ID=%d with RecipeID=%d", mealPlan.ID, mealPlan.RecipeID)

	// Utiliser Updates avec une map pour s'assurer que tous les champs sont mis à jour
	updates := map[string]interface{}{
		"recipe_id":    mealPlan.RecipeID,
		"planned_date": mealPlan.PlannedDate,
		"meal_type":    mealPlan.MealType,
		"servings":     mealPlan.Servings,
		"notes":        mealPlan.Notes,
		"is_completed": mealPlan.IsCompleted,
		"updated_at":   time.Now(),
	}

	if mealPlan.CompletedAt != nil {
		updates["completed_at"] = mealPlan.CompletedAt
	}

	result := r.db.WithContext(ctx).Model(&dto.MealPlan{}).Where("id = ?", mealPlan.ID).Updates(updates)
	if result.Error != nil {
		log.Printf("Repository Update: Error updating meal plan: %v", result.Error)
		return ormerrors.NewDatabaseError("update meal plan", result.Error)
	}

	log.Printf("Repository Update: Successfully updated %d rows", result.RowsAffected)
	return nil
}

// Delete supprime un planning de repas
func (r *mealPlanRepository) Delete(ctx context.Context, id uint) error {
	result := r.db.WithContext(ctx).Delete(&dto.MealPlan{}, id)
	if result.Error != nil {
		return ormerrors.NewDatabaseError("delete meal plan", result.Error)
	}
	if result.RowsAffected == 0 {
		return ormerrors.NewNotFoundError("meal plan", id)
	}
	return nil
}

// MarkAsCompleted marque un planning de repas comme terminé
func (r *mealPlanRepository) MarkAsCompleted(ctx context.Context, id uint) error {
	now := time.Now()
	result := r.db.WithContext(ctx).
		Model(&dto.MealPlan{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"is_completed": true,
			"completed_at": &now,
		})

	if result.Error != nil {
		return ormerrors.NewDatabaseError("mark meal plan as completed", result.Error)
	}
	if result.RowsAffected == 0 {
		return ormerrors.NewNotFoundError("meal plan", id)
	}
	return nil
}

// GetUpcomingMeals récupère les prochains repas planifiés pour un utilisateur
func (r *mealPlanRepository) GetUpcomingMeals(ctx context.Context, userID uint, days int) ([]*dto.MealPlan, error) {
	var mealPlans []*dto.MealPlan

	startDate := time.Now()
	endDate := startDate.Add(time.Duration(days) * 24 * time.Hour)

	if err := r.db.WithContext(ctx).
		Preload("Recipe").
		Preload("Recipe.Author").
		Where("user_id = ? AND planned_date >= ? AND planned_date <= ? AND is_completed = ?",
			userID, startDate, endDate, false).
		Order("planned_date ASC, meal_type").
		Find(&mealPlans).Error; err != nil {
		return nil, ormerrors.NewDatabaseError("get upcoming meals", err)
	}

	return mealPlans, nil
}

// RecipeIngredientCollector aide à collecter les ingrédients avec les recettes imbriquées
type RecipeIngredientCollector struct {
	Ingredients []RecipeIngredientWithSource
	RecipeData  map[uint]*dto.Recipe // Cache des recettes pour éviter les requêtes répétées
}

// RecipeIngredientWithSource inclut l'ingrédient et sa source
type RecipeIngredientWithSource struct {
	dto.RecipeIngredient
	SourceRecipeID   uint    // ID de la recette qui contient cet ingrédient
	SourceRecipeName string  // Nom de la recette qui contient cet ingrédient
	QuantityRatio    float64 // Ratio de quantité basé sur les portions
	Depth            int     // Profondeur dans l'arbre des recettes imbriquées
}

// collectNestedIngredients collecte récursivement tous les ingrédients d'une recette et de ses recettes référencées
func (r *mealPlanRepository) collectNestedIngredients(ctx context.Context, recipe *dto.Recipe, servingsRatio float64, depth int, visited map[uint]bool, collector *RecipeIngredientCollector) error {
	if depth > MaxNestedRecipeDepth || visited[recipe.ID] {
		return nil // Éviter les cycles et limiter la profondeur
	}

	visited[recipe.ID] = true
	defer func() { visited[recipe.ID] = false }()

	// Ajouter les ingrédients directs de cette recette
	for _, ingredient := range recipe.Ingredients {
		collector.Ingredients = append(collector.Ingredients, RecipeIngredientWithSource{
			RecipeIngredient: ingredient,
			SourceRecipeID:   recipe.ID,
			SourceRecipeName: recipe.Title,
			QuantityRatio:    servingsRatio,
			Depth:            depth,
		})
	}

	// Traiter les recettes référencées dans les étapes
	for _, step := range recipe.Instructions {
		if step.ReferencedRecipeID != nil && *step.ReferencedRecipeID > 0 {
			// Vérifier si la recette est déjà en cache
			var referencedRecipe *dto.Recipe
			if cachedRecipe, exists := collector.RecipeData[*step.ReferencedRecipeID]; exists {
				referencedRecipe = cachedRecipe
			} else {
				// Charger la recette référencée avec ses ingrédients et instructions
				var loadedRecipe dto.Recipe
				if err := r.db.WithContext(ctx).
					Preload("Ingredients").
					Preload("Ingredients.Ingredient").
					First(&loadedRecipe, *step.ReferencedRecipeID).Error; err != nil {
					if errors.Is(err, gorm.ErrRecordNotFound) {
						log.Printf("Warning: Referenced recipe %d not found, skipping", *step.ReferencedRecipeID)
						continue
					}
					return ormerrors.NewDatabaseError("load referenced recipe", err)
				}
				collector.RecipeData[*step.ReferencedRecipeID] = &loadedRecipe
				referencedRecipe = &loadedRecipe
			}

			// Calculer le ratio de portions pour la recette référencée
			// Ici on suppose que l'étape utilise la totalité de la recette référencée
			// Ce ratio pourrait être ajusté si on veut permettre des portions partielles
			referencedServingsRatio := servingsRatio

			// Collecter récursivement les ingrédients de la recette référencée
			if err := r.collectNestedIngredients(ctx, referencedRecipe, referencedServingsRatio, depth+1, visited, collector); err != nil {
				return err
			}
		}
	}

	return nil
}

// GetWeeklyShoppingList récupère la liste de courses pour une semaine donnée
// GetWeeklyShoppingList récupère la liste de courses pour une semaine donnée
func (r *mealPlanRepository) GetWeeklyShoppingList(ctx context.Context, userID uint, startDate, endDate time.Time) (*dto.WeeklyShoppingList, error) {
	// Récupérer tous les meal plans de la semaine avec leurs recettes et ingrédients
	var mealPlans []*dto.MealPlan
	if err := r.db.WithContext(ctx).
		Preload("Recipe").
		Preload("Recipe.Ingredients").
		Preload("Recipe.Ingredients.Ingredient").
		Where("user_id = ? AND planned_date >= ? AND planned_date <= ?", userID, startDate, endDate).
		Order("planned_date ASC").
		Find(&mealPlans).Error; err != nil {
		return nil, ormerrors.NewDatabaseError("get meal plans for shopping list", err)
	}

	// Créer une map pour agréger les ingrédients par ID
	ingredientMap := make(map[uint]*dto.ShoppingListItem)

	// Initialiser le collecteur pour les recettes imbriquées
	collector := &RecipeIngredientCollector{
		Ingredients: make([]RecipeIngredientWithSource, 0),
		RecipeData:  make(map[uint]*dto.Recipe),
	}

	for _, mealPlan := range mealPlans {
		// Calculer le ratio de portions (portions planifiées / portions de base de la recette)
		servingsRatio := float64(mealPlan.Servings) / float64(mealPlan.Recipe.Servings)

		// Collecter tous les ingrédients (directs et des recettes imbriquées)
		visited := make(map[uint]bool)
		if err := r.collectNestedIngredients(ctx, &mealPlan.Recipe, servingsRatio, 0, visited, collector); err != nil {
			return nil, err
		}

		// Traiter tous les ingrédients collectés
		for _, ingredientWithSource := range collector.Ingredients {
			ingredient := ingredientWithSource.RecipeIngredient.Ingredient
			adjustedQuantity := ingredientWithSource.RecipeIngredient.Quantity * ingredientWithSource.QuantityRatio

			if existingItem, exists := ingredientMap[ingredient.ID]; exists {
				// Additionner les quantités si l'ingrédient existe déjà
				existingItem.TotalQuantity += adjustedQuantity

				// Ajouter les détails de cette recette source
				existingItem.Recipes = append(existingItem.Recipes, struct {
					RecipeID   uint    `json:"recipe_id"`
					RecipeName string  `json:"recipe_name"`
					Quantity   float64 `json:"quantity"`
					Date       string  `json:"date"`
					MealType   string  `json:"meal_type"`
				}{
					RecipeID:   ingredientWithSource.SourceRecipeID,
					RecipeName: ingredientWithSource.SourceRecipeName,
					Quantity:   adjustedQuantity,
					Date:       mealPlan.PlannedDate.Format("2006-01-02"),
					MealType:   mealPlan.MealType,
				})
			} else {
				// Créer un nouvel item
				ingredientMap[ingredient.ID] = &dto.ShoppingListItem{
					IngredientID:   ingredient.ID,
					IngredientName: ingredient.Name,
					TotalQuantity:  adjustedQuantity,
					Unit:           ingredientWithSource.RecipeIngredient.Unit,
					Recipes: []struct {
						RecipeID   uint    `json:"recipe_id"`
						RecipeName string  `json:"recipe_name"`
						Quantity   float64 `json:"quantity"`
						Date       string  `json:"date"`
						MealType   string  `json:"meal_type"`
					}{{
						RecipeID:   ingredientWithSource.SourceRecipeID,
						RecipeName: ingredientWithSource.SourceRecipeName,
						Quantity:   adjustedQuantity,
						Date:       mealPlan.PlannedDate.Format("2006-01-02"),
						MealType:   mealPlan.MealType,
					}},
				}
			}
		}

		// Réinitialiser le collecteur pour le prochain meal plan
		collector.Ingredients = collector.Ingredients[:0]
	}

	// Convertir la map en slice
	items := make([]dto.ShoppingListItem, 0, len(ingredientMap))
	for _, item := range ingredientMap {
		items = append(items, *item)
	}

	// Compter le nombre unique de recettes (y compris les recettes imbriquées)
	uniqueRecipes := make(map[uint]bool)
	for _, mealPlan := range mealPlans {
		uniqueRecipes[mealPlan.Recipe.ID] = true
	}
	// Ajouter aussi les recettes imbriquées
	for recipeID := range collector.RecipeData {
		uniqueRecipes[recipeID] = true
	}

	return &dto.WeeklyShoppingList{
		StartDate:    startDate,
		EndDate:      endDate,
		Items:        items,
		TotalRecipes: len(uniqueRecipes),
	}, nil
}
