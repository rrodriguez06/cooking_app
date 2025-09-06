package repositories

import (
	"context"
	"errors"

	"github.com/romainrodriguez/cooking_server/internal/dto"
	ormerrors "github.com/romainrodriguez/cooking_server/internal/services/orm/errors"
	"gorm.io/gorm"
)

type commentRepository struct {
	db *gorm.DB
}

// NewCommentRepository crée une nouvelle instance du repository commentaire
func NewCommentRepository(db *gorm.DB) *commentRepository {
	return &commentRepository{db: db}
}

// Create crée un nouveau commentaire
func (r *commentRepository) Create(ctx context.Context, comment *dto.Comment) error {
	if err := r.db.WithContext(ctx).Create(comment).Error; err != nil {
		return ormerrors.NewDatabaseError("create comment", err)
	}
	return nil
}

// GetByID récupère un commentaire par son ID
func (r *commentRepository) GetByID(ctx context.Context, id uint) (*dto.Comment, error) {
	var comment dto.Comment
	if err := r.db.WithContext(ctx).
		Preload("User").
		Preload("Recipe").
		Preload("Parent").
		Preload("Replies.User").
		First(&comment, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ormerrors.NewNotFoundError("comment", id)
		}
		return nil, ormerrors.NewDatabaseError("get comment by id", err)
	}
	return &comment, nil
}

// GetByRecipe récupère les commentaires d'une recette avec pagination
func (r *commentRepository) GetByRecipe(ctx context.Context, recipeID uint, limit, offset int) ([]*dto.Comment, int64, error) {
	var comments []*dto.Comment
	var total int64

	// Compter le total (seulement les commentaires de premier niveau)
	if err := r.db.WithContext(ctx).
		Model(&dto.Comment{}).
		Where("recipe_id = ? AND parent_id IS NULL", recipeID).
		Count(&total).Error; err != nil {
		return nil, 0, ormerrors.NewDatabaseError("count comments by recipe", err)
	}

	// Récupérer les commentaires paginés avec leurs réponses
	if err := r.db.WithContext(ctx).
		Preload("User").
		Preload("Replies.User").
		Where("recipe_id = ? AND parent_id IS NULL", recipeID).
		Limit(limit).
		Offset(offset).
		Order("created_at DESC").
		Find(&comments).Error; err != nil {
		return nil, 0, ormerrors.NewDatabaseError("list comments by recipe", err)
	}

	return comments, total, nil
}

// GetByUser récupère les commentaires d'un utilisateur avec pagination
func (r *commentRepository) GetByUser(ctx context.Context, userID uint, limit, offset int) ([]*dto.Comment, int64, error) {
	var comments []*dto.Comment
	var total int64

	// Compter le total
	if err := r.db.WithContext(ctx).
		Model(&dto.Comment{}).
		Where("user_id = ?", userID).
		Count(&total).Error; err != nil {
		return nil, 0, ormerrors.NewDatabaseError("count comments by user", err)
	}

	// Récupérer les commentaires paginés
	if err := r.db.WithContext(ctx).
		Preload("Recipe").
		Preload("Parent").
		Where("user_id = ?", userID).
		Limit(limit).
		Offset(offset).
		Order("created_at DESC").
		Find(&comments).Error; err != nil {
		return nil, 0, ormerrors.NewDatabaseError("list comments by user", err)
	}

	return comments, total, nil
}

// Update met à jour un commentaire
func (r *commentRepository) Update(ctx context.Context, comment *dto.Comment) error {
	if err := r.db.WithContext(ctx).Save(comment).Error; err != nil {
		return ormerrors.NewDatabaseError("update comment", err)
	}
	return nil
}

// Delete supprime un commentaire
func (r *commentRepository) Delete(ctx context.Context, id uint) error {
	result := r.db.WithContext(ctx).Delete(&dto.Comment{}, id)
	if result.Error != nil {
		return ormerrors.NewDatabaseError("delete comment", result.Error)
	}
	if result.RowsAffected == 0 {
		return ormerrors.NewNotFoundError("comment", id)
	}
	return nil
}

// GetReplies récupère les réponses à un commentaire
func (r *commentRepository) GetReplies(ctx context.Context, parentID uint) ([]*dto.Comment, error) {
	var replies []*dto.Comment

	if err := r.db.WithContext(ctx).
		Preload("User").
		Where("parent_id = ?", parentID).
		Order("created_at ASC").
		Find(&replies).Error; err != nil {
		return nil, ormerrors.NewDatabaseError("get comment replies", err)
	}

	return replies, nil
}
