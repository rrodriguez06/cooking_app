package dto

import "time"

type Category struct {
	ID          uint   `json:"id" gorm:"primaryKey"`
	Name        string `json:"name" gorm:"uniqueIndex;not null"`
	Description string `json:"description,omitempty"`
	Color       string `json:"color"`
	Icon        string `json:"icon"`

	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`

	// Supprimé pour éviter les références circulaires lors des migrations
	// Recipes []Recipe `json:"recipes,omitempty" gorm:"many2many:recipe_category_associations;"`
}

// CategoryCreateRequest représente les données pour créer une catégorie
type CategoryCreateRequest struct {
	Name        string `json:"name" binding:"required,min=2,max=100"`
	Description string `json:"description,omitempty" binding:"max=500"`
	Color       string `json:"color,omitempty" binding:"omitempty,len=7"` // Format: #RRGGBB
	Icon        string `json:"icon,omitempty" binding:"max=10"`
}

// CategoryUpdateRequest représente les données pour mettre à jour une catégorie
type CategoryUpdateRequest struct {
	Name        string `json:"name,omitempty" binding:"omitempty,min=2,max=100"`
	Description string `json:"description,omitempty" binding:"omitempty,max=500"`
	Color       string `json:"color,omitempty" binding:"omitempty,len=7"` // Format: #RRGGBB
	Icon        string `json:"icon,omitempty" binding:"omitempty,max=10"`
}

// CategoryResponse représente la réponse pour une catégorie
type CategoryResponse struct {
	Success bool     `json:"success"`
	Message string   `json:"message,omitempty"`
	Data    Category `json:"data"`
}

// CategoryListResponse représente la réponse pour une liste de catégories
type CategoryListResponse struct {
	Success bool `json:"success"`
	Data    struct {
		Categories  []Category `json:"categories"`
		TotalCount  int64      `json:"total_count"`
		CurrentPage int        `json:"current_page"`
		TotalPages  int        `json:"total_pages"`
		HasNext     bool       `json:"has_next"`
		HasPrev     bool       `json:"has_prev"`
	} `json:"data"`
}
