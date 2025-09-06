package dto

import "time"

type Comment struct {
	ID       uint   `json:"id" gorm:"primaryKey"`
	Content  string `json:"content" gorm:"not null"`
	Rating   int    `json:"rating"`                    // 1-5 etoiles, optionnel
	RecipeID uint   `json:"recipe_id" gorm:"not null"` // ID de la recette associée
	UserID   uint   `json:"user_id" gorm:"not null"`   // ID de l'utilisateur ayant laissé le commentaire
	ParentID *uint  `json:"parent_id,omitempty"`       // ID du commentaire parent pour les réponses, optionnel

	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`

	Recipe  Recipe    `json:"recipe,omitempty" gorm:"foreignKey:RecipeID"`
	User    User      `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Parent  *Comment  `json:"parent,omitempty" gorm:"foreignKey:ParentID"` // Commentaire parent pour les réponses
	Replies []Comment `json:"replies,omitempty" gorm:"foreignKey:ParentID"`
}

type CommentCreateRequest struct {
	Content  string `json:"content" binding:"required,min=1,max=1000"`
	Rating   int    `json:"rating" binding:"min=1,max=5"`
	RecipeID uint   `json:"recipe_id" binding:"required"`
	ParentID *uint  `json:"parent_id"` // ID du commentaire parent pour les réponses, optionnel
}

type CommentUpdateRequest struct {
	Content string `json:"content" binding:"required,min=1,max=1000"`
	Rating  int    `json:"rating" binding:"min=1,max=5"`
}

// CommentResponse représente la réponse pour un commentaire
type CommentResponse struct {
	Success bool    `json:"success"`
	Message string  `json:"message,omitempty"`
	Data    Comment `json:"data"`
}

// CommentListResponse représente la réponse pour une liste de commentaires
type CommentListResponse struct {
	Success bool `json:"success"`
	Data    struct {
		Comments    []Comment `json:"comments"`
		TotalCount  int64     `json:"total_count"`
		CurrentPage int       `json:"current_page"`
		TotalPages  int       `json:"total_pages"`
		HasNext     bool      `json:"has_next"`
		HasPrev     bool      `json:"has_prev"`
	} `json:"data"`
}
