package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/romainrodriguez/cooking_server/internal/api/middleware"
	"github.com/romainrodriguez/cooking_server/internal/dto"
	"github.com/romainrodriguez/cooking_server/internal/services/auth"
	"github.com/romainrodriguez/cooking_server/internal/services/orm"
	ormerrors "github.com/romainrodriguez/cooking_server/internal/services/orm/errors"
)

// UserHandler gère les requêtes liées aux utilisateurs
type UserHandler struct {
	ormService *orm.ORMService
	jwtService *auth.JWTService
}

// NewUserHandler crée une nouvelle instance du handler utilisateur
func NewUserHandler(ormService *orm.ORMService, jwtService *auth.JWTService) *UserHandler {
	return &UserHandler{
		ormService: ormService,
		jwtService: jwtService,
	}
}

// CreateUser crée un nouvel utilisateur
// @Summary Créer un nouvel utilisateur
// @Description Crée un nouvel utilisateur avec les informations fournies
// @Tags Users
// @Accept json
// @Produce json
// @Param user body dto.UserCreateRequest true "Informations de l'utilisateur"
// @Success 201 {object} dto.User "Utilisateur créé avec succès"
// @Failure 400 {object} dto.ErrorResponse "Requête invalide"
// @Failure 409 {object} dto.ErrorResponse "Utilisateur déjà existant"
// @Failure 500 {object} dto.ErrorResponse "Erreur serveur"
// @Router /users [post]
func (h *UserHandler) CreateUser(c *gin.Context) {
	var req dto.UserCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request",
			"message": err.Error(),
		})
		return
	}

	// Hasher le mot de passe
	hashedPassword, err := auth.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to process password",
		})
		return
	}

	user := &dto.User{
		Username: req.Username,
		Email:    req.Email,
		Password: hashedPassword,
		Avatar:   req.Avatar,
	}

	if err := h.ormService.UserRepository.Create(c.Request.Context(), user); err != nil {
		switch {
		case errors.Is(err, ormerrors.ErrDuplicateEntry):
			c.JSON(http.StatusConflict, gin.H{
				"error":   "User already exists",
				"message": "A user with this email or username already exists",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Internal server error",
				"message": "Failed to create user",
			})
		}
		return
	}

	// Convertir en réponse publique (sans mot de passe)
	response := dto.UserResponse{
		ID:        strconv.Itoa(int(user.ID)),
		Username:  user.Username,
		Email:     user.Email,
		Avatar:    user.Avatar,
		CreatedAt: user.CreatedAt,
	}

	// Générer un token JWT pour l'utilisateur créé
	token, err := h.jwtService.GenerateToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to generate authentication token",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    response,
		"token":   token,
	})
}

// GetCurrentUser récupère les informations de l'utilisateur actuellement connecté
// @Summary Récupérer l'utilisateur actuel
// @Description Récupère les informations de l'utilisateur connecté basé sur le token JWT
// @Tags Users
// @Accept json
// @Produce json
// @Success 200 {object} dto.UserDetailsResponse "Informations de l'utilisateur actuel"
// @Failure 401 {object} dto.ErrorResponse "Non authentifié"
// @Failure 404 {object} dto.ErrorResponse "Utilisateur non trouvé"
// @Failure 500 {object} dto.ErrorResponse "Erreur serveur"
// @Security ApiKeyAuth
// @Router /users/me [get]
func (h *UserHandler) GetCurrentUser(c *gin.Context) {
	// Récupérer l'ID de l'utilisateur depuis le contexte (extrait du JWT par le middleware)
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Authentication required",
			"message": "User information not found in token",
		})
		return
	}

	// Récupérer l'utilisateur depuis la base de données
	user, err := h.ormService.UserRepository.GetByID(c.Request.Context(), userID)
	if err != nil {
		switch {
		case errors.Is(err, ormerrors.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "User not found",
				"message": "No user found with this ID",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Internal server error",
				"message": "Failed to retrieve user",
			})
		}
		return
	}

	// Convertir en réponse publique
	response := dto.UserResponse{
		ID:        strconv.Itoa(int(user.ID)),
		Username:  user.Username,
		Email:     user.Email,
		Avatar:    user.Avatar,
		CreatedAt: user.CreatedAt,
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}

// GetUser récupère un utilisateur par son ID
// @Summary Récupérer un utilisateur
// @Description Récupère les informations d'un utilisateur par son ID
// @Tags Users
// @Accept json
// @Produce json
// @Param id path int true "ID de l'utilisateur"
// @Success 200 {object} dto.UserResponse "Utilisateur trouvé"
// @Failure 400 {object} map[string]interface{} "ID invalide"
// @Failure 401 {object} map[string]interface{} "Non authentifié"
// @Failure 404 {object} map[string]interface{} "Utilisateur non trouvé"
// @Failure 500 {object} map[string]interface{} "Erreur serveur"
// @Security ApiKeyAuth
// @Router /users/{id} [get]
func (h *UserHandler) GetUser(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid user ID",
			"message": "User ID must be a number",
		})
		return
	}

	user, err := h.ormService.UserRepository.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		switch {
		case errors.Is(err, ormerrors.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "User not found",
				"message": "No user found with this ID",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Internal server error",
				"message": "Failed to retrieve user",
			})
		}
		return
	}

	// Convertir en réponse publique
	response := dto.UserResponse{
		ID:        strconv.Itoa(int(user.ID)),
		Username:  user.Username,
		Email:     user.Email,
		Avatar:    user.Avatar,
		CreatedAt: user.CreatedAt,
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}

// UpdateUser met à jour un utilisateur
// @Summary Mettre à jour un utilisateur
// @Description Met à jour les informations d'un utilisateur existant
// @Tags Users
// @Accept json
// @Produce json
// @Param id path int true "ID de l'utilisateur"
// @Param user body dto.UserUpdateRequest true "Nouvelles informations de l'utilisateur"
// @Success 200 {object} dto.UserResponse "Utilisateur mis à jour"
// @Failure 400 {object} map[string]interface{} "Requête invalide"
// @Failure 401 {object} map[string]interface{} "Non authentifié"
// @Failure 404 {object} map[string]interface{} "Utilisateur non trouvé"
// @Failure 409 {object} map[string]interface{} "Conflit (email/nom d'utilisateur déjà pris)"
// @Failure 500 {object} map[string]interface{} "Erreur serveur"
// @Security ApiKeyAuth
// @Router /users/{id} [put]
func (h *UserHandler) UpdateUser(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid user ID",
			"message": "User ID must be a number",
		})
		return
	}

	// Vérifier l'ownership : on ne peut modifier que son propre compte
	if currentUserID, ok := middleware.GetCurrentUserID(c); !ok || currentUserID != uint(id) {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "Forbidden",
			"message": "Vous ne pouvez modifier que votre propre compte",
		})
		return
	}

	var req dto.UserUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request",
			"message": err.Error(),
		})
		return
	}

	// Récupérer l'utilisateur existant
	user, err := h.ormService.UserRepository.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		switch {
		case errors.Is(err, ormerrors.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "User not found",
				"message": "No user found with this ID",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Internal server error",
				"message": "Failed to retrieve user",
			})
		}
		return
	}

	// Mettre à jour les champs (le mot de passe passe par l'endpoint dédié ChangePassword)
	if req.Username != "" {
		user.Username = req.Username
	}
	if req.Email != "" {
		user.Email = req.Email
	}
	if req.Avatar != "" {
		user.Avatar = req.Avatar
	}

	if err := h.ormService.UserRepository.Update(c.Request.Context(), user); err != nil {
		switch {
		case errors.Is(err, ormerrors.ErrDuplicateEntry):
			c.JSON(http.StatusConflict, gin.H{
				"error":   "Duplicate entry",
				"message": "Username or email already in use",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Internal server error",
				"message": "Failed to update user",
			})
		}
		return
	}

	// Convertir en réponse publique
	response := dto.UserResponse{
		ID:        strconv.Itoa(int(user.ID)),
		Username:  user.Username,
		Email:     user.Email,
		Avatar:    user.Avatar,
		CreatedAt: user.CreatedAt,
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}

// DeleteUser supprime un utilisateur
// @Summary Supprimer un utilisateur
// @Description Supprime définitivement un utilisateur du système
// @Tags Users
// @Accept json
// @Produce json
// @Param id path int true "ID de l'utilisateur"
// @Success 200 {object} map[string]interface{} "Utilisateur supprimé avec succès"
// @Failure 400 {object} map[string]interface{} "ID invalide"
// @Failure 401 {object} map[string]interface{} "Non authentifié"
// @Failure 404 {object} map[string]interface{} "Utilisateur non trouvé"
// @Failure 500 {object} map[string]interface{} "Erreur serveur"
// @Security ApiKeyAuth
// @Router /users/{id} [delete]
func (h *UserHandler) DeleteUser(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid user ID",
			"message": "User ID must be a number",
		})
		return
	}

	// Vérifier l'ownership : on ne peut supprimer que son propre compte
	if currentUserID, ok := middleware.GetCurrentUserID(c); !ok || currentUserID != uint(id) {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "Forbidden",
			"message": "Vous ne pouvez supprimer que votre propre compte",
		})
		return
	}

	if err := h.ormService.UserRepository.Delete(c.Request.Context(), uint(id)); err != nil {
		switch {
		case errors.Is(err, ormerrors.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "User not found",
				"message": "No user found with this ID",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Internal server error",
				"message": "Failed to delete user",
			})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "User deleted successfully",
	})
}

// ListUsers liste les utilisateurs avec pagination
// @Summary Lister les utilisateurs
// @Description Récupère une liste paginée d'utilisateurs
// @Tags Users
// @Accept json
// @Produce json
// @Param page query int false "Numéro de page (défaut: 1)"
// @Param limit query int false "Nombre d'éléments par page (défaut: 10)"
// @Success 200 {object} map[string]interface{} "Liste des utilisateurs"
// @Failure 401 {object} map[string]interface{} "Non authentifié"
// @Failure 500 {object} map[string]interface{} "Erreur serveur"
// @Security ApiKeyAuth
// @Router /users [get]
func (h *UserHandler) ListUsers(c *gin.Context) {
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

	users, total, err := h.ormService.UserRepository.List(c.Request.Context(), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to retrieve users",
		})
		return
	}

	// Convertir en réponses publiques
	var responses []dto.UserResponse
	for _, user := range users {
		responses = append(responses, dto.UserResponse{
			ID:        strconv.Itoa(int(user.ID)),
			Username:  user.Username,
			Email:     user.Email,
			Avatar:    user.Avatar,
			CreatedAt: user.CreatedAt,
		})
	}

	totalPages := int((total + int64(limit) - 1) / int64(limit))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"users":        responses,
			"total_count":  total,
			"current_page": page,
			"total_pages":  totalPages,
			"has_next":     page < totalPages,
			"has_prev":     page > 1,
		},
	})
}

// LoginUser authentifie un utilisateur
// @Summary Connexion utilisateur
// @Description Authentifie un utilisateur avec email et mot de passe
// @Tags Users
// @Accept json
// @Produce json
// @Param credentials body dto.UserLoginRequest true "Identifiants de connexion"
// @Success 200 {object} map[string]interface{} "Connexion réussie"
// @Failure 400 {object} map[string]interface{} "Requête invalide"
// @Failure 401 {object} map[string]interface{} "Identifiants incorrects"
// @Failure 500 {object} map[string]interface{} "Erreur serveur"
// @Router /users/login [post]
func (h *UserHandler) LoginUser(c *gin.Context) {
	var req dto.UserLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request",
			"message": err.Error(),
		})
		return
	}

	// Récupérer l'utilisateur par email
	user, err := h.ormService.UserRepository.GetByEmail(c.Request.Context(), req.Email)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Invalid credentials",
			"message": "Email or password is incorrect",
		})
		return
	}

	// Vérifier le mot de passe hashé
	if !auth.CheckPassword(req.Password, user.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Invalid credentials",
			"message": "Email or password is incorrect",
		})
		return
	}

	// Générer un JWT token
	token, err := h.jwtService.GenerateToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to generate authentication token",
		})
		return
	}

	response := dto.UserResponse{
		ID:        strconv.Itoa(int(user.ID)),
		Username:  user.Username,
		Email:     user.Email,
		Avatar:    user.Avatar,
		CreatedAt: user.CreatedAt,
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Login successful",
		"data":    response,
		"token":   token,
	})
}

// GetUserProfile récupère le profil public d'un utilisateur avec ses recettes et statistiques
// @Summary Récupérer le profil public d'un utilisateur
// @Description Récupère le profil public d'un utilisateur avec ses recettes publiques, listes publiques et statistiques
// @Tags Users
// @Accept json
// @Produce json
// @Param id path int true "ID de l'utilisateur"
// @Success 200 {object} dto.UserProfileResponse "Profil utilisateur trouvé"
// @Failure 400 {object} map[string]interface{} "ID invalide"
// @Failure 404 {object} map[string]interface{} "Utilisateur non trouvé"
// @Failure 500 {object} map[string]interface{} "Erreur serveur"
// @Security ApiKeyAuth
// @Router /users/{id}/profile [get]
func (h *UserHandler) GetUserProfile(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid user ID",
			"message": "User ID must be a number",
		})
		return
	}

	profileUserID := uint(id)

	// Récupérer l'utilisateur
	user, err := h.ormService.UserRepository.GetByID(c.Request.Context(), profileUserID)
	if err != nil {
		switch {
		case errors.Is(err, ormerrors.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "User not found",
				"message": "No user found with this ID",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Internal server error",
				"message": "Failed to retrieve user",
			})
		}
		return
	}

	// Récupérer les recettes publiques de l'utilisateur
	var filteredRecipes []dto.Recipe
	publicRecipes, _, err := h.ormService.RecipeRepository.GetByAuthor(c.Request.Context(), profileUserID, 6, 0)
	if err != nil {
		// En cas d'erreur, on initialise un slice vide
		filteredRecipes = []dto.Recipe{}
	} else {
		// Filtrer pour ne garder que les recettes publiques
		for _, recipe := range publicRecipes {
			if recipe.IsPublic {
				filteredRecipes = append(filteredRecipes, *recipe)
			}
		}
	}

	// Récupérer les listes publiques de l'utilisateur
	var convertedLists []dto.RecipeList
	publicLists, _, err := h.ormService.RecipeListRepository.GetPublicListsByUser(c.Request.Context(), profileUserID, 6, 0)
	if err != nil {
		// En cas d'erreur, on initialise un slice vide
		convertedLists = []dto.RecipeList{}
	} else {
		// Convertir en slice de valeurs
		for _, list := range publicLists {
			convertedLists = append(convertedLists, *list)
		}
	}

	// Récupérer les statistiques
	followersCount, err := h.ormService.UserFollowRepository.GetFollowersCount(c.Request.Context(), profileUserID)
	if err != nil {
		followersCount = 0
	}

	followingCount, err := h.ormService.UserFollowRepository.GetFollowingCount(c.Request.Context(), profileUserID)
	if err != nil {
		followingCount = 0
	}

	// Compter les recettes publiques
	recipeCount := int64(len(filteredRecipes))
	// Compter manuellement les recettes publiques
	allRecipes, _, err := h.ormService.RecipeRepository.GetByAuthor(c.Request.Context(), profileUserID, 1000, 0)
	if err == nil {
		count := int64(0)
		for _, recipe := range allRecipes {
			if recipe.IsPublic {
				count++
			}
		}
		recipeCount = count
	}

	// Vérifier si l'utilisateur connecté suit cet utilisateur
	isFollowing := false
	if currentUserID, exists := middleware.GetCurrentUserID(c); exists && currentUserID != profileUserID {
		isFollowing, _ = h.ormService.UserFollowRepository.IsFollowing(c.Request.Context(), currentUserID, profileUserID)
	}

	// S'assurer que les arrays ne sont jamais nil
	if filteredRecipes == nil {
		filteredRecipes = []dto.Recipe{}
	}
	if convertedLists == nil {
		convertedLists = []dto.RecipeList{}
	}

	response := dto.UserProfileResponse{
		Success: true,
		Data: struct {
			User           dto.User         `json:"user"`
			PublicRecipes  []dto.Recipe     `json:"public_recipes"`
			PublicLists    []dto.RecipeList `json:"public_lists"`
			IsFollowing    bool             `json:"is_following"`
			FollowersCount int64            `json:"followers_count"`
			FollowingCount int64            `json:"following_count"`
			RecipeCount    int64            `json:"recipe_count"`
		}{
			User:           *user,
			PublicRecipes:  filteredRecipes,
			PublicLists:    convertedLists,
			IsFollowing:    isFollowing,
			FollowersCount: followersCount,
			FollowingCount: followingCount,
			RecipeCount:    recipeCount,
		},
	}

	c.JSON(http.StatusOK, response)
}

// FollowUser permet de suivre un utilisateur
// @Summary Suivre un utilisateur
// @Description Permet à l'utilisateur connecté de suivre un autre utilisateur
// @Tags Users
// @Accept json
// @Produce json
// @Param id path int true "ID de l'utilisateur à suivre"
// @Success 200 {object} dto.UserFollowResponse "Suivi avec succès"
// @Failure 400 {object} map[string]interface{} "ID invalide ou tentative de se suivre soi-même"
// @Failure 401 {object} map[string]interface{} "Non authentifié"
// @Failure 404 {object} map[string]interface{} "Utilisateur non trouvé"
// @Failure 409 {object} map[string]interface{} "Déjà suivi"
// @Failure 500 {object} map[string]interface{} "Erreur serveur"
// @Security ApiKeyAuth
// @Router /users/{id}/follow [post]
func (h *UserHandler) FollowUser(c *gin.Context) {
	idStr := c.Param("id")
	followingID, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid user ID",
			"message": "User ID must be a number",
		})
		return
	}

	followerID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Authentication required",
			"message": "User information not found in token",
		})
		return
	}

	// Log des informations de debug
	log.Printf("[FOLLOW] User %d trying to follow user %d", followerID, followingID)

	if followerID == uint(followingID) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid operation",
			"message": "Cannot follow yourself",
		})
		return
	}

	err = h.ormService.UserFollowRepository.Follow(c.Request.Context(), followerID, uint(followingID))
	if err != nil {
		log.Printf("[FOLLOW] Error following user: %v", err)
		switch {
		case errors.Is(err, ormerrors.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "User not found",
				"message": "No user found with this ID",
			})
		case errors.Is(err, ormerrors.ErrDuplicateEntry):
			c.JSON(http.StatusConflict, gin.H{
				"error":   "Already following",
				"message": "You are already following this user",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Internal server error",
				"message": "Failed to follow user",
			})
		}
		return
	}

	log.Printf("[FOLLOW] Successfully followed user %d by user %d", followingID, followerID)
	c.JSON(http.StatusOK, dto.UserFollowResponse{
		Success:     true,
		Message:     "User followed successfully",
		IsFollowing: true,
	})
}

// UnfollowUser permet d'arrêter de suivre un utilisateur
// @Summary Arrêter de suivre un utilisateur
// @Description Permet à l'utilisateur connecté d'arrêter de suivre un autre utilisateur
// @Tags Users
// @Accept json
// @Produce json
// @Param id path int true "ID de l'utilisateur à ne plus suivre"
// @Success 200 {object} dto.UserFollowResponse "Suivi arrêté avec succès"
// @Failure 400 {object} map[string]interface{} "ID invalide"
// @Failure 401 {object} map[string]interface{} "Non authentifié"
// @Failure 404 {object} map[string]interface{} "Relation non trouvée"
// @Failure 500 {object} map[string]interface{} "Erreur serveur"
// @Security ApiKeyAuth
// @Router /users/{id}/follow [delete]
func (h *UserHandler) UnfollowUser(c *gin.Context) {
	idStr := c.Param("id")
	followingID, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid user ID",
			"message": "User ID must be a number",
		})
		return
	}

	followerID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Authentication required",
			"message": "User information not found in token",
		})
		return
	}

	err = h.ormService.UserFollowRepository.Unfollow(c.Request.Context(), followerID, uint(followingID))
	if err != nil {
		switch {
		case errors.Is(err, ormerrors.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "Not following",
				"message": "You are not following this user",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Internal server error",
				"message": "Failed to unfollow user",
			})
		}
		return
	}

	c.JSON(http.StatusOK, dto.UserFollowResponse{
		Success:     true,
		Message:     "User unfollowed successfully",
		IsFollowing: false,
	})
}

// GetFollowers récupère la liste des suiveurs d'un utilisateur
// @Summary Récupérer les suiveurs d'un utilisateur
// @Description Récupère la liste paginée des utilisateurs qui suivent l'utilisateur spécifié
// @Tags Users
// @Accept json
// @Produce json
// @Param id path int true "ID de l'utilisateur"
// @Param page query int false "Numéro de page (défaut: 1)"
// @Param limit query int false "Nombre d'éléments par page (défaut: 10)"
// @Success 200 {object} dto.UserFollowListResponse "Liste des suiveurs"
// @Failure 400 {object} map[string]interface{} "ID invalide"
// @Failure 404 {object} map[string]interface{} "Utilisateur non trouvé"
// @Failure 500 {object} map[string]interface{} "Erreur serveur"
// @Security ApiKeyAuth
// @Router /users/{id}/followers [get]
func (h *UserHandler) GetFollowers(c *gin.Context) {
	idStr := c.Param("id")
	userID, err := strconv.ParseUint(idStr, 10, 32)
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

	followers, total, err := h.ormService.UserFollowRepository.GetFollowers(c.Request.Context(), uint(userID), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to retrieve followers",
		})
		return
	}

	// Convertir en slice de valeurs
	var usersList []dto.User
	for _, user := range followers {
		usersList = append(usersList, *user)
	}

	totalPages := int((total + int64(limit) - 1) / int64(limit))

	response := dto.UserFollowListResponse{
		Success: true,
		Data: struct {
			Users       []dto.User `json:"users"`
			TotalCount  int64      `json:"total_count"`
			CurrentPage int        `json:"current_page"`
			TotalPages  int        `json:"total_pages"`
			HasNext     bool       `json:"has_next"`
			HasPrev     bool       `json:"has_prev"`
		}{
			Users:       usersList,
			TotalCount:  total,
			CurrentPage: page,
			TotalPages:  totalPages,
			HasNext:     page < totalPages,
			HasPrev:     page > 1,
		},
	}

	c.JSON(http.StatusOK, response)
}

// GetFollowing récupère la liste des utilisateurs suivis par un utilisateur
// @Summary Récupérer les utilisateurs suivis
// @Description Récupère la liste paginée des utilisateurs suivis par l'utilisateur spécifié
// @Tags Users
// @Accept json
// @Produce json
// @Param id path int true "ID de l'utilisateur"
// @Param page query int false "Numéro de page (défaut: 1)"
// @Param limit query int false "Nombre d'éléments par page (défaut: 10)"
// @Success 200 {object} dto.UserFollowListResponse "Liste des utilisateurs suivis"
// @Failure 400 {object} map[string]interface{} "ID invalide"
// @Failure 404 {object} map[string]interface{} "Utilisateur non trouvé"
// @Failure 500 {object} map[string]interface{} "Erreur serveur"
// @Security ApiKeyAuth
// @Router /users/{id}/following [get]
func (h *UserHandler) GetFollowing(c *gin.Context) {
	idStr := c.Param("id")
	userID, err := strconv.ParseUint(idStr, 10, 32)
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

	following, total, err := h.ormService.UserFollowRepository.GetFollowing(c.Request.Context(), uint(userID), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to retrieve following",
		})
		return
	}

	// Convertir en slice de valeurs
	var usersList []dto.User
	for _, user := range following {
		usersList = append(usersList, *user)
	}

	totalPages := int((total + int64(limit) - 1) / int64(limit))

	response := dto.UserFollowListResponse{
		Success: true,
		Data: struct {
			Users       []dto.User `json:"users"`
			TotalCount  int64      `json:"total_count"`
			CurrentPage int        `json:"current_page"`
			TotalPages  int        `json:"total_pages"`
			HasNext     bool       `json:"has_next"`
			HasPrev     bool       `json:"has_prev"`
		}{
			Users:       usersList,
			TotalCount:  total,
			CurrentPage: page,
			TotalPages:  totalPages,
			HasNext:     page < totalPages,
			HasPrev:     page > 1,
		},
	}

	c.JSON(http.StatusOK, response)
}

// ChangePassword permet à un utilisateur authentifié de changer son propre mot de passe.
// Exige le mot de passe actuel (re-authentification) — contrairement à l'ancien flux via UpdateUser.
// @Summary Changer le mot de passe
// @Description Change le mot de passe de l'utilisateur authentifié après vérification du mot de passe actuel
// @Tags Users
// @Accept json
// @Produce json
// @Param id path int true "ID de l'utilisateur"
// @Param passwordData body dto.UserPasswordChangeRequest true "Mot de passe actuel et nouveau"
// @Success 200 {object} map[string]interface{} "Mot de passe mis à jour"
// @Failure 400 {object} map[string]interface{} "Requête invalide"
// @Failure 401 {object} map[string]interface{} "Mot de passe actuel incorrect"
// @Failure 403 {object} map[string]interface{} "Interdit"
// @Failure 500 {object} map[string]interface{} "Erreur serveur"
// @Security ApiKeyAuth
// @Router /users/{id}/password [put]
func (h *UserHandler) ChangePassword(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid user ID",
			"message": "User ID must be a number",
		})
		return
	}

	// Ownership : on ne peut changer que son propre mot de passe
	if currentUserID, ok := middleware.GetCurrentUserID(c); !ok || currentUserID != uint(id) {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "Forbidden",
			"message": "Vous ne pouvez modifier que votre propre mot de passe",
		})
		return
	}

	var req dto.UserPasswordChangeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request",
			"message": err.Error(),
		})
		return
	}

	if req.NewPassword != req.ConfirmPassword {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Password mismatch",
			"message": "Les mots de passe ne correspondent pas",
		})
		return
	}

	user, err := h.ormService.UserRepository.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "User not found",
			"message": "No user found with this ID",
		})
		return
	}

	// Re-authentification : vérifier le mot de passe actuel
	if !auth.CheckPassword(req.CurrentPassword, user.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Invalid credentials",
			"message": "Le mot de passe actuel est incorrect",
		})
		return
	}

	hashedPassword, err := auth.HashPassword(req.NewPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to hash password",
		})
		return
	}

	user.Password = hashedPassword
	if err := h.ormService.UserRepository.Update(c.Request.Context(), user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to update password",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Mot de passe mis à jour",
	})
}

// RequestPasswordReset (étape 1 « mot de passe oublié ») génère un token à usage unique et à expiration.
// App familiale, sans envoi d'email : le token est renvoyé dans la réponse pour être utilisé
// immédiatement à l'étape de confirmation. La réponse est générique si l'email est inconnu.
// @Summary Demander une réinitialisation de mot de passe
// @Tags Users
// @Accept json
// @Produce json
// @Param data body dto.UserPasswordResetRequestRequest true "Email du compte"
// @Success 200 {object} map[string]interface{} "Jeton généré (ou réponse générique)"
// @Router /users/reset-password/request [post]
func (h *UserHandler) RequestPasswordReset(c *gin.Context) {
	var req dto.UserPasswordResetRequestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request",
			"message": err.Error(),
		})
		return
	}

	user, err := h.ormService.UserRepository.GetByEmail(c.Request.Context(), req.Email)
	if err != nil {
		// Réponse générique : ne pas révéler si l'email existe.
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Si un compte existe pour cet email, un jeton de réinitialisation a été généré.",
		})
		return
	}

	// Générer un token aléatoire (32 octets → 64 hexa)
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to generate token",
		})
		return
	}
	token := hex.EncodeToString(tokenBytes)
	expiresAt := time.Now().Add(15 * time.Minute)

	user.ResetToken = token
	user.ResetTokenExpiresAt = &expiresAt
	if err := h.ormService.UserRepository.Update(c.Request.Context(), user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to store reset token",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Jeton de réinitialisation généré (valable 15 minutes).",
		"token":   token,
	})
}

// ConfirmPasswordReset (étape 2) réinitialise le mot de passe si le token est valide et non expiré,
// puis invalide le token (usage unique).
// @Summary Confirmer la réinitialisation du mot de passe
// @Tags Users
// @Accept json
// @Produce json
// @Param data body dto.UserPasswordResetConfirmRequest true "Email, token et nouveau mot de passe"
// @Success 200 {object} map[string]interface{} "Mot de passe réinitialisé"
// @Failure 400 {object} map[string]interface{} "Jeton invalide ou expiré"
// @Router /users/reset-password/confirm [post]
func (h *UserHandler) ConfirmPasswordReset(c *gin.Context) {
	var req dto.UserPasswordResetConfirmRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request",
			"message": err.Error(),
		})
		return
	}

	if req.NewPassword != req.ConfirmPassword {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Password mismatch",
			"message": "Les mots de passe ne correspondent pas",
		})
		return
	}

	user, err := h.ormService.UserRepository.GetByEmail(c.Request.Context(), req.Email)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid token",
			"message": "Jeton invalide ou expiré",
		})
		return
	}

	// Token présent, correspondant et non expiré
	if user.ResetToken == "" || user.ResetToken != req.Token ||
		user.ResetTokenExpiresAt == nil || user.ResetTokenExpiresAt.Before(time.Now()) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid token",
			"message": "Jeton invalide ou expiré",
		})
		return
	}

	hashedPassword, err := auth.HashPassword(req.NewPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to hash password",
		})
		return
	}

	user.Password = hashedPassword
	user.ResetToken = ""       // usage unique
	user.ResetTokenExpiresAt = nil
	if err := h.ormService.UserRepository.Update(c.Request.Context(), user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to update password",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Mot de passe réinitialisé avec succès",
	})
}
