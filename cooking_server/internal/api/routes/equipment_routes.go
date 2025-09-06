package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/romainrodriguez/cooking_server/internal/api/handlers"
	"github.com/romainrodriguez/cooking_server/internal/services/auth"
)

// SetupEquipmentRoutes configure les routes pour les équipements
func SetupEquipmentRoutes(router *gin.RouterGroup, handler *handlers.EquipmentHandler, jwtService *auth.JWTService) {
	equipment := router.Group("/equipment")
	{
		// Routes publiques (lecture seule)
		equipment.GET("", handler.ListEquipment)          // GET /api/equipment?page=1&limit=50
		equipment.GET("/:id", handler.GetEquipment)       // GET /api/equipment/1
		equipment.GET("/search", handler.SearchEquipment) // GET /api/equipment/search?q=knife&limit=10

		// Routes protégées pour la modification (admin seulement dans le futur)
		// Pour l'instant, on les laisse ouvertes
		equipment.POST("", handler.CreateEquipment)       // POST /api/equipment
		equipment.PUT("/:id", handler.UpdateEquipment)    // PUT /api/equipment/1
		equipment.DELETE("/:id", handler.DeleteEquipment) // DELETE /api/equipment/1
	}
}
