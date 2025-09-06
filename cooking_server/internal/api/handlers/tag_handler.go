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

// TagHandler gère les requêtes liées aux tags
type TagHandler struct {
	ormService *orm.ORMService
}

// NewTagHandler crée une nouvelle instance du handler tag
func NewTagHandler(ormService *orm.ORMService) *TagHandler {
	return &TagHandler{
		ormService: ormService,
	}
}

// CreateTag crée un nouveau tag
// @Summary Créer un nouveau tag
// @Description Crée un nouveau tag pour catégoriser les recettes
// @Tags Tags
// @Accept json
// @Produce json
// @Param tag body dto.TagCreateRequest true "Informations du tag"
// @Success 201 {object} dto.TagResponse "Tag créé avec succès"
// @Failure 400 {object} dto.ErrorResponse "Requête invalide"
// @Failure 409 {object} dto.ErrorResponse "Tag déjà existant"
// @Failure 500 {object} dto.ErrorResponse "Erreur serveur"
// @Router /tags [post]
func (h *TagHandler) CreateTag(c *gin.Context) {
	var req dto.TagCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Success: false,
			Error:   "Invalid request",
			Message: err.Error(),
		})
		return
	}

	tag := &dto.Tag{
		Name:        req.Name,
		Description: req.Description,
	}

	if err := h.ormService.TagRepository.Create(c.Request.Context(), tag); err != nil {
		switch {
		case errors.Is(err, ormerrors.ErrDuplicateEntry):
			c.JSON(http.StatusConflict, dto.ErrorResponse{
				Success: false,
				Error:   "Tag already exists",
				Message: "A tag with this name already exists",
			})
		default:
			c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
				Success: false,
				Error:   "Internal server error",
				Message: "Failed to create tag",
			})
		}
		return
	}

	c.JSON(http.StatusCreated, dto.TagResponse{
		Success: true,
		Message: "Tag created successfully",
		Data:    *tag,
	})
}

// GetTag récupère un tag par son ID
// @Summary Récupérer un tag
// @Description Récupère les détails d'un tag spécifique par son ID
// @Tags Tags
// @Accept json
// @Produce json
// @Param id path uint true "ID du tag"
// @Success 200 {object} dto.TagResponse "Détails du tag"
// @Failure 400 {object} dto.ErrorResponse "ID invalide"
// @Failure 404 {object} dto.ErrorResponse "Tag non trouvé"
// @Failure 500 {object} dto.ErrorResponse "Erreur serveur"
// @Router /tags/{id} [get]
func (h *TagHandler) GetTag(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Success: false,
			Error:   "Invalid tag ID",
			Message: "Tag ID must be a number",
		})
		return
	}

	tag, err := h.ormService.TagRepository.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		switch {
		case errors.Is(err, ormerrors.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, dto.ErrorResponse{
				Success: false,
				Error:   "Tag not found",
				Message: "No tag found with this ID",
			})
		default:
			c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
				Success: false,
				Error:   "Internal server error",
				Message: "Failed to retrieve tag",
			})
		}
		return
	}

	c.JSON(http.StatusOK, dto.TagResponse{
		Success: true,
		Data:    *tag,
	})
}

// UpdateTag met à jour un tag existant
// @Summary Mettre à jour un tag
// @Description Met à jour les informations d'un tag existant
// @Tags Tags
// @Accept json
// @Produce json
// @Param id path uint true "ID du tag"
// @Param tag body dto.TagUpdateRequest true "Nouvelles informations du tag"
// @Success 200 {object} dto.TagResponse "Tag mis à jour"
// @Failure 400 {object} dto.ErrorResponse "Données invalides"
// @Failure 404 {object} dto.ErrorResponse "Tag non trouvé"
// @Failure 500 {object} dto.ErrorResponse "Erreur serveur"
// @Router /tags/{id} [put]
func (h *TagHandler) UpdateTag(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Success: false,
			Error:   "Invalid tag ID",
			Message: "Tag ID must be a number",
		})
		return
	}

	var request dto.TagUpdateRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Success: false,
			Error:   "Invalid input",
			Message: err.Error(),
		})
		return
	}

	// Vérifier que le tag existe
	existingTag, err := h.ormService.TagRepository.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		switch {
		case errors.Is(err, ormerrors.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, dto.ErrorResponse{
				Success: false,
				Error:   "Tag not found",
				Message: "No tag found with this ID",
			})
		default:
			c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
				Success: false,
				Error:   "Internal server error",
				Message: "Failed to retrieve tag",
			})
		}
		return
	}

	// Mettre à jour les champs si ils sont fournis
	if request.Name != "" {
		existingTag.Name = request.Name
	}
	if request.Description != "" {
		existingTag.Description = request.Description
	}

	err = h.ormService.TagRepository.Update(c.Request.Context(), existingTag)
	if err != nil {
		switch {
		case errors.Is(err, ormerrors.ErrDuplicateEntry):
			c.JSON(http.StatusConflict, dto.ErrorResponse{
				Success: false,
				Error:   "Tag already exists",
				Message: "A tag with this name already exists",
			})
		default:
			c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
				Success: false,
				Error:   "Internal server error",
				Message: "Failed to update tag",
			})
		}
		return
	}

	c.JSON(http.StatusOK, dto.TagResponse{
		Success: true,
		Data:    *existingTag,
	})
}

// DeleteTag supprime un tag
// @Summary Supprimer un tag
// @Description Supprime un tag par son ID
// @Tags Tags
// @Accept json
// @Produce json
// @Param id path uint true "ID du tag"
// @Success 200 {object} dto.MessageResponse "Tag supprimé avec succès"
// @Failure 400 {object} dto.ErrorResponse "ID invalide"
// @Failure 404 {object} dto.ErrorResponse "Tag non trouvé"
// @Failure 500 {object} dto.ErrorResponse "Erreur serveur"
// @Router /tags/{id} [delete]
func (h *TagHandler) DeleteTag(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Success: false,
			Error:   "Invalid tag ID",
			Message: "Tag ID must be a number",
		})
		return
	}

	if err := h.ormService.TagRepository.Delete(c.Request.Context(), uint(id)); err != nil {
		switch {
		case errors.Is(err, ormerrors.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, dto.ErrorResponse{
				Success: false,
				Error:   "Tag not found",
				Message: "No tag found with this ID",
			})
		default:
			c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
				Success: false,
				Error:   "Internal server error",
				Message: "Failed to delete tag",
			})
		}
		return
	}

	c.JSON(http.StatusOK, dto.MessageResponse{
		Success: true,
		Message: "Tag deleted successfully",
	})
}

// ListTags liste les tags
// @Summary Lister les tags
// @Description Récupère la liste de tous les tags disponibles
// @Tags Tags
// @Accept json
// @Produce json
// @Param page query int false "Numéro de page (défaut: 1)"
// @Param limit query int false "Nombre d'éléments par page (défaut: 50)"
// @Success 200 {object} dto.TagListResponse "Liste des tags"
// @Failure 500 {object} dto.ErrorResponse "Erreur serveur"
// @Router /tags [get]
func (h *TagHandler) ListTags(c *gin.Context) {
	page := 1
	limit := 50

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

	tagPointers, total, err := h.ormService.TagRepository.List(c.Request.Context(), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Success: false,
			Error:   "Internal server error",
			Message: "Failed to retrieve tags",
		})
		return
	}

	// Convert []*dto.Tag to []dto.Tag
	tags := make([]dto.Tag, len(tagPointers))
	for i, tagPtr := range tagPointers {
		tags[i] = *tagPtr
	}

	totalPages := int((total + int64(limit) - 1) / int64(limit))

	response := dto.TagListResponse{
		Success: true,
	}
	response.Data.Tags = tags
	response.Data.TotalCount = total
	response.Data.CurrentPage = page
	response.Data.TotalPages = totalPages
	response.Data.HasNext = page < totalPages
	response.Data.HasPrev = page > 1

	c.JSON(http.StatusOK, response)
}
