package repositories

import (
	"context"
	"strings"

	"github.com/romainrodriguez/cooking_server/internal/dto"
	ormerrors "github.com/romainrodriguez/cooking_server/internal/services/orm/errors"
	"gorm.io/gorm"
)

type UserFollowRepository struct {
	db *gorm.DB
}

func NewUserFollowRepository(db *gorm.DB) *UserFollowRepository {
	return &UserFollowRepository{db: db}
}

// Follow permet à un utilisateur de suivre un autre utilisateur
func (r *UserFollowRepository) Follow(ctx context.Context, followerID, followingID uint) error {
	if followerID == followingID {
		return ormerrors.ErrInvalidInput
	}

	// Vérifier que les deux utilisateurs existent
	var followerExists, followingExists bool
	if err := r.db.WithContext(ctx).Model(&dto.User{}).
		Select("1").Where("id = ?", followerID).Scan(&followerExists).Error; err != nil {
		return ormerrors.NewDatabaseError("check follower exists", err)
	}
	if !followerExists {
		return ormerrors.ErrRecordNotFound
	}

	if err := r.db.WithContext(ctx).Model(&dto.User{}).
		Select("1").Where("id = ?", followingID).Scan(&followingExists).Error; err != nil {
		return ormerrors.NewDatabaseError("check following exists", err)
	}
	if !followingExists {
		return ormerrors.ErrRecordNotFound
	}

	// Créer la relation de suivi (table d'association simple)
	follow := &dto.UserFollow{
		FollowerID:  followerID,
		FollowingID: followingID,
	}

	if err := r.db.WithContext(ctx).Create(follow).Error; err != nil {
		// Vérifier si c'est un doublon (clé primaire composite)
		if r.db.Dialector.Name() == "postgres" {
			errStr := err.Error()
			if strings.Contains(errStr, "duplicate key value violates unique constraint") ||
				strings.Contains(errStr, "user_follows_pkey") ||
				strings.Contains(errStr, "SQLSTATE 23505") {
				return ormerrors.ErrDuplicateEntry
			}
		}
		return ormerrors.NewDatabaseError("create follow", err)
	}

	return nil
}

// Unfollow permet à un utilisateur d'arrêter de suivre un autre utilisateur
func (r *UserFollowRepository) Unfollow(ctx context.Context, followerID, followingID uint) error {
	result := r.db.WithContext(ctx).
		Where("follower_id = ? AND following_id = ?", followerID, followingID).
		Delete(&dto.UserFollow{})

	if result.Error != nil {
		return ormerrors.NewDatabaseError("unfollow", result.Error)
	}

	if result.RowsAffected == 0 {
		return ormerrors.ErrRecordNotFound
	}

	return nil
}

// IsFollowing vérifie si un utilisateur en suit un autre
func (r *UserFollowRepository) IsFollowing(ctx context.Context, followerID, followingID uint) (bool, error) {
	var count int64
	if err := r.db.WithContext(ctx).Model(&dto.UserFollow{}).
		Where("follower_id = ? AND following_id = ?", followerID, followingID).
		Count(&count).Error; err != nil {
		return false, ormerrors.NewDatabaseError("check is following", err)
	}

	return count > 0, nil
}

// GetFollowers récupère la liste des suiveurs d'un utilisateur
func (r *UserFollowRepository) GetFollowers(ctx context.Context, userID uint, limit, offset int) ([]*dto.User, int64, error) {
	var users []*dto.User
	var total int64

	// Compter le total
	if err := r.db.WithContext(ctx).Model(&dto.UserFollow{}).
		Where("following_id = ?", userID).
		Count(&total).Error; err != nil {
		return nil, 0, ormerrors.NewDatabaseError("count followers", err)
	}

	// Récupérer les utilisateurs
	if err := r.db.WithContext(ctx).
		Table("users").
		Select("users.*").
		Joins("INNER JOIN user_follows ON users.id = user_follows.follower_id").
		Where("user_follows.following_id = ?", userID).
		Limit(limit).
		Offset(offset).
		Find(&users).Error; err != nil {
		return nil, 0, ormerrors.NewDatabaseError("get followers", err)
	}

	return users, total, nil
}

// GetFollowing récupère la liste des utilisateurs suivis par un utilisateur
func (r *UserFollowRepository) GetFollowing(ctx context.Context, userID uint, limit, offset int) ([]*dto.User, int64, error) {
	var users []*dto.User
	var total int64

	// Compter le total
	if err := r.db.WithContext(ctx).Model(&dto.UserFollow{}).
		Where("follower_id = ?", userID).
		Count(&total).Error; err != nil {
		return nil, 0, ormerrors.NewDatabaseError("count following", err)
	}

	// Récupérer les utilisateurs
	if err := r.db.WithContext(ctx).
		Table("users").
		Select("users.*").
		Joins("INNER JOIN user_follows ON users.id = user_follows.following_id").
		Where("user_follows.follower_id = ?", userID).
		Limit(limit).
		Offset(offset).
		Find(&users).Error; err != nil {
		return nil, 0, ormerrors.NewDatabaseError("get following", err)
	}

	return users, total, nil
}

// GetFollowersCount récupère le nombre de suiveurs d'un utilisateur
func (r *UserFollowRepository) GetFollowersCount(ctx context.Context, userID uint) (int64, error) {
	var count int64
	if err := r.db.WithContext(ctx).Model(&dto.UserFollow{}).
		Where("following_id = ?", userID).
		Count(&count).Error; err != nil {
		return 0, ormerrors.NewDatabaseError("count followers", err)
	}

	return count, nil
}

// GetFollowingCount récupère le nombre d'utilisateurs suivis par un utilisateur
func (r *UserFollowRepository) GetFollowingCount(ctx context.Context, userID uint) (int64, error) {
	var count int64
	if err := r.db.WithContext(ctx).Model(&dto.UserFollow{}).
		Where("follower_id = ?", userID).
		Count(&count).Error; err != nil {
		return 0, ormerrors.NewDatabaseError("count following", err)
	}

	return count, nil
}

// GetFollowingRecipes récupère les recettes des utilisateurs suivis
func (r *UserFollowRepository) GetFollowingRecipes(ctx context.Context, userID uint, limit, offset int) ([]*dto.Recipe, int64, error) {
	var recipes []*dto.Recipe
	var total int64

	// Compter le total des recettes des utilisateurs suivis
	if err := r.db.WithContext(ctx).
		Table("recipes").
		Joins("INNER JOIN user_follows ON recipes.author_id = user_follows.following_id").
		Where("user_follows.follower_id = ? AND recipes.is_public = ?", userID, true).
		Count(&total).Error; err != nil {
		return nil, 0, ormerrors.NewDatabaseError("count following recipes", err)
	}

	// Récupérer les recettes avec leurs auteurs
	if err := r.db.WithContext(ctx).
		Preload("Author").
		Preload("Category").
		Preload("Tags").
		Table("recipes").
		Select("recipes.*").
		Joins("INNER JOIN user_follows ON recipes.author_id = user_follows.following_id").
		Where("user_follows.follower_id = ? AND recipes.is_public = ?", userID, true).
		Order("recipes.created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&recipes).Error; err != nil {
		return nil, 0, ormerrors.NewDatabaseError("get following recipes", err)
	}

	return recipes, total, nil
}
