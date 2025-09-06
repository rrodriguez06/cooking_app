package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/romainrodriguez/cooking_server/internal/api/handlers"
	"github.com/romainrodriguez/cooking_server/internal/services/auth"
	"github.com/romainrodriguez/cooking_server/internal/services/orm"
)

// SetupRoutes configure toutes les routes de l'API
func SetupRoutes(router *gin.Engine, ormService *orm.ORMService, jwtService *auth.JWTService) {
	// Groupe API v1
	api := router.Group("/api/v1")

	// Initialisation des handlers
	userHandler := handlers.NewUserHandler(ormService, jwtService)
	recipeHandler := handlers.NewRecipeHandler(ormService)
	ingredientHandler := handlers.NewIngredientHandler(ormService)
	equipmentHandler := handlers.NewEquipmentHandler(ormService)
	categoryHandler := handlers.NewCategoryHandler(ormService)
	tagHandler := handlers.NewTagHandler(ormService)
	commentHandler := handlers.NewCommentHandler(ormService)
	mealPlanHandler := handlers.NewMealPlanHandler(ormService)
	favoriteHandler := handlers.NewFavoriteHandler(ormService)
	recipeListHandler := handlers.NewRecipeListHandler(ormService)
	feedHandler := handlers.NewFeedHandler(ormService)
	uploadHandler := handlers.NewUploadHandler()

	// Configuration des routes pour chaque entité
	SetupUserRoutes(api, userHandler, jwtService)
	SetupRecipeRoutes(api, recipeHandler, jwtService)
	SetupIngredientRoutes(api, ingredientHandler, jwtService)
	SetupEquipmentRoutes(api, equipmentHandler, jwtService)
	SetupCategoryRoutes(api, categoryHandler, jwtService)
	SetupTagRoutes(api, tagHandler, jwtService)
	SetupCommentRoutes(api, commentHandler, jwtService)
	SetupMealPlanRoutes(api, mealPlanHandler, jwtService)
	SetupFavoriteRoutes(api, favoriteHandler, jwtService)
	SetupRecipeListRoutes(api, recipeListHandler, jwtService)
	SetupFeedRoutes(api, feedHandler, jwtService)
	SetupUploadRoutes(api, uploadHandler, jwtService)
}
