package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/romainrodriguez/cooking_server/internal/api/handlers"
	"github.com/romainrodriguez/cooking_server/internal/api/middleware"
	"github.com/romainrodriguez/cooking_server/internal/services/auth"
)

// SetupMealPlanRoutes configure les routes pour le planning de repas
func SetupMealPlanRoutes(router *gin.RouterGroup, handler *handlers.MealPlanHandler, jwtService *auth.JWTService) {
	mealPlans := router.Group("/meal-plans")
	{
		// Toutes les routes de planning nécessitent une authentification
		mealPlans.Use(middleware.AuthMiddleware(jwtService))
		{
			// Routes CRUD de base
			mealPlans.POST("", handler.CreateMealPlan)       // POST /api/meal-plans
			mealPlans.GET("/:id", handler.GetMealPlan)       // GET /api/meal-plans/1
			mealPlans.PUT("/:id", handler.UpdateMealPlan)    // PUT /api/meal-plans/1
			mealPlans.DELETE("/:id", handler.DeleteMealPlan) // DELETE /api/meal-plans/1
			mealPlans.GET("", handler.GetUserMealPlans)      // GET /api/meal-plans?page=1&limit=10

			// Routes spécialisées pour le planning
			mealPlans.GET("/weekly", handler.GetWeeklyMealPlan)            // GET /api/meal-plans/weekly?date=2024-01-01
			mealPlans.GET("/daily", handler.GetDailyMealPlan)              // GET /api/meal-plans/daily?date=2024-01-01
			mealPlans.GET("/upcoming", handler.GetUpcomingMeals)           // GET /api/meal-plans/upcoming?days=7
			mealPlans.GET("/shopping-list", handler.GetWeeklyShoppingList) // GET /api/meal-plans/shopping-list?start_date=2024-01-01&end_date=2024-01-07

			// Action de completion
			mealPlans.PATCH("/:id/complete", handler.MarkMealAsCompleted) // PATCH /api/meal-plans/1/complete
		}
	}
}
