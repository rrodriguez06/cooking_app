package dto

import "time"

// PaginationRequest représente les paramètres de pagination
type PaginationRequest struct {
	Page  int `json:"page" form:"page" binding:"min=1"`
	Limit int `json:"limit" form:"limit" binding:"min=1,max=100"`
}

// PaginationMeta représente les métadonnées de pagination
type PaginationMeta struct {
	TotalCount  int64 `json:"total_count"`
	CurrentPage int   `json:"current_page"`
	TotalPages  int   `json:"total_pages"`
	HasNext     bool  `json:"has_next"`
	HasPrev     bool  `json:"has_prev"`
}

// ErrorResponse représente une réponse d'erreur standardisée
type ErrorResponse struct {
	Success bool              `json:"success"`
	Error   string            `json:"error"`
	Message string            `json:"message"`
	Details map[string]string `json:"details,omitempty"`
}

// SuccessResponse représente une réponse de succès générique
type SuccessResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// MessageResponse représente une réponse simple avec message
type MessageResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

// AuthResponse représente une réponse d'authentification
type AuthResponse struct {
	User        UserResponse  `json:"user"`
	AccessToken string        `json:"access_token"`
	TokenType   string        `json:"token_type"` // e.g., "Bearer"
	ExpiresIn   time.Duration `json:"expires_in"`
}

// HealthCheckResponse représente la réponse du health check
type HealthCheckResponse struct {
	Success bool   `json:"success"`
	Status  string `json:"status"`
	Time    string `json:"time"`
	Version string `json:"version,omitempty"`
}
