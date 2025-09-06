package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/romainrodriguez/cooking_server/internal/api/handlers"
	"github.com/romainrodriguez/cooking_server/internal/api/middleware"
	"github.com/romainrodriguez/cooking_server/internal/services/auth"
)

func SetupUploadRoutes(router *gin.RouterGroup, uploadHandler *handlers.UploadHandler, jwtService *auth.JWTService) {
	upload := router.Group("/upload")
	{
		// Routes protégées par authentification
		upload.Use(middleware.AuthMiddleware(jwtService))
		upload.POST("/image", uploadHandler.UploadImage)
		upload.DELETE("/image", uploadHandler.DeleteImage)
	}
}
