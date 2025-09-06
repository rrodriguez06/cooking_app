package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/romainrodriguez/cooking_server/internal/api/handlers"
	"github.com/romainrodriguez/cooking_server/internal/services/auth"
)

// SetupTagRoutes configure les routes pour les tags
func SetupTagRoutes(router *gin.RouterGroup, handler *handlers.TagHandler, jwtService *auth.JWTService) {
	tags := router.Group("/tags")
	{
		// Routes publiques (lecture seule)
		tags.GET("", handler.ListTags)   // GET /api/tags
		tags.GET("/:id", handler.GetTag) // GET /api/tags/1

		// Routes protégées pour la modification (admin seulement dans le futur)
		// Pour l'instant, on les laisse ouvertes
		tags.POST("", handler.CreateTag)       // POST /api/tags
		tags.PUT("/:id", handler.UpdateTag)    // PUT /api/tags/1
		tags.DELETE("/:id", handler.DeleteTag) // DELETE /api/tags/1
	}
}
