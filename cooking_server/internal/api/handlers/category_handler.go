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

// CategoryHandler gère les requêtes liées aux catégories
type CategoryHandler struct {
	ormService *orm.ORMService
}

// NewCategoryHandler crée une nouvelle instance du handler catégorie
func NewCategoryHandler(ormService *orm.ORMService) *CategoryHandler {
	return &CategoryHandler{
		ormService: ormService,
	}
}

// CreateCategory crée une nouvelle catégorie
// @Summary Créer une nouvelle catégorie
// @Description Crée une nouvelle catégorie de recettes
// @Tags Categories
// @Accept json
// @Produce json
// @Param category body dto.CategoryCreateRequest true "Informations de la catégorie"
// @Success 201 {object} dto.CategoryResponse "Catégorie créée avec succès"
// @Failure 400 {object} dto.ErrorResponse "Requête invalide"
// @Failure 409 {object} dto.ErrorResponse "Catégorie déjà existante"
// @Failure 500 {object} dto.ErrorResponse "Erreur serveur"
// @Router /categories [post]
func (h *CategoryHandler) CreateCategory(c *gin.Context) {
	var req dto.CategoryCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Success: false,
			Error:   "Invalid request",
			Message: err.Error(),
		})
		return
	}

	category := &dto.Category{
		Name:        req.Name,
		Description: req.Description,
		Color:       req.Color,
		Icon:        req.Icon,
	}

	if err := h.ormService.CategoryRepository.Create(c.Request.Context(), category); err != nil {
		switch {
		case errors.Is(err, ormerrors.ErrDuplicateEntry):
			c.JSON(http.StatusConflict, dto.ErrorResponse{
				Success: false,
				Error:   "Category already exists",
				Message: "A category with this name already exists",
			})
		default:
			c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
				Success: false,
				Error:   "Internal server error",
				Message: "Failed to create category",
			})
		}
		return
	}

	c.JSON(http.StatusCreated, dto.CategoryResponse{
		Success: true,
		Message: "Category created successfully",
		Data:    *category,
	})
}

// GetCategory récupère une catégorie par son ID
// @Summary Récupérer une catégorie
// @Description Récupère les détails d'une catégorie spécifique par son ID
// @Tags Categories
// @Accept json
// @Produce json
// @Param id path uint true "ID de la catégorie"
// @Success 200 {object} dto.CategoryResponse "Détails de la catégorie"
// @Failure 400 {object} dto.ErrorResponse "ID invalide"
// @Failure 404 {object} dto.ErrorResponse "Catégorie non trouvée"
// @Failure 500 {object} dto.ErrorResponse "Erreur serveur"
// @Router /categories/{id} [get]
func (h *CategoryHandler) GetCategory(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Success: false,
			Error:   "Invalid category ID",
			Message: "Category ID must be a number",
		})
		return
	}

	category, err := h.ormService.CategoryRepository.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		switch {
		case errors.Is(err, ormerrors.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, dto.ErrorResponse{
				Success: false,
				Error:   "Category not found",
				Message: "No category found with this ID",
			})
		default:
			c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
				Success: false,
				Error:   "Internal server error",
				Message: "Failed to retrieve category",
			})
		}
		return
	}

	c.JSON(http.StatusOK, dto.CategoryResponse{
		Success: true,
		Data:    *category,
	})
}

// UpdateCategory met à jour une catégorie
// @Summary Mettre à jour une catégorie
// @Description Met à jour les informations d'une catégorie existante
// @Tags Categories
// @Accept json
// @Produce json
// @Param id path uint true "ID de la catégorie"
// @Param category body dto.CategoryUpdateRequest true "Données de la catégorie à mettre à jour"
// @Success 200 {object} dto.CategoryResponse "Catégorie mise à jour avec succès"
// @Failure 400 {object} dto.ErrorResponse "Requête invalide"
// @Failure 404 {object} dto.ErrorResponse "Catégorie non trouvée"
// @Failure 409 {object} dto.ErrorResponse "Conflit - nom de catégorie déjà utilisé"
// @Failure 500 {object} dto.ErrorResponse "Erreur serveur"
// @Router /categories/{id} [put]
func (h *CategoryHandler) UpdateCategory(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Success: false,
			Error:   "Invalid category ID",
			Message: "Category ID must be a number",
		})
		return
	}

	category, err := h.ormService.CategoryRepository.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		switch {
		case errors.Is(err, ormerrors.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, dto.ErrorResponse{
				Success: false,
				Error:   "Category not found",
				Message: "No category found with this ID",
			})
		default:
			c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
				Success: false,
				Error:   "Internal server error",
				Message: "Failed to retrieve category",
			})
		}
		return
	}

	var req dto.CategoryUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Success: false,
			Error:   "Invalid request",
			Message: err.Error(),
		})
		return
	}

	if req.Name != "" {
		category.Name = req.Name
	}
	if req.Description != "" {
		category.Description = req.Description
	}
	if req.Color != "" {
		category.Color = req.Color
	}
	if req.Icon != "" {
		category.Icon = req.Icon
	}

	if err := h.ormService.CategoryRepository.Update(c.Request.Context(), category); err != nil {
		switch {
		case errors.Is(err, ormerrors.ErrDuplicateEntry):
			c.JSON(http.StatusConflict, dto.ErrorResponse{
				Success: false,
				Error:   "Duplicate entry",
				Message: "Category name already in use",
			})
		default:
			c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
				Success: false,
				Error:   "Internal server error",
				Message: "Failed to update category",
			})
		}
		return
	}

	c.JSON(http.StatusOK, dto.CategoryResponse{
		Success: true,
		Message: "Category updated successfully",
		Data:    *category,
	})
}

// DeleteCategory supprime une catégorie
// @Summary Supprimer une catégorie
// @Description Supprime une catégorie par son ID
// @Tags Categories
// @Accept json
// @Produce json
// @Param id path uint true "ID de la catégorie"
// @Success 200 {object} dto.MessageResponse "Catégorie supprimée avec succès"
// @Failure 400 {object} dto.ErrorResponse "ID invalide"
// @Failure 404 {object} dto.ErrorResponse "Catégorie non trouvée"
// @Failure 500 {object} dto.ErrorResponse "Erreur serveur"
// @Router /categories/{id} [delete]
func (h *CategoryHandler) DeleteCategory(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Success: false,
			Error:   "Invalid category ID",
			Message: "Category ID must be a number",
		})
		return
	}

	if err := h.ormService.CategoryRepository.Delete(c.Request.Context(), uint(id)); err != nil {
		switch {
		case errors.Is(err, ormerrors.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, dto.ErrorResponse{
				Success: false,
				Error:   "Category not found",
				Message: "No category found with this ID",
			})
		default:
			c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
				Success: false,
				Error:   "Internal server error",
				Message: "Failed to delete category",
			})
		}
		return
	}

	c.JSON(http.StatusOK, dto.MessageResponse{
		Success: true,
		Message: "Category deleted successfully",
	})
}

// ListCategories liste les catégories
// @Summary Lister les catégories
// @Description Récupère la liste de toutes les catégories disponibles
// @Tags Categories
// @Accept json
// @Produce json
// @Param page query int false "Numéro de page (défaut: 1)"
// @Param limit query int false "Nombre d'éléments par page (défaut: 20)"
// @Success 200 {object} dto.CategoryListResponse "Liste des catégories"
// @Failure 500 {object} dto.ErrorResponse "Erreur serveur"
// @Router /categories [get]
func (h *CategoryHandler) ListCategories(c *gin.Context) {
	page := 1
	limit := 20

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

	categories, total, err := h.ormService.CategoryRepository.List(c.Request.Context(), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Success: false,
			Error:   "Internal server error",
			Message: "Failed to retrieve categories",
		})
		return
	}

	totalPages := int((total + int64(limit) - 1) / int64(limit))

	// Convertir []*dto.Category en []dto.Category
	categoryList := make([]dto.Category, len(categories))
	for i, cat := range categories {
		categoryList[i] = *cat
	}

	response := dto.CategoryListResponse{
		Success: true,
	}
	response.Data.Categories = categoryList
	response.Data.TotalCount = total
	response.Data.CurrentPage = page
	response.Data.TotalPages = totalPages
	response.Data.HasNext = page < totalPages
	response.Data.HasPrev = page > 1

	c.JSON(http.StatusOK, response)
}
