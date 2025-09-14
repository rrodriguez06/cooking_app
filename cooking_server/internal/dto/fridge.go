package dto

import "time"

// FridgeItem représente un item dans le frigo d'un utilisateur
type FridgeItem struct {
	ID           uint       `json:"id" gorm:"primaryKey;autoIncrement"`
	UserID       uint       `json:"user_id" gorm:"not null;index"`
	IngredientID uint       `json:"ingredient_id" gorm:"not null"`
	Quantity     *float64   `json:"quantity,omitempty"`
	Unit         *string    `json:"unit,omitempty"`
	ExpiryDate   *time.Time `json:"expiry_date,omitempty"`
	Notes        *string    `json:"notes,omitempty"`
	CreatedAt    time.Time  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt    time.Time  `json:"updated_at" gorm:"autoUpdateTime"`

	// Relations
	Ingredient Ingredient `json:"ingredient" gorm:"foreignKey:IngredientID"`
}

// FridgeItemCreateRequest représente la requête pour créer un item de frigo
type FridgeItemCreateRequest struct {
	IngredientID uint       `json:"ingredient_id" binding:"required"`
	Quantity     *float64   `json:"quantity,omitempty"`
	Unit         *string    `json:"unit,omitempty"`
	ExpiryDate   *time.Time `json:"expiry_date,omitempty"`
	Notes        *string    `json:"notes,omitempty"`
}

// FridgeItemUpdateRequest représente la requête pour modifier un item de frigo
type FridgeItemUpdateRequest struct {
	IngredientID *uint      `json:"ingredient_id,omitempty"`
	Quantity     *float64   `json:"quantity,omitempty"`
	Unit         *string    `json:"unit,omitempty"`
	ExpiryDate   *time.Time `json:"expiry_date,omitempty"`
	Notes        *string    `json:"notes,omitempty"`
}

// FridgeListResponse représente la réponse pour la liste des items du frigo
type FridgeListResponse struct {
	FridgeItems []FridgeItem `json:"fridge_items"`
	TotalCount  int          `json:"total_count"`
}

// FridgeStats représente les statistiques du frigo d'un utilisateur
type FridgeStats struct {
	TotalItems      int      `json:"total_items"`
	ExpiringSoon    int      `json:"expiring_soon"`    // Items qui expirent dans les 3 prochains jours
	Expired         int      `json:"expired"`          // Items expirés
	CategoriesCount int      `json:"categories_count"` // Nombre de catégories représentées
	Categories      []string `json:"categories"`       // Liste des catégories
}

// RecipeSearchByIngredientsRequest représente les paramètres de recherche de recettes
type RecipeSearchByIngredientsRequest struct {
	MatchType             string   `json:"match_type" form:"match_type"`                           // "all" ou "any"
	MaxMissingIngredients *int     `json:"max_missing_ingredients" form:"max_missing_ingredients"` // Nombre max d'ingrédients manquants
	ExcludeCategories     []string `json:"exclude_categories" form:"exclude_categories"`           // Catégories à exclure
	Limit                 *int     `json:"limit" form:"limit"`                                     // Limite de résultats
}

// RecipeSuggestion représente une suggestion de recette basée sur les ingrédients du frigo
type RecipeSuggestion struct {
	Recipe              RecipeSummary `json:"recipe"`
	MatchingIngredients int           `json:"matching_ingredients"`
	TotalIngredients    int           `json:"total_ingredients"`
	MissingIngredients  []Ingredient  `json:"missing_ingredients"`
	MatchPercentage     float64       `json:"match_percentage"`
	CanCook             bool          `json:"can_cook"`
}

// RecipeSummary représente un résumé de recette pour les suggestions
type RecipeSummary struct {
	ID            int      `json:"id"`
	Title         string   `json:"title"`
	Description   *string  `json:"description,omitempty"`
	ImageURL      *string  `json:"image_url,omitempty"`
	Categories    []string `json:"categories,omitempty"`
	CookingTime   *int     `json:"cooking_time,omitempty"`
	Servings      *int     `json:"servings,omitempty"`
	AverageRating *float64 `json:"average_rating,omitempty"`
}

// RecipeSuggestionsResponse représente la réponse pour les suggestions de recettes
type RecipeSuggestionsResponse struct {
	Suggestions      []RecipeSuggestion               `json:"suggestions"`
	TotalFridgeItems int                              `json:"total_fridge_items"`
	SearchParameters RecipeSearchByIngredientsRequest `json:"search_parameters"`
}

// FridgeItemRemovedResponse représente la réponse après suppression d'items expirés
type FridgeItemRemovedResponse struct {
	RemovedCount int `json:"removed_count"`
}
