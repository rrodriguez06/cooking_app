package handlers

import (
	"errors"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/romainrodriguez/cooking_server/internal/dto"
	"github.com/romainrodriguez/cooking_server/internal/services/orm"
	ormerrors "github.com/romainrodriguez/cooking_server/internal/services/orm/errors"
)

type FavoriteHandler struct {
	ormService *orm.ORMService
}

// NewFavoriteHandler crée une nouvelle instance du handler des favoris
func NewFavoriteHandler(ormService *orm.ORMService) *FavoriteHandler {
	return &FavoriteHandler{
		ormService: ormService,
	}
}

// ToggleFavorite ajoute ou supprime une recette des favoris d'un utilisateur
// @Summary Ajouter/Supprimer une recette des favoris
// @Description Toggle le statut favori d'une recette pour l'utilisateur connecté
// @Tags favorites
// @Accept json
// @Produce json
// @Param recipe_id path int true "ID de la recette"
// @Success 200 {object} dto.FavoriteStatusResponse "Statut du favori mis à jour"
// @Failure 400 {object} ErrorResponse "Requête invalide"
// @Failure 401 {object} ErrorResponse "Non autorisé"
// @Failure 404 {object} ErrorResponse "Recette non trouvée"
// @Failure 500 {object} ErrorResponse "Erreur serveur"
// @Router /api/favorites/{recipe_id} [post]
func (h *FavoriteHandler) ToggleFavorite(c *gin.Context) {
	log.Printf("[FAVORITE] ToggleFavorite called - Request: %s %s", c.Request.Method, c.Request.URL.Path)

	// Récupérer l'utilisateur connecté
	userID, exists := c.Get("user_id")
	if !exists {
		log.Printf("[FAVORITE] Error: User not authenticated")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Unauthorized",
			"message": "User not authenticated",
		})
		return
	}
	log.Printf("[FAVORITE] User authenticated - UserID: %v", userID)

	// Récupérer l'ID de la recette
	recipeIDStr := c.Param("recipe_id")
	log.Printf("[FAVORITE] Recipe ID from params: %s", recipeIDStr)

	recipeID, err := strconv.ParseUint(recipeIDStr, 10, 32)
	if err != nil {
		log.Printf("[FAVORITE] Error parsing recipe ID: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid recipe ID",
			"message": "Recipe ID must be a valid number",
		})
		return
	}

	userIDUint := userID.(uint)
	recipeIDUint := uint(recipeID)
	log.Printf("[FAVORITE] Parsed IDs - UserID: %d, RecipeID: %d", userIDUint, recipeIDUint)

	// Vérifier si la recette est déjà en favori
	log.Printf("[FAVORITE] Checking if recipe is already favorite...")
	isFavorite, err := h.ormService.UserFavoriteRecipeRepository.IsFavorite(c.Request.Context(), userIDUint, recipeIDUint)
	if err != nil {
		log.Printf("[FAVORITE] Error checking favorite status: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Database error",
			"message": "Failed to check favorite status",
		})
		return
	}
	log.Printf("[FAVORITE] Current favorite status: %t", isFavorite)

	// Toggle le statut
	if isFavorite {
		// Supprimer des favoris
		log.Printf("[FAVORITE] Removing recipe from favorites...")
		if err := h.ormService.UserFavoriteRecipeRepository.RemoveFavorite(c.Request.Context(), userIDUint, recipeIDUint); err != nil {
			log.Printf("[FAVORITE] Error removing from favorites: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Database error",
				"message": "Failed to remove from favorites",
			})
			return
		}
		log.Printf("[FAVORITE] Successfully removed from favorites")
	} else {
		// Ajouter aux favoris
		log.Printf("[FAVORITE] Adding recipe to favorites...")
		if err := h.ormService.UserFavoriteRecipeRepository.AddFavorite(c.Request.Context(), userIDUint, recipeIDUint); err != nil {
			log.Printf("[FAVORITE] Error adding to favorites: %v", err)
			if errors.Is(err, ormerrors.ErrRecordNotFound) {
				log.Printf("[FAVORITE] Recipe not found error")
				c.JSON(http.StatusNotFound, gin.H{
					"error":   "Not found",
					"message": "Recipe not found",
				})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Database error",
				"message": "Failed to add to favorites",
			})
			return
		}
		log.Printf("[FAVORITE] Successfully added to favorites")
	}

	response := dto.FavoriteStatusResponse{
		Success:    true,
		IsFavorite: !isFavorite,
	}
	log.Printf("[FAVORITE] Sending response: %+v", response)
	c.JSON(http.StatusOK, response)
}

// GetFavoriteStatus vérifie si une recette est dans les favoris de l'utilisateur
// @Summary Vérifier le statut favori d'une recette
// @Description Vérifie si une recette est dans les favoris de l'utilisateur connecté
// @Tags favorites
// @Produce json
// @Param recipe_id path int true "ID de la recette"
// @Success 200 {object} dto.FavoriteStatusResponse "Statut du favori"
// @Failure 400 {object} ErrorResponse "Requête invalide"
// @Failure 401 {object} ErrorResponse "Non autorisé"
// @Failure 500 {object} ErrorResponse "Erreur serveur"
// @Router /api/favorites/{recipe_id}/status [get]
func (h *FavoriteHandler) GetFavoriteStatus(c *gin.Context) {
	log.Printf("[FAVORITE] GetFavoriteStatus called - Request: %s %s", c.Request.Method, c.Request.URL.Path)

	// Récupérer l'utilisateur connecté
	userID, exists := c.Get("user_id")
	if !exists {
		log.Printf("[FAVORITE] Error: User not authenticated")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Unauthorized",
			"message": "User not authenticated",
		})
		return
	}
	log.Printf("[FAVORITE] User authenticated - UserID: %v", userID)

	// Récupérer l'ID de la recette
	recipeIDStr := c.Param("recipe_id")
	log.Printf("[FAVORITE] Recipe ID from params: %s", recipeIDStr)

	recipeID, err := strconv.ParseUint(recipeIDStr, 10, 32)
	if err != nil {
		log.Printf("[FAVORITE] Error parsing recipe ID: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid recipe ID",
			"message": "Recipe ID must be a valid number",
		})
		return
	}

	userIDUint := userID.(uint)
	recipeIDUint := uint(recipeID)
	log.Printf("[FAVORITE] Parsed IDs - UserID: %d, RecipeID: %d", userIDUint, recipeIDUint)

	// Vérifier le statut favori
	log.Printf("[FAVORITE] Checking favorite status...")
	isFavorite, err := h.ormService.UserFavoriteRecipeRepository.IsFavorite(c.Request.Context(), userIDUint, recipeIDUint)
	if err != nil {
		log.Printf("[FAVORITE] Error checking favorite status: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Database error",
			"message": "Failed to check favorite status",
		})
		return
	}
	log.Printf("[FAVORITE] Favorite status: %t", isFavorite)

	response := dto.FavoriteStatusResponse{
		Success:    true,
		IsFavorite: isFavorite,
	}
	log.Printf("[FAVORITE] Sending response: %+v", response)
	c.JSON(http.StatusOK, response)
}

// GetUserFavorites récupère les recettes favorites de l'utilisateur connecté
// @Summary Récupérer les recettes favorites de l'utilisateur
// @Description Récupère la liste paginée des recettes favorites de l'utilisateur connecté
// @Tags favorites
// @Produce json
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(10)
// @Success 200 {object} dto.FavoriteRecipesResponse "Liste des recettes favorites"
// @Failure 401 {object} ErrorResponse "Non autorisé"
// @Failure 500 {object} ErrorResponse "Erreur serveur"
// @Router /api/favorites [get]
func (h *FavoriteHandler) GetUserFavorites(c *gin.Context) {
	// Récupérer l'utilisateur connecté
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Unauthorized",
			"message": "User not authenticated",
		})
		return
	}

	// Récupérer les paramètres de pagination
	page := 1
	if pageStr := c.Query("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	limit := 10
	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	offset := (page - 1) * limit
	userIDUint := userID.(uint)

	// Récupérer les favoris
	favorites, total, err := h.ormService.UserFavoriteRecipeRepository.GetUserFavorites(c.Request.Context(), userIDUint, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Database error",
			"message": "Failed to get user favorites",
		})
		return
	}

	// Calculer les métadonnées de pagination
	totalPages := int((total + int64(limit) - 1) / int64(limit))
	hasNext := page < totalPages
	hasPrev := page > 1

	c.JSON(http.StatusOK, dto.FavoriteRecipesResponse{
		Success: true,
		Data: struct {
			Recipes     []dto.Recipe `json:"recipes"`
			TotalCount  int64        `json:"total_count"`
			CurrentPage int          `json:"current_page"`
			TotalPages  int          `json:"total_pages"`
			HasNext     bool         `json:"has_next"`
			HasPrev     bool         `json:"has_prev"`
		}{
			Recipes:     convertRecipePointerSlice(favorites),
			TotalCount:  total,
			CurrentPage: page,
			TotalPages:  totalPages,
			HasNext:     hasNext,
			HasPrev:     hasPrev,
		},
	})
}

// Helper function pour convertir []*dto.Recipe en []dto.Recipe
func convertRecipePointerSlice(recipes []*dto.Recipe) []dto.Recipe {
	result := make([]dto.Recipe, len(recipes))
	for i, recipe := range recipes {
		if recipe != nil {
			result[i] = *recipe
		}
	}
	return result
}
