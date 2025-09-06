package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/romainrodriguez/cooking_server/internal/api/handlers"
	"github.com/romainrodriguez/cooking_server/internal/api/middleware"
	"github.com/romainrodriguez/cooking_server/internal/services/auth"
)

// SetupFeedRoutes configure les routes pour le feed personnalisé
func SetupFeedRoutes(router *gin.RouterGroup, handler *handlers.FeedHandler, jwtService *auth.JWTService) {
	feed := router.Group("/feed")
	{
		// Routes protégées (authentification requise)
		protected := feed.Group("", middleware.AuthMiddleware(jwtService))
		{
			protected.GET("/following", handler.GetFollowingFeed)                // GET /api/feed/following
			protected.GET("/following/grouped", handler.GetFollowingFeedGrouped) // GET /api/feed/following/grouped
		}
	}
}
