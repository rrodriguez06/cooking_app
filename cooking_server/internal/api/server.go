package api

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/romainrodriguez/cooking_server/internal/api/middleware"
	"github.com/romainrodriguez/cooking_server/internal/api/routes"
	"github.com/romainrodriguez/cooking_server/internal/services/auth"
	"github.com/romainrodriguez/cooking_server/internal/services/orm"

	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

// Server représente le serveur API
type Server struct {
	router     *gin.Engine
	ormService *orm.ORMService
	jwtService *auth.JWTService
	port       string
}

// ServerConfig contient la configuration du serveur
type ServerConfig struct {
	Port        string
	Environment string // "development", "production"
	ORMService  *orm.ORMService
	JWTService  *auth.JWTService
}

// NewServer crée une nouvelle instance du serveur
func NewServer(config *ServerConfig) *Server {
	// Configuration de Gin selon l'environnement
	if config.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()

	// Middlewares globaux
	router.Use(gin.Logger())
	router.Use(gin.Recovery())
	router.Use(middleware.CORS())
	router.Use(middleware.RequestID())

	server := &Server{
		router:     router,
		ormService: config.ORMService,
		jwtService: config.JWTService,
		port:       config.Port,
	}

	// Configurer les routes
	server.setupRoutes()

	return server
}

// setupRoutes configure toutes les routes de l'API
func (s *Server) setupRoutes() {
	// Route de santé
	s.router.GET("/health", s.healthCheck)

	// Route Swagger pour la documentation
	s.router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// Configurer toutes les routes API
	routes.SetupRoutes(s.router, s.ormService, s.jwtService)
}

// healthCheck vérifie l'état du serveur et de la base de données
func (s *Server) healthCheck(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	// Vérifier la base de données
	if err := s.ormService.HealthCheck(ctx); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status":   "unhealthy",
			"database": "down",
			"error":    err.Error(),
		})
		return
	}

	// Obtenir les statistiques de la DB
	stats, err := s.ormService.GetStats()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"status":   "healthy",
			"database": "up",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":   "healthy",
		"database": "up",
		"stats": gin.H{
			"open_connections": stats.OpenConnections,
			"in_use":           stats.InUse,
			"idle":             stats.Idle,
		},
	})
}

// Start démarre le serveur HTTP
func (s *Server) Start() error {
	srv := &http.Server{
		Addr:         ":" + s.port,
		Handler:      s.router,
		ReadTimeout:  10 * time.Minute, // 10 minutes pour les gros uploads et LLM
		WriteTimeout: 10 * time.Minute, // 10 minutes pour les réponses LLM
		IdleTimeout:  2 * time.Minute,  // 2 minutes pour les connexions idle
	}

	// Canal pour recevoir les signaux d'interruption
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	// Démarrer le serveur dans une goroutine
	go func() {
		log.Printf("🚀 Serveur démarré sur le port %s", s.port)
		log.Printf("📖 API disponible sur http://localhost:%s/api/v1", s.port)
		log.Printf("🏥 Health check sur http://localhost:%s/health", s.port)

		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Erreur de démarrage du serveur: %v", err)
		}
	}()

	// Attendre le signal d'interruption
	<-quit
	log.Println("🛑 Arrêt du serveur...")

	// Délai d'attente pour l'arrêt gracieux
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Arrêt gracieux du serveur HTTP
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("Erreur lors de l'arrêt du serveur: %v", err)
		return err
	}

	// Fermer la connexion à la base de données
	if err := s.ormService.Close(); err != nil {
		log.Printf("Erreur lors de la fermeture de la DB: %v", err)
		return err
	}

	log.Println("✅ Serveur arrêté proprement")
	return nil
}

// GetRouter retourne le router Gin (utile pour les tests)
func (s *Server) GetRouter() *gin.Engine {
	return s.router
}

// LoadServerConfig charge la configuration du serveur depuis les variables d'environnement
func LoadServerConfig() *ServerConfig {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	environment := os.Getenv("ENVIRONMENT")
	if environment == "" {
		environment = "development"
	}

	return &ServerConfig{
		Port:        port,
		Environment: environment,
	}
}
