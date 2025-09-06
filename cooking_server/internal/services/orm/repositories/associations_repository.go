package repositories

import (
	"context"

	"github.com/romainrodriguez/cooking_server/internal/dto"
	ormerrors "github.com/romainrodriguez/cooking_server/internal/services/orm/errors"
	"gorm.io/gorm"
)

type recipeIngredientRepository struct {
	db *gorm.DB
}

// NewRecipeIngredientRepository crée une nouvelle instance du repository recipe-ingredient
func NewRecipeIngredientRepository(db *gorm.DB) *recipeIngredientRepository {
	return &recipeIngredientRepository{db: db}
}

// Create crée une nouvelle association recette-ingrédient
func (r *recipeIngredientRepository) Create(ctx context.Context, recipeIngredient *dto.RecipeIngredient) error {
	if err := r.db.WithContext(ctx).Create(recipeIngredient).Error; err != nil {
		return ormerrors.NewDatabaseError("create recipe ingredient", err)
	}
	return nil
}

// GetByRecipe récupère tous les ingrédients d'une recette
func (r *recipeIngredientRepository) GetByRecipe(ctx context.Context, recipeID uint) ([]*dto.RecipeIngredient, error) {
	var recipeIngredients []*dto.RecipeIngredient

	if err := r.db.WithContext(ctx).
		Preload("Ingredient").
		Where("recipe_id = ?", recipeID).
		Find(&recipeIngredients).Error; err != nil {
		return nil, ormerrors.NewDatabaseError("get recipe ingredients", err)
	}

	return recipeIngredients, nil
}

// Update met à jour une association recette-ingrédient
func (r *recipeIngredientRepository) Update(ctx context.Context, recipeIngredient *dto.RecipeIngredient) error {
	if err := r.db.WithContext(ctx).Save(recipeIngredient).Error; err != nil {
		return ormerrors.NewDatabaseError("update recipe ingredient", err)
	}
	return nil
}

// Delete supprime une association recette-ingrédient spécifique
func (r *recipeIngredientRepository) Delete(ctx context.Context, recipeID, ingredientID uint) error {
	result := r.db.WithContext(ctx).
		Where("recipe_id = ? AND ingredient_id = ?", recipeID, ingredientID).
		Delete(&dto.RecipeIngredient{})

	if result.Error != nil {
		return ormerrors.NewDatabaseError("delete recipe ingredient", result.Error)
	}
	if result.RowsAffected == 0 {
		return ormerrors.NewNotFoundError("recipe ingredient", map[string]uint{
			"recipe_id":     recipeID,
			"ingredient_id": ingredientID,
		})
	}
	return nil
}

// DeleteByRecipe supprime tous les ingrédients d'une recette
func (r *recipeIngredientRepository) DeleteByRecipe(ctx context.Context, recipeID uint) error {
	if err := r.db.WithContext(ctx).
		Where("recipe_id = ?", recipeID).
		Delete(&dto.RecipeIngredient{}).Error; err != nil {
		return ormerrors.NewDatabaseError("delete all recipe ingredients", err)
	}
	return nil
}

type recipeEquipmentRepository struct {
	db *gorm.DB
}

// NewRecipeEquipmentRepository crée une nouvelle instance du repository recipe-equipment
func NewRecipeEquipmentRepository(db *gorm.DB) *recipeEquipmentRepository {
	return &recipeEquipmentRepository{db: db}
}

// Create crée une nouvelle association recette-équipement
func (r *recipeEquipmentRepository) Create(ctx context.Context, recipeEquipment *dto.RecipeEquipment) error {
	if err := r.db.WithContext(ctx).Create(recipeEquipment).Error; err != nil {
		return ormerrors.NewDatabaseError("create recipe equipment", err)
	}
	return nil
}

// GetByRecipe récupère tous les équipements d'une recette
func (r *recipeEquipmentRepository) GetByRecipe(ctx context.Context, recipeID uint) ([]*dto.RecipeEquipment, error) {
	var recipeEquipments []*dto.RecipeEquipment

	if err := r.db.WithContext(ctx).
		Preload("Equipment").
		Where("recipe_id = ?", recipeID).
		Find(&recipeEquipments).Error; err != nil {
		return nil, ormerrors.NewDatabaseError("get recipe equipment", err)
	}

	return recipeEquipments, nil
}

// Update met à jour une association recette-équipement
func (r *recipeEquipmentRepository) Update(ctx context.Context, recipeEquipment *dto.RecipeEquipment) error {
	if err := r.db.WithContext(ctx).Save(recipeEquipment).Error; err != nil {
		return ormerrors.NewDatabaseError("update recipe equipment", err)
	}
	return nil
}

// Delete supprime une association recette-équipement spécifique
func (r *recipeEquipmentRepository) Delete(ctx context.Context, recipeID, equipmentID uint) error {
	result := r.db.WithContext(ctx).
		Where("recipe_id = ? AND equipment_id = ?", recipeID, equipmentID).
		Delete(&dto.RecipeEquipment{})

	if result.Error != nil {
		return ormerrors.NewDatabaseError("delete recipe equipment", result.Error)
	}
	if result.RowsAffected == 0 {
		return ormerrors.NewNotFoundError("recipe equipment", map[string]uint{
			"recipe_id":    recipeID,
			"equipment_id": equipmentID,
		})
	}
	return nil
}

// DeleteByRecipe supprime tous les équipements d'une recette
func (r *recipeEquipmentRepository) DeleteByRecipe(ctx context.Context, recipeID uint) error {
	if err := r.db.WithContext(ctx).
		Where("recipe_id = ?", recipeID).
		Delete(&dto.RecipeEquipment{}).Error; err != nil {
		return ormerrors.NewDatabaseError("delete all recipe equipment", err)
	}
	return nil
}
