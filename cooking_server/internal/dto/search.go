package dto

type SearchQuery struct {
	Query        string   `json:"query" form:"query"`                 // Recherche textuelle générale
	Ingredients  []string `json:"ingredients" form:"ingredients"`     // Liste d'ingrédients à filtrer
	Equipments   []string `json:"equipments" form:"equipments"`       // Liste d'équipements à filtrer
	Categories   []string `json:"categories" form:"categories"`       // Liste de catégories à filtrer
	Tags         []string `json:"tags" form:"tags"`                   // Liste de tags à filtr
	MaxPrepTime  int      `json:"max_prep_time" form:"max_prep_time"` // Temps de préparation maximum en minutes
	MaxCookTime  int      `json:"max_cook_time" form:"max_cook_time"`
	MaxTotalTime int      `json:"max_total_time" form:"max_total_time"` // Temps total maximum en minutes
	Difficulty   string   `json:"difficulty" form:"difficulty"`         // Niveau de difficulté
	MinRating    float64  `json:"min_rating" form:"min_rating"`         // Note minimale (1-5)
	AuthorID     uint     `json:"author_id" form:"author_id"`           // ID de l'auteur de la recette

	Page  int `json:"page" form:"page"`   // Numéro de la page pour la pagination
	Limit int `json:"limit" form:"limit"` // Nombre de résultats par page

	SortBy    string `json:"sort_by" form:"sort_by"`       // Champ de tri (ex: "created_at", "rating")
	SortOrder string `json:"sort_order" form:"sort_order"` // Ordre de tri (ex: "asc", "desc")
}

type SearchResponse struct {
	Recipes     []Recipe `json:"recipes"`      // Liste des recettes correspondant à la recherche
	TotalCount  int64    `json:"total_count"`  // Nombre total de recettes correspondant à la recherche
	CurrentPage int      `json:"current_page"` // Page actuelle
	TotalPages  int      `json:"total_pages"`  // Nombre total de pages

	HasNext bool `json:"has_next"` // Indique s'il y a une page suivante
	HasPrev bool `json:"has_prev"` // Indique s'il y a une page précédente
}
