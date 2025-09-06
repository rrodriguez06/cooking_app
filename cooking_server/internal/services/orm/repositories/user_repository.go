package repositories

import (
	"context"
	"errors"

	"github.com/romainrodriguez/cooking_server/internal/dto"
	ormerrors "github.com/romainrodriguez/cooking_server/internal/services/orm/errors"
	"gorm.io/gorm"
)

type userRepository struct {
	db *gorm.DB
}

// NewUserRepository crée une nouvelle instance du repository utilisateur
func NewUserRepository(db *gorm.DB) *userRepository {
	return &userRepository{db: db}
}

// Create crée un nouvel utilisateur
func (r *userRepository) Create(ctx context.Context, user *dto.User) error {
	if err := r.db.WithContext(ctx).Create(user).Error; err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			return ormerrors.NewDuplicateError("user", "email/username", user.Email)
		}
		return ormerrors.NewDatabaseError("create user", err)
	}
	return nil
}

// GetByID récupère un utilisateur par son ID
func (r *userRepository) GetByID(ctx context.Context, id uint) (*dto.User, error) {
	var user dto.User
	if err := r.db.WithContext(ctx).First(&user, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ormerrors.NewNotFoundError("user", id)
		}
		return nil, ormerrors.NewDatabaseError("get user by id", err)
	}
	return &user, nil
}

// GetByEmail récupère un utilisateur par son email
func (r *userRepository) GetByEmail(ctx context.Context, email string) (*dto.User, error) {
	var user dto.User
	if err := r.db.WithContext(ctx).Where("email = ?", email).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ormerrors.NewNotFoundError("user", email)
		}
		return nil, ormerrors.NewDatabaseError("get user by email", err)
	}
	return &user, nil
}

// GetByUsername récupère un utilisateur par son nom d'utilisateur
func (r *userRepository) GetByUsername(ctx context.Context, username string) (*dto.User, error) {
	var user dto.User
	if err := r.db.WithContext(ctx).Where("username = ?", username).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ormerrors.NewNotFoundError("user", username)
		}
		return nil, ormerrors.NewDatabaseError("get user by username", err)
	}
	return &user, nil
}

// Update met à jour un utilisateur
func (r *userRepository) Update(ctx context.Context, user *dto.User) error {
	if err := r.db.WithContext(ctx).Save(user).Error; err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			return ormerrors.NewDuplicateError("user", "email/username", user.Email)
		}
		return ormerrors.NewDatabaseError("update user", err)
	}
	return nil
}

// Delete supprime un utilisateur
func (r *userRepository) Delete(ctx context.Context, id uint) error {
	result := r.db.WithContext(ctx).Delete(&dto.User{}, id)
	if result.Error != nil {
		return ormerrors.NewDatabaseError("delete user", result.Error)
	}
	if result.RowsAffected == 0 {
		return ormerrors.NewNotFoundError("user", id)
	}
	return nil
}

// List récupère une liste d'utilisateurs avec pagination
func (r *userRepository) List(ctx context.Context, limit, offset int) ([]*dto.User, int64, error) {
	var users []*dto.User
	var total int64

	// Compter le total
	if err := r.db.WithContext(ctx).Model(&dto.User{}).Count(&total).Error; err != nil {
		return nil, 0, ormerrors.NewDatabaseError("count users", err)
	}

	// Récupérer les utilisateurs paginés
	if err := r.db.WithContext(ctx).
		Limit(limit).
		Offset(offset).
		Order("created_at DESC").
		Find(&users).Error; err != nil {
		return nil, 0, ormerrors.NewDatabaseError("list users", err)
	}

	return users, total, nil
}
