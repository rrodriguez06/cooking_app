package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/romainrodriguez/cooking_server/internal/api/handlers"
	"github.com/romainrodriguez/cooking_server/internal/services/auth"
)

// SetupCategoryRoutes configure les routes pour les catégories
func SetupCategoryRoutes(router *gin.RouterGroup, handler *handlers.CategoryHandler, jwtService *auth.JWTService) {
	categories := router.Group("/categories")
	{
		// Routes publiques (lecture seule)
		categories.GET("", handler.ListCategories)  // GET /api/categories
		categories.GET("/:id", handler.GetCategory) // GET /api/categories/1

		// Routes protégées pour la modification (admin seulement dans le futur)
		// Pour l'instant, on les laisse ouvertes
		categories.POST("", handler.CreateCategory)       // POST /api/categories
		categories.PUT("/:id", handler.UpdateCategory)    // PUT /api/categories/1
		categories.DELETE("/:id", handler.DeleteCategory) // DELETE /api/categories/1
	}
}
