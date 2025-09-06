package main

import (
	"log"
	"os"

	"github.com/joho/godotenv"

	"github.com/romainrodriguez/cooking_server/internal/api"
	"github.com/romainrodriguez/cooking_server/internal/services/auth"
	"github.com/romainrodriguez/cooking_server/internal/services/orm"
	"github.com/romainrodriguez/cooking_server/internal/services/orm/config"
	"github.com/romainrodriguez/cooking_server/internal/services/orm/migrations"

	_ "github.com/romainrodriguez/cooking_server/docs" // Import des docs générées par swag
)

// @title Cooking Server API
// @version 1.0
// @description API REST pour une application de partage de recettes de cuisine
// @termsOfService http://swagger.io/terms/

// @contact.name Support API
// @contact.url http://www.cooking-server.com/support
// @contact.email support@cooking-server.com

// @license.name MIT
// @license.url https://opensource.org/licenses/MIT

// @host localhost:8080
// @BasePath /api/v1

// @securityDefinitions.apikey ApiKeyAuth
// @in header
// @name Authorization

func main() {
	// Chargement des variables d'environnement depuis le fichier .env
	if err := godotenv.Load(); err != nil {
		log.Println("Aucun fichier .env trouvé, utilisation des variables d'environnement du système")
	}

	// Configuration de la base de données
	dbConfig := config.LoadDatabaseConfig()

	// Initialisation du service ORM
	ormService, err := orm.NewORMService(dbConfig)
	if err != nil {
		log.Fatalf("Erreur lors de l'initialisation du service ORM: %v", err)
	}
	defer ormService.Close()

	// Exécution des migrations
	migrator := migrations.NewMigrationService(ormService.GetDB())
	if err := migrator.RunMigrations(); err != nil {
		log.Fatalf("Erreur lors de l'exécution des migrations: %v", err)
	}

	// Initialisation du service JWT
	jwtSecret := getEnv("JWT_SECRET", "your-super-secret-jwt-key-change-in-production")
	jwtIssuer := getEnv("JWT_ISSUER", "cooking-server")
	jwtService := auth.NewJWTService(jwtSecret, jwtIssuer)

	// Configuration du serveur API
	serverConfig := &api.ServerConfig{
		Port:        getEnv("SERVER_PORT", "8080"),
		Environment: getEnv("ENV", "development"),
		ORMService:  ormService,
		JWTService:  jwtService,
	}

	// Création et démarrage du serveur
	server := api.NewServer(serverConfig)

	// Le serveur gère l'arrêt gracieux dans sa méthode Start()
	if err := server.Start(); err != nil {
		log.Fatalf("Erreur lors du démarrage du serveur: %v", err)
	}
}

// getEnv récupère une variable d'environnement ou retourne une valeur par défaut
func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
