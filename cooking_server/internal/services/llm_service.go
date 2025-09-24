package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/romainrodriguez/cooking_server/internal/dto"
)

// LLMService gère l'interaction avec le service Ollama
type LLMService struct {
	baseURL    string
	httpClient *http.Client
	model      string
}

// NewLLMService crée une nouvelle instance du service LLM
func NewLLMService() *LLMService {
	baseURL := os.Getenv("OLLAMA_BASE_URL")
	if baseURL == "" {
		baseURL = "http://localhost:11434"
	}

	return &LLMService{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 120 * time.Second, // 2 minutes timeout pour les requêtes LLM
		},
		model: "gemma2:2b",
	}
}

// ExtractRecipeFromText utilise le LLM pour extraire une recette structurée depuis du texte
func (s *LLMService) ExtractRecipeFromText(extractedText string) (*dto.ExtractedRecipeData, error) {
	prompt := s.buildRecipeExtractionPrompt(extractedText)

	// Préparer la requête vers Ollama
	request := dto.LLMRequest{
		Model:  s.model,
		Prompt: prompt,
		Stream: false,
	}

	// Faire la requête vers le service Ollama
	response, err := s.callOllama(request)
	if err != nil {
		return nil, fmt.Errorf("erreur lors de l'appel au LLM: %w", err)
	}

	// Parser la réponse JSON du LLM
	recipeData, err := s.parseRecipeResponse(response.Response)
	if err != nil {
		return nil, fmt.Errorf("erreur lors du parsing de la réponse LLM: %w", err)
	}

	return recipeData, nil
}

// buildRecipeExtractionPrompt construit le prompt pour l'extraction de recette
func (s *LLMService) buildRecipeExtractionPrompt(text string) string {
	return fmt.Sprintf(`Tu es un assistant spécialisé dans l'extraction de recettes. Analyse le texte suivant extrait d'une image de recette et retourne UNIQUEMENT un objet JSON valide contenant les informations structurées de la recette.

Format de réponse attendu (JSON uniquement, sans texte supplémentaire):
{
  "title": "string",
  "description": "string",
  "prep_time": number,
  "cook_time": number,
  "servings": number,
  "difficulty": "easy|medium|hard",
  "ingredients": [
    {
      "name": "string",
      "quantity": number,
      "unit": "string",
      "notes": "string"
    }
  ],
  "instructions": [
    {
      "step_number": number,
      "title": "string",
      "description": "string",
      "duration": number,
      "temperature": number,
      "tips": "string"
    }
  ],
  "tips": ["string"],
  "equipment": ["string"]
}

Règles d'extraction:
- Si une information n'est pas disponible, utilise des valeurs par défaut raisonnables
- prep_time et cook_time en minutes (défaut: 30 et 30)
- servings par défaut: 4
- difficulty: "medium" par défaut
- Convertis toutes les quantités en nombres (ex: "1/2" = 0.5)
- Pour les unités, utilise les abréviations standard (g, ml, c. à soupe, etc.)
- Les températures en degrés Celsius
- Numérotation des étapes à partir de 1

Texte à analyser:
%s`, text)
}

// callOllama fait un appel HTTP au service Ollama
func (s *LLMService) callOllama(request dto.LLMRequest) (*dto.LLMResponse, error) {
	// Sérialiser la requête
	requestBody, err := json.Marshal(request)
	if err != nil {
		return nil, fmt.Errorf("erreur lors de la sérialisation de la requête: %w", err)
	}

	// Créer la requête HTTP
	url := fmt.Sprintf("%s/api/generate", s.baseURL)
	httpReq, err := http.NewRequest("POST", url, bytes.NewBuffer(requestBody))
	if err != nil {
		return nil, fmt.Errorf("erreur lors de la création de la requête HTTP: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")

	// Faire l'appel HTTP
	resp, err := s.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("erreur lors de l'appel HTTP vers Ollama: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("erreur HTTP %d lors de l'appel vers Ollama", resp.StatusCode)
	}

	// Parser la réponse
	var response dto.LLMResponse
	err = json.NewDecoder(resp.Body).Decode(&response)
	if err != nil {
		return nil, fmt.Errorf("erreur lors du parsing de la réponse Ollama: %w", err)
	}

	return &response, nil
}

// parseRecipeResponse parse la réponse JSON du LLM en structure de recette
func (s *LLMService) parseRecipeResponse(responseText string) (*dto.ExtractedRecipeData, error) {
	// Nettoyer la réponse (supprimer d'éventuels textes avant/après le JSON)
	start := bytes.Index([]byte(responseText), []byte("{"))
	end := bytes.LastIndex([]byte(responseText), []byte("}"))

	if start == -1 || end == -1 || start >= end {
		return nil, fmt.Errorf("aucun JSON valide trouvé dans la réponse du LLM")
	}

	jsonText := responseText[start : end+1]

	// Parser le JSON
	var recipeData dto.ExtractedRecipeData
	err := json.Unmarshal([]byte(jsonText), &recipeData)
	if err != nil {
		return nil, fmt.Errorf("erreur lors du parsing JSON: %w", err)
	}

	// Validation et nettoyage des données
	s.validateAndCleanRecipeData(&recipeData)

	return &recipeData, nil
}

// validateAndCleanRecipeData valide et nettoie les données extraites
func (s *LLMService) validateAndCleanRecipeData(data *dto.ExtractedRecipeData) {
	// Titre obligatoire
	if data.Title == "" {
		data.Title = "Recette extraite"
	}

	// Valeurs par défaut pour les temps
	if data.PrepTime <= 0 {
		data.PrepTime = 30
	}
	if data.CookTime < 0 {
		data.CookTime = 30
	}

	// Nombre de portions
	if data.Servings <= 0 {
		data.Servings = 4
	}

	// Difficulté
	validDifficulties := map[string]bool{"easy": true, "medium": true, "hard": true}
	if !validDifficulties[data.Difficulty] {
		data.Difficulty = "medium"
	}

	// Vérifier qu'il y a au moins un ingrédient
	if len(data.Ingredients) == 0 {
		data.Ingredients = []dto.ExtractedIngredient{
			{Name: "Ingrédient à définir", Quantity: 1, Unit: "unité"},
		}
	}

	// Vérifier qu'il y a au moins une instruction
	if len(data.Instructions) == 0 {
		data.Instructions = []dto.ExtractedInstruction{
			{StepNumber: 1, Description: "Instruction à définir"},
		}
	}

	// Renuméroter les instructions
	for i := range data.Instructions {
		data.Instructions[i].StepNumber = i + 1
	}
}

// CheckHealth vérifie si le service Ollama est accessible
func (s *LLMService) CheckHealth() error {
	url := fmt.Sprintf("%s/api/version", s.baseURL)
	resp, err := s.httpClient.Get(url)
	if err != nil {
		return fmt.Errorf("service Ollama inaccessible: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("service Ollama en erreur: status %d", resp.StatusCode)
	}

	return nil
}
