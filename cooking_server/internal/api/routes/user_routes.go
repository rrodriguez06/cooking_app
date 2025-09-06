package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/romainrodriguez/cooking_server/internal/api/handlers"
	"github.com/romainrodriguez/cooking_server/internal/api/middleware"
	"github.com/romainrodriguez/cooking_server/internal/services/auth"
)

// SetupUserRoutes configure les routes pour les utilisateurs
func SetupUserRoutes(router *gin.RouterGroup, handler *handlers.UserHandler, jwtService *auth.JWTService) {
	users := router.Group("/users")
	{
		// Routes publiques (pas d'authentification requise)
		users.POST("", handler.CreateUser)                   // POST /api/users (inscription)
		users.POST("/login", handler.LoginUser)              // POST /api/users/login (connexion)
		users.POST("/reset-password", handler.ResetPassword) // POST /api/users/reset-password (réinitialisation du mot de passe)

		// Routes protégées (authentification requise)
		protected := users.Group("", middleware.AuthMiddleware(jwtService))
		{
			protected.GET("/me", handler.GetCurrentUser)          // GET /api/users/me (utilisateur actuel)
			protected.GET("/:id", handler.GetUser)                // GET /api/users/1
			protected.GET("/:id/profile", handler.GetUserProfile) // GET /api/users/1/profile (profil public)
			protected.PUT("/:id", handler.UpdateUser)             // PUT /api/users/1
			protected.DELETE("/:id", handler.DeleteUser)          // DELETE /api/users/1
			protected.GET("", handler.ListUsers)                  // GET /api/users?page=1&limit=10

			// Routes pour le système de suivi
			protected.POST("/:id/follow", handler.FollowUser)     // POST /api/users/1/follow
			protected.DELETE("/:id/follow", handler.UnfollowUser) // DELETE /api/users/1/follow
			protected.GET("/:id/followers", handler.GetFollowers) // GET /api/users/1/followers
			protected.GET("/:id/following", handler.GetFollowing) // GET /api/users/1/following
		}
	}
}
