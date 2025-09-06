package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/romainrodriguez/cooking_server/internal/api/handlers"
	"github.com/romainrodriguez/cooking_server/internal/api/middleware"
	"github.com/romainrodriguez/cooking_server/internal/services/auth"
)

// SetupFavoriteRoutes configure les routes pour les favoris
func SetupFavoriteRoutes(router *gin.RouterGroup, handler *handlers.FavoriteHandler, jwtService *auth.JWTService) {
	favorites := router.Group("/favorites")

	// Toutes les routes de favoris nécessitent une authentification
	favorites.Use(middleware.AuthMiddleware(jwtService))
	{
		favorites.GET("", handler.GetUserFavorites)                    // GET /api/favorites
		favorites.POST("/:recipe_id", handler.ToggleFavorite)          // POST /api/favorites/123
		favorites.GET("/:recipe_id/status", handler.GetFavoriteStatus) // GET /api/favorites/123/status
	}
}
