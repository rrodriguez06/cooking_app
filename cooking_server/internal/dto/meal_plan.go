package dto

import "time"

// MealPlan représente une recette planifiée dans le calendrier d'un utilisateur
type MealPlan struct {
	ID          uint       `json:"id" gorm:"primaryKey"`
	UserID      uint       `json:"user_id" gorm:"not null"`                                                                                      // ID de l'utilisateur qui planifie
	RecipeID    uint       `json:"recipe_id" gorm:"not null"`                                                                                    // ID de la recette planifiée
	PlannedDate time.Time  `json:"planned_date" gorm:"not null"`                                                                                 // Date prévue pour la recette
	MealType    string     `json:"meal_type" gorm:"type:varchar(20);default:'dinner';check:meal_type IN ('breakfast','lunch','dinner','snack')"` // Type de repas
	Servings    int        `json:"servings" gorm:"default:1"`                                                                                    // Nombre de portions prévues
	Notes       string     `json:"notes,omitempty"`                                                                                              // Notes personnelles pour ce planning
	IsCompleted bool       `json:"is_completed" gorm:"default:false"`                                                                            // Indique si le repas a été préparé
	CompletedAt *time.Time `json:"completed_at,omitempty"`                                                                                       // Date de réalisation du repas

	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`

	// Relations
	User   User   `json:"user" gorm:"foreignKey:UserID"`
	Recipe Recipe `json:"recipe" gorm:"foreignKey:RecipeID"`
}

// MealPlanCreateRequest représente les données pour créer un planning de repas
type MealPlanCreateRequest struct {
	RecipeID    uint      `json:"recipe_id" binding:"required"`
	PlannedDate time.Time `json:"planned_date" binding:"required"`
	MealType    string    `json:"meal_type" binding:"required,oneof=breakfast lunch dinner snack"`
	Servings    int       `json:"servings" binding:"min=1"`
	Notes       string    `json:"notes,omitempty" binding:"max=500"`
}

// MealPlanUpdateRequest représente les données pour mettre à jour un planning de repas
type MealPlanUpdateRequest struct {
	RecipeID    uint      `json:"recipe_id,omitempty"`
	PlannedDate time.Time `json:"planned_date,omitempty"`
	MealType    string    `json:"meal_type,omitempty" binding:"omitempty,oneof=breakfast lunch dinner snack"`
	Servings    int       `json:"servings,omitempty" binding:"omitempty,min=1"`
	Notes       string    `json:"notes,omitempty" binding:"omitempty,max=500"`
	IsCompleted bool      `json:"is_completed,omitempty"`
}

// MealPlanResponse représente la réponse pour un planning de repas
type MealPlanResponse struct {
	ID          uint       `json:"id"`
	RecipeID    uint       `json:"recipe_id"`
	PlannedDate time.Time  `json:"planned_date"`
	MealType    string     `json:"meal_type"`
	Servings    int        `json:"servings"`
	Notes       string     `json:"notes,omitempty"`
	IsCompleted bool       `json:"is_completed"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	Recipe      Recipe     `json:"recipe"`
}

// WeeklyMealPlan représente le planning d'une semaine
type WeeklyMealPlan struct {
	StartDate time.Time             `json:"start_date"`
	EndDate   time.Time             `json:"end_date"`
	MealPlans map[string][]MealPlan `json:"meal_plans"` // Clé: date au format "2006-01-02"
}

// DailyMealPlan représente le planning d'une journée
type DailyMealPlan struct {
	Date      time.Time  `json:"date"`
	Breakfast []MealPlan `json:"breakfast"`
	Lunch     []MealPlan `json:"lunch"`
	Dinner    []MealPlan `json:"dinner"`
	Snack     []MealPlan `json:"snack"`
}

// MealPlanSingleResponse représente la réponse pour un planning de repas
type MealPlanSingleResponse struct {
	Success bool     `json:"success"`
	Message string   `json:"message,omitempty"`
	Data    MealPlan `json:"data"`
}

// MealPlanListResponse représente la réponse pour une liste de plannings
type MealPlanListResponse struct {
	Success bool `json:"success"`
	Data    struct {
		MealPlans   []MealPlan `json:"meal_plans"`
		TotalCount  int64      `json:"total_count"`
		CurrentPage int        `json:"current_page"`
		TotalPages  int        `json:"total_pages"`
		HasNext     bool       `json:"has_next"`
		HasPrev     bool       `json:"has_prev"`
	} `json:"data"`
}

// WeeklyMealPlanResponse représente la réponse pour le planning hebdomadaire
type WeeklyMealPlanResponse struct {
	Success bool           `json:"success"`
	Data    WeeklyMealPlan `json:"data"`
}

// DailyMealPlanResponse représente la réponse pour le planning quotidien
type DailyMealPlanResponse struct {
	Success bool          `json:"success"`
	Data    DailyMealPlan `json:"data"`
}

// UpcomingMealsResponse représente la réponse pour les prochains repas
type UpcomingMealsResponse struct {
	Success bool `json:"success"`
	Data    struct {
		UpcomingMeals []MealPlan `json:"upcoming_meals"`
		DaysAhead     int        `json:"days_ahead"`
		TotalCount    int        `json:"total_count"`
	} `json:"data"`
}

// ShoppingListItem représente un ingrédient dans la liste de courses
type ShoppingListItem struct {
	IngredientID   uint    `json:"ingredient_id"`
	IngredientName string  `json:"ingredient_name"`
	TotalQuantity  float64 `json:"total_quantity"`
	Unit           string  `json:"unit"`
	Recipes        []struct {
		RecipeID   uint    `json:"recipe_id"`
		RecipeName string  `json:"recipe_name"`
		Quantity   float64 `json:"quantity"`
		Date       string  `json:"date"`
		MealType   string  `json:"meal_type"`
	} `json:"recipes"` // Détail des recettes qui utilisent cet ingrédient
}

// WeeklyShoppingList représente la liste de courses pour une semaine
type WeeklyShoppingList struct {
	StartDate    time.Time          `json:"start_date"`
	EndDate      time.Time          `json:"end_date"`
	Items        []ShoppingListItem `json:"items"`
	TotalRecipes int                `json:"total_recipes"`
}

// WeeklyShoppingListResponse représente la réponse pour la liste de courses hebdomadaire
type WeeklyShoppingListResponse struct {
	Success bool               `json:"success"`
	Data    WeeklyShoppingList `json:"data"`
}
