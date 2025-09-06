package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/romainrodriguez/cooking_server/internal/api/middleware"
	"github.com/romainrodriguez/cooking_server/internal/dto"
	"github.com/romainrodriguez/cooking_server/internal/services/orm"
)

// FeedHandler gère les requêtes liées au feed personnalisé
type FeedHandler struct {
	ormService *orm.ORMService
}

// NewFeedHandler crée une nouvelle instance du handler feed
func NewFeedHandler(ormService *orm.ORMService) *FeedHandler {
	return &FeedHandler{
		ormService: ormService,
	}
}

// GetFollowingFeed récupère les recettes des utilisateurs suivis
// @Summary Récupérer le feed des utilisateurs suivis
// @Description Récupère les recettes publiques des utilisateurs suivis par l'utilisateur connecté
// @Tags Feed
// @Accept json
// @Produce json
// @Param page query int false "Numéro de page (défaut: 1)"
// @Param limit query int false "Nombre d'éléments par page (défaut: 10)"
// @Success 200 {object} dto.RecipeListResponse "Recettes du feed"
// @Failure 401 {object} map[string]interface{} "Non authentifié"
// @Failure 500 {object} map[string]interface{} "Erreur serveur"
// @Security ApiKeyAuth
// @Router /feed/following [get]
func (h *FeedHandler) GetFollowingFeed(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Authentication required",
			"message": "User information not found in token",
		})
		return
	}

	// Paramètres de pagination
	page := 1
	limit := 10

	if pageStr := c.Query("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	offset := (page - 1) * limit

	// Récupérer les recettes des utilisateurs suivis
	recipes, total, err := h.ormService.UserFollowRepository.GetFollowingRecipes(c.Request.Context(), userID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to retrieve following feed",
		})
		return
	}

	// Convertir en slice de valeurs
	var recipesList []dto.Recipe
	for _, recipe := range recipes {
		recipesList = append(recipesList, *recipe)
	}

	totalPages := int((total + int64(limit) - 1) / int64(limit))

	response := dto.RecipeListResponse{
		Success: true,
		Data: struct {
			Recipes     []dto.Recipe `json:"recipes"`
			TotalCount  int64        `json:"total_count"`
			CurrentPage int          `json:"current_page"`
			TotalPages  int          `json:"total_pages"`
			HasNext     bool         `json:"has_next"`
			HasPrev     bool         `json:"has_prev"`
		}{
			Recipes:     recipesList,
			TotalCount:  total,
			CurrentPage: page,
			TotalPages:  totalPages,
			HasNext:     page < totalPages,
			HasPrev:     page > 1,
		},
	}

	c.JSON(http.StatusOK, response)
}

// GetFollowingFeedGrouped récupère les recettes des utilisateurs suivis groupées par auteur
// @Summary Récupérer le feed groupé par utilisateur
// @Description Récupère les recettes publiques des utilisateurs suivis groupées par auteur
// @Tags Feed
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "Recettes groupées par utilisateur"
// @Failure 401 {object} map[string]interface{} "Non authentifié"
// @Failure 500 {object} map[string]interface{} "Erreur serveur"
// @Security ApiKeyAuth
// @Router /feed/following/grouped [get]
func (h *FeedHandler) GetFollowingFeedGrouped(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Authentication required",
			"message": "User information not found in token",
		})
		return
	}

	// Récupérer les utilisateurs suivis
	following, _, err := h.ormService.UserFollowRepository.GetFollowing(c.Request.Context(), userID, 100, 0)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to retrieve following users",
		})
		return
	}

	type UserFeed struct {
		User    dto.User     `json:"user"`
		Recipes []dto.Recipe `json:"recipes"`
	}

	var groupedFeed []UserFeed

	// Pour chaque utilisateur suivi, récupérer ses dernières recettes
	for _, followedUser := range following {
		userRecipes, _, err := h.ormService.RecipeRepository.GetByAuthor(c.Request.Context(), followedUser.ID, 3, 0)
		if err != nil {
			continue // Ignorer les erreurs pour un utilisateur spécifique
		}

		// Filtrer pour ne garder que les recettes publiques
		var publicRecipes []dto.Recipe
		for _, recipe := range userRecipes {
			if recipe.IsPublic {
				publicRecipes = append(publicRecipes, *recipe)
			}
		}

		// Ajouter seulement si l'utilisateur a des recettes publiques
		if len(publicRecipes) > 0 {
			groupedFeed = append(groupedFeed, UserFeed{
				User:    *followedUser,
				Recipes: publicRecipes,
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    groupedFeed,
	})
}
