package handlers

import (
	"fmt"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/romainrodriguez/cooking_server/internal/dto"
)

// buildFullImageURL convertit une URL relative d'image en URL complète
func buildFullImageURL(c *gin.Context, imageURL string) string {
	if imageURL == "" {
		return ""
	}

	// Si c'est déjà une URL complète, la retourner telle quelle
	if strings.HasPrefix(imageURL, "http://") || strings.HasPrefix(imageURL, "https://") {
		return imageURL
	}

	// Si c'est une URL relative, construire l'URL complète
	if strings.HasPrefix(imageURL, "/") {
		baseURL := getBaseURL(c)
		return fmt.Sprintf("%s%s", baseURL, imageURL)
	}

	// Si ce n'est ni relatif ni absolu, considérer comme relatif et ajouter le préfixe
	baseURL := getBaseURL(c)
	return fmt.Sprintf("%s/uploads/images/%s", baseURL, imageURL)
}

// processRecipeImageURL traite l'URL d'image d'une recette
func processRecipeImageURL(c *gin.Context, recipe *dto.Recipe) {
	if recipe.ImageURL != "" {
		recipe.ImageURL = buildFullImageURL(c, recipe.ImageURL)
	}
}

// processRecipesImageURLs traite les URLs d'images pour une liste de recettes
func processRecipesImageURLs(c *gin.Context, recipes []*dto.Recipe) {
	for _, recipe := range recipes {
		processRecipeImageURL(c, recipe)
	}
}

// processRecipesSliceImageURLs traite les URLs d'images pour une slice de recettes (sans pointeurs)
func processRecipesSliceImageURLs(c *gin.Context, recipes []dto.Recipe) {
	for i := range recipes {
		processRecipeImageURL(c, &recipes[i])
	}
}

// getBaseURL construit l'URL de base du serveur
func getBaseURL(c *gin.Context) string {
	scheme := "http"
	if c.Request.TLS != nil {
		scheme = "https"
	}

	// Vérifier s'il y a un header X-Forwarded-Proto (pour les proxies/load balancers)
	if proto := c.GetHeader("X-Forwarded-Proto"); proto != "" {
		scheme = proto
	}

	host := c.Request.Host
	return fmt.Sprintf("%s://%s", scheme, host)
}
