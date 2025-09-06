package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// CORS middleware pour gérer les requêtes cross-origin
func CORS() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With, X-Request-ID")
		c.Header("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})
}

// RequestID middleware pour ajouter un ID unique à chaque requête
func RequestID() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = uuid.New().String()
		}
		c.Header("X-Request-ID", requestID)
		c.Set("RequestID", requestID)
		c.Next()
	})
}

// TODO: Middleware d'authentification JWT
// func AuthRequired() gin.HandlerFunc {
// 	return gin.HandlerFunc(func(c *gin.Context) {
// 		// Vérifier le token JWT
// 		// Extraire l'utilisateur du token
// 		// Ajouter l'utilisateur au contexte
// 		c.Next()
// 	})
// }
