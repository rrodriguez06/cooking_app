package migrations

import (
	"fmt"
	"log"

	"github.com/romainrodriguez/cooking_server/internal/dto"
	"gorm.io/gorm"
)

// MigrationService gère les migrations de la base de données
type MigrationService struct {
	db *gorm.DB
}

// NewMigrationService crée une nouvelle instance du service de migration
func NewMigrationService(db *gorm.DB) *MigrationService {
	return &MigrationService{db: db}
}

// RunMigrations exécute toutes les migrations nécessaires
func (m *MigrationService) RunMigrations() error {
	log.Println("Starting database migrations...")

	// Ordre des migrations important à cause des clés étrangères
	models := []interface{}{
		&dto.User{},
		&dto.Category{},
		&dto.Tag{},
		&dto.Ingredient{},
		&dto.Equipment{},
		&dto.Recipe{},
		&dto.RecipeIngredient{},
		&dto.RecipeEquipment{},
		&dto.RecipeTag{},
		&dto.Comment{},
		&dto.MealPlan{},

		// Nouvelles tables pour favoris et listes
		&dto.UserFavoriteRecipe{},
		&dto.RecipeList{},
		&dto.RecipeListItem{},

		// Table pour le système de suivi
		&dto.UserFollow{},
	}

	for _, model := range models {
		if err := m.db.AutoMigrate(model); err != nil {
			return fmt.Errorf("failed to migrate %T: %w", model, err)
		}
		log.Printf("Successfully migrated %T", model)
	}

	log.Println("All migrations completed successfully")
	return nil
}

// DropAllTables supprime toutes les tables (utile pour les tests)
func (m *MigrationService) DropAllTables() error {
	log.Println("Dropping all tables...")

	// Ordre inverse pour respecter les contraintes de clés étrangères
	models := []interface{}{
		&dto.UserFollow{},
		&dto.RecipeListItem{},
		&dto.RecipeList{},
		&dto.UserFavoriteRecipe{},
		&dto.MealPlan{},
		&dto.Comment{},
		&dto.RecipeEquipment{},
		&dto.RecipeIngredient{},
		&dto.RecipeTag{},
		&dto.Recipe{},
		&dto.Equipment{},
		&dto.Ingredient{},
		&dto.Tag{},
		&dto.Category{},
		&dto.User{},
	}

	for _, model := range models {
		if err := m.db.Migrator().DropTable(model); err != nil {
			return fmt.Errorf("failed to drop table %T: %w", model, err)
		}
		log.Printf("Successfully dropped table %T", model)
	}

	log.Println("All tables dropped successfully")
	return nil
}

// SeedData insère des données de test/démo
func (m *MigrationService) SeedData() error {
	log.Println("Seeding database with initial data...")

	// Créer des catégories par défaut
	categories := []*dto.Category{
		{Name: "Entrées", Description: "Plats d'entrée", Color: "#FF6B6B", Icon: "🥗"},
		{Name: "Plats principaux", Description: "Plats de résistance", Color: "#4ECDC4", Icon: "🍽️"},
		{Name: "Desserts", Description: "Desserts et sucreries", Color: "#45B7D1", Icon: "🍰"},
		{Name: "Boissons", Description: "Boissons et cocktails", Color: "#96CEB4", Icon: "🥤"},
		{Name: "Petit-déjeuner", Description: "Plats pour le matin", Color: "#FFEAA7", Icon: "🥞"},
	}

	for _, category := range categories {
		var existingCategory dto.Category
		if err := m.db.Where("name = ?", category.Name).First(&existingCategory).Error; err == gorm.ErrRecordNotFound {
			if err := m.db.Create(category).Error; err != nil {
				return fmt.Errorf("failed to create category %s: %w", category.Name, err)
			}
			log.Printf("Created category: %s", category.Name)
		}
	}

	// Créer des tags par défaut
	tags := []*dto.Tag{
		{Name: "Végétarien", Description: "Sans viande"},
		{Name: "Végan", Description: "Sans produits d'origine animale"},
		{Name: "Sans gluten", Description: "Adapté aux personnes cœliaques"},
		{Name: "Rapide", Description: "Moins de 30 minutes"},
		{Name: "Facile", Description: "Niveau débutant"},
		{Name: "Épicé", Description: "Contient des épices fortes"},
		{Name: "Sans lactose", Description: "Sans produits laitiers"},
		{Name: "Healthy", Description: "Équilibré et nutritif"},
	}

	for _, tag := range tags {
		var existingTag dto.Tag
		if err := m.db.Where("name = ?", tag.Name).First(&existingTag).Error; err == gorm.ErrRecordNotFound {
			if err := m.db.Create(tag).Error; err != nil {
				return fmt.Errorf("failed to create tag %s: %w", tag.Name, err)
			}
			log.Printf("Created tag: %s", tag.Name)
		}
	}

	log.Println("Database seeding completed successfully")
	return nil
}
