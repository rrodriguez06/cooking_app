package interfaces

import (
	"context"
	"time"

	"github.com/romainrodriguez/cooking_server/internal/dto"
)

// UserRepository définit les opérations CRUD pour les utilisateurs
type UserRepository interface {
	Create(ctx context.Context, user *dto.User) error
	GetByID(ctx context.Context, id uint) (*dto.User, error)
	GetByEmail(ctx context.Context, email string) (*dto.User, error)
	GetByUsername(ctx context.Context, username string) (*dto.User, error)
	Update(ctx context.Context, user *dto.User) error
	Delete(ctx context.Context, id uint) error
	List(ctx context.Context, limit, offset int) ([]*dto.User, int64, error)
}

// RecipeRepository définit les opérations CRUD pour les recettes
type RecipeRepository interface {
	Create(ctx context.Context, recipe *dto.Recipe) error
	GetByID(ctx context.Context, id uint) (*dto.Recipe, error)
	GetByAuthor(ctx context.Context, authorID uint, limit, offset int) ([]*dto.Recipe, int64, error)
	Update(ctx context.Context, recipe *dto.Recipe) error
	Delete(ctx context.Context, id uint) error
	List(ctx context.Context, limit, offset int) ([]*dto.Recipe, int64, error)
	Search(ctx context.Context, searchReq *dto.SearchQuery) ([]*dto.Recipe, int64, error)
	Copy(ctx context.Context, originalRecipeID, newAuthorID uint) (*dto.Recipe, error)
	GetPublicRecipes(ctx context.Context, limit, offset int) ([]*dto.Recipe, int64, error)
	GetPublicRecipesByRating(ctx context.Context, limit, offset int) ([]*dto.Recipe, int64, error)
	UpdateRecipeRating(ctx context.Context, recipeID uint) error
}

// IngredientRepository définit les opérations CRUD pour les ingrédients
type IngredientRepository interface {
	Create(ctx context.Context, ingredient *dto.Ingredient) error
	GetByID(ctx context.Context, id uint) (*dto.Ingredient, error)
	GetByName(ctx context.Context, name string) (*dto.Ingredient, error)
	Update(ctx context.Context, ingredient *dto.Ingredient) error
	Delete(ctx context.Context, id uint) error
	List(ctx context.Context, limit, offset int) ([]*dto.Ingredient, int64, error)
	SearchByName(ctx context.Context, name string, limit int) ([]*dto.Ingredient, error)
}

// EquipmentRepository définit les opérations CRUD pour les équipements
type EquipmentRepository interface {
	Create(ctx context.Context, equipment *dto.Equipment) error
	GetByID(ctx context.Context, id uint) (*dto.Equipment, error)
	GetByName(ctx context.Context, name string) (*dto.Equipment, error)
	Update(ctx context.Context, equipment *dto.Equipment) error
	Delete(ctx context.Context, id uint) error
	List(ctx context.Context, limit, offset int) ([]*dto.Equipment, int64, error)
	SearchByName(ctx context.Context, name string, limit int) ([]*dto.Equipment, error)
}

// CategoryRepository définit les opérations CRUD pour les catégories
type CategoryRepository interface {
	Create(ctx context.Context, category *dto.Category) error
	GetByID(ctx context.Context, id uint) (*dto.Category, error)
	GetByName(ctx context.Context, name string) (*dto.Category, error)
	Update(ctx context.Context, category *dto.Category) error
	Delete(ctx context.Context, id uint) error
	List(ctx context.Context, limit, offset int) ([]*dto.Category, int64, error)
}

// TagRepository définit les opérations CRUD pour les tags
type TagRepository interface {
	Create(ctx context.Context, tag *dto.Tag) error
	GetByID(ctx context.Context, id uint) (*dto.Tag, error)
	GetByName(ctx context.Context, name string) (*dto.Tag, error)
	Update(ctx context.Context, tag *dto.Tag) error
	Delete(ctx context.Context, id uint) error
	List(ctx context.Context, limit, offset int) ([]*dto.Tag, int64, error)
	GetByIDs(ctx context.Context, ids []uint) ([]*dto.Tag, error)
}

// CommentRepository définit les opérations CRUD pour les commentaires
type CommentRepository interface {
	Create(ctx context.Context, comment *dto.Comment) error
	GetByID(ctx context.Context, id uint) (*dto.Comment, error)
	GetByRecipe(ctx context.Context, recipeID uint, limit, offset int) ([]*dto.Comment, int64, error)
	GetByUser(ctx context.Context, userID uint, limit, offset int) ([]*dto.Comment, int64, error)
	Update(ctx context.Context, comment *dto.Comment) error
	Delete(ctx context.Context, id uint) error
	GetReplies(ctx context.Context, parentID uint) ([]*dto.Comment, error)
}

// RecipeIngredientRepository gère les associations recette-ingrédient
type RecipeIngredientRepository interface {
	Create(ctx context.Context, recipeIngredient *dto.RecipeIngredient) error
	GetByRecipe(ctx context.Context, recipeID uint) ([]*dto.RecipeIngredient, error)
	Update(ctx context.Context, recipeIngredient *dto.RecipeIngredient) error
	Delete(ctx context.Context, recipeID, ingredientID uint) error
	DeleteByRecipe(ctx context.Context, recipeID uint) error
}

// RecipeEquipmentRepository gère les associations recette-équipement
type RecipeEquipmentRepository interface {
	Create(ctx context.Context, recipeEquipment *dto.RecipeEquipment) error
	GetByRecipe(ctx context.Context, recipeID uint) ([]*dto.RecipeEquipment, error)
	Update(ctx context.Context, recipeEquipment *dto.RecipeEquipment) error
	Delete(ctx context.Context, recipeID, equipmentID uint) error
	DeleteByRecipe(ctx context.Context, recipeID uint) error
}

// MealPlanRepository définit les opérations CRUD pour le planning de repas
type MealPlanRepository interface {
	Create(ctx context.Context, mealPlan *dto.MealPlan) error
	GetByID(ctx context.Context, id uint) (*dto.MealPlan, error)
	GetByUser(ctx context.Context, userID uint, limit, offset int) ([]*dto.MealPlan, int64, error)
	GetByUserAndDateRange(ctx context.Context, userID uint, startDate, endDate time.Time) ([]*dto.MealPlan, error)
	GetByUserAndDate(ctx context.Context, userID uint, date time.Time) ([]*dto.MealPlan, error)
	Update(ctx context.Context, mealPlan *dto.MealPlan) error
	Delete(ctx context.Context, id uint) error
	MarkAsCompleted(ctx context.Context, id uint) error
	GetUpcomingMeals(ctx context.Context, userID uint, days int) ([]*dto.MealPlan, error)
	GetWeeklyShoppingList(ctx context.Context, userID uint, startDate, endDate time.Time) (*dto.WeeklyShoppingList, error)
}

// UserFavoriteRecipeRepository définit les opérations pour les recettes favorites
type UserFavoriteRecipeRepository interface {
	AddFavorite(ctx context.Context, userID, recipeID uint) error
	RemoveFavorite(ctx context.Context, userID, recipeID uint) error
	IsFavorite(ctx context.Context, userID, recipeID uint) (bool, error)
	GetUserFavorites(ctx context.Context, userID uint, limit, offset int) ([]*dto.Recipe, int64, error)
	GetFavoriteUsers(ctx context.Context, recipeID uint) ([]*dto.User, error)
}

// RecipeListRepository définit les opérations CRUD pour les listes de recettes personnalisées
type RecipeListRepository interface {
	Create(ctx context.Context, list *dto.RecipeList) error
	GetByID(ctx context.Context, id uint) (*dto.RecipeList, error)
	GetByUser(ctx context.Context, userID uint, limit, offset int) ([]*dto.RecipeList, int64, error)
	Update(ctx context.Context, list *dto.RecipeList) error
	Delete(ctx context.Context, id uint) error
	AddRecipe(ctx context.Context, listID, recipeID uint, notes string, position int) error
	RemoveRecipe(ctx context.Context, listID, recipeID uint) error
	UpdateRecipeInList(ctx context.Context, listID, recipeID uint, notes string, position int) error
	GetListRecipes(ctx context.Context, listID uint, limit, offset int) ([]*dto.Recipe, int64, error)
	ReorderRecipes(ctx context.Context, listID uint, recipePositions map[uint]int) error
	GetPublicLists(ctx context.Context, limit, offset int) ([]*dto.RecipeList, int64, error)
	GetPublicListsByUser(ctx context.Context, userID uint, limit, offset int) ([]*dto.RecipeList, int64, error)
}

// UserFollowRepository définit les opérations pour le système de suivi d'utilisateurs
type UserFollowRepository interface {
	Follow(ctx context.Context, followerID, followingID uint) error
	Unfollow(ctx context.Context, followerID, followingID uint) error
	IsFollowing(ctx context.Context, followerID, followingID uint) (bool, error)
	GetFollowers(ctx context.Context, userID uint, limit, offset int) ([]*dto.User, int64, error)
	GetFollowing(ctx context.Context, userID uint, limit, offset int) ([]*dto.User, int64, error)
	GetFollowersCount(ctx context.Context, userID uint) (int64, error)
	GetFollowingCount(ctx context.Context, userID uint) (int64, error)
	GetFollowingRecipes(ctx context.Context, userID uint, limit, offset int) ([]*dto.Recipe, int64, error)
}
