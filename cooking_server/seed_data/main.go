package main

import (
	"context"
	"fmt"
	"log"

	"github.com/joho/godotenv"
	"github.com/romainrodriguez/cooking_server/internal/services/orm"
	"github.com/romainrodriguez/cooking_server/internal/services/orm/config"
	"github.com/romainrodriguez/cooking_server/seed_data/seeder"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("Aucun fichier .env trouvé, utilisation des variables d'environnement du système")
	}
	// Charger la configuration de la base de données
	cfg := config.LoadDatabaseConfig()

	// Créer le service ORM
	ormService, err := orm.NewORMService(cfg)
	if err != nil {
		log.Fatalf("Erreur lors de la connexion à la base de données: %v", err)
	}
	defer ormService.Close()

	// Créer le contexte
	ctx := context.Background()

	// Créer le seeder
	seederService := seeder.NewSeederService(ormService)

	fmt.Println("🌱 Début du processus de seed des données...")

	// Seed des données de base
	if err := seederService.SeedIngredients(ctx); err != nil {
		log.Fatalf("Erreur lors du seed des ingrédients: %v", err)
	}
	fmt.Println("✅ Ingrédients créés avec succès")

	if err := seederService.SeedEquipments(ctx); err != nil {
		log.Fatalf("Erreur lors du seed des équipements: %v", err)
	}
	fmt.Println("✅ Équipements créés avec succès")

	if err := seederService.SeedCategories(ctx); err != nil {
		log.Fatalf("Erreur lors du seed des catégories: %v", err)
	}
	fmt.Println("✅ Catégories créées avec succès")

	if err := seederService.SeedTags(ctx); err != nil {
		log.Fatalf("Erreur lors du seed des tags: %v", err)
	}
	fmt.Println("✅ Tags créés avec succès")

	// Récupérer un utilisateur existant pour les recettes
	users, _, err := ormService.UserRepository.List(ctx, 10, 0)
	if err != nil || len(users) == 0 {
		log.Fatalf("Aucun utilisateur trouvé. Veuillez créer au moins un utilisateur avant de lancer le seed.")
	}

	if err := seederService.SeedRecipes(ctx, users[0].ID); err != nil {
		log.Fatalf("Erreur lors du seed des recettes: %v", err)
	}
	fmt.Println("✅ Recettes créées avec succès")

	// Mettre à jour les ingrédients avec des icônes
	if err := seederService.UpdateIngredientsWithIcons(ctx); err != nil {
		log.Fatalf("Erreur lors de la mise à jour des icônes d'ingrédients: %v", err)
	}
	fmt.Println("✅ Icônes d'ingrédients mises à jour avec succès")

	// Mettre à jour les équipements avec des icônes
	if err := seederService.UpdateEquipmentsWithIcons(ctx); err != nil {
		log.Fatalf("Erreur lors de la mise à jour des icônes d'équipements: %v", err)
	}
	fmt.Println("✅ Icônes d'équipements mises à jour avec succès")

	fmt.Println("🎉 Processus de seed terminé avec succès!")
}
