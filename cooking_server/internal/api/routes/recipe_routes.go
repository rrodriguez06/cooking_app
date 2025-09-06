package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/romainrodriguez/cooking_server/internal/api/handlers"
	"github.com/romainrodriguez/cooking_server/internal/api/middleware"
	"github.com/romainrodriguez/cooking_server/internal/services/auth"
)

// SetupRecipeRoutes configure les routes pour les recettes
func SetupRecipeRoutes(router *gin.RouterGroup, handler *handlers.RecipeHandler, jwtService *auth.JWTService) {
	recipes := router.Group("/recipes")
	{
		// Routes publiques (lecture)
		recipes.GET("/:id", handler.GetRecipe)                // GET /api/recipes/1
		recipes.GET("", handler.ListRecipes)                  // GET /api/recipes?page=1&limit=10
		recipes.GET("/search", handler.SearchRecipes)         // GET /api/recipes/search?q=pasta&category=italian
		recipes.GET("/user/:user_id", handler.GetUserRecipes) // GET /api/recipes/user/1

		// Routes protégées (authentification requise pour modification)
		protected := recipes.Group("", middleware.AuthMiddleware(jwtService))
		{
			protected.POST("", handler.CreateRecipe)        // POST /api/recipes
			protected.PUT("/:id", handler.UpdateRecipe)     // PUT /api/recipes/1
			protected.DELETE("/:id", handler.DeleteRecipe)  // DELETE /api/recipes/1
			protected.POST("/:id/copy", handler.CopyRecipe) // POST /api/recipes/1/copy
		}
	}
}
