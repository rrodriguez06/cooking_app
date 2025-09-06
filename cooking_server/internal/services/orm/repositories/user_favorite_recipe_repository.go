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

type userFavoriteRecipeRepository struct {
	db *gorm.DB
}

// NewUserFavoriteRecipeRepository crée une nouvelle instance du repository des favoris
func NewUserFavoriteRecipeRepository(db *gorm.DB) *userFavoriteRecipeRepository {
	return &userFavoriteRecipeRepository{db: db}
}

// AddFavorite ajoute une recette aux favoris d'un utilisateur
func (r *userFavoriteRecipeRepository) AddFavorite(ctx context.Context, userID, recipeID uint) error {
	log.Printf("[REPO] AddFavorite called - UserID: %d, RecipeID: %d", userID, recipeID)

	// Vérifier si la recette existe
	var recipe dto.Recipe
	log.Printf("[REPO] Checking if recipe %d exists...", recipeID)
	if err := r.db.WithContext(ctx).First(&recipe, recipeID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			log.Printf("[REPO] Recipe %d not found", recipeID)
			return ormerrors.NewNotFoundError("recipe", recipeID)
		}
		log.Printf("[REPO] Error finding recipe %d: %v", recipeID, err)
		return ormerrors.NewDatabaseError("find recipe", err)
	}
	log.Printf("[REPO] Recipe %d found: %s", recipeID, recipe.Title)

	// Vérifier si l'utilisateur existe
	var user dto.User
	log.Printf("[REPO] Checking if user %d exists...", userID)
	if err := r.db.WithContext(ctx).First(&user, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			log.Printf("[REPO] User %d not found", userID)
			return ormerrors.NewNotFoundError("user", userID)
		}
		log.Printf("[REPO] Error finding user %d: %v", userID, err)
		return ormerrors.NewDatabaseError("find user", err)
	}
	log.Printf("[REPO] User %d found: %s", userID, user.Email)

	// Créer la relation favorite si elle n'existe pas déjà
	favorite := &dto.UserFavoriteRecipe{
		UserID:   userID,
		RecipeID: recipeID,
	}

	log.Printf("[REPO] Creating favorite relation...")
	if err := r.db.WithContext(ctx).Create(favorite).Error; err != nil {
		// Si c'est une violation d'unicité, c'est que le favori existe déjà
		if isDuplicateError(err) {
			log.Printf("[REPO] Duplicate favorite error: %v", err)
			return ormerrors.NewDuplicateError("favorite", "user-recipe combination", fmt.Sprintf("%d-%d", userID, recipeID))
		}
		log.Printf("[REPO] Error creating favorite: %v", err)
		return ormerrors.NewDatabaseError("create favorite", err)
	}

	log.Printf("[REPO] Favorite created successfully")
	return nil
}

// RemoveFavorite supprime une recette des favoris d'un utilisateur
func (r *userFavoriteRecipeRepository) RemoveFavorite(ctx context.Context, userID, recipeID uint) error {
	result := r.db.WithContext(ctx).
		Where("user_id = ? AND recipe_id = ?", userID, recipeID).
		Delete(&dto.UserFavoriteRecipe{})

	if result.Error != nil {
		return ormerrors.NewDatabaseError("remove favorite", result.Error)
	}

	if result.RowsAffected == 0 {
		return ormerrors.NewNotFoundError("favorite", "user-recipe combination")
	}

	return nil
}

// IsFavorite vérifie si une recette est dans les favoris d'un utilisateur
func (r *userFavoriteRecipeRepository) IsFavorite(ctx context.Context, userID, recipeID uint) (bool, error) {
	log.Printf("[REPO] IsFavorite called - UserID: %d, RecipeID: %d", userID, recipeID)

	var count int64
	err := r.db.WithContext(ctx).
		Model(&dto.UserFavoriteRecipe{}).
		Where("user_id = ? AND recipe_id = ?", userID, recipeID).
		Count(&count).Error

	if err != nil {
		log.Printf("[REPO] Error checking favorite status: %v", err)
		return false, ormerrors.NewDatabaseError("check favorite status", err)
	}

	isFavorite := count > 0
	log.Printf("[REPO] IsFavorite result - Count: %d, IsFavorite: %t", count, isFavorite)
	return isFavorite, nil
}

// GetUserFavorites récupère les recettes favorites d'un utilisateur avec pagination
func (r *userFavoriteRecipeRepository) GetUserFavorites(ctx context.Context, userID uint, limit, offset int) ([]*dto.Recipe, int64, error) {
	var recipes []*dto.Recipe
	var total int64

	// Compter le total
	if err := r.db.WithContext(ctx).
		Model(&dto.UserFavoriteRecipe{}).
		Where("user_id = ?", userID).
		Count(&total).Error; err != nil {
		return nil, 0, ormerrors.NewDatabaseError("count user favorites", err)
	}

	// Récupérer les recettes avec pagination
	subQuery := r.db.WithContext(ctx).
		Model(&dto.UserFavoriteRecipe{}).
		Select("recipe_id").
		Where("user_id = ?", userID).
		Order("created_at DESC").
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
		return nil, 0, ormerrors.NewDatabaseError("get user favorites", err)
	}

	return recipes, total, nil
}

// GetFavoriteUsers récupère les utilisateurs qui ont mis une recette en favori
func (r *userFavoriteRecipeRepository) GetFavoriteUsers(ctx context.Context, recipeID uint) ([]*dto.User, error) {
	var users []*dto.User

	subQuery := r.db.WithContext(ctx).
		Model(&dto.UserFavoriteRecipe{}).
		Select("user_id").
		Where("recipe_id = ?", recipeID)

	if err := r.db.WithContext(ctx).
		Where("id IN (?)", subQuery).
		Find(&users).Error; err != nil {
		return nil, ormerrors.NewDatabaseError("get favorite users", err)
	}

	return users, nil
}

// isDuplicateError vérifie si l'erreur est une violation de contrainte d'unicité
func isDuplicateError(err error) bool {
	// Pour PostgreSQL, l'erreur de duplication contient généralement "duplicate key"
	return err != nil && (containsString(err.Error(), "duplicate key") ||
		containsString(err.Error(), "UNIQUE constraint failed") ||
		containsString(err.Error(), "violates unique constraint"))
}

// containsString vérifie si une chaîne contient une sous-chaîne (helper function)
func containsString(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr ||
		(len(s) > len(substr) &&
			(s[:len(substr)] == substr ||
				s[len(s)-len(substr):] == substr ||
				indexString(s, substr) >= 0)))
}

// indexString trouve l'index d'une sous-chaîne (helper function)
func indexString(s, substr string) int {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return i
		}
	}
	return -1
}
