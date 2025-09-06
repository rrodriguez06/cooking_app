package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/romainrodriguez/cooking_server/internal/api/handlers"
	"github.com/romainrodriguez/cooking_server/internal/services/auth"
)

// SetupIngredientRoutes configure les routes pour les ingrédients
func SetupIngredientRoutes(router *gin.RouterGroup, handler *handlers.IngredientHandler, jwtService *auth.JWTService) {
	ingredients := router.Group("/ingredients")
	{
		// Routes publiques (lecture seule)
		ingredients.GET("", handler.ListIngredients)          // GET /api/ingredients?page=1&limit=50
		ingredients.GET("/:id", handler.GetIngredient)        // GET /api/ingredients/1
		ingredients.GET("/search", handler.SearchIngredients) // GET /api/ingredients/search?q=tomato&limit=10

		// Routes protégées pour la modification (admin seulement dans le futur)
		// Pour l'instant, on les laisse ouvertes
		ingredients.POST("", handler.CreateIngredient)       // POST /api/ingredients
		ingredients.PUT("/:id", handler.UpdateIngredient)    // PUT /api/ingredients/1
		ingredients.DELETE("/:id", handler.DeleteIngredient) // DELETE /api/ingredients/1
	}
}
