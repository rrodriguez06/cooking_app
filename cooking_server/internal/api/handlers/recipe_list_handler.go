package handlers

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/romainrodriguez/cooking_server/internal/dto"
	"github.com/romainrodriguez/cooking_server/internal/services/orm"
	ormerrors "github.com/romainrodriguez/cooking_server/internal/services/orm/errors"
)

type RecipeListHandler struct {
	ormService *orm.ORMService
}

// NewRecipeListHandler crée une nouvelle instance du handler des listes de recettes
func NewRecipeListHandler(ormService *orm.ORMService) *RecipeListHandler {
	return &RecipeListHandler{
		ormService: ormService,
	}
}

// CreateRecipeList crée une nouvelle liste de recettes
// @Summary Créer une nouvelle liste de recettes
// @Description Crée une nouvelle liste personnalisée de recettes pour l'utilisateur connecté
// @Tags recipe-lists
// @Accept json
// @Produce json
// @Param list body dto.RecipeListCreateRequest true "Données de la liste à créer"
// @Success 201 {object} dto.CustomRecipeListResponse "Liste créée avec succès"
// @Failure 400 {object} gin.H "Requête invalide"
// @Failure 401 {object} gin.H "Non autorisé"
// @Failure 500 {object} gin.H "Erreur serveur"
// @Router /api/recipe-lists [post]
func (h *RecipeListHandler) CreateRecipeList(c *gin.Context) {
	// Récupérer l'utilisateur connecté
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Unauthorized",
			"message": "User not authenticated",
		})
		return
	}

	var req dto.RecipeListCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request",
			"message": err.Error(),
		})
		return
	}

	userIDUint := userID.(uint)
	list := &dto.RecipeList{
		Name:        req.Name,
		Description: req.Description,
		IsPublic:    req.IsPublic,
		UserID:      userIDUint,
	}

	if err := h.ormService.RecipeListRepository.Create(c.Request.Context(), list); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Database error",
			"message": "Failed to create recipe list",
		})
		return
	}

	c.JSON(http.StatusCreated, dto.CustomRecipeListResponse{
		Success: true,
		Message: "Recipe list created successfully",
		Data:    *list,
	})
}

// GetRecipeList récupère une liste de recettes par son ID
// @Summary Récupérer une liste de recettes
// @Description Récupère une liste de recettes avec toutes ses recettes
// @Tags recipe-lists
// @Produce json
// @Param id path int true "ID de la liste"
// @Success 200 {object} dto.CustomRecipeListResponse "Liste récupérée avec succès"
// @Failure 400 {object} gin.H "Requête invalide"
// @Failure 404 {object} gin.H "Liste non trouvée"
// @Failure 500 {object} gin.H "Erreur serveur"
// @Router /api/recipe-lists/{id} [get]
func (h *RecipeListHandler) GetRecipeList(c *gin.Context) {
	listIDStr := c.Param("id")
	listID, err := strconv.ParseUint(listIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid list ID",
			"message": "List ID must be a valid number",
		})
		return
	}

	list, err := h.ormService.RecipeListRepository.GetByID(c.Request.Context(), uint(listID))
	if err != nil {
		if errors.Is(err, ormerrors.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "Not found",
				"message": "Recipe list not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Database error",
			"message": "Failed to get recipe list",
		})
		return
	}

	c.JSON(http.StatusOK, dto.CustomRecipeListResponse{
		Success: true,
		Data:    *list,
	})
}

// GetUserRecipeLists récupère les listes de recettes de l'utilisateur connecté
// @Summary Récupérer les listes de l'utilisateur
// @Description Récupère toutes les listes de recettes de l'utilisateur connecté avec pagination
// @Tags recipe-lists
// @Produce json
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(10)
// @Success 200 {object} dto.CustomRecipeListsResponse "Listes récupérées avec succès"
// @Failure 401 {object} gin.H "Non autorisé"
// @Failure 500 {object} gin.H "Erreur serveur"
// @Router /api/recipe-lists [get]
func (h *RecipeListHandler) GetUserRecipeLists(c *gin.Context) {
	log.Printf("[RECIPE_LIST_HANDLER] GetUserRecipeLists called - Request: %s %s", c.Request.Method, c.Request.URL.Path)

	// Récupérer l'utilisateur connecté
	userID, exists := c.Get("user_id")
	if !exists {
		log.Printf("[RECIPE_LIST_HANDLER] Error: User not authenticated")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Unauthorized",
			"message": "User not authenticated",
		})
		return
	}
	log.Printf("[RECIPE_LIST_HANDLER] User authenticated - UserID: %v", userID)

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
	log.Printf("[RECIPE_LIST_HANDLER] Pagination params - Page: %d, Limit: %d, Offset: %d", page, limit, offset)

	log.Printf("[RECIPE_LIST_HANDLER] Calling repository GetByUser...")
	lists, total, err := h.ormService.RecipeListRepository.GetByUser(c.Request.Context(), userIDUint, limit, offset)
	if err != nil {
		log.Printf("[RECIPE_LIST_HANDLER] Error from repository: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Database error",
			"message": "Failed to get user recipe lists",
		})
		return
	}
	log.Printf("[RECIPE_LIST_HANDLER] Repository call successful - Lists: %d, Total: %d", len(lists), total)

	// Calculer les métadonnées de pagination
	totalPages := int((total + int64(limit) - 1) / int64(limit))
	hasNext := page < totalPages
	hasPrev := page > 1

	log.Printf("[RECIPE_LIST_HANDLER] Sending response with %d lists", len(lists))
	c.JSON(http.StatusOK, dto.CustomRecipeListsResponse{
		Success: true,
		Data: struct {
			Lists       []dto.RecipeList `json:"lists"`
			TotalCount  int64            `json:"total_count"`
			CurrentPage int              `json:"current_page"`
			TotalPages  int              `json:"total_pages"`
			HasNext     bool             `json:"has_next"`
			HasPrev     bool             `json:"has_prev"`
		}{
			Lists:       convertRecipeListPointerSlice(lists),
			TotalCount:  total,
			CurrentPage: page,
			TotalPages:  totalPages,
			HasNext:     hasNext,
			HasPrev:     hasPrev,
		},
	})
}

// UpdateRecipeList met à jour une liste de recettes
// @Summary Mettre à jour une liste de recettes
// @Description Met à jour les informations d'une liste de recettes (nom, description, visibilité)
// @Tags recipe-lists
// @Accept json
// @Produce json
// @Param id path int true "ID de la liste"
// @Param list body dto.RecipeListUpdateRequest true "Nouvelles données de la liste"
// @Success 200 {object} dto.CustomRecipeListResponse "Liste mise à jour avec succès"
// @Failure 400 {object} gin.H "Requête invalide"
// @Failure 401 {object} gin.H "Non autorisé"
// @Failure 403 {object} gin.H "Accès interdit"
// @Failure 404 {object} gin.H "Liste non trouvée"
// @Failure 500 {object} gin.H "Erreur serveur"
// @Router /api/recipe-lists/{id} [put]
func (h *RecipeListHandler) UpdateRecipeList(c *gin.Context) {
	// Récupérer l'utilisateur connecté
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Unauthorized",
			"message": "User not authenticated",
		})
		return
	}

	listIDStr := c.Param("id")
	listID, err := strconv.ParseUint(listIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid list ID",
			"message": "List ID must be a valid number",
		})
		return
	}

	var req dto.RecipeListUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request",
			"message": err.Error(),
		})
		return
	}

	// Récupérer la liste existante pour vérifier les permissions
	list, err := h.ormService.RecipeListRepository.GetByID(c.Request.Context(), uint(listID))
	if err != nil {
		if errors.Is(err, ormerrors.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "Not found",
				"message": "Recipe list not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Database error",
			"message": "Failed to get recipe list",
		})
		return
	}

	// Vérifier que l'utilisateur est propriétaire de la liste
	userIDUint := userID.(uint)
	if list.UserID != userIDUint {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "Forbidden",
			"message": "You don't have permission to modify this list",
		})
		return
	}

	// Mettre à jour les champs modifiables
	if req.Name != "" {
		list.Name = req.Name
	}
	list.Description = req.Description
	list.IsPublic = req.IsPublic

	if err := h.ormService.RecipeListRepository.Update(c.Request.Context(), list); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Database error",
			"message": "Failed to update recipe list",
		})
		return
	}

	c.JSON(http.StatusOK, dto.CustomRecipeListResponse{
		Success: true,
		Message: "Recipe list updated successfully",
		Data:    *list,
	})
}

// DeleteRecipeList supprime une liste de recettes
// @Summary Supprimer une liste de recettes
// @Description Supprime définitivement une liste de recettes et toutes ses associations
// @Tags recipe-lists
// @Produce json
// @Param id path int true "ID de la liste"
// @Success 200 {object} gin.H "Liste supprimée avec succès"
// @Failure 400 {object} gin.H "Requête invalide"
// @Failure 401 {object} gin.H "Non autorisé"
// @Failure 403 {object} gin.H "Accès interdit"
// @Failure 404 {object} gin.H "Liste non trouvée"
// @Failure 500 {object} gin.H "Erreur serveur"
// @Router /api/recipe-lists/{id} [delete]
func (h *RecipeListHandler) DeleteRecipeList(c *gin.Context) {
	// Récupérer l'utilisateur connecté
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Unauthorized",
			"message": "User not authenticated",
		})
		return
	}

	listIDStr := c.Param("id")
	listID, err := strconv.ParseUint(listIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid list ID",
			"message": "List ID must be a valid number",
		})
		return
	}

	// Récupérer la liste existante pour vérifier les permissions
	list, err := h.ormService.RecipeListRepository.GetByID(c.Request.Context(), uint(listID))
	if err != nil {
		if errors.Is(err, ormerrors.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "Not found",
				"message": "Recipe list not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Database error",
			"message": "Failed to get recipe list",
		})
		return
	}

	// Vérifier que l'utilisateur est propriétaire de la liste
	userIDUint := userID.(uint)
	if list.UserID != userIDUint {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "Forbidden",
			"message": "You don't have permission to delete this list",
		})
		return
	}

	if err := h.ormService.RecipeListRepository.Delete(c.Request.Context(), uint(listID)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Database error",
			"message": "Failed to delete recipe list",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Recipe list deleted successfully",
	})
}

// AddRecipeToList ajoute une recette à une liste
// @Summary Ajouter une recette à une liste
// @Description Ajoute une recette à une liste personnalisée avec des notes optionnelles
// @Tags recipe-lists
// @Accept json
// @Produce json
// @Param id path int true "ID de la liste"
// @Param recipe body dto.AddRecipeToListRequest true "Données de la recette à ajouter"
// @Success 200 {object} gin.H "Recette ajoutée avec succès"
// @Failure 400 {object} gin.H "Requête invalide"
// @Failure 401 {object} gin.H "Non autorisé"
// @Failure 403 {object} gin.H "Accès interdit"
// @Failure 404 {object} gin.H "Liste ou recette non trouvée"
// @Failure 409 {object} gin.H "Recette déjà dans la liste"
// @Failure 500 {object} gin.H "Erreur serveur"
// @Router /api/recipe-lists/{id}/recipes [post]
func (h *RecipeListHandler) AddRecipeToList(c *gin.Context) {
	log.Printf("[RECIPE_LIST] AddRecipeToList called - Request: %s %s", c.Request.Method, c.Request.URL.Path)

	// Récupérer l'utilisateur connecté
	userID, exists := c.Get("user_id")
	if !exists {
		log.Printf("[RECIPE_LIST] Error: User not authenticated")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Unauthorized",
			"message": "User not authenticated",
		})
		return
	}
	log.Printf("[RECIPE_LIST] User authenticated - UserID: %v", userID)

	listIDStr := c.Param("id")
	log.Printf("[RECIPE_LIST] List ID from params: %s", listIDStr)

	listID, err := strconv.ParseUint(listIDStr, 10, 32)
	if err != nil {
		log.Printf("[RECIPE_LIST] Error parsing list ID: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid list ID",
			"message": "List ID must be a valid number",
		})
		return
	}

	var req dto.AddRecipeToListRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("[RECIPE_LIST] Error binding JSON: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request",
			"message": err.Error(),
		})
		return
	}
	log.Printf("[RECIPE_LIST] Parsed request - ListID: %d, RecipeID: %d, Notes: %s, Position: %d", listID, req.RecipeID, req.Notes, req.Position)

	// Vérifier que l'utilisateur est propriétaire de la liste
	log.Printf("[RECIPE_LIST] Checking if user owns the list...")
	list, err := h.ormService.RecipeListRepository.GetByID(c.Request.Context(), uint(listID))
	if err != nil {
		log.Printf("[RECIPE_LIST] Error getting list: %v", err)
		if errors.Is(err, ormerrors.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "Not found",
				"message": "Recipe list not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Database error",
			"message": "Failed to get recipe list",
		})
		return
	}

	userIDUint := userID.(uint)
	if list.UserID != userIDUint {
		log.Printf("[RECIPE_LIST] Permission denied - List owner: %d, User: %d", list.UserID, userIDUint)
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "Forbidden",
			"message": "You don't have permission to modify this list",
		})
		return
	}
	log.Printf("[RECIPE_LIST] User owns the list, proceeding with adding recipe...")

	log.Printf("[RECIPE_LIST] Adding recipe to list...")
	if err := h.ormService.RecipeListRepository.AddRecipe(c.Request.Context(), uint(listID), req.RecipeID, req.Notes, req.Position); err != nil {
		log.Printf("[RECIPE_LIST] Error adding recipe to list: %v", err)
		if errors.Is(err, ormerrors.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "Not found",
				"message": "Recipe not found",
			})
			return
		}
		if errors.Is(err, ormerrors.ErrDuplicateEntry) {
			c.JSON(http.StatusConflict, gin.H{
				"error":   "Conflict",
				"message": "Recipe already in list",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Database error",
			"message": "Failed to add recipe to list",
		})
		return
	}

	log.Printf("[RECIPE_LIST] Recipe added to list successfully")
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Recipe added to list successfully",
	})
}

// RemoveRecipeFromList supprime une recette d'une liste
// @Summary Supprimer une recette d'une liste
// @Description Supprime une recette d'une liste personnalisée
// @Tags recipe-lists
// @Produce json
// @Param id path int true "ID de la liste"
// @Param recipe_id path int true "ID de la recette"
// @Success 200 {object} gin.H "Recette supprimée avec succès"
// @Failure 400 {object} gin.H "Requête invalide"
// @Failure 401 {object} gin.H "Non autorisé"
// @Failure 403 {object} gin.H "Accès interdit"
// @Failure 404 {object} gin.H "Liste ou recette non trouvée"
// @Failure 500 {object} gin.H "Erreur serveur"
// @Router /api/recipe-lists/{id}/recipes/{recipe_id} [delete]
func (h *RecipeListHandler) RemoveRecipeFromList(c *gin.Context) {
	// Récupérer l'utilisateur connecté
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Unauthorized",
			"message": "User not authenticated",
		})
		return
	}

	listIDStr := c.Param("id")
	listID, err := strconv.ParseUint(listIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid list ID",
			"message": "List ID must be a valid number",
		})
		return
	}

	recipeIDStr := c.Param("recipe_id")
	recipeID, err := strconv.ParseUint(recipeIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid recipe ID",
			"message": "Recipe ID must be a valid number",
		})
		return
	}

	fmt.Printf("DEBUG: RemoveRecipeFromList - listID: %d, recipeID: %d, userID: %v\n", listID, recipeID, userID)

	// Vérifier que l'utilisateur est propriétaire de la liste
	list, err := h.ormService.RecipeListRepository.GetByID(c.Request.Context(), uint(listID))
	if err != nil {
		if errors.Is(err, ormerrors.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "Not found",
				"message": "Recipe list not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Database error",
			"message": "Failed to get recipe list",
		})
		return
	}

	userIDUint := userID.(uint)
	if list.UserID != userIDUint {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "Forbidden",
			"message": "You don't have permission to modify this list",
		})
		return
	}

	if err := h.ormService.RecipeListRepository.RemoveRecipe(c.Request.Context(), uint(listID), uint(recipeID)); err != nil {
		if errors.Is(err, ormerrors.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "Not found",
				"message": "Recipe not found in list",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Database error",
			"message": "Failed to remove recipe from list",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Recipe removed from list successfully",
	})
}

// Helper function pour convertir []*dto.RecipeList en []dto.RecipeList
func convertRecipeListPointerSlice(lists []*dto.RecipeList) []dto.RecipeList {
	result := make([]dto.RecipeList, len(lists))
	for i, list := range lists {
		if list != nil {
			result[i] = *list
		}
	}
	return result
}
