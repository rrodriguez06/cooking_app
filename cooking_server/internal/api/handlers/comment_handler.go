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

// CommentHandler gère les requêtes liées aux commentaires
type CommentHandler struct {
	ormService *orm.ORMService
}

// NewCommentHandler crée une nouvelle instance du handler commentaire
func NewCommentHandler(ormService *orm.ORMService) *CommentHandler {
	return &CommentHandler{
		ormService: ormService,
	}
}

// CreateComment crée un nouveau commentaire
// @Summary Créer un nouveau commentaire
// @Description Crée un commentaire ou une réponse sur une recette
// @Tags Comments
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param comment body dto.CommentCreateRequest true "Informations du commentaire"
// @Success 201 {object} dto.Comment "Commentaire créé avec succès"
// @Failure 400 {object} dto.ErrorResponse "Requête invalide"
// @Failure 401 {object} dto.ErrorResponse "Non authentifié"
// @Failure 404 {object} dto.ErrorResponse "Recette non trouvée"
// @Failure 500 {object} dto.ErrorResponse "Erreur serveur"
// @Router /comments [post]
func (h *CommentHandler) CreateComment(c *gin.Context) {
	var req dto.CommentCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request",
			"message": err.Error(),
		})
		return
	}

	// Récupérer l'ID de l'utilisateur depuis le contexte d'authentification
	authUserID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Unauthorized",
			"message": "User not authenticated",
		})
		return
	}

	userID, ok := authUserID.(uint)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Invalid user ID format",
		})
		return
	}

	// Créer le commentaire à partir de la requête
	comment := dto.Comment{
		Content:  req.Content,
		Rating:   req.Rating,
		RecipeID: req.RecipeID,
		UserID:   userID,
		ParentID: req.ParentID,
	}

	if err := h.ormService.CommentRepository.Create(c.Request.Context(), &comment); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to create comment",
		})
		return
	}

	// Mettre à jour la note de la recette
	if err := h.ormService.RecipeRepository.UpdateRecipeRating(c.Request.Context(), req.RecipeID); err != nil {
		// Log l'erreur mais ne pas faire échouer la requête
		// car le commentaire a été créé avec succès
		c.Header("X-Warning", "Failed to update recipe rating")
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    comment,
	})
}

// GetComment récupère un commentaire par son ID
// @Summary Récupérer un commentaire
// @Description Récupère les détails d'un commentaire spécifique par son ID
// @Tags Comments
// @Accept json
// @Produce json
// @Param id path uint true "ID du commentaire"
// @Success 200 {object} dto.CommentResponse "Détails du commentaire"
// @Failure 400 {object} dto.ErrorResponse "ID invalide"
// @Failure 404 {object} dto.ErrorResponse "Commentaire non trouvé"
// @Failure 500 {object} dto.ErrorResponse "Erreur serveur"
// @Router /comments/{id} [get]
func (h *CommentHandler) GetComment(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid comment ID",
			"message": "Comment ID must be a number",
		})
		return
	}

	comment, err := h.ormService.CommentRepository.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		switch {
		case errors.Is(err, ormerrors.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "Comment not found",
				"message": "No comment found with this ID",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Internal server error",
				"message": "Failed to retrieve comment",
			})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    comment,
	})
}

// UpdateComment met à jour un commentaire
// @Summary Mettre à jour un commentaire
// @Description Met à jour le contenu et/ou la note d'un commentaire existant
// @Tags Comments
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param id path uint true "ID du commentaire"
// @Param comment body dto.CommentUpdateRequest true "Données du commentaire à mettre à jour"
// @Success 200 {object} dto.CommentResponse "Commentaire mis à jour avec succès"
// @Failure 400 {object} dto.ErrorResponse "Requête invalide"
// @Failure 401 {object} dto.ErrorResponse "Non authentifié"
// @Failure 404 {object} map[string]interface{} "Commentaire non trouvé"
// @Failure 500 {object} map[string]interface{} "Erreur serveur"
// @Router /comments/{id} [put]
func (h *CommentHandler) UpdateComment(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid comment ID",
			"message": "Comment ID must be a number",
		})
		return
	}

	comment, err := h.ormService.CommentRepository.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		switch {
		case errors.Is(err, ormerrors.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "Comment not found",
				"message": "No comment found with this ID",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Internal server error",
				"message": "Failed to retrieve comment",
			})
		}
		return
	}

	// Vérifier que l'utilisateur authentifié est le propriétaire du commentaire
	authUserID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Unauthorized",
			"message": "User not authenticated",
		})
		return
	}

	userID, ok := authUserID.(uint)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Invalid user ID format",
		})
		return
	}

	// Vérifier que l'utilisateur est le propriétaire du commentaire
	if comment.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "Forbidden",
			"message": "You can only update your own comments",
		})
		return
	}

	var req dto.CommentUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request",
			"message": err.Error(),
		})
		return
	}

	// Mettre à jour seulement les champs fournis
	if req.Content != "" {
		comment.Content = req.Content
	}
	if req.Rating > 0 {
		comment.Rating = req.Rating
	}

	if err := h.ormService.CommentRepository.Update(c.Request.Context(), comment); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to update comment",
		})
		return
	}

	// Mettre à jour la note de la recette
	if err := h.ormService.RecipeRepository.UpdateRecipeRating(c.Request.Context(), comment.RecipeID); err != nil {
		// Log l'erreur mais ne pas faire échouer la requête
		c.Header("X-Warning", "Failed to update recipe rating")
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    comment,
	})
}

// DeleteComment supprime un commentaire
// @Summary Supprimer un commentaire
// @Description Supprime un commentaire par son ID
// @Tags Comments
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param id path uint true "ID du commentaire"
// @Success 200 {object} map[string]interface{} "Commentaire supprimé avec succès"
// @Failure 400 {object} map[string]interface{} "ID invalide"
// @Failure 401 {object} map[string]interface{} "Non authentifié"
// @Failure 404 {object} map[string]interface{} "Commentaire non trouvé"
// @Failure 500 {object} map[string]interface{} "Erreur serveur"
// @Router /comments/{id} [delete]
func (h *CommentHandler) DeleteComment(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid comment ID",
			"message": "Comment ID must be a number",
		})
		return
	}

	// Récupérer le commentaire pour vérifier l'autorisation
	comment, err := h.ormService.CommentRepository.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		switch {
		case errors.Is(err, ormerrors.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "Comment not found",
				"message": "No comment found with this ID",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Internal server error",
				"message": "Failed to retrieve comment",
			})
		}
		return
	}

	// Vérifier que l'utilisateur authentifié est le propriétaire du commentaire
	authUserID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Unauthorized",
			"message": "User not authenticated",
		})
		return
	}

	userID, ok := authUserID.(uint)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Invalid user ID format",
		})
		return
	}

	// Vérifier que l'utilisateur est le propriétaire du commentaire
	if comment.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "Forbidden",
			"message": "You can only delete your own comments",
		})
		return
	}

	// Sauvegarder l'ID de la recette pour la mise à jour de la note
	recipeID := comment.RecipeID

	if err := h.ormService.CommentRepository.Delete(c.Request.Context(), uint(id)); err != nil {
		switch {
		case errors.Is(err, ormerrors.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "Comment not found",
				"message": "No comment found with this ID",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Internal server error",
				"message": "Failed to delete comment",
			})
		}
		return
	}

	// Mettre à jour la note de la recette
	if err := h.ormService.RecipeRepository.UpdateRecipeRating(c.Request.Context(), recipeID); err != nil {
		// Log l'erreur mais ne pas faire échouer la requête
		c.Header("X-Warning", "Failed to update recipe rating")
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Comment deleted successfully",
	})
}

// GetCommentsByRecipe récupère les commentaires d'une recette avec hiérarchie
// @Summary Récupérer les commentaires d'une recette
// @Description Récupère tous les commentaires et réponses associés à une recette
// @Tags Comments
// @Accept json
// @Produce json
// @Param recipe_id path int true "ID de la recette"
// @Param page query int false "Numéro de page (défaut: 1)"
// @Param limit query int false "Nombre d'éléments par page (défaut: 50)"
// @Success 200 {object} map[string]interface{} "Liste des commentaires"
// @Failure 400 {object} map[string]interface{} "ID de recette invalide"
// @Failure 500 {object} map[string]interface{} "Erreur serveur"
// @Router /comments/recipe/{recipe_id} [get]
func (h *CommentHandler) GetCommentsByRecipe(c *gin.Context) {
	recipeIDStr := c.Param("recipe_id")
	recipeID, err := strconv.ParseUint(recipeIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid recipe ID",
			"message": "Recipe ID must be a number",
		})
		return
	}

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

	comments, total, err := h.ormService.CommentRepository.GetByRecipe(c.Request.Context(), uint(recipeID), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to retrieve comments",
		})
		return
	}

	totalPages := int((total + int64(limit) - 1) / int64(limit))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"comments":     comments,
			"total_count":  total,
			"current_page": page,
			"total_pages":  totalPages,
			"has_next":     page < totalPages,
			"has_prev":     page > 1,
		},
	})
}

// GetCommentReplies récupère les réponses d'un commentaire
// @Summary Récupérer les réponses d'un commentaire
// @Description Récupère toutes les réponses associées à un commentaire parent
// @Tags Comments
// @Accept json
// @Produce json
// @Param id path uint true "ID du commentaire parent"
// @Success 200 {object} map[string]interface{} "Liste des réponses"
// @Failure 400 {object} map[string]interface{} "ID invalide"
// @Failure 500 {object} map[string]interface{} "Erreur serveur"
// @Router /comments/{id}/replies [get]
func (h *CommentHandler) GetCommentReplies(c *gin.Context) {
	commentIDStr := c.Param("id")
	commentID, err := strconv.ParseUint(commentIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid comment ID",
			"message": "Comment ID must be a number",
		})
		return
	}

	replies, err := h.ormService.CommentRepository.GetReplies(c.Request.Context(), uint(commentID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to retrieve replies",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    replies,
	})
}
