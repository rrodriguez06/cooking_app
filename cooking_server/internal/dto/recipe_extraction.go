package dto

// ExtractRecipeRequest représente la requête d'extraction de recette depuis une image
type ExtractRecipeRequest struct {
	// L'image sera reçue via multipart/form-data avec la clé "image"
}

// ExtractRecipeResponse représente la réponse de l'extraction de recette
type ExtractRecipeResponse struct {
	Success       bool                 `json:"success"`
	Message       string               `json:"message,omitempty"`
	Data          *ExtractedRecipeData `json:"data,omitempty"`
	ExtractedText string               `json:"extracted_text,omitempty"` // Texte brut extrait par OCR (pour debug)
}

// ExtractedRecipeData contient les données de recette extraites et structurées
type ExtractedRecipeData struct {
	Title        string                 `json:"title"`
	Description  string                 `json:"description,omitempty"`
	PrepTime     int                    `json:"prep_time"` // en minutes
	CookTime     int                    `json:"cook_time"` // en minutes
	Servings     int                    `json:"servings"`
	Difficulty   string                 `json:"difficulty"` // "easy", "medium", "hard"
	Ingredients  []ExtractedIngredient  `json:"ingredients"`
	Instructions []ExtractedInstruction `json:"instructions"`
	Tips         []string               `json:"tips,omitempty"`      // Conseils additionnels
	Equipment    []string               `json:"equipment,omitempty"` // Équipements mentionnés
}

// ExtractedIngredient représente un ingrédient extrait
type ExtractedIngredient struct {
	Name     string  `json:"name"`
	Quantity float64 `json:"quantity"`
	Unit     string  `json:"unit,omitempty"`
	Notes    string  `json:"notes,omitempty"`
}

// ExtractedInstruction représente une instruction extraite
type ExtractedInstruction struct {
	StepNumber  int    `json:"step_number"`
	Title       string `json:"title,omitempty"`
	Description string `json:"description"`
	Duration    int    `json:"duration,omitempty"`    // en minutes
	Temperature int    `json:"temperature,omitempty"` // en degrés Celsius
	Tips        string `json:"tips,omitempty"`
}

// LLMRequest représente une requête vers le service LLM
type LLMRequest struct {
	Model  string `json:"model"`
	Prompt string `json:"prompt"`
	Stream bool   `json:"stream"`
}

// LLMResponse représente la réponse du service LLM
type LLMResponse struct {
	Model              string `json:"model"`
	CreatedAt          string `json:"created_at"`
	Response           string `json:"response"`
	Done               bool   `json:"done"`
	Context            []int  `json:"context,omitempty"`
	TotalDuration      int64  `json:"total_duration,omitempty"`
	LoadDuration       int64  `json:"load_duration,omitempty"`
	PromptEvalCount    int    `json:"prompt_eval_count,omitempty"`
	PromptEvalDuration int64  `json:"prompt_eval_duration,omitempty"`
	EvalCount          int    `json:"eval_count,omitempty"`
	EvalDuration       int64  `json:"eval_duration,omitempty"`
}
