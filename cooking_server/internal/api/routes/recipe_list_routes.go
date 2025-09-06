package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/romainrodriguez/cooking_server/internal/api/handlers"
	"github.com/romainrodriguez/cooking_server/internal/api/middleware"
	"github.com/romainrodriguez/cooking_server/internal/services/auth"
)

// SetupRecipeListRoutes configure les routes pour les listes de recettes
func SetupRecipeListRoutes(router *gin.RouterGroup, handler *handlers.RecipeListHandler, jwtService *auth.JWTService) {
	recipeLists := router.Group("/recipe-lists")

	// Routes publiques pour consulter les listes publiques (pourront être ajoutées plus tard)
	// recipeLists.GET("/public", handler.GetPublicRecipeLists)

	// Routes protégées (authentification requise)
	protected := recipeLists.Group("", middleware.AuthMiddleware(jwtService))
	{
		// CRUD des listes
		protected.POST("", handler.CreateRecipeList)       // POST /api/recipe-lists
		protected.GET("", handler.GetUserRecipeLists)      // GET /api/recipe-lists
		protected.GET("/:id", handler.GetRecipeList)       // GET /api/recipe-lists/123
		protected.PUT("/:id", handler.UpdateRecipeList)    // PUT /api/recipe-lists/123
		protected.DELETE("/:id", handler.DeleteRecipeList) // DELETE /api/recipe-lists/123

		// Gestion des recettes dans les listes
		protected.POST("/:id/recipes", handler.AddRecipeToList)                   // POST /api/recipe-lists/123/recipes
		protected.DELETE("/:id/recipes/:recipe_id", handler.RemoveRecipeFromList) // DELETE /api/recipe-lists/123/recipes/456
	}
}
