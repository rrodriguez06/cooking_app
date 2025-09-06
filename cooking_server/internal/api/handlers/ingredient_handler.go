package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/romainrodriguez/cooking_server/internal/dto"
	"github.com/romainrodriguez/cooking_server/internal/services/orm"
	ormerrors "github.com/romainrodriguez/cooking_server/internal/services/orm/errors"
)

// IngredientHandler gère les requêtes liées aux ingrédients
type IngredientHandler struct {
	ormService *orm.ORMService
}

// NewIngredientHandler crée une nouvelle instance du handler ingrédient
func NewIngredientHandler(ormService *orm.ORMService) *IngredientHandler {
	return &IngredientHandler{
		ormService: ormService,
	}
}

// CreateIngredient crée un nouvel ingrédient
// @Summary Créer un nouvel ingrédient
// @Description Crée un nouvel ingrédient utilisable dans les recettes
// @Tags Ingredients
// @Accept json
// @Produce json
// @Param ingredient body dto.IngredientCreateRequest true "Informations de l'ingrédient"
// @Success 201 {object} dto.IngredientResponse "Ingrédient créé avec succès"
// @Failure 400 {object} dto.ErrorResponse "Requête invalide"
// @Failure 409 {object} dto.ErrorResponse "Ingrédient déjà existant"
// @Failure 500 {object} dto.ErrorResponse "Erreur serveur"
// @Router /ingredients [post]
func (h *IngredientHandler) CreateIngredient(c *gin.Context) {
	var request dto.IngredientCreateRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Success: false,
			Error:   "Invalid input",
			Message: err.Error(),
		})
		return
	}

	ingredient := &dto.Ingredient{
		Name:        request.Name,
		Description: request.Description,
		Category:    request.Category,
		Icon:        request.Icon,
	}

	if err := h.ormService.IngredientRepository.Create(c.Request.Context(), ingredient); err != nil {
		switch {
		case errors.Is(err, ormerrors.ErrDuplicateEntry):
			c.JSON(http.StatusConflict, dto.ErrorResponse{
				Success: false,
				Error:   "Ingredient already exists",
				Message: "An ingredient with this name already exists",
			})
		default:
			c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
				Success: false,
				Error:   "Internal server error",
				Message: "Failed to create ingredient",
			})
		}
		return
	}

	c.JSON(http.StatusCreated, dto.IngredientResponse{
		Success: true,
		Data:    *ingredient,
	})
}

// GetIngredient récupère un ingrédient par son ID
// @Summary Récupérer un ingrédient
// @Description Récupère les détails d'un ingrédient par son ID
// @Tags Ingredients
// @Accept json
// @Produce json
// @Param id path int true "ID de l'ingrédient"
// @Success 200 {object} dto.IngredientResponse "Ingrédient trouvé"
// @Failure 400 {object} dto.ErrorResponse "ID invalide"
// @Failure 404 {object} dto.ErrorResponse "Ingrédient non trouvé"
// @Failure 500 {object} dto.ErrorResponse "Erreur serveur"
// @Router /ingredients/{id} [get]
func (h *IngredientHandler) GetIngredient(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Success: false,
			Error:   "Invalid ingredient ID",
			Message: "Ingredient ID must be a number",
		})
		return
	}

	ingredient, err := h.ormService.IngredientRepository.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		switch {
		case errors.Is(err, ormerrors.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, dto.ErrorResponse{
				Success: false,
				Error:   "Ingredient not found",
				Message: "No ingredient found with this ID",
			})
		default:
			c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
				Success: false,
				Error:   "Internal server error",
				Message: "Failed to retrieve ingredient",
			})
		}
		return
	}

	c.JSON(http.StatusOK, dto.IngredientResponse{
		Success: true,
		Data:    *ingredient,
	})
}

// UpdateIngredient met à jour un ingrédient
// @Summary Mettre à jour un ingrédient
// @Description Met à jour les informations d'un ingrédient existant
// @Tags Ingredients
// @Accept json
// @Produce json
// @Param id path uint true "ID de l'ingrédient"
// @Param ingredient body dto.IngredientUpdateRequest true "Données de l'ingrédient à mettre à jour"
// @Success 200 {object} dto.IngredientResponse "Ingrédient mis à jour avec succès"
// @Failure 400 {object} dto.ErrorResponse "Requête invalide"
// @Failure 404 {object} dto.ErrorResponse "Ingrédient non trouvé"
// @Failure 409 {object} dto.ErrorResponse "Conflit - nom d'ingrédient déjà utilisé"
// @Failure 500 {object} dto.ErrorResponse "Erreur serveur"
// @Router /ingredients/{id} [put]
func (h *IngredientHandler) UpdateIngredient(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Success: false,
			Error:   "Invalid ingredient ID",
			Message: "Ingredient ID must be a number",
		})
		return
	}

	var request dto.IngredientUpdateRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Success: false,
			Error:   "Invalid input",
			Message: err.Error(),
		})
		return
	}

	// Récupérer l'ingrédient existant
	ingredient, err := h.ormService.IngredientRepository.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		switch {
		case errors.Is(err, ormerrors.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, dto.ErrorResponse{
				Success: false,
				Error:   "Ingredient not found",
				Message: "No ingredient found with this ID",
			})
		default:
			c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
				Success: false,
				Error:   "Internal server error",
				Message: "Failed to retrieve ingredient",
			})
		}
		return
	}

	// Mettre à jour les champs si ils sont fournis
	if request.Name != "" {
		ingredient.Name = request.Name
	}
	if request.Description != "" {
		ingredient.Description = request.Description
	}
	if request.Category != "" {
		ingredient.Category = request.Category
	}
	if request.Icon != "" {
		ingredient.Icon = request.Icon
	}

	err = h.ormService.IngredientRepository.Update(c.Request.Context(), ingredient)
	if err != nil {
		switch {
		case errors.Is(err, ormerrors.ErrDuplicateEntry):
			c.JSON(http.StatusConflict, dto.ErrorResponse{
				Success: false,
				Error:   "Ingredient already exists",
				Message: "An ingredient with this name already exists",
			})
		default:
			c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
				Success: false,
				Error:   "Internal server error",
				Message: "Failed to update ingredient",
			})
		}
		return
	}

	c.JSON(http.StatusOK, dto.IngredientResponse{
		Success: true,
		Data:    *ingredient,
	})
}

// DeleteIngredient supprime un ingrédient
// @Summary Supprimer un ingrédient
// @Description Supprime un ingrédient par son ID
// @Tags Ingredients
// @Accept json
// @Produce json
// @Param id path uint true "ID de l'ingrédient"
// @Success 200 {object} dto.MessageResponse "Ingrédient supprimé avec succès"
// @Failure 400 {object} dto.ErrorResponse "ID invalide"
// @Failure 404 {object} dto.ErrorResponse "Ingrédient non trouvé"
// @Failure 500 {object} dto.ErrorResponse "Erreur serveur"
// @Router /ingredients/{id} [delete]
func (h *IngredientHandler) DeleteIngredient(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Success: false,
			Error:   "Invalid ingredient ID",
			Message: "Ingredient ID must be a number",
		})
		return
	}

	if err := h.ormService.IngredientRepository.Delete(c.Request.Context(), uint(id)); err != nil {
		switch {
		case errors.Is(err, ormerrors.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, dto.ErrorResponse{
				Success: false,
				Error:   "Ingredient not found",
				Message: "No ingredient found with this ID",
			})
		default:
			c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
				Success: false,
				Error:   "Internal server error",
				Message: "Failed to delete ingredient",
			})
		}
		return
	}

	c.JSON(http.StatusOK, dto.MessageResponse{
		Success: true,
		Message: "Ingredient deleted successfully",
	})
}

// ListIngredients liste les ingrédients avec pagination
// @Summary Lister les ingrédients
// @Description Récupère une liste paginée de tous les ingrédients disponibles
// @Tags Ingredients
// @Accept json
// @Produce json
// @Param page query int false "Numéro de page (défaut: 1)"
// @Param limit query int false "Nombre d'éléments par page (défaut: 50)"
// @Success 200 {object} dto.IngredientListResponse "Liste des ingrédients"
// @Failure 500 {object} dto.ErrorResponse "Erreur serveur"
// @Router /ingredients [get]
func (h *IngredientHandler) ListIngredients(c *gin.Context) {
	// Paramètres de pagination
	page := 1
	limit := 50 // Plus élevé pour les ingrédients

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

	ingredientPointers, total, err := h.ormService.IngredientRepository.List(c.Request.Context(), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Success: false,
			Error:   "Internal server error",
			Message: "Failed to retrieve ingredients",
		})
		return
	}

	// Convert []*dto.Ingredient to []dto.Ingredient
	ingredients := make([]dto.Ingredient, len(ingredientPointers))
	for i, ingredientPtr := range ingredientPointers {
		ingredients[i] = *ingredientPtr
	}

	totalPages := int((total + int64(limit) - 1) / int64(limit))

	response := dto.IngredientListResponse{
		Success: true,
	}
	response.Data.Ingredients = ingredients
	response.Data.TotalCount = total
	response.Data.CurrentPage = page
	response.Data.TotalPages = totalPages
	response.Data.HasNext = page < totalPages
	response.Data.HasPrev = page > 1

	c.JSON(http.StatusOK, response)
}

// SearchIngredients recherche des ingrédients par nom (autocomplétion)
// @Summary Rechercher des ingrédients
// @Description Recherche des ingrédients par nom pour l'autocomplétion
// @Tags Ingredients
// @Accept json
// @Produce json
// @Param q query string true "Terme de recherche"
// @Param limit query int false "Limite de résultats (défaut: 10, max: 50)"
// @Success 200 {object} dto.IngredientSearchResponse "Résultats de recherche"
// @Failure 400 {object} dto.ErrorResponse "Paramètre de recherche manquant"
// @Failure 500 {object} dto.ErrorResponse "Erreur serveur"
// @Router /ingredients/search [get]
func (h *IngredientHandler) SearchIngredients(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Success: false,
			Error:   "Missing query parameter",
			Message: "The 'q' parameter is required for search",
		})
		return
	}

	limit := 10
	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 50 {
			limit = l
		}
	}

	ingredientPointers, err := h.ormService.IngredientRepository.SearchByName(c.Request.Context(), query, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Success: false,
			Error:   "Internal server error",
			Message: "Search failed",
		})
		return
	}

	// Convert []*dto.Ingredient to []dto.Ingredient
	ingredients := make([]dto.Ingredient, len(ingredientPointers))
	for i, ingredientPtr := range ingredientPointers {
		ingredients[i] = *ingredientPtr
	}

	response := dto.IngredientSearchResponse{
		Success: true,
	}
	response.Data.Ingredients = ingredients
	response.Data.Query = query
	response.Data.TotalCount = len(ingredients)

	c.JSON(http.StatusOK, response)
}
