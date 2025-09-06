package repositories

import (
	"context"
	"errors"
	"strings"

	"github.com/romainrodriguez/cooking_server/internal/dto"
	ormerrors "github.com/romainrodriguez/cooking_server/internal/services/orm/errors"
	"gorm.io/gorm"
)

type ingredientRepository struct {
	db *gorm.DB
}

// NewIngredientRepository crée une nouvelle instance du repository ingrédient
func NewIngredientRepository(db *gorm.DB) *ingredientRepository {
	return &ingredientRepository{db: db}
}

// Create crée un nouvel ingrédient
func (r *ingredientRepository) Create(ctx context.Context, ingredient *dto.Ingredient) error {
	if err := r.db.WithContext(ctx).Create(ingredient).Error; err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			return ormerrors.NewDuplicateError("ingredient", "name", ingredient.Name)
		}
		return ormerrors.NewDatabaseError("create ingredient", err)
	}
	return nil
}

// GetByID récupère un ingrédient par son ID
func (r *ingredientRepository) GetByID(ctx context.Context, id uint) (*dto.Ingredient, error) {
	var ingredient dto.Ingredient
	if err := r.db.WithContext(ctx).First(&ingredient, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ormerrors.NewNotFoundError("ingredient", id)
		}
		return nil, ormerrors.NewDatabaseError("get ingredient by id", err)
	}
	return &ingredient, nil
}

// GetByName récupère un ingrédient par son nom
func (r *ingredientRepository) GetByName(ctx context.Context, name string) (*dto.Ingredient, error) {
	var ingredient dto.Ingredient
	if err := r.db.WithContext(ctx).Where("LOWER(name) = LOWER(?)", name).First(&ingredient).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ormerrors.NewNotFoundError("ingredient", name)
		}
		return nil, ormerrors.NewDatabaseError("get ingredient by name", err)
	}
	return &ingredient, nil
}

// Update met à jour un ingrédient
func (r *ingredientRepository) Update(ctx context.Context, ingredient *dto.Ingredient) error {
	if err := r.db.WithContext(ctx).Save(ingredient).Error; err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			return ormerrors.NewDuplicateError("ingredient", "name", ingredient.Name)
		}
		return ormerrors.NewDatabaseError("update ingredient", err)
	}
	return nil
}

// Delete supprime un ingrédient
func (r *ingredientRepository) Delete(ctx context.Context, id uint) error {
	result := r.db.WithContext(ctx).Delete(&dto.Ingredient{}, id)
	if result.Error != nil {
		return ormerrors.NewDatabaseError("delete ingredient", result.Error)
	}
	if result.RowsAffected == 0 {
		return ormerrors.NewNotFoundError("ingredient", id)
	}
	return nil
}

// List récupère une liste d'ingrédients avec pagination
func (r *ingredientRepository) List(ctx context.Context, limit, offset int) ([]*dto.Ingredient, int64, error) {
	var ingredients []*dto.Ingredient
	var total int64

	// Compter le total
	if err := r.db.WithContext(ctx).Model(&dto.Ingredient{}).Count(&total).Error; err != nil {
		return nil, 0, ormerrors.NewDatabaseError("count ingredients", err)
	}

	// Récupérer les ingrédients paginés
	if err := r.db.WithContext(ctx).
		Limit(limit).
		Offset(offset).
		Order("name ASC").
		Find(&ingredients).Error; err != nil {
		return nil, 0, ormerrors.NewDatabaseError("list ingredients", err)
	}

	return ingredients, total, nil
}

// SearchByName recherche des ingrédients par nom (pour l'autocomplétion)
func (r *ingredientRepository) SearchByName(ctx context.Context, name string, limit int) ([]*dto.Ingredient, error) {
	var ingredients []*dto.Ingredient
	searchTerm := "%" + strings.ToLower(name) + "%"

	if err := r.db.WithContext(ctx).
		Where("LOWER(name) LIKE ?", searchTerm).
		Limit(limit).
		Order("name ASC").
		Find(&ingredients).Error; err != nil {
		return nil, ormerrors.NewDatabaseError("search ingredients by name", err)
	}

	return ingredients, nil
}
