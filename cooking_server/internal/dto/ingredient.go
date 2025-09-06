package dto

import "time"

type Ingredient struct {
	ID          uint   `json:"id" gorm:"primaryKey"`
	Name        string `json:"name" gorm:"uniqueIndex;not null"`
	Description string `json:"description,omitempty"` // Description facultative
	Category    string `json:"category"`              // legume, viande, epice, etc.
	Icon        string `json:"icon"`                  // Icône pour l'affichage

	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

type RecipeIngredient struct {
	ID           uint    `json:"id" gorm:"primaryKey"`
	RecipeID     uint    `json:"recipe_id" gorm:"not null"`        // ID de la recette associée
	IngredientID uint    `json:"ingredient_id" gorm:"not null"`    // ID de l'ingrédient
	Quantity     float64 `json:"quantity"`                         // Quantité de l'ingrédient
	Unit         string  `json:"unit"`                             // Unité de mesure (grammes, litres, etc.)
	Notes        string  `json:"notes,omitempty"`                  // Notes facultatives sur l'ingrédient
	IsOptional   bool    `json:"is_optional" gorm:"default:false"` // Indique si l'ingrédient est optionnel

	Recipe     Recipe     `json:"recipe" gorm:"foreignKey:RecipeID"`
	Ingredient Ingredient `json:"ingredient" gorm:"foreignKey:IngredientID"`
}

type RecipeIngredientRequest struct {
	IngredientID uint    `json:"ingredient_id" binding:"required"`
	Quantity     float64 `json:"quantity" binding:"min=0"`
	Unit         string  `json:"unit" binding:"required"`
	Notes        string  `json:"notes,omitempty"`
	IsOptional   bool    `json:"is_optional"`
}

// IngredientCreateRequest représente les données pour créer un ingrédient
type IngredientCreateRequest struct {
	Name        string `json:"name" binding:"required,min=2,max=100"`
	Description string `json:"description,omitempty" binding:"max=500"`
	Category    string `json:"category,omitempty" binding:"max=50"`
	Icon        string `json:"icon,omitempty" binding:"max=10"`
}

// IngredientUpdateRequest représente les données pour mettre à jour un ingrédient
type IngredientUpdateRequest struct {
	Name        string `json:"name,omitempty" binding:"omitempty,min=2,max=100"`
	Description string `json:"description,omitempty" binding:"omitempty,max=500"`
	Category    string `json:"category,omitempty" binding:"omitempty,max=50"`
	Icon        string `json:"icon,omitempty" binding:"omitempty,max=10"`
}

// IngredientResponse représente la réponse pour un ingrédient
type IngredientResponse struct {
	Success bool       `json:"success"`
	Message string     `json:"message,omitempty"`
	Data    Ingredient `json:"data"`
}

// IngredientListResponse représente la réponse pour une liste d'ingrédients
type IngredientListResponse struct {
	Success bool `json:"success"`
	Data    struct {
		Ingredients []Ingredient `json:"ingredients"`
		TotalCount  int64        `json:"total_count"`
		CurrentPage int          `json:"current_page"`
		TotalPages  int          `json:"total_pages"`
		HasNext     bool         `json:"has_next"`
		HasPrev     bool         `json:"has_prev"`
	} `json:"data"`
}

// IngredientSearchResponse représente la réponse pour une recherche d'ingrédients
type IngredientSearchResponse struct {
	Success bool `json:"success"`
	Data    struct {
		Ingredients []Ingredient `json:"ingredients"`
		Query       string       `json:"query"`
		TotalCount  int          `json:"total_count"`
	} `json:"data"`
}
