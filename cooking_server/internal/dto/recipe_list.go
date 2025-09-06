package dto

// RecipeList représente une liste personnalisée de recettes créée par un utilisateur
type RecipeList struct {
	ID          uint   `json:"id" gorm:"primaryKey"`
	Name        string `json:"name" gorm:"not null"`
	Description string `json:"description"`
	IsPublic    bool   `json:"is_public" gorm:"default:false"` // Pour le partage futur
	UserID      uint   `json:"user_id" gorm:"not null"`        // Propriétaire de la liste

	User    User             `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Items   []RecipeListItem `json:"items,omitempty" gorm:"foreignKey:RecipeListID"`
	Recipes []Recipe         `json:"recipes,omitempty" gorm:"many2many:recipe_list_items;"`
}

// RecipeListItem représente une recette dans une liste avec des métadonnées optionnelles
type RecipeListItem struct {
	RecipeListID uint `json:"recipe_list_id" gorm:"primaryKey"`
	RecipeID     uint `json:"recipe_id" gorm:"primaryKey"`

	RecipeList RecipeList `json:"recipe_list,omitempty" gorm:"foreignKey:RecipeListID"`
	Recipe     Recipe     `json:"recipe,omitempty" gorm:"foreignKey:RecipeID"`
}

// UserFavoriteRecipe représente les recettes favorites d'un utilisateur
type UserFavoriteRecipe struct {
	UserID   uint `json:"user_id" gorm:"primaryKey"`
	RecipeID uint `json:"recipe_id" gorm:"primaryKey"`

	User   User   `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Recipe Recipe `json:"recipe,omitempty" gorm:"foreignKey:RecipeID"`
}

// RecipeListCreateRequest représente une demande de création de liste
type RecipeListCreateRequest struct {
	Name        string `json:"name" binding:"required,min=1,max=100"`
	Description string `json:"description" binding:"max=500"`
	IsPublic    bool   `json:"is_public"`
}

// RecipeListUpdateRequest représente une demande de mise à jour de liste
type RecipeListUpdateRequest struct {
	Name        string `json:"name" binding:"min=1,max=100"`
	Description string `json:"description" binding:"max=500"`
	IsPublic    bool   `json:"is_public"`
}

// AddRecipeToListRequest représente une demande d'ajout de recette à une liste
type AddRecipeToListRequest struct {
	RecipeID uint   `json:"recipe_id" binding:"required"`
	Notes    string `json:"notes" binding:"max=500"`
	Position int    `json:"position"`
}

// UpdateRecipeInListRequest représente une demande de mise à jour d'une recette dans une liste
type UpdateRecipeInListRequest struct {
	Notes    string `json:"notes" binding:"max=500"`
	Position int    `json:"position"`
}

// CustomRecipeListResponse représente la réponse pour une liste personnalisée de recettes
type CustomRecipeListResponse struct {
	Success bool       `json:"success"`
	Message string     `json:"message,omitempty"`
	Data    RecipeList `json:"data"`
}

// CustomRecipeListsResponse représente la réponse pour plusieurs listes personnalisées de recettes
type CustomRecipeListsResponse struct {
	Success bool `json:"success"`
	Data    struct {
		Lists       []RecipeList `json:"lists"`
		TotalCount  int64        `json:"total_count"`
		CurrentPage int          `json:"current_page"`
		TotalPages  int          `json:"total_pages"`
		HasNext     bool         `json:"has_next"`
		HasPrev     bool         `json:"has_prev"`
	} `json:"data"`
}

// FavoriteRecipesResponse représente la réponse pour les recettes favorites
type FavoriteRecipesResponse struct {
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

// ToggleFavoriteRequest représente une demande d'ajout/suppression de favori
type ToggleFavoriteRequest struct {
	RecipeID uint `json:"recipe_id" binding:"required"`
}

// FavoriteStatusResponse représente la réponse du statut de favori
type FavoriteStatusResponse struct {
	Success    bool `json:"success"`
	IsFavorite bool `json:"is_favorite"`
}
