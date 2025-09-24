package handlers

import (
	"github.com/romainrodriguez/cooking_server/internal/services/auth"
	"github.com/romainrodriguez/cooking_server/internal/services/orm"
)

// Handlers contient tous les handlers de l'API
type Handlers struct {
	UserHandler             *UserHandler
	RecipeHandler           *RecipeHandler
	IngredientHandler       *IngredientHandler
	EquipmentHandler        *EquipmentHandler
	CategoryHandler         *CategoryHandler
	TagHandler              *TagHandler
	CommentHandler          *CommentHandler
	FavoriteHandler         *FavoriteHandler
	RecipeListHandler       *RecipeListHandler
	RecipeExtractionHandler *RecipeExtractionHandler
}

// NewHandlers crée une nouvelle instance des handlers avec le service ORM et JWT
func NewHandlers(ormService *orm.ORMService, jwtService *auth.JWTService) *Handlers {
	return &Handlers{
		UserHandler:             NewUserHandler(ormService, jwtService),
		RecipeHandler:           NewRecipeHandler(ormService),
		IngredientHandler:       NewIngredientHandler(ormService),
		EquipmentHandler:        NewEquipmentHandler(ormService),
		CategoryHandler:         NewCategoryHandler(ormService),
		TagHandler:              NewTagHandler(ormService),
		CommentHandler:          NewCommentHandler(ormService),
		FavoriteHandler:         NewFavoriteHandler(ormService),
		RecipeListHandler:       NewRecipeListHandler(ormService),
		RecipeExtractionHandler: NewRecipeExtractionHandler(),
	}
}
