package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/romainrodriguez/cooking_server/internal/dto"
	"github.com/romainrodriguez/cooking_server/internal/services/orm"
)

type FridgeHandler struct {
	ormService *orm.ORMService
}

func NewFridgeHandler(ormService *orm.ORMService) *FridgeHandler {
	return &FridgeHandler{
		ormService: ormService,
	}
}

// GetFridgeItems récupère tous les items du frigo pour l'utilisateur connecté
func (h *FridgeHandler) GetFridgeItems(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Utilisateur non authentifié"})
		return
	}

	var fridgeItems []dto.FridgeItem
	err := h.ormService.GetDB().
		Preload("Ingredient").
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Find(&fridgeItems).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur lors de la récupération des items du frigo"})
		return
	}

	c.JSON(http.StatusOK, fridgeItems)
}

// CreateFridgeItem ajoute un nouvel item au frigo
func (h *FridgeHandler) CreateFridgeItem(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Utilisateur non authentifié"})
		return
	}

	var request dto.FridgeItemCreateRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Données invalides", "details": err.Error()})
		return
	}

	// Vérifier que l'ingrédient existe
	var ingredient dto.Ingredient
	err := h.ormService.GetDB().First(&ingredient, request.IngredientID).Error
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ingrédient non trouvé"})
		return
	}

	// Créer un nouvel item (ou mettre à jour s'il existe déjà)
	fridgeItem := dto.FridgeItem{
		UserID:       userID.(uint),
		IngredientID: request.IngredientID,
		Quantity:     request.Quantity,
		Unit:         request.Unit,
		ExpiryDate:   request.ExpiryDate,
		Notes:        request.Notes,
	}

	err = h.ormService.GetDB().Create(&fridgeItem).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur lors de la création de l'item"})
		return
	}

	// Charger l'ingrédient pour la réponse
	h.ormService.GetDB().Preload("Ingredient").First(&fridgeItem, fridgeItem.ID)

	c.JSON(http.StatusCreated, fridgeItem)
}

// UpdateFridgeItem met à jour un item du frigo
func (h *FridgeHandler) UpdateFridgeItem(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Utilisateur non authentifié"})
		return
	}

	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID invalide"})
		return
	}

	var request dto.FridgeItemUpdateRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Données invalides", "details": err.Error()})
		return
	}

	var fridgeItem dto.FridgeItem
	err = h.ormService.GetDB().Where("id = ? AND user_id = ?", uint(id), userID).First(&fridgeItem).Error
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Item non trouvé"})
		return
	}

	// Mettre à jour les champs
	if request.Quantity != nil {
		fridgeItem.Quantity = request.Quantity
	}
	if request.Unit != nil {
		fridgeItem.Unit = request.Unit
	}
	if request.ExpiryDate != nil {
		fridgeItem.ExpiryDate = request.ExpiryDate
	}
	if request.Notes != nil {
		fridgeItem.Notes = request.Notes
	}

	err = h.ormService.GetDB().Save(&fridgeItem).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur lors de la mise à jour"})
		return
	}

	// Charger l'ingrédient pour la réponse
	h.ormService.GetDB().Preload("Ingredient").First(&fridgeItem, fridgeItem.ID)

	c.JSON(http.StatusOK, fridgeItem)
}

// DeleteFridgeItem supprime un item du frigo
func (h *FridgeHandler) DeleteFridgeItem(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Utilisateur non authentifié"})
		return
	}

	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID invalide"})
		return
	}

	result := h.ormService.GetDB().Where("id = ? AND user_id = ?", uint(id), userID).Delete(&dto.FridgeItem{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur lors de la suppression"})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Item non trouvé"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Item supprimé avec succès"})
}

// GetFridgeStats récupère les statistiques du frigo
func (h *FridgeHandler) GetFridgeStats(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Utilisateur non authentifié"})
		return
	}

	var fridgeItems []dto.FridgeItem
	err := h.ormService.GetDB().
		Preload("Ingredient").
		Where("user_id = ?", userID).
		Find(&fridgeItems).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur lors de la récupération des statistiques"})
		return
	}

	now := time.Now()
	threeDaysFromNow := now.AddDate(0, 0, 3)

	var expiringSoon, expired int
	categoriesMap := make(map[string]bool)

	for _, item := range fridgeItems {
		// Compter les catégories (noter que Category est un string, pas un pointeur)
		if item.Ingredient.Category != "" {
			categoriesMap[item.Ingredient.Category] = true
		}

		// Compter les items qui expirent bientôt ou qui sont expirés
		if item.ExpiryDate != nil {
			if item.ExpiryDate.Before(now) {
				expired++
			} else if item.ExpiryDate.Before(threeDaysFromNow) {
				expiringSoon++
			}
		}
	}

	// Convertir les catégories en slice
	categories := make([]string, 0, len(categoriesMap))
	for category := range categoriesMap {
		categories = append(categories, category)
	}

	stats := dto.FridgeStats{
		TotalItems:      len(fridgeItems),
		ExpiringSoon:    expiringSoon,
		Expired:         expired,
		CategoriesCount: len(categories),
		Categories:      categories,
	}

	c.JSON(http.StatusOK, stats)
}

// ClearFridge supprime tous les items du frigo de l'utilisateur
func (h *FridgeHandler) ClearFridge(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Utilisateur non authentifié"})
		return
	}

	result := h.ormService.GetDB().Where("user_id = ?", userID).Delete(&dto.FridgeItem{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur lors du vidage du frigo"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Frigo vidé avec succès", "removed_count": result.RowsAffected})
}

// RemoveExpiredItems supprime tous les items expirés du frigo
func (h *FridgeHandler) RemoveExpiredItems(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Utilisateur non authentifié"})
		return
	}

	now := time.Now()
	result := h.ormService.GetDB().Where("user_id = ? AND expiry_date < ?", userID, now).Delete(&dto.FridgeItem{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur lors de la suppression des items expirés"})
		return
	}

	response := dto.FridgeItemRemovedResponse{
		RemovedCount: int(result.RowsAffected),
	}

	c.JSON(http.StatusOK, response)
}
