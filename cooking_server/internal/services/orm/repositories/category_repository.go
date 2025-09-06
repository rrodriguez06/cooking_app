package repositories

import (
	"context"
	"errors"

	"github.com/romainrodriguez/cooking_server/internal/dto"
	ormerrors "github.com/romainrodriguez/cooking_server/internal/services/orm/errors"
	"gorm.io/gorm"
)

type categoryRepository struct {
	db *gorm.DB
}

// NewCategoryRepository crée une nouvelle instance du repository catégorie
func NewCategoryRepository(db *gorm.DB) *categoryRepository {
	return &categoryRepository{db: db}
}

// Create crée une nouvelle catégorie
func (r *categoryRepository) Create(ctx context.Context, category *dto.Category) error {
	if err := r.db.WithContext(ctx).Create(category).Error; err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			return ormerrors.NewDuplicateError("category", "name", category.Name)
		}
		return ormerrors.NewDatabaseError("create category", err)
	}
	return nil
}

// GetByID récupère une catégorie par son ID
func (r *categoryRepository) GetByID(ctx context.Context, id uint) (*dto.Category, error) {
	var category dto.Category
	if err := r.db.WithContext(ctx).First(&category, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ormerrors.NewNotFoundError("category", id)
		}
		return nil, ormerrors.NewDatabaseError("get category by id", err)
	}
	return &category, nil
}

// GetByName récupère une catégorie par son nom
func (r *categoryRepository) GetByName(ctx context.Context, name string) (*dto.Category, error) {
	var category dto.Category
	if err := r.db.WithContext(ctx).Where("LOWER(name) = LOWER(?)", name).First(&category).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ormerrors.NewNotFoundError("category", name)
		}
		return nil, ormerrors.NewDatabaseError("get category by name", err)
	}
	return &category, nil
}

// Update met à jour une catégorie
func (r *categoryRepository) Update(ctx context.Context, category *dto.Category) error {
	if err := r.db.WithContext(ctx).Save(category).Error; err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			return ormerrors.NewDuplicateError("category", "name", category.Name)
		}
		return ormerrors.NewDatabaseError("update category", err)
	}
	return nil
}

// Delete supprime une catégorie
func (r *categoryRepository) Delete(ctx context.Context, id uint) error {
	result := r.db.WithContext(ctx).Delete(&dto.Category{}, id)
	if result.Error != nil {
		return ormerrors.NewDatabaseError("delete category", result.Error)
	}
	if result.RowsAffected == 0 {
		return ormerrors.NewNotFoundError("category", id)
	}
	return nil
}

// List récupère une liste de catégories avec pagination
func (r *categoryRepository) List(ctx context.Context, limit, offset int) ([]*dto.Category, int64, error) {
	var categories []*dto.Category
	var total int64

	// Compter le total
	if err := r.db.WithContext(ctx).Model(&dto.Category{}).Count(&total).Error; err != nil {
		return nil, 0, ormerrors.NewDatabaseError("count categories", err)
	}

	// Récupérer les catégories paginées
	if err := r.db.WithContext(ctx).
		Limit(limit).
		Offset(offset).
		Order("name ASC").
		Find(&categories).Error; err != nil {
		return nil, 0, ormerrors.NewDatabaseError("list categories", err)
	}

	return categories, total, nil
}
