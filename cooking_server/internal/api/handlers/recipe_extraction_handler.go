package handlers

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/romainrodriguez/cooking_server/internal/dto"
	"github.com/romainrodriguez/cooking_server/internal/services"
)

// RecipeExtractionHandler gère les requêtes d'extraction de recette
type RecipeExtractionHandler struct {
	ocrService *services.OCRService
	llmService *services.LLMService
}

// NewRecipeExtractionHandler crée un nouveau handler d'extraction
func NewRecipeExtractionHandler() *RecipeExtractionHandler {
	return &RecipeExtractionHandler{
		ocrService: services.NewOCRService(),
		llmService: services.NewLLMService(),
	}
}

// ExtractFromImage extrait une recette depuis une image uploadée
// @Summary Extraire une recette depuis une image
// @Description Utilise OCR et IA pour extraire les informations de recette d'une photo
// @Tags recipes
// @Accept multipart/form-data
// @Produce json
// @Param image formData file true "Image de la recette"
// @Success 200 {object} dto.ExtractRecipeResponse
// @Failure 400 {object} dto.ExtractRecipeResponse
// @Failure 500 {object} dto.ExtractRecipeResponse
// @Router /recipes/extract-from-image [post]
func (h *RecipeExtractionHandler) ExtractFromImage(c *gin.Context) {
	// Vérifier que le service LLM est accessible
	if err := h.llmService.CheckHealth(); err != nil {
		fmt.Printf("[RecipeExtraction] LLM health check failed: %v\n", err)
		c.JSON(http.StatusServiceUnavailable, dto.ExtractRecipeResponse{
			Success: false,
			Message: "Service d'IA temporairement indisponible. Veuillez réessayer plus tard.",
		})
		return
	}

	// Récupérer le fichier uploadé
	file, header, err := c.Request.FormFile("image")
	if err != nil {
		fmt.Printf("[RecipeExtraction] No image provided: %v\n", err)
		c.JSON(http.StatusBadRequest, dto.ExtractRecipeResponse{
			Success: false,
			Message: "Aucune image fournie. Veuillez sélectionner un fichier image.",
		})
		return
	}
	defer file.Close()

	// Valider le format de l'image
	if err := h.ocrService.ValidateImageFile(header.Filename); err != nil {
		fmt.Printf("[RecipeExtraction] Invalid image format: %v\n", err)
		c.JSON(http.StatusBadRequest, dto.ExtractRecipeResponse{
			Success: false,
			Message: fmt.Sprintf("Format d'image invalide: %s", err.Error()),
		})
		return
	}

	// Vérifier la taille du fichier (limite à 10MB)
	const maxFileSize = 10 * 1024 * 1024 // 10MB
	if header.Size > maxFileSize {
		fmt.Printf("[RecipeExtraction] Image too large: %d bytes\n", header.Size)
		c.JSON(http.StatusBadRequest, dto.ExtractRecipeResponse{
			Success: false,
			Message: "L'image est trop volumineuse. Taille maximale: 10MB.",
		})
		return
	}

	// Étape 1: Extraction du texte avec OCR
	fmt.Printf("[RecipeExtraction] Starting OCR for image: %s\n", header.Filename)
	extractedText, err := h.ocrService.ExtractTextFromImage(file, header.Filename)
	if err != nil {
		fmt.Printf("[RecipeExtraction] OCR error: %v\n", err)
		c.JSON(http.StatusInternalServerError, dto.ExtractRecipeResponse{
			Success:       false,
			Message:       "Erreur lors de l'analyse de l'image. Assurez-vous que l'image contient du texte lisible.",
			ExtractedText: "", // Pas de texte extrait en cas d'erreur OCR
		})
		return
	}
	fmt.Printf("[RecipeExtraction] OCR extracted text: %s\n", extractedText)

	// Vérifier que du texte a été extrait
	if strings.TrimSpace(extractedText) == "" {
		fmt.Printf("[RecipeExtraction] No text detected in image.\n")
		c.JSON(http.StatusBadRequest, dto.ExtractRecipeResponse{
			Success:       false,
			Message:       "Aucun texte détecté dans l'image. Veuillez utiliser une image plus claire ou avec plus de texte.",
			ExtractedText: extractedText,
		})
		return
	}

	// Vérifier que le texte semble contenir une recette
	if !h.containsRecipeKeywords(extractedText) {
		fmt.Printf("[RecipeExtraction] Extracted text does not contain recipe keywords.\n")
		c.JSON(http.StatusBadRequest, dto.ExtractRecipeResponse{
			Success:       false,
			Message:       "Le texte extrait ne semble pas contenir une recette. Veuillez utiliser une image de recette.",
			ExtractedText: extractedText,
		})
		return
	}

	// Étape 2: Extraction structurée avec LLM
	fmt.Printf("[RecipeExtraction] Sending extracted text to LLM...\n")
	recipeData, err := h.llmService.ExtractRecipeFromText(extractedText)
	if err != nil {
		fmt.Printf("[RecipeExtraction] LLM error: %v\n", err)
		c.JSON(http.StatusInternalServerError, dto.ExtractRecipeResponse{
			Success:       false,
			Message:       "Erreur lors de l'analyse de la recette. Le texte extrait ne peut pas être traité correctement.",
			ExtractedText: extractedText,
		})
		return
	}
	fmt.Printf("[RecipeExtraction] LLM returned recipe data: %+v\n", recipeData)

	// Retourner la réponse avec succès
	c.JSON(http.StatusOK, dto.ExtractRecipeResponse{
		Success:       true,
		Message:       "Recette extraite avec succès!",
		Data:          recipeData,
		ExtractedText: extractedText, // Inclure le texte brut pour référence/debug
	})
}

// containsRecipeKeywords vérifie si le texte extrait contient des mots-clés de recette
func (h *RecipeExtractionHandler) containsRecipeKeywords(text string) bool {
	lowerText := strings.ToLower(text)

	// Mots-clés français et anglais pour les recettes
	recipeKeywords := []string{
		// Français
		"ingrédients", "ingrédient", "préparation", "cuisson", "recette",
		"minutes", "grammes", "cuillères", "cuillère", "ml", "cl", "dl",
		"étapes", "étape", "mélanger", "ajouter", "verser", "cuisiner",
		"four", "plat", "casserole", "poêle", "portions", "personnes",
		"temps", "température", "degrés", "préchauffer", "servir",

		// Anglais
		"ingredients", "ingredient", "preparation", "cooking", "recipe",
		"minutes", "grams", "spoons", "spoon", "tablespoon", "teaspoon",
		"steps", "step", "mix", "add", "pour", "cook", "bake",
		"oven", "pan", "pot", "servings", "serves", "time",
		"temperature", "degrees", "preheat", "serve",
	}

	// Compter combien de mots-clés sont trouvés
	keywordCount := 0
	for _, keyword := range recipeKeywords {
		if strings.Contains(lowerText, keyword) {
			keywordCount++
			if keywordCount >= 3 { // Au moins 3 mots-clés pour considérer que c'est une recette
				return true
			}
		}
	}

	return false
}

// HealthCheck vérifie l'état des services d'extraction
// @Summary Vérifier l'état des services d'extraction
// @Description Vérifie que les services OCR et LLM sont opérationnels
// @Tags health
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Failure 503 {object} map[string]interface{}
// @Router /recipes/extraction/health [get]
func (h *RecipeExtractionHandler) HealthCheck(c *gin.Context) {
	health := map[string]interface{}{
		"ocr_service": "ok",
		"llm_service": "checking...",
		"status":      "ok",
	}

	// Vérifier le service LLM
	if err := h.llmService.CheckHealth(); err != nil {
		health["llm_service"] = fmt.Sprintf("error: %s", err.Error())
		health["status"] = "degraded"
		c.JSON(http.StatusServiceUnavailable, health)
		return
	}

	health["llm_service"] = "ok"
	c.JSON(http.StatusOK, health)
}
