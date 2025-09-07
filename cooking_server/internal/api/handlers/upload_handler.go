package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/romainrodriguez/cooking_server/internal/api/middleware"
	"github.com/romainrodriguez/cooking_server/internal/services/orm"
)

type UploadHandler struct {
	ormService *orm.ORMService
}

func NewUploadHandler(ormService *orm.ORMService) *UploadHandler {
	return &UploadHandler{
		ormService: ormService,
	}
}

// UploadImage permet d'uploader une image pour une recette
// @Summary Upload d'une image de recette
// @Description Upload une image et retourne l'URL pour l'utiliser dans une recette
// @Tags Upload
// @Accept multipart/form-data
// @Produce json
// @Param image formData file true "Image de la recette (JPEG, PNG, WebP, max 5MB)"
// @Success 200 {object} map[string]string "Image uploadée avec succès"
// @Failure 400 {object} map[string]string "Erreur de validation"
// @Failure 500 {object} map[string]string "Erreur serveur"
// @Security BearerAuth
// @Router /upload/image [post]
func (h *UploadHandler) UploadImage(c *gin.Context) {
	// Récupérer le fichier depuis le formulaire
	file, header, err := c.Request.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Aucun fichier fourni",
		})
		return
	}
	defer file.Close()

	// Vérifier la taille du fichier (max 5MB)
	if header.Size > 5*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Le fichier est trop volumineux (max 5MB)",
		})
		return
	}

	// Vérifier le type de fichier
	contentType := header.Header.Get("Content-Type")
	allowedTypes := []string{"image/jpeg", "image/png", "image/webp"}
	isValidType := false
	for _, allowedType := range allowedTypes {
		if contentType == allowedType {
			isValidType = true
			break
		}
	}

	if !isValidType {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Type de fichier non supporté. Utilisez JPEG, PNG ou WebP",
		})
		return
	}

	// Générer un nom de fichier unique
	ext := filepath.Ext(header.Filename)
	if ext == "" {
		// Déterminer l'extension basée sur le content-type si elle n'est pas présente
		switch contentType {
		case "image/jpeg":
			ext = ".jpg"
		case "image/png":
			ext = ".png"
		case "image/webp":
			ext = ".webp"
		}
	}

	// Créer un nom de fichier unique avec UUID + timestamp
	fileName := fmt.Sprintf("%s_%d%s", uuid.New().String(), time.Now().Unix(), ext)

	// Créer le dossier d'upload s'il n'existe pas
	uploadDir := "uploads/images"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Erreur lors de la création du dossier d'upload",
		})
		return
	}

	// Chemin complet du fichier
	filePath := filepath.Join(uploadDir, fileName)

	// Créer le fichier de destination
	dst, err := os.Create(filePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Erreur lors de la création du fichier",
		})
		return
	}
	defer dst.Close()

	// Copier le contenu du fichier uploadé vers le fichier de destination
	if _, err := io.Copy(dst, file); err != nil {
		// Supprimer le fichier en cas d'erreur
		os.Remove(filePath)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Erreur lors de l'enregistrement du fichier",
		})
		return
	}

	// Retourner l'URL du fichier
	// Construire l'URL complète du serveur
	baseURL := getBaseURL(c)
	relativeURL := fmt.Sprintf("/uploads/images/%s", fileName)
	fullImageURL := fmt.Sprintf("%s%s", baseURL, relativeURL)

	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"message":   "Image uploadée avec succès",
		"image_url": relativeURL,  // URL relative pour stockage en DB
		"full_url":  fullImageURL, // URL complète pour affichage immédiat
		"filename":  fileName,
	})
}

// DeleteImage permet de supprimer une image uploadée
// @Summary Suppression d'une image
// @Description Supprime une image uploadée du serveur
// @Tags Upload
// @Accept json
// @Produce json
// @Param body body map[string]string true "URL de l'image à supprimer"
// @Success 200 {object} map[string]string "Image supprimée avec succès"
// @Failure 400 {object} map[string]string "Erreur de validation"
// @Failure 404 {object} map[string]string "Image non trouvée"
// @Failure 500 {object} map[string]string "Erreur serveur"
// @Security BearerAuth
// @Router /upload/image [delete]
func (h *UploadHandler) DeleteImage(c *gin.Context) {
	var req struct {
		ImageURL string `json:"image_url" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "URL d'image requise",
		})
		return
	}

	// Extraire le nom du fichier de l'URL
	// Format attendu: /uploads/images/filename.jpg
	if !strings.HasPrefix(req.ImageURL, "/uploads/images/") {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "URL d'image invalide",
		})
		return
	}

	// Extraire le nom du fichier
	fileName := strings.TrimPrefix(req.ImageURL, "/uploads/images/")
	filePath := filepath.Join("uploads/images", fileName)

	// Vérifier que le fichier existe
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Image non trouvée",
		})
		return
	}

	// Supprimer le fichier
	if err := os.Remove(filePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Erreur lors de la suppression du fichier",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Image supprimée avec succès",
	})
}

// UploadProfileImage permet d'uploader une image de profil pour l'utilisateur connecté
// @Summary Upload d'une image de profil
// @Description Upload une image de profil et supprime l'ancienne si elle existe
// @Tags Upload
// @Accept multipart/form-data
// @Produce json
// @Param image formData file true "Image de profil (JPEG, PNG, WebP, max 5MB)"
// @Success 200 {object} map[string]string "Image uploadée avec succès"
// @Failure 400 {object} map[string]string "Erreur de validation"
// @Failure 401 {object} map[string]string "Non authentifié"
// @Failure 500 {object} map[string]string "Erreur serveur"
// @Security BearerAuth
// @Router /upload/profile-image [post]
func (h *UploadHandler) UploadProfileImage(c *gin.Context) {
	// Récupérer l'ID de l'utilisateur connecté
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "Non authentifié",
		})
		return
	}

	// Récupérer l'utilisateur pour connaître son avatar actuel
	user, err := h.ormService.UserRepository.GetByID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Erreur lors de la récupération de l'utilisateur",
		})
		return
	}

	// Récupérer le fichier depuis le formulaire
	file, header, err := c.Request.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Aucun fichier fourni",
		})
		return
	}
	defer file.Close()

	// Vérifier la taille du fichier (max 5MB)
	if header.Size > 5*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Le fichier est trop volumineux (max 5MB)",
		})
		return
	}

	// Vérifier le type de fichier
	contentType := header.Header.Get("Content-Type")
	allowedTypes := []string{"image/jpeg", "image/png", "image/webp"}
	isValidType := false
	for _, allowedType := range allowedTypes {
		if contentType == allowedType {
			isValidType = true
			break
		}
	}

	if !isValidType {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Type de fichier non supporté. Utilisez JPEG, PNG ou WebP",
		})
		return
	}

	// Générer un nom de fichier unique
	ext := filepath.Ext(header.Filename)
	if ext == "" {
		// Déterminer l'extension basée sur le content-type si elle n'est pas présente
		switch contentType {
		case "image/jpeg":
			ext = ".jpg"
		case "image/png":
			ext = ".png"
		case "image/webp":
			ext = ".webp"
		}
	}

	// Créer un nom de fichier unique avec UUID + timestamp
	fileName := fmt.Sprintf("profile_%s_%d%s", uuid.New().String(), time.Now().Unix(), ext)

	// Créer le dossier d'upload s'il n'existe pas
	uploadDir := "uploads/images"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Erreur lors de la création du dossier d'upload",
		})
		return
	}

	// Chemin complet du fichier
	filePath := filepath.Join(uploadDir, fileName)

	// Créer le fichier de destination
	dst, err := os.Create(filePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Erreur lors de la création du fichier",
		})
		return
	}
	defer dst.Close()

	// Copier le contenu du fichier uploadé vers le fichier de destination
	if _, err := io.Copy(dst, file); err != nil {
		// Supprimer le fichier en cas d'erreur
		os.Remove(filePath)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Erreur lors de l'enregistrement du fichier",
		})
		return
	}

	// Supprimer l'ancienne photo de profil si elle existe
	if user.Avatar != "" && strings.HasPrefix(user.Avatar, "/uploads/images/") {
		oldFileName := strings.TrimPrefix(user.Avatar, "/uploads/images/")
		oldFilePath := filepath.Join("uploads/images", oldFileName)

		// Vérifier que le fichier existe avant de le supprimer
		if _, err := os.Stat(oldFilePath); err == nil {
			if err := os.Remove(oldFilePath); err != nil {
				// Log l'erreur mais ne pas faire échouer la requête
				fmt.Printf("Erreur lors de la suppression de l'ancienne photo de profil: %v\n", err)
			}
		}
	}

	// Construire l'URL complète du serveur
	baseURL := getBaseURL(c)
	relativeURL := fmt.Sprintf("/uploads/images/%s", fileName)
	fullImageURL := fmt.Sprintf("%s%s", baseURL, relativeURL)

	// Mettre à jour l'avatar de l'utilisateur dans la base de données
	user.Avatar = relativeURL
	if err := h.ormService.UserRepository.Update(c.Request.Context(), user); err != nil {
		// Supprimer le fichier uploadé en cas d'erreur de base de données
		os.Remove(filePath)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Erreur lors de la mise à jour du profil",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"message":   "Photo de profil uploadée avec succès",
		"image_url": relativeURL,  // URL relative pour stockage en DB
		"full_url":  fullImageURL, // URL complète pour affichage immédiat
		"filename":  fileName,
	})
}
