package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/romainrodriguez/cooking_server/internal/api/handlers"
	"github.com/romainrodriguez/cooking_server/internal/api/middleware"
	"github.com/romainrodriguez/cooking_server/internal/services/auth"
)

// SetupFridgeRoutes configure les routes pour le système de frigo
func SetupFridgeRoutes(router *gin.RouterGroup, handler *handlers.FridgeHandler, jwtService *auth.JWTService) {
	fridge := router.Group("/fridge")

	// Toutes les routes de frigo nécessitent une authentification
	fridge.Use(middleware.AuthMiddleware(jwtService))
	{
		fridge.GET("", handler.GetFridgeItems)                // GET /api/v1/fridge
		fridge.POST("", handler.CreateFridgeItem)             // POST /api/v1/fridge
		fridge.PUT("/:id", handler.UpdateFridgeItem)          // PUT /api/v1/fridge/123
		fridge.DELETE("/:id", handler.DeleteFridgeItem)       // DELETE /api/v1/fridge/123
		fridge.GET("/stats", handler.GetFridgeStats)          // GET /api/v1/fridge/stats
		fridge.DELETE("/clear", handler.ClearFridge)          // DELETE /api/v1/fridge/clear
		fridge.DELETE("/expired", handler.RemoveExpiredItems) // DELETE /api/v1/fridge/expired

		// TODO: Implémenter les suggestions de recettes basées sur le frigo
		// fridge.GET("/suggestions", handler.GetRecipeSuggestions) // GET /api/v1/fridge/suggestions
	}
}
