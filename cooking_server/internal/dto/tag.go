package dto

import "time"

type Tag struct {
	ID          uint   `json:"id" gorm:"primaryKey"`
	Name        string `json:"name" gorm:"uniqueIndex;not null"`
	Description string `json:"description"`

	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`

	// Relations avec les recettes via la table recipe_tags
	Recipes []Recipe `json:"recipes,omitempty" gorm:"many2many:recipe_tags;"`
}

type RecipeTag struct {
	RecipeID uint `json:"recipe_id" gorm:"primaryKey"`
	TagID    uint `json:"tag_id" gorm:"primaryKey"`
}

// TagCreateRequest représente les données pour créer un tag
type TagCreateRequest struct {
	Name        string `json:"name" binding:"required,min=2,max=50"`
	Description string `json:"description,omitempty" binding:"max=500"`
}

// TagUpdateRequest représente les données pour mettre à jour un tag
type TagUpdateRequest struct {
	Name        string `json:"name,omitempty" binding:"omitempty,min=2,max=50"`
	Description string `json:"description,omitempty" binding:"omitempty,max=500"`
}

// TagResponse représente la réponse pour un tag
type TagResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
	Data    Tag    `json:"data"`
}

// TagListResponse représente la réponse pour une liste de tags
type TagListResponse struct {
	Success bool `json:"success"`
	Data    struct {
		Tags        []Tag `json:"tags"`
		TotalCount  int64 `json:"total_count"`
		CurrentPage int   `json:"current_page"`
		TotalPages  int   `json:"total_pages"`
		HasNext     bool  `json:"has_next"`
		HasPrev     bool  `json:"has_prev"`
	} `json:"data"`
}
