package handlers

import (
	"errors"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/romainrodriguez/cooking_server/internal/dto"
	"github.com/romainrodriguez/cooking_server/internal/services/orm"
	ormerrors "github.com/romainrodriguez/cooking_server/internal/services/orm/errors"
)

// MealPlanHandler gère les requêtes liées au planning de repas
type MealPlanHandler struct {
	ormService *orm.ORMService
}

// NewMealPlanHandler crée une nouvelle instance du handler meal plan
func NewMealPlanHandler(ormService *orm.ORMService) *MealPlanHandler {
	return &MealPlanHandler{
		ormService: ormService,
	}
}

// CreateMealPlan crée un nouveau planning de repas
// @Summary Créer un planning de repas
// @Description Ajoute une recette au planning d'un utilisateur pour une date donnée
// @Tags MealPlans
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param mealPlan body dto.MealPlanCreateRequest true "Informations du planning de repas"
// @Success 201 {object} dto.MealPlan "Planning créé avec succès"
// @Failure 400 {object} map[string]interface{} "Requête invalide"
// @Failure 401 {object} map[string]interface{} "Non authentifié"
// @Failure 500 {object} map[string]interface{} "Erreur serveur"
// @Router /meal-plans [post]
func (h *MealPlanHandler) CreateMealPlan(c *gin.Context) {
	var req dto.MealPlanCreateRequest
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

	// Vérifier que la recette existe
	_, err := h.ormService.RecipeRepository.GetByID(c.Request.Context(), req.RecipeID)
	if err != nil {
		if errors.Is(err, ormerrors.ErrRecordNotFound) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Recipe not found",
				"message": "The specified recipe does not exist",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to verify recipe",
		})
		return
	}

	mealPlan := &dto.MealPlan{
		UserID:      userID,
		RecipeID:    req.RecipeID,
		PlannedDate: req.PlannedDate,
		MealType:    req.MealType,
		Servings:    req.Servings,
		Notes:       req.Notes,
	}

	if err := h.ormService.MealPlanRepository.Create(c.Request.Context(), mealPlan); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to create meal plan",
		})
		return
	}

	// Récupérer le planning créé avec ses relations
	createdMealPlan, err := h.ormService.MealPlanRepository.GetByID(c.Request.Context(), mealPlan.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to retrieve created meal plan",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    createdMealPlan,
		"message": "Meal plan created successfully",
	})
}

// GetMealPlan récupère un planning de repas par son ID
// @Summary Récupérer un planning de repas
// @Description Récupère les détails d'un planning de repas par son ID
// @Tags MealPlans
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param id path int true "ID du planning de repas"
// @Success 200 {object} dto.MealPlan "Planning trouvé"
// @Failure 400 {object} map[string]interface{} "ID invalide"
// @Failure 401 {object} map[string]interface{} "Non authentifié"
// @Failure 404 {object} map[string]interface{} "Planning non trouvé"
// @Failure 500 {object} map[string]interface{} "Erreur serveur"
// @Router /meal-plans/{id} [get]
func (h *MealPlanHandler) GetMealPlan(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid meal plan ID",
			"message": "Meal plan ID must be a number",
		})
		return
	}

	mealPlan, err := h.ormService.MealPlanRepository.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		switch {
		case errors.Is(err, ormerrors.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "Meal plan not found",
				"message": "No meal plan found with this ID",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Internal server error",
				"message": "Failed to retrieve meal plan",
			})
		}
		return
	}

	// TODO: Vérifier que l'utilisateur peut accéder à ce planning
	// if mealPlan.UserID != currentUserID { ... }

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    mealPlan,
	})
}

// UpdateMealPlan met à jour un planning de repas
// @Summary Mettre à jour un planning de repas
// @Description Met à jour les informations d'un planning de repas existant
// @Tags MealPlans
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param id path uint true "ID du planning de repas"
// @Param mealPlan body dto.MealPlanUpdateRequest true "Données du planning à mettre à jour"
// @Success 200 {object} map[string]interface{} "Planning mis à jour avec succès"
// @Failure 400 {object} map[string]interface{} "Requête invalide"
// @Failure 401 {object} map[string]interface{} "Non authentifié"
// @Failure 404 {object} map[string]interface{} "Planning non trouvé"
// @Failure 500 {object} map[string]interface{} "Erreur serveur"
// @Router /meal-plans/{id} [put]
func (h *MealPlanHandler) UpdateMealPlan(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid meal plan ID",
			"message": "Meal plan ID must be a number",
		})
		return
	}

	var req dto.MealPlanUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request",
			"message": err.Error(),
		})
		return
	}

	log.Printf("UpdateMealPlan: Received request for ID %d with data: %+v", id, req)

	// Récupérer le planning existant
	mealPlan, err := h.ormService.MealPlanRepository.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		switch {
		case errors.Is(err, ormerrors.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "Meal plan not found",
				"message": "No meal plan found with this ID",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Internal server error",
				"message": "Failed to retrieve meal plan",
			})
		}
		return
	}

	log.Printf("UpdateMealPlan: Current meal plan before update: RecipeID=%d, MealType=%s, Servings=%d",
		mealPlan.RecipeID, mealPlan.MealType, mealPlan.Servings)

	// TODO: Vérifier que l'utilisateur peut modifier ce planning
	// if mealPlan.UserID != currentUserID { ... }

	// Mettre à jour les champs modifiés
	if req.RecipeID > 0 {
		log.Printf("UpdateMealPlan: Updating RecipeID from %d to %d", mealPlan.RecipeID, req.RecipeID)
		// Vérifier que la nouvelle recette existe
		_, err := h.ormService.RecipeRepository.GetByID(c.Request.Context(), req.RecipeID)
		if err != nil {
			if errors.Is(err, ormerrors.ErrRecordNotFound) {
				c.JSON(http.StatusBadRequest, gin.H{
					"error":   "Recipe not found",
					"message": "The specified recipe does not exist",
				})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Internal server error",
				"message": "Failed to verify recipe",
			})
			return
		}
		mealPlan.RecipeID = req.RecipeID
		log.Printf("UpdateMealPlan: RecipeID updated to %d", mealPlan.RecipeID)
	}

	if !req.PlannedDate.IsZero() {
		mealPlan.PlannedDate = req.PlannedDate
	}
	if req.MealType != "" {
		mealPlan.MealType = req.MealType
	}
	if req.Servings > 0 {
		mealPlan.Servings = req.Servings
	}
	if req.Notes != "" {
		mealPlan.Notes = req.Notes
	}

	// Gérer le statut de completion
	if req.IsCompleted && !mealPlan.IsCompleted {
		// Marquer comme terminé
		if err := h.ormService.MealPlanRepository.MarkAsCompleted(c.Request.Context(), mealPlan.ID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Internal server error",
				"message": "Failed to mark meal plan as completed",
			})
			return
		}
	} else if !req.IsCompleted && mealPlan.IsCompleted {
		// Remettre comme non terminé
		mealPlan.IsCompleted = false
		mealPlan.CompletedAt = nil
	}

	log.Printf("UpdateMealPlan: About to save meal plan with RecipeID=%d", mealPlan.RecipeID)

	if err := h.ormService.MealPlanRepository.Update(c.Request.Context(), mealPlan); err != nil {
		log.Printf("UpdateMealPlan: Error updating meal plan: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to update meal plan",
		})
		return
	}

	log.Printf("UpdateMealPlan: Meal plan updated successfully")

	// Récupérer le planning mis à jour avec ses relations
	updatedMealPlan, err := h.ormService.MealPlanRepository.GetByID(c.Request.Context(), mealPlan.ID)
	if err != nil {
		log.Printf("UpdateMealPlan: Error retrieving updated meal plan: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to retrieve updated meal plan",
		})
		return
	}

	log.Printf("UpdateMealPlan: Retrieved updated meal plan with RecipeID=%d, Recipe Title=%s",
		updatedMealPlan.RecipeID, updatedMealPlan.Recipe.Title)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    updatedMealPlan,
		"message": "Meal plan updated successfully",
	})
}

// DeleteMealPlan supprime un planning de repas
// @Summary Supprimer un planning de repas
// @Description Supprime un planning de repas par son ID
// @Tags MealPlans
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param id path uint true "ID du planning de repas"
// @Success 200 {object} map[string]interface{} "Planning supprimé avec succès"
// @Failure 400 {object} map[string]interface{} "ID invalide"
// @Failure 401 {object} map[string]interface{} "Non authentifié"
// @Failure 404 {object} map[string]interface{} "Planning non trouvé"
// @Failure 500 {object} map[string]interface{} "Erreur serveur"
// @Router /meal-plans/{id} [delete]
func (h *MealPlanHandler) DeleteMealPlan(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid meal plan ID",
			"message": "Meal plan ID must be a number",
		})
		return
	}

	// Vérifier que le planning existe et appartient à l'utilisateur
	_, err = h.ormService.MealPlanRepository.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		switch {
		case errors.Is(err, ormerrors.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "Meal plan not found",
				"message": "No meal plan found with this ID",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Internal server error",
				"message": "Failed to retrieve meal plan",
			})
		}
		return
	}

	// TODO: Vérifier que l'utilisateur peut supprimer ce planning
	// if mealPlan.UserID != currentUserID { ... }

	if err := h.ormService.MealPlanRepository.Delete(c.Request.Context(), uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to delete meal plan",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Meal plan deleted successfully",
	})
}

// GetUserMealPlans récupère les plannings de repas d'un utilisateur
// @Summary Récupérer les plannings d'un utilisateur
// @Description Récupère tous les plannings de repas d'un utilisateur avec pagination
// @Tags MealPlans
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param page query int false "Numéro de page (défaut: 1)"
// @Param limit query int false "Nombre d'éléments par page (défaut: 10, max: 100)"
// @Success 200 {object} map[string]interface{} "Liste des plannings de l'utilisateur"
// @Failure 401 {object} map[string]interface{} "Non authentifié"
// @Failure 500 {object} map[string]interface{} "Erreur serveur"
// @Router /meal-plans [get]
func (h *MealPlanHandler) GetUserMealPlans(c *gin.Context) {
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

	mealPlans, total, err := h.ormService.MealPlanRepository.GetByUser(c.Request.Context(), userID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to retrieve meal plans",
		})
		return
	}

	totalPages := int((total + int64(limit) - 1) / int64(limit))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"meal_plans":   mealPlans,
			"total_count":  total,
			"current_page": page,
			"total_pages":  totalPages,
			"has_next":     page < totalPages,
			"has_prev":     page > 1,
		},
	})
}

// GetWeeklyMealPlan récupère le planning de la semaine
// @Summary Récupérer le planning hebdomadaire
// @Description Récupère le planning de repas pour une semaine donnée
// @Tags MealPlans
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param date query string false "Date de référence (format: 2006-01-02). Par défaut: aujourd'hui"
// @Success 200 {object} dto.WeeklyMealPlan "Planning hebdomadaire"
// @Failure 400 {object} map[string]interface{} "Date invalide"
// @Failure 401 {object} map[string]interface{} "Non authentifié"
// @Failure 500 {object} map[string]interface{} "Erreur serveur"
// @Router /meal-plans/weekly [get]
func (h *MealPlanHandler) GetWeeklyMealPlan(c *gin.Context) {
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

	// Déterminer la date de référence
	var referenceDate time.Time
	if dateStr := c.Query("date"); dateStr != "" {
		var err error
		referenceDate, err = time.Parse("2006-01-02", dateStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Invalid date format",
				"message": "Date must be in format YYYY-MM-DD",
			})
			return
		}
	} else {
		referenceDate = time.Now()
	}

	// Calculer le début et la fin de la semaine (lundi à dimanche)
	weekday := referenceDate.Weekday()
	daysToMonday := int(weekday - time.Monday)
	if daysToMonday < 0 {
		daysToMonday += 7
	}

	startOfWeek := referenceDate.AddDate(0, 0, -daysToMonday)
	endOfWeek := startOfWeek.AddDate(0, 0, 6)

	// Mettre les heures à 00:00:00 pour le début et 23:59:59 pour la fin
	startOfWeek = time.Date(startOfWeek.Year(), startOfWeek.Month(), startOfWeek.Day(), 0, 0, 0, 0, startOfWeek.Location())
	endOfWeek = time.Date(endOfWeek.Year(), endOfWeek.Month(), endOfWeek.Day(), 23, 59, 59, 999999999, endOfWeek.Location())

	mealPlans, err := h.ormService.MealPlanRepository.GetByUserAndDateRange(c.Request.Context(), userID, startOfWeek, endOfWeek)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to retrieve weekly meal plan",
		})
		return
	}

	// Organiser les repas par date
	weeklyPlan := dto.WeeklyMealPlan{
		StartDate: startOfWeek,
		EndDate:   endOfWeek,
		MealPlans: make(map[string][]dto.MealPlan),
	}

	for _, mealPlan := range mealPlans {
		dateKey := mealPlan.PlannedDate.Format("2006-01-02")
		weeklyPlan.MealPlans[dateKey] = append(weeklyPlan.MealPlans[dateKey], *mealPlan)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    weeklyPlan,
	})
}

// GetDailyMealPlan récupère le planning d'une journée
// @Summary Récupérer le planning quotidien
// @Description Récupère le planning de repas pour une journée donnée, organisé par type de repas
// @Tags MealPlans
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param date query string false "Date (format: 2006-01-02). Par défaut: aujourd'hui"
// @Success 200 {object} dto.DailyMealPlan "Planning quotidien"
// @Failure 400 {object} map[string]interface{} "Date invalide"
// @Failure 401 {object} map[string]interface{} "Non authentifié"
// @Failure 500 {object} map[string]interface{} "Erreur serveur"
// @Router /meal-plans/daily [get]
func (h *MealPlanHandler) GetDailyMealPlan(c *gin.Context) {
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

	// Déterminer la date
	var targetDate time.Time
	if dateStr := c.Query("date"); dateStr != "" {
		var err error
		targetDate, err = time.Parse("2006-01-02", dateStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Invalid date format",
				"message": "Date must be in format YYYY-MM-DD",
			})
			return
		}
	} else {
		targetDate = time.Now()
	}

	mealPlans, err := h.ormService.MealPlanRepository.GetByUserAndDate(c.Request.Context(), userID, targetDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to retrieve daily meal plan",
		})
		return
	}

	// Organiser les repas par type
	dailyPlan := dto.DailyMealPlan{
		Date:      targetDate,
		Breakfast: []dto.MealPlan{},
		Lunch:     []dto.MealPlan{},
		Dinner:    []dto.MealPlan{},
		Snack:     []dto.MealPlan{},
	}

	for _, mealPlan := range mealPlans {
		switch mealPlan.MealType {
		case "breakfast":
			dailyPlan.Breakfast = append(dailyPlan.Breakfast, *mealPlan)
		case "lunch":
			dailyPlan.Lunch = append(dailyPlan.Lunch, *mealPlan)
		case "dinner":
			dailyPlan.Dinner = append(dailyPlan.Dinner, *mealPlan)
		case "snack":
			dailyPlan.Snack = append(dailyPlan.Snack, *mealPlan)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    dailyPlan,
	})
}

// GetUpcomingMeals récupère les prochains repas planifiés
// @Summary Récupérer les prochains repas
// @Description Récupère les repas planifiés pour les prochains jours (non terminés)
// @Tags MealPlans
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param days query int false "Nombre de jours à venir (défaut: 7)"
// @Success 200 {object} map[string]interface{} "Prochains repas planifiés"
// @Failure 401 {object} map[string]interface{} "Non authentifié"
// @Failure 500 {object} map[string]interface{} "Erreur serveur"
// @Router /meal-plans/upcoming [get]
func (h *MealPlanHandler) GetUpcomingMeals(c *gin.Context) {
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

	// Nombre de jours à venir
	days := 7
	if daysStr := c.Query("days"); daysStr != "" {
		if d, err := strconv.Atoi(daysStr); err == nil && d > 0 && d <= 30 {
			days = d
		}
	}

	mealPlans, err := h.ormService.MealPlanRepository.GetUpcomingMeals(c.Request.Context(), userID, days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to retrieve upcoming meals",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"upcoming_meals": mealPlans,
			"days_ahead":     days,
			"total_count":    len(mealPlans),
		},
	})
}

// MarkMealAsCompleted marque un repas comme terminé
// @Summary Marquer un repas comme terminé
// @Description Marque un planning de repas comme étant terminé/préparé
// @Tags MealPlans
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param id path uint true "ID du planning de repas"
// @Success 200 {object} map[string]interface{} "Repas marqué comme terminé"
// @Failure 400 {object} map[string]interface{} "ID invalide"
// @Failure 401 {object} map[string]interface{} "Non authentifié"
// @Failure 404 {object} map[string]interface{} "Planning non trouvé"
// @Failure 500 {object} map[string]interface{} "Erreur serveur"
// @Router /meal-plans/{id}/complete [patch]
func (h *MealPlanHandler) MarkMealAsCompleted(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid meal plan ID",
			"message": "Meal plan ID must be a number",
		})
		return
	}

	// Vérifier que le planning existe et appartient à l'utilisateur
	_, err = h.ormService.MealPlanRepository.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		switch {
		case errors.Is(err, ormerrors.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "Meal plan not found",
				"message": "No meal plan found with this ID",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Internal server error",
				"message": "Failed to retrieve meal plan",
			})
		}
		return
	}

	// TODO: Vérifier que l'utilisateur peut modifier ce planning
	// if mealPlan.UserID != currentUserID { ... }

	if err := h.ormService.MealPlanRepository.MarkAsCompleted(c.Request.Context(), uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to mark meal as completed",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Meal plan marked as completed",
	})
}

// GetWeeklyShoppingList récupère la liste de courses pour une semaine donnée
// @Summary Récupérer la liste de courses hebdomadaire
// @Description Récupère une liste de courses agrégée pour tous les repas planifiés d'une semaine
// @Tags MealPlans
// @Produce json
// @Security ApiKeyAuth
// @Param start_date query string true "Date de début (format: 2006-01-02)"
// @Param end_date query string false "Date de fin (format: 2006-01-02, par défaut: start_date + 6 jours)"
// @Success 200 {object} dto.WeeklyShoppingListResponse "Liste de courses récupérée avec succès"
// @Failure 400 {object} map[string]interface{} "Requête invalide"
// @Failure 401 {object} map[string]interface{} "Non authentifié"
// @Failure 500 {object} map[string]interface{} "Erreur serveur"
// @Router /meal-plans/shopping-list [get]
func (h *MealPlanHandler) GetWeeklyShoppingList(c *gin.Context) {
	// Récupérer l'ID de l'utilisateur depuis le contexte d'authentification
	authUserID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Unauthorized",
			"message": "User not authenticated",
		})
		return
	}

	userID := authUserID.(uint)

	// Récupérer et valider la date de début
	startDateStr := c.Query("start_date")
	if startDateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Missing start_date",
			"message": "start_date parameter is required (format: 2006-01-02)",
		})
		return
	}

	startDate, err := time.Parse("2006-01-02", startDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid start_date",
			"message": "start_date must be in format 2006-01-02",
		})
		return
	}

	// Récupérer la date de fin ou calculer une semaine après le début
	var endDate time.Time
	endDateStr := c.Query("end_date")
	if endDateStr != "" {
		endDate, err = time.Parse("2006-01-02", endDateStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Invalid end_date",
				"message": "end_date must be in format 2006-01-02",
			})
			return
		}
	} else {
		// Par défaut, une semaine après la date de début
		endDate = startDate.AddDate(0, 0, 6)
	}

	// Vérifier que la date de fin est après la date de début
	if endDate.Before(startDate) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid date range",
			"message": "end_date must be after or equal to start_date",
		})
		return
	}

	// Récupérer la liste de courses
	shoppingList, err := h.ormService.MealPlanRepository.GetWeeklyShoppingList(c.Request.Context(), userID, startDate, endDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to generate shopping list",
		})
		return
	}

	c.JSON(http.StatusOK, dto.WeeklyShoppingListResponse{
		Success: true,
		Data:    *shoppingList,
	})
}
