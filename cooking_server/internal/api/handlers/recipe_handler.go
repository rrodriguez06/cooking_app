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

// RecipeHandler gère les requêtes liées aux recettes
type RecipeHandler struct {
	ormService *orm.ORMService
}

// NewRecipeHandler crée une nouvelle instance du handler recette
func NewRecipeHandler(ormService *orm.ORMService) *RecipeHandler {
	return &RecipeHandler{
		ormService: ormService,
	}
}

// CreateRecipe crée une nouvelle recette
// @Summary Créer une nouvelle recette
// @Description Crée une nouvelle recette de cuisine avec ingrédients et étapes
// @Tags Recipes
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param recipe body dto.RecipeCreateRequest true "Informations de la recette"
// @Success 201 {object} dto.RecipeResponse "Recette créée avec succès"
// @Failure 400 {object} dto.ErrorResponse "Requête invalide"
// @Failure 401 {object} dto.ErrorResponse "Non authentifié"
// @Failure 500 {object} dto.ErrorResponse "Erreur serveur"
// @Router /recipes [post]
func (h *RecipeHandler) CreateRecipe(c *gin.Context) {
	var req dto.RecipeCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request",
			"message": err.Error(),
		})
		return
	}

	// Récupérer l'ID de l'utilisateur depuis le contexte d'authentification
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Unauthorized",
			"message": "User not authenticated",
		})
		return
	}

	authorID, ok := userID.(uint)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Invalid user ID format",
		})
		return
	}

	// Convertir les étapes de la requête en RecipeSteps
	var instructions dto.RecipeSteps
	for _, stepReq := range req.Instructions {
		step := dto.RecipeStep{
			StepNumber:         stepReq.StepNumber,
			Title:              stepReq.Title,
			Description:        stepReq.Description,
			Duration:           stepReq.Duration,
			Temperature:        stepReq.Temperature,
			Tips:               stepReq.Tips,
			ReferencedRecipeID: stepReq.ReferencedRecipeID,
		}
		instructions = append(instructions, step)
	}

	recipe := &dto.Recipe{
		Title:        req.Title,
		Description:  req.Description,
		Instructions: instructions,
		PrepTime:     req.PrepTime,
		CookTime:     req.CookTime,
		Servings:     req.Servings,
		Difficulty:   req.Difficulty,
		ImageURL:     req.ImageURL,
		IsPublic:     req.IsPublic,
		AuthorID:     authorID,
	}

	// Créer la recette d'abord
	if err := h.ormService.RecipeRepository.Create(c.Request.Context(), recipe); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to create recipe",
		})
		return
	}

	// Ajouter les ingrédients
	for _, ingredientReq := range req.Ingredients {
		// Utiliser "pièce" par défaut si l'unité est vide
		unit := ingredientReq.Unit
		if unit == "" {
			unit = "pièce"
		}

		recipeIngredient := &dto.RecipeIngredient{
			RecipeID:     recipe.ID,
			IngredientID: ingredientReq.IngredientID,
			Quantity:     ingredientReq.Quantity,
			Unit:         unit,
			Notes:        ingredientReq.Notes,
			IsOptional:   ingredientReq.IsOptional,
		}
		if err := h.ormService.RecipeIngredientRepository.Create(c.Request.Context(), recipeIngredient); err != nil {
			log.Printf("Failed to create recipe ingredient: %v", err)
			// Ne pas faire échouer toute la création pour un ingrédient, mais log l'erreur
		}
	}

	// Ajouter les équipements
	for _, equipmentReq := range req.Equipments {
		recipeEquipment := &dto.RecipeEquipment{
			RecipeID:    recipe.ID,
			EquipmentID: equipmentReq.EquipmentID,
			IsOptional:  equipmentReq.IsOptional,
			Notes:       equipmentReq.Notes,
		}
		if err := h.ormService.RecipeEquipmentRepository.Create(c.Request.Context(), recipeEquipment); err != nil {
			log.Printf("Failed to create recipe equipment: %v", err)
			// Ne pas faire échouer toute la création pour un équipement, mais log l'erreur
		}
	}

	// Ajouter les catégories (relation many-to-many)
	if len(req.CategoryIDs) > 0 {
		var categories []dto.Category
		if err := h.ormService.GetDB().Where("id IN ?", req.CategoryIDs).Find(&categories).Error; err == nil {
			if err := h.ormService.GetDB().Model(recipe).Association("Categories").Append(categories); err != nil {
				log.Printf("Failed to associate categories: %v", err)
			}
		}
	}

	// Ajouter les tags (relation many-to-many)
	if len(req.TagIDs) > 0 {
		var tags []dto.Tag
		if err := h.ormService.GetDB().Where("id IN ?", req.TagIDs).Find(&tags).Error; err == nil {
			if err := h.ormService.GetDB().Model(recipe).Association("Tags").Append(tags); err != nil {
				log.Printf("Failed to associate tags: %v", err)
			}
		}
	}

	// Recharger la recette avec toutes ses relations pour la réponse
	updatedRecipe, err := h.ormService.RecipeRepository.GetByID(c.Request.Context(), recipe.ID)
	if err != nil {
		// Si on ne peut pas recharger, retourner la recette de base
		updatedRecipe = recipe
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    updatedRecipe,
		"message": "Recipe created successfully",
	})
}

// GetRecipe récupère une recette par son ID
// @Summary Récupérer une recette
// @Description Récupère les détails complets d'une recette par son ID
// @Tags Recipes
// @Accept json
// @Produce json
// @Param id path int true "ID de la recette"
// @Success 200 {object} dto.Recipe "Recette trouvée"
// @Failure 400 {object} dto.ErrorResponse "ID invalide"
// @Failure 404 {object} dto.ErrorResponse "Recette non trouvée"
// @Failure 500 {object} dto.ErrorResponse "Erreur serveur"
// @Router /recipes/{id} [get]
func (h *RecipeHandler) GetRecipe(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid recipe ID",
			"message": "Recipe ID must be a number",
		})
		return
	}

	recipe, err := h.ormService.RecipeRepository.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		switch {
		case errors.Is(err, ormerrors.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "Recipe not found",
				"message": "No recipe found with this ID",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Internal server error",
				"message": "Failed to retrieve recipe",
			})
		}
		return
	}

	// Traiter l'URL de l'image pour la rendre complète
	processRecipeImageURL(c, recipe)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    recipe,
	})
}

// UpdateRecipe met à jour une recette
// @Summary Mettre à jour une recette
// @Description Met à jour les informations d'une recette existante
// @Tags Recipes
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param id path uint true "ID de la recette"
// @Param recipe body dto.RecipeUpdateRequest true "Données de la recette à mettre à jour"
// @Success 200 {object} dto.RecipeResponse "Recette mise à jour avec succès"
// @Failure 400 {object} dto.ErrorResponse "Requête invalide"
// @Failure 401 {object} dto.ErrorResponse "Non authentifié"
// @Failure 404 {object} dto.ErrorResponse "Recette non trouvée"
// @Failure 500 {object} dto.ErrorResponse "Erreur serveur"
// @Router /recipes/{id} [put]
func (h *RecipeHandler) UpdateRecipe(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid recipe ID",
			"message": "Recipe ID must be a number",
		})
		return
	}

	var req dto.RecipeUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request",
			"message": err.Error(),
		})
		return
	}

	// Récupérer la recette existante
	recipe, err := h.ormService.RecipeRepository.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		switch {
		case errors.Is(err, ormerrors.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "Recipe not found",
				"message": "No recipe found with this ID",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Internal server error",
				"message": "Failed to retrieve recipe",
			})
		}
		return
	}

	// Récupérer l'ID de l'utilisateur depuis le contexte d'authentification
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Unauthorized",
			"message": "User not authenticated",
		})
		return
	}

	currentUserID, ok := userID.(uint)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Invalid user ID format",
		})
		return
	}

	// Vérifier que l'utilisateur peut modifier cette recette
	if recipe.AuthorID != currentUserID {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "Forbidden",
			"message": "You can only modify your own recipes",
		})
		return
	}

	// Mettre à jour les champs
	if req.Title != "" {
		recipe.Title = req.Title
	}
	// Toujours mettre à jour la description (y compris pour la vider)
	recipe.Description = req.Description
	if len(req.Instructions) > 0 {
		var instructions dto.RecipeSteps
		for _, stepReq := range req.Instructions {
			step := dto.RecipeStep{
				StepNumber:         stepReq.StepNumber,
				Title:              stepReq.Title,
				Description:        stepReq.Description,
				Duration:           stepReq.Duration,
				Temperature:        stepReq.Temperature,
				Tips:               stepReq.Tips,
				ReferencedRecipeID: stepReq.ReferencedRecipeID,
			}
			instructions = append(instructions, step)
		}
		recipe.Instructions = instructions
	}
	if req.PrepTime > 0 {
		recipe.PrepTime = req.PrepTime
	}
	if req.CookTime > 0 {
		recipe.CookTime = req.CookTime
	}
	if req.Servings > 0 {
		recipe.Servings = req.Servings
	}
	if req.Difficulty != "" {
		recipe.Difficulty = req.Difficulty
	}
	if req.ImageURL != "" {
		recipe.ImageURL = req.ImageURL
	}
	recipe.IsPublic = req.IsPublic

	// Mettre à jour la recette d'abord
	if err := h.ormService.RecipeRepository.Update(c.Request.Context(), recipe); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to update recipe",
		})
		return
	}

	// Mettre à jour les ingrédients si fournis
	if len(req.Ingredients) > 0 {
		// Supprimer tous les ingrédients existants
		if err := h.ormService.RecipeIngredientRepository.DeleteByRecipe(c.Request.Context(), recipe.ID); err != nil {
			log.Printf("Failed to delete existing recipe ingredients: %v", err)
		}

		// Ajouter les nouveaux ingrédients
		for _, ingredientReq := range req.Ingredients {
			// Utiliser "pièce" par défaut si l'unité est vide
			unit := ingredientReq.Unit
			if unit == "" {
				unit = "pièce"
			}

			recipeIngredient := &dto.RecipeIngredient{
				RecipeID:     recipe.ID,
				IngredientID: ingredientReq.IngredientID,
				Quantity:     ingredientReq.Quantity,
				Unit:         unit,
				Notes:        ingredientReq.Notes,
				IsOptional:   ingredientReq.IsOptional,
			}
			if err := h.ormService.RecipeIngredientRepository.Create(c.Request.Context(), recipeIngredient); err != nil {
				log.Printf("Failed to create recipe ingredient during update: %v", err)
			}
		}
	}

	// Mettre à jour les équipements si fournis
	if len(req.Equipments) > 0 {
		// Supprimer tous les équipements existants
		if err := h.ormService.RecipeEquipmentRepository.DeleteByRecipe(c.Request.Context(), recipe.ID); err != nil {
			log.Printf("Failed to delete existing recipe equipment: %v", err)
		}

		// Ajouter les nouveaux équipements
		for _, equipmentReq := range req.Equipments {
			recipeEquipment := &dto.RecipeEquipment{
				RecipeID:    recipe.ID,
				EquipmentID: equipmentReq.EquipmentID,
				IsOptional:  equipmentReq.IsOptional,
				Notes:       equipmentReq.Notes,
			}
			if err := h.ormService.RecipeEquipmentRepository.Create(c.Request.Context(), recipeEquipment); err != nil {
				log.Printf("Failed to create recipe equipment during update: %v", err)
			}
		}
	}

	// Mettre à jour les catégories si fournies
	if len(req.CategoryIDs) > 0 {
		// Supprimer toutes les associations existantes
		if err := h.ormService.GetDB().Model(recipe).Association("Categories").Clear(); err != nil {
			log.Printf("Failed to clear existing categories: %v", err)
		}

		// Ajouter les nouvelles catégories
		var categories []dto.Category
		if err := h.ormService.GetDB().Where("id IN ?", req.CategoryIDs).Find(&categories).Error; err == nil {
			if err := h.ormService.GetDB().Model(recipe).Association("Categories").Append(categories); err != nil {
				log.Printf("Failed to associate categories during update: %v", err)
			}
		}
	}

	// Mettre à jour les tags si fournis
	if len(req.TagIDs) > 0 {
		// Supprimer toutes les associations existantes
		if err := h.ormService.GetDB().Model(recipe).Association("Tags").Clear(); err != nil {
			log.Printf("Failed to clear existing tags: %v", err)
		}

		// Ajouter les nouveaux tags
		var tags []dto.Tag
		if err := h.ormService.GetDB().Where("id IN ?", req.TagIDs).Find(&tags).Error; err == nil {
			if err := h.ormService.GetDB().Model(recipe).Association("Tags").Append(tags); err != nil {
				log.Printf("Failed to associate tags during update: %v", err)
			}
		}
	}

	// Recharger la recette avec toutes ses relations pour la réponse
	updatedRecipe, err := h.ormService.RecipeRepository.GetByID(c.Request.Context(), recipe.ID)
	if err != nil {
		// Si on ne peut pas recharger, retourner la recette de base
		updatedRecipe = recipe
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    updatedRecipe,
		"message": "Recipe updated successfully",
	})
}

// DeleteRecipe supprime une recette
// @Summary Supprimer une recette
// @Description Supprime une recette par son ID
// @Tags Recipes
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param id path uint true "ID de la recette"
// @Success 200 {object} dto.MessageResponse "Recette supprimée avec succès"
// @Failure 400 {object} dto.ErrorResponse "ID invalide"
// @Failure 401 {object} dto.ErrorResponse "Non authentifié"
// @Failure 404 {object} dto.ErrorResponse "Recette non trouvée"
// @Failure 500 {object} dto.ErrorResponse "Erreur serveur"
// @Router /recipes/{id} [delete]
func (h *RecipeHandler) DeleteRecipe(c *gin.Context) {
	idStr := c.Param("id")
	log.Printf("DeleteRecipe called with ID: %s", idStr)

	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		log.Printf("Invalid recipe ID: %s, error: %v", idStr, err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid recipe ID",
			"message": "Recipe ID must be a number",
		})
		return
	}

	// Récupérer l'ID de l'utilisateur depuis le contexte d'authentification
	userID, exists := c.Get("user_id")
	if !exists {
		log.Printf("User not authenticated for recipe deletion")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Unauthorized",
			"message": "User not authenticated",
		})
		return
	}

	currentUserID, ok := userID.(uint)
	if !ok {
		log.Printf("Invalid user ID format: %v", userID)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Invalid user ID format",
		})
		return
	}

	log.Printf("User %d attempting to delete recipe %d", currentUserID, id)

	// Récupérer la recette pour vérifier l'auteur
	recipe, err := h.ormService.RecipeRepository.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		log.Printf("Error retrieving recipe %d: %v", id, err)
		switch {
		case errors.Is(err, ormerrors.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "Recipe not found",
				"message": "No recipe found with this ID",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Internal server error",
				"message": "Failed to retrieve recipe",
			})
		}
		return
	}

	log.Printf("Recipe %d found, author: %d, current user: %d", id, recipe.AuthorID, currentUserID)

	// Vérifier que l'utilisateur peut supprimer cette recette
	if recipe.AuthorID != currentUserID {
		log.Printf("User %d is not authorized to delete recipe %d (author: %d)", currentUserID, id, recipe.AuthorID)
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "Forbidden",
			"message": "You can only delete your own recipes",
		})
		return
	}

	log.Printf("Authorization confirmed, proceeding with deletion of recipe %d", id)

	if err := h.ormService.RecipeRepository.Delete(c.Request.Context(), uint(id)); err != nil {
		log.Printf("Error deleting recipe %d: %v", id, err)
		switch {
		case errors.Is(err, ormerrors.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "Recipe not found",
				"message": "No recipe found with this ID",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Internal server error",
				"message": "Failed to delete recipe",
			})
		}
		return
	}

	log.Printf("Recipe %d successfully deleted by user %d", id, currentUserID)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Recipe deleted successfully",
	})
}

// ListRecipes liste les recettes avec pagination
// @Summary Lister les recettes
// @Description Récupère une liste paginée de toutes les recettes publiques
// @Tags Recipes
// @Accept json
// @Produce json
// @Param page query int false "Numéro de page (défaut: 1)"
// @Param limit query int false "Nombre d'éléments par page (défaut: 10, max: 100)"
// @Success 200 {object} dto.RecipeListResponse "Liste des recettes"
// @Failure 500 {object} dto.ErrorResponse "Erreur serveur"
// @Router /recipes [get]
func (h *RecipeHandler) ListRecipes(c *gin.Context) {
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

	// Paramètre de tri
	sort := c.Query("sort")
	var recipes []*dto.Recipe
	var total int64
	var err error

	// Choisir la méthode de récupération selon le tri demandé
	if sort == "popularity" {
		recipes, total, err = h.ormService.RecipeRepository.GetPublicRecipesByRating(c.Request.Context(), limit, offset)
	} else {
		// Tri par défaut (chronologique)
		recipes, total, err = h.ormService.RecipeRepository.GetPublicRecipes(c.Request.Context(), limit, offset)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to retrieve recipes",
		})
		return
	}

	// Traiter les URLs d'images pour les rendre complètes
	processRecipesImageURLs(c, recipes)

	totalPages := int((total + int64(limit) - 1) / int64(limit))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"recipes":      recipes,
			"total_count":  total,
			"current_page": page,
			"total_pages":  totalPages,
			"has_next":     page < totalPages,
			"has_prev":     page > 1,
		},
	})
}

// SearchRecipes effectue une recherche avancée de recettes
// @Summary Rechercher des recettes
// @Description Effectue une recherche avancée de recettes avec filtres et pagination
// @Tags Recipes
// @Accept json
// @Produce json
// @Param q query string false "Terme de recherche"
// @Param page query int false "Numéro de page (défaut: 1)"
// @Param limit query int false "Nombre d'éléments par page (défaut: 10)"
// @Param sort_by query string false "Champ de tri (défaut: created_at)"
// @Param sort_order query string false "Ordre de tri: asc ou desc (défaut: desc)"
// @Param difficulty query string false "Niveau de difficulté: easy, medium, hard"
// @Param prep_time_max query int false "Temps de préparation maximum en minutes"
// @Param categories query string false "IDs de catégories séparés par des virgules"
// @Param tags query string false "IDs de tags séparés par des virgules"
// @Success 200 {object} dto.RecipeListResponse "Résultats de recherche"
// @Failure 500 {object} dto.ErrorResponse "Erreur serveur"
// @Router /recipes/search [get]
func (h *RecipeHandler) SearchRecipes(c *gin.Context) {
	// Construire la requête de recherche depuis les paramètres
	searchQuery := &dto.SearchQuery{
		Query:     c.Query("q"),
		Page:      1,
		Limit:     10,
		SortBy:    c.DefaultQuery("sort_by", "created_at"),
		SortOrder: c.DefaultQuery("sort_order", "desc"),
	}

	// Pagination
	if pageStr := c.Query("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			searchQuery.Page = p
		}
	}

	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			searchQuery.Limit = l
		}
	}

	// Filtres temporels
	if maxPrepStr := c.Query("max_prep_time"); maxPrepStr != "" {
		if t, err := strconv.Atoi(maxPrepStr); err == nil && t > 0 {
			searchQuery.MaxPrepTime = t
		}
	}

	if maxCookStr := c.Query("max_cook_time"); maxCookStr != "" {
		if t, err := strconv.Atoi(maxCookStr); err == nil && t > 0 {
			searchQuery.MaxCookTime = t
		}
	}

	if maxTotalStr := c.Query("max_total_time"); maxTotalStr != "" {
		if t, err := strconv.Atoi(maxTotalStr); err == nil && t > 0 {
			searchQuery.MaxTotalTime = t
		}
	}

	// Autres filtres
	if difficulty := c.Query("difficulty"); difficulty != "" {
		searchQuery.Difficulty = difficulty
	}

	if minRatingStr := c.Query("min_rating"); minRatingStr != "" {
		if rating, err := strconv.ParseFloat(minRatingStr, 64); err == nil && rating >= 0 && rating <= 5 {
			searchQuery.MinRating = rating
		}
	}

	if authorIDStr := c.Query("author_id"); authorIDStr != "" {
		if id, err := strconv.ParseUint(authorIDStr, 10, 32); err == nil {
			searchQuery.AuthorID = uint(id)
		}
	}

	// Support for author parameter (username)
	if authorUsername := c.Query("author"); authorUsername != "" {
		fmt.Printf("DEBUG: SearchRecipes - author parameter received: %s\n", authorUsername)
		// Find user by username and get their ID
		user, err := h.ormService.UserRepository.GetByUsername(c.Request.Context(), authorUsername)
		if err == nil && user != nil {
			fmt.Printf("DEBUG: SearchRecipes - found user %s with ID: %d\n", authorUsername, user.ID)
			searchQuery.AuthorID = user.ID
		} else {
			fmt.Printf("DEBUG: SearchRecipes - error finding user %s: %v\n", authorUsername, err)
		}
	}

	// Filtres par listes (ingrédients, équipements, etc.)
	if ingredients := c.QueryArray("ingredients"); len(ingredients) > 0 {
		searchQuery.Ingredients = ingredients
	}

	if equipments := c.QueryArray("equipments"); len(equipments) > 0 {
		searchQuery.Equipments = equipments
	}

	if categories := c.QueryArray("categories"); len(categories) > 0 {
		searchQuery.Categories = categories
	}

	if tags := c.QueryArray("tags"); len(tags) > 0 {
		searchQuery.Tags = tags
	}

	// Effectuer la recherche
	// Debug: afficher la requête finale
	fmt.Printf("DEBUG: SearchRecipes - Final searchQuery.AuthorID: %d\n", searchQuery.AuthorID)
	fmt.Printf("DEBUG: SearchRecipes - Final searchQuery: %+v\n", searchQuery)

	recipes, total, err := h.ormService.RecipeRepository.Search(c.Request.Context(), searchQuery)
	if err != nil {
		// Log détaillé de l'erreur
		log.Printf("SearchRecipes error: %v", err)
		log.Printf("SearchQuery: %+v", searchQuery)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Search failed",
			"debug":   err.Error(), // Temporaire pour debug
		})
		return
	}

	// Traiter les URLs d'images pour les rendre complètes
	processRecipesImageURLs(c, recipes)

	totalPages := int((total + int64(searchQuery.Limit) - 1) / int64(searchQuery.Limit))

	response := dto.SearchResponse{
		Recipes:     make([]dto.Recipe, len(recipes)),
		TotalCount:  total,
		CurrentPage: searchQuery.Page,
		TotalPages:  totalPages,
		HasNext:     searchQuery.Page < totalPages,
		HasPrev:     searchQuery.Page > 1,
	}

	// Convertir les pointeurs en valeurs
	for i, recipe := range recipes {
		response.Recipes[i] = *recipe
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}

// CopyRecipe copie une recette existante
// @Summary Copier une recette
// @Description Crée une copie d'une recette existante pour l'utilisateur actuel
// @Tags Recipes
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param id path uint true "ID de la recette à copier"
// @Success 201 {object} dto.RecipeResponse "Recette copiée avec succès"
// @Failure 400 {object} dto.ErrorResponse "ID invalide"
// @Failure 401 {object} dto.ErrorResponse "Non authentifié"
// @Failure 404 {object} dto.ErrorResponse "Recette non trouvée"
// @Failure 500 {object} map[string]interface{} "Erreur serveur"
// @Router /recipes/{id}/copy [post]
func (h *RecipeHandler) CopyRecipe(c *gin.Context) {
	idStr := c.Param("id")
	originalRecipeID, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid recipe ID",
			"message": "Recipe ID must be a number",
		})
		return
	}

	// Récupérer l'ID de l'utilisateur depuis le contexte d'authentification
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Unauthorized",
			"message": "User not authenticated",
		})
		return
	}

	newAuthorID, ok := userID.(uint)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Invalid user ID format",
		})
		return
	}

	copiedRecipe, err := h.ormService.RecipeRepository.Copy(c.Request.Context(), uint(originalRecipeID), newAuthorID)
	if err != nil {
		switch {
		case errors.Is(err, ormerrors.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "Recipe not found",
				"message": "No recipe found with this ID",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Internal server error",
				"message": "Failed to copy recipe",
			})
		}
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    copiedRecipe,
		"message": "Recipe copied successfully",
	})
}

// GetUserRecipes récupère les recettes d'un utilisateur
// @Summary Récupérer les recettes d'un utilisateur
// @Description Récupère toutes les recettes créées par un utilisateur spécifique
// @Tags Recipes
// @Accept json
// @Produce json
// @Param user_id path uint true "ID de l'utilisateur"
// @Param page query int false "Numéro de page (défaut: 1)"
// @Param limit query int false "Nombre d'éléments par page (défaut: 10, max: 100)"
// @Success 200 {object} map[string]interface{} "Liste des recettes de l'utilisateur"
// @Failure 400 {object} map[string]interface{} "ID utilisateur invalide"
// @Failure 500 {object} map[string]interface{} "Erreur serveur"
// @Router /users/{user_id}/recipes [get]
func (h *RecipeHandler) GetUserRecipes(c *gin.Context) {
	userIDStr := c.Param("user_id")
	userID, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid user ID",
			"message": "User ID must be a number",
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

	recipes, total, err := h.ormService.RecipeRepository.GetByAuthor(c.Request.Context(), uint(userID), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to retrieve user recipes",
		})
		return
	}

	totalPages := int((total + int64(limit) - 1) / int64(limit))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"recipes":      recipes,
			"total_count":  total,
			"current_page": page,
			"total_pages":  totalPages,
			"has_next":     page < totalPages,
			"has_prev":     page > 1,
		},
	})
}
