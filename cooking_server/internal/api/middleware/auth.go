package middleware

import (
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/romainrodriguez/cooking_server/internal/services/auth"
)

const (
	AuthorizationHeader = "Authorization"
	BearerPrefix        = "Bearer "
	UserIDKey           = "user_id"
	UserEmailKey        = "user_email"
	UserUsernameKey     = "user_username"
)

// AuthMiddleware middleware d'authentification JWT
func AuthMiddleware(jwtService *auth.JWTService) gin.HandlerFunc {
	return func(c *gin.Context) {
		log.Printf("[AUTH] AuthMiddleware called for request: %s %s", c.Request.Method, c.Request.URL.Path)

		// Récupérer le header Authorization
		authHeader := c.GetHeader(AuthorizationHeader)
		if authHeader == "" {
			log.Printf("[AUTH] Missing authorization header")
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "Authorization header required",
				"message": "Missing authorization header",
			})
			c.Abort()
			return
		}

		// Vérifier le format Bearer
		if !strings.HasPrefix(authHeader, BearerPrefix) {
			log.Printf("[AUTH] Invalid authorization header format: %s", authHeader)
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "Invalid authorization header format",
				"message": "Authorization header must start with 'Bearer '",
			})
			c.Abort()
			return
		}

		// Extraire le token
		tokenString := strings.TrimPrefix(authHeader, BearerPrefix)
		if tokenString == "" {
			log.Printf("[AUTH] Empty token")
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "Token required",
				"message": "Empty token",
			})
			c.Abort()
			return
		}

		log.Printf("[AUTH] Validating token...")
		// Valider le token
		claims, err := jwtService.ValidateToken(tokenString)
		if err != nil {
			log.Printf("[AUTH] Token validation failed: %v", err)
			switch err {
			case auth.ErrExpiredToken:
				c.JSON(http.StatusUnauthorized, gin.H{
					"error":   "Token expired",
					"message": "Your session has expired, please login again",
				})
			case auth.ErrInvalidToken:
				c.JSON(http.StatusUnauthorized, gin.H{
					"error":   "Invalid token",
					"message": "The provided token is invalid",
				})
			default:
				c.JSON(http.StatusUnauthorized, gin.H{
					"error":   "Authentication failed",
					"message": "Token validation failed",
				})
			}
			c.Abort()
			return
		}

		log.Printf("[AUTH] Token validated successfully - UserID: %d, Email: %s", claims.UserID, claims.Email)
		// Stocker les informations utilisateur dans le contexte
		c.Set(UserIDKey, claims.UserID)
		c.Set(UserEmailKey, claims.Email)
		c.Set(UserUsernameKey, claims.Username)

		c.Next()
	}
}

// OptionalAuthMiddleware middleware d'authentification optionnel
// Permet d'accéder à la route sans token, mais extrait les infos utilisateur si présent
func OptionalAuthMiddleware(jwtService *auth.JWTService) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader(AuthorizationHeader)
		if authHeader == "" {
			c.Next()
			return
		}

		if !strings.HasPrefix(authHeader, BearerPrefix) {
			c.Next()
			return
		}

		tokenString := strings.TrimPrefix(authHeader, BearerPrefix)
		if tokenString == "" {
			c.Next()
			return
		}

		claims, err := jwtService.ValidateToken(tokenString)
		if err != nil {
			// En mode optionnel, on continue même si le token est invalide
			c.Next()
			return
		}

		// Stocker les informations utilisateur dans le contexte
		c.Set(UserIDKey, claims.UserID)
		c.Set(UserEmailKey, claims.Email)
		c.Set(UserUsernameKey, claims.Username)

		c.Next()
	}
}

// GetCurrentUserID récupère l'ID de l'utilisateur connecté depuis le contexte
func GetCurrentUserID(c *gin.Context) (uint, bool) {
	userID, exists := c.Get(UserIDKey)
	if !exists {
		return 0, false
	}
	id, ok := userID.(uint)
	return id, ok
}

// GetCurrentUserEmail récupère l'email de l'utilisateur connecté depuis le contexte
func GetCurrentUserEmail(c *gin.Context) (string, bool) {
	email, exists := c.Get(UserEmailKey)
	if !exists {
		return "", false
	}
	emailStr, ok := email.(string)
	return emailStr, ok
}

// GetCurrentUserUsername récupère le nom d'utilisateur connecté depuis le contexte
func GetCurrentUserUsername(c *gin.Context) (string, bool) {
	username, exists := c.Get(UserUsernameKey)
	if !exists {
		return "", false
	}
	usernameStr, ok := username.(string)
	return usernameStr, ok
}

// RequireCurrentUser vérifie qu'un utilisateur est connecté et retourne son ID
func RequireCurrentUser(c *gin.Context) (uint, bool) {
	userID, exists := GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Authentication required",
			"message": "You must be logged in to access this resource",
		})
		return 0, false
	}
	return userID, true
}
