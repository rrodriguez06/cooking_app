package repositories

import (
	"context"
	"errors"
	"fmt"
	"log"

	"github.com/romainrodriguez/cooking_server/internal/dto"
	ormerrors "github.com/romainrodriguez/cooking_server/internal/services/orm/errors"
	"gorm.io/gorm"
)

type recipeListRepository struct {
	db *gorm.DB
}

// NewRecipeListRepository crée une nouvelle instance du repository des listes de recettes
func NewRecipeListRepository(db *gorm.DB) *recipeListRepository {
	return &recipeListRepository{db: db}
}

// Create crée une nouvelle liste de recettes
func (r *recipeListRepository) Create(ctx context.Context, list *dto.RecipeList) error {
	if err := r.db.WithContext(ctx).Create(list).Error; err != nil {
		return ormerrors.NewDatabaseError("create recipe list", err)
	}
	return nil
}

// GetByID récupère une liste de recettes par son ID
func (r *recipeListRepository) GetByID(ctx context.Context, id uint) (*dto.RecipeList, error) {
	var list dto.RecipeList
	if err := r.db.WithContext(ctx).
		Preload("User").
		Preload("Items.Recipe.Author").
		Preload("Items.Recipe.Categories").
		Preload("Items.Recipe.Tags").
		First(&list, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ormerrors.NewNotFoundError("recipe list", id)
		}
		return nil, ormerrors.NewDatabaseError("get recipe list by id", err)
	}
	return &list, nil
}

// GetByUser récupère les listes de recettes d'un utilisateur avec pagination
func (r *recipeListRepository) GetByUser(ctx context.Context, userID uint, limit, offset int) ([]*dto.RecipeList, int64, error) {
	var lists []*dto.RecipeList
	var total int64

	// Compter le total
	if err := r.db.WithContext(ctx).
		Model(&dto.RecipeList{}).
		Where("user_id = ?", userID).
		Count(&total).Error; err != nil {
		return nil, 0, ormerrors.NewDatabaseError("count user recipe lists", err)
	}

	// Récupérer les listes avec pagination
	if err := r.db.WithContext(ctx).
		Preload("Items.Recipe.Author").
		Where("user_id = ?", userID).
		Limit(limit).
		Offset(offset).
		Order("created_at DESC").
		Find(&lists).Error; err != nil {
		return nil, 0, ormerrors.NewDatabaseError("get user recipe lists", err)
	}

	return lists, total, nil
}

// Update met à jour une liste de recettes
func (r *recipeListRepository) Update(ctx context.Context, list *dto.RecipeList) error {
	if err := r.db.WithContext(ctx).Save(list).Error; err != nil {
		return ormerrors.NewDatabaseError("update recipe list", err)
	}
	return nil
}

// Delete supprime une liste de recettes
func (r *recipeListRepository) Delete(ctx context.Context, id uint) error {
	// Supprimer d'abord tous les items de la liste
	if err := r.db.WithContext(ctx).
		Where("recipe_list_id = ?", id).
		Delete(&dto.RecipeListItem{}).Error; err != nil {
		return ormerrors.NewDatabaseError("delete recipe list items", err)
	}

	// Puis supprimer la liste
	result := r.db.WithContext(ctx).Delete(&dto.RecipeList{}, id)
	if result.Error != nil {
		return ormerrors.NewDatabaseError("delete recipe list", result.Error)
	}
	if result.RowsAffected == 0 {
		return ormerrors.NewNotFoundError("recipe list", id)
	}

	return nil
}

// AddRecipe ajoute une recette à une liste
func (r *recipeListRepository) AddRecipe(ctx context.Context, listID, recipeID uint, notes string, position int) error {
	log.Printf("[REPO_LIST] AddRecipe called - ListID: %d, RecipeID: %d", listID, recipeID)

	// Vérifier que la liste existe
	var list dto.RecipeList
	log.Printf("[REPO_LIST] Checking if list %d exists...", listID)
	if err := r.db.WithContext(ctx).First(&list, listID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			log.Printf("[REPO_LIST] List %d not found", listID)
			return ormerrors.NewNotFoundError("recipe list", listID)
		}
		log.Printf("[REPO_LIST] Error finding list %d: %v", listID, err)
		return ormerrors.NewDatabaseError("find recipe list", err)
	}
	log.Printf("[REPO_LIST] List %d found: %s", listID, list.Name)

	// Vérifier que la recette existe
	var recipe dto.Recipe
	log.Printf("[REPO_LIST] Checking if recipe %d exists...", recipeID)
	if err := r.db.WithContext(ctx).First(&recipe, recipeID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			log.Printf("[REPO_LIST] Recipe %d not found", recipeID)
			return ormerrors.NewNotFoundError("recipe", recipeID)
		}
		log.Printf("[REPO_LIST] Error finding recipe %d: %v", recipeID, err)
		return ormerrors.NewDatabaseError("find recipe", err)
	}
	log.Printf("[REPO_LIST] Recipe %d found: %s", recipeID, recipe.Title)

	// Créer l'item de liste (sans notes ni position pour l'instant)
	item := &dto.RecipeListItem{
		RecipeListID: listID,
		RecipeID:     recipeID,
	}

	log.Printf("[REPO_LIST] Creating recipe list item...")
	if err := r.db.WithContext(ctx).Create(item).Error; err != nil {
		log.Printf("[REPO_LIST] Error creating recipe list item: %v", err)
		if isDuplicateError(err) {
			log.Printf("[REPO_LIST] Duplicate entry error")
			return ormerrors.NewDuplicateError("recipe in list", "recipe-list combination", fmt.Sprintf("%d-%d", listID, recipeID))
		}
		return ormerrors.NewDatabaseError("add recipe to list", err)
	}

	log.Printf("[REPO_LIST] Recipe list item created successfully")
	return nil
}

// RemoveRecipe supprime une recette d'une liste
func (r *recipeListRepository) RemoveRecipe(ctx context.Context, listID, recipeID uint) error {
	result := r.db.WithContext(ctx).
		Where("recipe_list_id = ? AND recipe_id = ?", listID, recipeID).
		Delete(&dto.RecipeListItem{})

	if result.Error != nil {
		return ormerrors.NewDatabaseError("remove recipe from list", result.Error)
	}

	if result.RowsAffected == 0 {
		return ormerrors.NewNotFoundError("recipe in list", fmt.Sprintf("list %d, recipe %d", listID, recipeID))
	}

	return nil
}

// UpdateRecipeInList met à jour les métadonnées d'une recette dans une liste
func (r *recipeListRepository) UpdateRecipeInList(ctx context.Context, listID, recipeID uint, notes string, position int) error {
	// Pour l'instant, cette méthode ne fait rien car nous n'avons plus de champs à mettre à jour
	// Elle pourra être réimplémentée plus tard si nous ajoutons des colonnes notes/position
	return nil
}

// GetListRecipes récupère les recettes d'une liste avec pagination
func (r *recipeListRepository) GetListRecipes(ctx context.Context, listID uint, limit, offset int) ([]*dto.Recipe, int64, error) {
	var recipes []*dto.Recipe
	var total int64

	// Compter le total
	if err := r.db.WithContext(ctx).
		Model(&dto.RecipeListItem{}).
		Where("recipe_list_id = ?", listID).
		Count(&total).Error; err != nil {
		return nil, 0, ormerrors.NewDatabaseError("count list recipes", err)
	}

	// Récupérer les recettes avec pagination
	subQuery := r.db.WithContext(ctx).
		Model(&dto.RecipeListItem{}).
		Select("recipe_id").
		Where("recipe_list_id = ?", listID).
		Limit(limit).
		Offset(offset)

	if err := r.db.WithContext(ctx).
		Preload("Author").
		Preload("Categories").
		Preload("Tags").
		Preload("Ingredients.Ingredient").
		Preload("Equipments.Equipment").
		Where("id IN (?)", subQuery).
		Find(&recipes).Error; err != nil {
		return nil, 0, ormerrors.NewDatabaseError("get list recipes", err)
	}

	return recipes, total, nil
}

// ReorderRecipes réorganise les recettes dans une liste
func (r *recipeListRepository) ReorderRecipes(ctx context.Context, listID uint, recipePositions map[uint]int) error {
	// Pour l'instant, cette méthode ne fait rien car nous n'avons plus de champ position
	// Elle pourra être réimplémentée plus tard si nous ajoutons une colonne position
	return nil
}

// GetPublicLists récupère les listes publiques avec pagination
func (r *recipeListRepository) GetPublicLists(ctx context.Context, limit, offset int) ([]*dto.RecipeList, int64, error) {
	var lists []*dto.RecipeList
	var total int64

	// Compter le total
	if err := r.db.WithContext(ctx).
		Model(&dto.RecipeList{}).
		Where("is_public = ?", true).
		Count(&total).Error; err != nil {
		return nil, 0, ormerrors.NewDatabaseError("count public recipe lists", err)
	}

	// Récupérer les listes avec pagination
	if err := r.db.WithContext(ctx).
		Preload("User").
		Preload("Items.Recipe.Author").
		Where("is_public = ?", true).
		Limit(limit).
		Offset(offset).
		Order("created_at DESC").
		Find(&lists).Error; err != nil {
		return nil, 0, ormerrors.NewDatabaseError("get public recipe lists", err)
	}

	return lists, total, nil
}

// GetPublicListsByUser récupère les listes publiques d'un utilisateur avec pagination
func (r *recipeListRepository) GetPublicListsByUser(ctx context.Context, userID uint, limit, offset int) ([]*dto.RecipeList, int64, error) {
	var lists []*dto.RecipeList
	var total int64

	// Compter le total
	if err := r.db.WithContext(ctx).
		Model(&dto.RecipeList{}).
		Where("user_id = ? AND is_public = ?", userID, true).
		Count(&total).Error; err != nil {
		return nil, 0, ormerrors.NewDatabaseError("count user public recipe lists", err)
	}

	// Récupérer les listes avec pagination
	if err := r.db.WithContext(ctx).
		Preload("User").
		Preload("Items.Recipe.Author").
		Where("user_id = ? AND is_public = ?", userID, true).
		Limit(limit).
		Offset(offset).
		Order("created_at DESC").
		Find(&lists).Error; err != nil {
		return nil, 0, ormerrors.NewDatabaseError("get user public recipe lists", err)
	}

	return lists, total, nil
}
