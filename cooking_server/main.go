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
	env := getEnv("ENV", "development")
	jwtSecret := os.Getenv("JWT_SECRET")
	// Valeurs vides ou par défaut connues = non sécurisées (secret prévisible → forge de token).
	insecureSecrets := map[string]bool{
		"": true,
		"your-super-secret-jwt-key-change-in-production":                            true,
		"your_super_secret_jwt_key_change_in_production_with_at_least_32_characters": true,
		"dev-only-insecure-secret":                                                  true,
	}
	if insecureSecrets[jwtSecret] {
		if env == "production" {
			// Ne jamais démarrer en production avec une clé absente ou par défaut.
			log.Fatal("JWT_SECRET doit être défini avec une valeur sûre en production (clé absente ou par défaut détectée)")
		}
		log.Println("[AVERTISSEMENT] JWT_SECRET absent ou non sécurisé : utilisation d'une clé de développement NON sécurisée")
		jwtSecret = "dev-only-insecure-secret"
	}
	jwtIssuer := getEnv("JWT_ISSUER", "cooking-server")
	jwtService := auth.NewJWTService(jwtSecret, jwtIssuer)

	// Configuration du serveur API
	serverConfig := &api.ServerConfig{
		Port:        getEnv("SERVER_PORT", "8080"),
		Environment: env,
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
