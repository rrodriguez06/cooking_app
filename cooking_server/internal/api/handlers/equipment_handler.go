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

// EquipmentHandler gère les requêtes liées aux équipements
type EquipmentHandler struct {
	ormService *orm.ORMService
}

// NewEquipmentHandler crée une nouvelle instance du handler équipement
func NewEquipmentHandler(ormService *orm.ORMService) *EquipmentHandler {
	return &EquipmentHandler{
		ormService: ormService,
	}
}

// CreateEquipment crée un nouvel équipement
// @Summary Créer un nouvel équipement
// @Description Crée un nouvel équipement de cuisine avec nom, description et catégorie
// @Tags Equipment
// @Accept json
// @Produce json
// @Param equipment body dto.EquipmentCreateRequest true "Données de l'équipement à créer"
// @Success 201 {object} dto.EquipmentResponse "Équipement créé avec succès"
// @Failure 400 {object} dto.ErrorResponse "Requête invalide"
// @Failure 409 {object} dto.ErrorResponse "Équipement déjà existant"
// @Failure 500 {object} dto.ErrorResponse "Erreur serveur"
// @Router /equipment [post]
func (h *EquipmentHandler) CreateEquipment(c *gin.Context) {
	var request dto.EquipmentCreateRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Success: false,
			Error:   "Invalid input",
			Message: err.Error(),
		})
		return
	}

	equipment := &dto.Equipment{
		Name:        request.Name,
		Description: request.Description,
		Category:    request.Category,
		Icon:        request.Icon,
	}

	if err := h.ormService.EquipmentRepository.Create(c.Request.Context(), equipment); err != nil {
		switch {
		case errors.Is(err, ormerrors.ErrDuplicateEntry):
			c.JSON(http.StatusConflict, dto.ErrorResponse{
				Success: false,
				Error:   "Equipment already exists",
				Message: "An equipment with this name already exists",
			})
		default:
			c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
				Success: false,
				Error:   "Internal server error",
				Message: "Failed to create equipment",
			})
		}
		return
	}

	c.JSON(http.StatusCreated, dto.EquipmentResponse{
		Success: true,
		Data:    *equipment,
	})
}

// GetEquipment récupère un équipement par son ID
// @Summary Récupérer un équipement
// @Description Récupère les détails d'un équipement spécifique par son ID
// @Tags Equipment
// @Accept json
// @Produce json
// @Param id path uint true "ID de l'équipement"
// @Success 200 {object} dto.EquipmentResponse "Détails de l'équipement"
// @Failure 400 {object} dto.ErrorResponse "ID invalide"
// @Failure 404 {object} dto.ErrorResponse "Équipement non trouvé"
// @Failure 500 {object} dto.ErrorResponse "Erreur serveur"
// @Router /equipment/{id} [get]
func (h *EquipmentHandler) GetEquipment(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Success: false,
			Error:   "Invalid equipment ID",
			Message: "Equipment ID must be a number",
		})
		return
	}

	equipment, err := h.ormService.EquipmentRepository.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		switch {
		case errors.Is(err, ormerrors.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, dto.ErrorResponse{
				Success: false,
				Error:   "Equipment not found",
				Message: "No equipment found with this ID",
			})
		default:
			c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
				Success: false,
				Error:   "Internal server error",
				Message: "Failed to retrieve equipment",
			})
		}
		return
	}

	c.JSON(http.StatusOK, dto.EquipmentResponse{
		Success: true,
		Data:    *equipment,
	})
}

// UpdateEquipment met à jour un équipement
// @Summary Mettre à jour un équipement
// @Description Met à jour les informations d'un équipement existant
// @Tags Equipment
// @Accept json
// @Produce json
// @Param id path uint true "ID de l'équipement"
// @Param equipment body dto.EquipmentUpdateRequest true "Données de l'équipement à mettre à jour"
// @Success 200 {object} dto.EquipmentResponse "Équipement mis à jour avec succès"
// @Failure 400 {object} dto.ErrorResponse "Requête invalide"
// @Failure 404 {object} dto.ErrorResponse "Équipement non trouvé"
// @Failure 409 {object} dto.ErrorResponse "Conflit - nom d'équipement déjà utilisé"
// @Failure 500 {object} dto.ErrorResponse "Erreur serveur"
// @Router /equipment/{id} [put]
func (h *EquipmentHandler) UpdateEquipment(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid equipment ID",
			"message": "Equipment ID must be a number",
		})
		return
	}

	equipment, err := h.ormService.EquipmentRepository.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		switch {
		case errors.Is(err, ormerrors.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "Equipment not found",
				"message": "No equipment found with this ID",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Internal server error",
				"message": "Failed to retrieve equipment",
			})
		}
		return
	}

	var updates dto.Equipment
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request",
			"message": err.Error(),
		})
		return
	}

	if updates.Name != "" {
		equipment.Name = updates.Name
	}
	if updates.Description != "" {
		equipment.Description = updates.Description
	}
	if updates.Category != "" {
		equipment.Category = updates.Category
	}
	if updates.Icon != "" {
		equipment.Icon = updates.Icon
	}

	if err := h.ormService.EquipmentRepository.Update(c.Request.Context(), equipment); err != nil {
		switch {
		case errors.Is(err, ormerrors.ErrDuplicateEntry):
			c.JSON(http.StatusConflict, gin.H{
				"error":   "Duplicate entry",
				"message": "Equipment name already in use",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Internal server error",
				"message": "Failed to update equipment",
			})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    equipment,
	})
}

// DeleteEquipment supprime un équipement
// @Summary Supprimer un équipment
// @Description Supprime un équipement par son ID
// @Tags Equipment
// @Accept json
// @Produce json
// @Param id path uint true "ID de l'équipement"
// @Success 200 {object} dto.MessageResponse "Équipement supprimé avec succès"
// @Failure 400 {object} dto.ErrorResponse "ID invalide"
// @Failure 404 {object} dto.ErrorResponse "Équipement non trouvé"
// @Failure 500 {object} dto.ErrorResponse "Erreur serveur"
// @Router /equipment/{id} [delete]
func (h *EquipmentHandler) DeleteEquipment(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid equipment ID",
			"message": "Equipment ID must be a number",
		})
		return
	}

	if err := h.ormService.EquipmentRepository.Delete(c.Request.Context(), uint(id)); err != nil {
		switch {
		case errors.Is(err, ormerrors.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "Equipment not found",
				"message": "No equipment found with this ID",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Internal server error",
				"message": "Failed to delete equipment",
			})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Equipment deleted successfully",
	})
}

// ListEquipment liste les équipements avec pagination
// @Summary Lister les équipements
// @Description Récupère une liste paginée de tous les équipements disponibles
// @Tags Equipment
// @Accept json
// @Produce json
// @Param page query int false "Numéro de page (défaut: 1)"
// @Param limit query int false "Nombre d'éléments par page (défaut: 50)"
// @Success 200 {object} dto.EquipmentListResponse "Liste des équipements"
// @Failure 500 {object} dto.ErrorResponse "Erreur serveur"
// @Router /equipment [get]
func (h *EquipmentHandler) ListEquipment(c *gin.Context) {
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

	equipment, total, err := h.ormService.EquipmentRepository.List(c.Request.Context(), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to retrieve equipment",
		})
		return
	}

	totalPages := int((total + int64(limit) - 1) / int64(limit))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"equipment":    equipment,
			"total_count":  total,
			"current_page": page,
			"total_pages":  totalPages,
			"has_next":     page < totalPages,
			"has_prev":     page > 1,
		},
	})
}

// SearchEquipment recherche des équipements par nom
// @Summary Rechercher des équipements
// @Description Recherche des équipements par nom pour l'autocomplétion
// @Tags Equipment
// @Accept json
// @Produce json
// @Param q query string true "Terme de recherche"
// @Param limit query int false "Limite de résultats (défaut: 10, max: 50)"
// @Success 200 {object} dto.EquipmentSearchResponse "Résultats de recherche"
// @Failure 400 {object} dto.ErrorResponse "Paramètre de recherche manquant"
// @Failure 500 {object} dto.ErrorResponse "Erreur serveur"
// @Router /equipment/search [get]
func (h *EquipmentHandler) SearchEquipment(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Missing query parameter",
			"message": "The 'q' parameter is required for search",
		})
		return
	}

	limit := 10
	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 50 {
			limit = l
		}
	}

	equipment, err := h.ormService.EquipmentRepository.SearchByName(c.Request.Context(), query, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Search failed",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    equipment,
	})
}
