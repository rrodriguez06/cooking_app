package dto

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"
)

type RecipeStep struct {
	StepNumber           int     `json:"step_number"`
	Title                string  `json:"title,omitempty"`
	Description          string  `json:"description"`
	Duration             int     `json:"duration,omitempty"`             // Durée en minutes
	Temperature          int     `json:"temperature,omitempty"`          // Température en degrés Celsius
	Tips                 string  `json:"tips,omitempty"`                 // Astuces facultatives
	ReferencedRecipeID   *uint   `json:"referenced_recipe_id,omitempty"` // ID de la recette référencée (optionnel)
	ReferencedRecipeData *Recipe `json:"referenced_recipe,omitempty"`    // Données de la recette référencée (non persisté, utilisé pour l'affichage)
}

type RecipeSteps []RecipeStep

func (rs *RecipeSteps) Scan(value interface{}) error {
	if value == nil {
		*rs = RecipeSteps{}
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("cannot scan non-[]byte into RecipeSteps")
	}

	return json.Unmarshal(bytes, rs)
}

func (rs RecipeSteps) Value() (driver.Value, error) {
	if len(rs) == 0 {
		return nil, nil
	}

	return json.Marshal(rs)
}

type Recipe struct {
	ID               uint        `json:"id" gorm:"primaryKey"`
	Title            string      `json:"title" gorm:"not null"`
	Description      string      `json:"description"`
	Instructions     RecipeSteps `json:"instructions" gorm:"type:json"`
	PrepTime         int         `json:"prep_time"`                                                                                        // Temps de préparation en minutes
	CookTime         int         `json:"cook_time"`                                                                                        // Temps de cuisson en minutes
	TotalTime        int         `json:"total_time"`                                                                                       // Temps total en minutes
	Servings         int         `json:"servings"`                                                                                         // Nombre de portions
	Difficulty       string      `json:"difficulty" gorm:"type:varchar(10);default:'medium';check:difficulty IN ('easy','medium','hard')"` // easy, medium, hard
	ImageURL         string      `json:"image_url,omitempty"`                                                                              // URL de l'image facultative
	AverageRating    float64     `json:"average_rating" gorm:"type:decimal(3,2);default:0"`                                                // Note moyenne (0-5)
	RatingCount      int         `json:"rating_count" gorm:"default:0"`                                                                    // Nombre total d'évaluations
	IsPublic         bool        `json:"is_public" gorm:"default:true"`                                                                    // Indique si la recette est publique
	IsOriginal       bool        `json:"is_original" gorm:"default:true"`                                                                  // Indique si la recette est originale
	OriginalRecipeID *uint       `json:"original_recipe_id,omitempty"`                                                                     // ID de la recette originale si c'est une adaptation
	AuthorID         uint        `json:"author_id" gorm:"not null"`                                                                        // ID de l'auteur de la recette

	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`

	Author         User               `json:"author" gorm:"foreignKey:AuthorID"`
	OriginalRecipe *Recipe            `json:"original_recipe,omitempty" gorm:"foreignKey:OriginalRecipeID"`
	Ingredients    []RecipeIngredient `json:"ingredients" gorm:"foreignKey:RecipeID"`
	Equipments     []RecipeEquipment  `json:"equipments" gorm:"foreignKey:RecipeID"`
	Tags           []Tag              `json:"tags,omitempty" gorm:"many2many:recipe_tags;"`
	Comments       []Comment          `json:"comments" gorm:"foreignKey:RecipeID"`
	Categories     []Category         `json:"categories" gorm:"many2many:recipe_category_associations;"`
}

type RecipeStepRequest struct {
	StepNumber         int    `json:"step_number" binding:"required,min=1"`
	Title              string `json:"title,omitempty" binding:"omitempty,max=100"`
	Description        string `json:"description" binding:"required,max=1000"`
	Duration           int    `json:"duration" binding:"min=0"`
	Temperature        int    `json:"temperature,omitempty" binding:"omitempty,min=0"`
	Tips               string `json:"tips,omitempty" binding:"omitempty,max=500"`
	ReferencedRecipeID *uint  `json:"referenced_recipe_id,omitempty"` // ID de la recette référencée (optionnel)
}

type RecipeCreateRequest struct {
	Title        string                    `json:"title" binding:"required,min=3,max=200"`
	Description  string                    `json:"description" binding:"max=1000"`
	Instructions []RecipeStepRequest       `json:"instructions" binding:"required,min=1,dive"`
	PrepTime     int                       `json:"prep_time" binding:"min=0"`
	CookTime     int                       `json:"cook_time" binding:"min=0"`
	Servings     int                       `json:"servings" binding:"min=1"`
	Difficulty   string                    `json:"difficulty" binding:"oneof=easy medium hard"`
	ImageURL     string                    `json:"image_url"`
	IsPublic     bool                      `json:"is_public"`
	Ingredients  []RecipeIngredientRequest `json:"ingredients" binding:"required,min=1,dive"`
	Equipments   []RecipeEquipmentRequest  `json:"equipments" binding:"dive"`
	TagIDs       []uint                    `json:"tag_ids"`
	CategoryIDs  []uint                    `json:"category_ids"`
}

type RecipeUpdateRequest struct {
	Title        string                    `json:"title" binding:"min=3,max=200"`
	Description  string                    `json:"description" binding:"max=1000"`
	Instructions []RecipeStepRequest       `json:"instructions" binding:"min=1,dive"`
	PrepTime     int                       `json:"prep_time" binding:"min=0"`
	CookTime     int                       `json:"cook_time" binding:"min=0"`
	Servings     int                       `json:"servings" binding:"min=1"`
	Difficulty   string                    `json:"difficulty" binding:"oneof=easy medium hard"`
	ImageURL     string                    `json:"image_url"`
	IsPublic     bool                      `json:"is_public"`
	Ingredients  []RecipeIngredientRequest `json:"ingredients" binding:"dive"`
	Equipments   []RecipeEquipmentRequest  `json:"equipments" binding:"dive"`
	TagIDs       []uint                    `json:"tag_ids"`
	CategoryIDs  []uint                    `json:"category_ids"`
}

type RecipeCopyRequest struct {
	OriginalRecipeID uint `json:"original_recipe_id" binding:"required"`
}

// RecipeResponse représente la réponse pour une recette
type RecipeResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
	Data    Recipe `json:"data"`
}

// RecipeListResponse représente la réponse pour une liste de recettes
type RecipeListResponse struct {
	Success bool `json:"success"`
	Data    struct {
		Recipes     []Recipe `json:"recipes"`
		TotalCount  int64    `json:"total_count"`
		CurrentPage int      `json:"current_page"`
		TotalPages  int      `json:"total_pages"`
		HasNext     bool     `json:"has_next"`
		HasPrev     bool     `json:"has_prev"`
	} `json:"data"`
}
