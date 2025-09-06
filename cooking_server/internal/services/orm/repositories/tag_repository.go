package repositories

import (
	"context"
	"errors"

	"github.com/romainrodriguez/cooking_server/internal/dto"
	ormerrors "github.com/romainrodriguez/cooking_server/internal/services/orm/errors"
	"gorm.io/gorm"
)

type tagRepository struct {
	db *gorm.DB
}

// NewTagRepository crée une nouvelle instance du repository tag
func NewTagRepository(db *gorm.DB) *tagRepository {
	return &tagRepository{db: db}
}

// Create crée un nouveau tag
func (r *tagRepository) Create(ctx context.Context, tag *dto.Tag) error {
	if err := r.db.WithContext(ctx).Create(tag).Error; err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			return ormerrors.NewDuplicateError("tag", "name", tag.Name)
		}
		return ormerrors.NewDatabaseError("create tag", err)
	}
	return nil
}

// GetByID récupère un tag par son ID
func (r *tagRepository) GetByID(ctx context.Context, id uint) (*dto.Tag, error) {
	var tag dto.Tag
	if err := r.db.WithContext(ctx).First(&tag, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ormerrors.NewNotFoundError("tag", id)
		}
		return nil, ormerrors.NewDatabaseError("get tag by id", err)
	}
	return &tag, nil
}

// GetByName récupère un tag par son nom
func (r *tagRepository) GetByName(ctx context.Context, name string) (*dto.Tag, error) {
	var tag dto.Tag
	if err := r.db.WithContext(ctx).Where("LOWER(name) = LOWER(?)", name).First(&tag).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ormerrors.NewNotFoundError("tag", name)
		}
		return nil, ormerrors.NewDatabaseError("get tag by name", err)
	}
	return &tag, nil
}

// Update met à jour un tag
func (r *tagRepository) Update(ctx context.Context, tag *dto.Tag) error {
	if err := r.db.WithContext(ctx).Save(tag).Error; err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			return ormerrors.NewDuplicateError("tag", "name", tag.Name)
		}
		return ormerrors.NewDatabaseError("update tag", err)
	}
	return nil
}

// Delete supprime un tag
func (r *tagRepository) Delete(ctx context.Context, id uint) error {
	result := r.db.WithContext(ctx).Delete(&dto.Tag{}, id)
	if result.Error != nil {
		return ormerrors.NewDatabaseError("delete tag", result.Error)
	}
	if result.RowsAffected == 0 {
		return ormerrors.NewNotFoundError("tag", id)
	}
	return nil
}

// List récupère une liste de tags avec pagination
func (r *tagRepository) List(ctx context.Context, limit, offset int) ([]*dto.Tag, int64, error) {
	var tags []*dto.Tag
	var total int64

	// Compter le total
	if err := r.db.WithContext(ctx).Model(&dto.Tag{}).Count(&total).Error; err != nil {
		return nil, 0, ormerrors.NewDatabaseError("count tags", err)
	}

	// Récupérer les tags paginés
	if err := r.db.WithContext(ctx).
		Limit(limit).
		Offset(offset).
		Order("name ASC").
		Find(&tags).Error; err != nil {
		return nil, 0, ormerrors.NewDatabaseError("list tags", err)
	}

	return tags, total, nil
}

// GetByIDs récupère plusieurs tags par leurs IDs
func (r *tagRepository) GetByIDs(ctx context.Context, ids []uint) ([]*dto.Tag, error) {
	var tags []*dto.Tag

	if err := r.db.WithContext(ctx).
		Where("id IN ?", ids).
		Find(&tags).Error; err != nil {
		return nil, ormerrors.NewDatabaseError("get tags by ids", err)
	}

	return tags, nil
}
