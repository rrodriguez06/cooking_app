package dto

import "time"

type Equipment struct {
	ID          uint   `json:"id" gorm:"primaryKey"`
	Name        string `json:"name" gorm:"uniqueIndex;not null"` // Nom de l'équipement
	Description string `json:"description,omitempty"`            // Description facultative
	Category    string `json:"category"`                         // Catégorie de l'équipement (cuisine, pâtisserie, etc.)
	Icon        string `json:"icon"`                             // Icône pour l'affichage

	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

type RecipeEquipment struct {
	ID          uint   `json:"id" gorm:"primaryKey"`
	RecipeID    uint   `json:"recipe_id" gorm:"not null"`        // ID de la recette associée
	EquipmentID uint   `json:"equipment_id" gorm:"not null"`     // ID de l'équipement
	IsOptional  bool   `json:"is_optional" gorm:"default:false"` // Indique si l'équipement est optionnel
	Notes       string `json:"notes,omitempty"`                  // Notes facultatives sur l'équipement

	Recipe    Recipe    `json:"recipe" gorm:"foreignKey:RecipeID"`
	Equipment Equipment `json:"equipment" gorm:"foreignKey:EquipmentID"`
}

type RecipeEquipmentRequest struct {
	EquipmentID uint   `json:"equipment_id" binding:"required"` // ID de l'équipement
	IsOptional  bool   `json:"is_optional"`                     // Indique si l'équipement est optionnel
	Notes       string `json:"notes"`                           // Notes facultatives sur l'équipement
}

// EquipmentCreateRequest représente les données pour créer un équipement
type EquipmentCreateRequest struct {
	Name        string `json:"name" binding:"required,min=2,max=100"`
	Description string `json:"description,omitempty" binding:"max=500"`
	Category    string `json:"category,omitempty" binding:"max=50"`
	Icon        string `json:"icon,omitempty" binding:"max=10"`
}

// EquipmentUpdateRequest représente les données pour mettre à jour un équipement
type EquipmentUpdateRequest struct {
	Name        string `json:"name,omitempty" binding:"omitempty,min=2,max=100"`
	Description string `json:"description,omitempty" binding:"omitempty,max=500"`
	Category    string `json:"category,omitempty" binding:"omitempty,max=50"`
	Icon        string `json:"icon,omitempty" binding:"omitempty,max=10"`
}

// EquipmentResponse représente la réponse pour un équipement
type EquipmentResponse struct {
	Success bool      `json:"success"`
	Message string    `json:"message,omitempty"`
	Data    Equipment `json:"data"`
}

// EquipmentListResponse représente la réponse pour une liste d'équipements
type EquipmentListResponse struct {
	Success bool `json:"success"`
	Data    struct {
		Equipments  []Equipment `json:"equipments"`
		TotalCount  int64       `json:"total_count"`
		CurrentPage int         `json:"current_page"`
		TotalPages  int         `json:"total_pages"`
		HasNext     bool        `json:"has_next"`
		HasPrev     bool        `json:"has_prev"`
	} `json:"data"`
}

// EquipmentSearchResponse représente la réponse pour une recherche d'équipements
type EquipmentSearchResponse struct {
	Success bool `json:"success"`
	Data    struct {
		Equipments []Equipment `json:"equipments"`
		Query      string      `json:"query"`
		TotalCount int         `json:"total_count"`
	} `json:"data"`
}
