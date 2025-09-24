package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/romainrodriguez/cooking_server/internal/api/handlers"
	"github.com/romainrodriguez/cooking_server/internal/api/middleware"
	"github.com/romainrodriguez/cooking_server/internal/services/auth"
)

// SetupRecipeExtractionRoutes configure les routes pour l'extraction de recettes
func SetupRecipeExtractionRoutes(router *gin.RouterGroup, h *handlers.Handlers, jwtService *auth.JWTService) {
	extraction := router.Group("/recipes")
	{
		// Route d'extraction de recette (nécessite une authentification)
		extraction.POST("/extract-from-image", middleware.AuthMiddleware(jwtService), h.RecipeExtractionHandler.ExtractFromImage)

		// Route de vérification de santé (publique)
		extraction.GET("/extraction/health", h.RecipeExtractionHandler.HealthCheck)
	}
}
