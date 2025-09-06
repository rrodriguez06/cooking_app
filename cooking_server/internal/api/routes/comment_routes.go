package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/romainrodriguez/cooking_server/internal/api/handlers"
	"github.com/romainrodriguez/cooking_server/internal/api/middleware"
	"github.com/romainrodriguez/cooking_server/internal/services/auth"
)

// SetupCommentRoutes configure les routes pour les commentaires
func SetupCommentRoutes(router *gin.RouterGroup, handler *handlers.CommentHandler, jwtService *auth.JWTService) {
	comments := router.Group("/comments")
	{
		// Routes publiques (lecture seule)
		comments.GET("/:id", handler.GetComment)                        // GET /api/comments/1
		comments.GET("/:id/replies", handler.GetCommentReplies)         // GET /api/comments/1/replies
		comments.GET("/recipe/:recipe_id", handler.GetCommentsByRecipe) // GET /api/comments/recipe/1

		// Routes protégées (authentification requise pour commenter)
		protected := comments.Group("", middleware.AuthMiddleware(jwtService))
		{
			protected.POST("", handler.CreateComment)       // POST /api/comments
			protected.PUT("/:id", handler.UpdateComment)    // PUT /api/comments/1
			protected.DELETE("/:id", handler.DeleteComment) // DELETE /api/comments/1
		}
	}
}
