package main

import (
	"context"
	"log"
	"os"

	"github.com/romainrodriguez/cooking_server/internal/dto"
	"github.com/romainrodriguez/cooking_server/internal/services/orm"
)

func main() {
	// Définir les variables d'environnement pour l'exemple
	// Dans un vrai projet, ces valeurs viendraient d'un fichier .env ou du système
	os.Setenv("DB_HOST", "localhost")
	os.Setenv("DB_PORT", "5432")
	os.Setenv("DB_USER", "postgres")
	os.Setenv("DB_PASSWORD", "password")
	os.Setenv("DB_NAME", "cooking_server_dev")
	os.Setenv("DB_SSL_MODE", "disable")
	os.Setenv("DB_DEBUG", "true")

	// Initialiser le service ORM
	ormService, err := orm.NewORMServiceFromConfig()
	if err != nil {
		log.Fatal("Erreur lors de l'initialisation du service ORM:", err)
	}
	defer func() {
		if err := ormService.Close(); err != nil {
			log.Printf("Erreur lors de la fermeture de la connexion DB: %v", err)
		}
	}()

	log.Println("Service ORM initialisé avec succès")

	// Exécuter les migrations
	log.Println("Exécution des migrations...")
	if err := ormService.Migrate(); err != nil {
		log.Fatal("Erreur lors des migrations:", err)
	}
	log.Println("Migrations terminées avec succès")

	// Insérer des données de démonstration
	log.Println("Insertion des données de démonstration...")
	if err := ormService.SeedData(); err != nil {
		log.Fatal("Erreur lors de l'insertion des données:", err)
	}
	log.Println("Données de démonstration insérées")

	// Exemples d'utilisation
	ctx := context.Background()

	// Exemple 1: Créer un utilisateur
	log.Println("\n=== Création d'un utilisateur ===")
	user := &dto.User{
		Username: "chef_demo",
		Email:    "chef@demo.com",
		Password: "hashed_password_here",
		Avatar:   "https://example.com/avatar.jpg",
	}

	if err := ormService.UserRepository.Create(ctx, user); err != nil {
		log.Printf("Erreur lors de la création de l'utilisateur: %v", err)
	} else {
		log.Printf("Utilisateur créé avec l'ID: %d", user.ID)
	}

	// Exemple 2: Créer des ingrédients
	log.Println("\n=== Création d'ingrédients ===")
	ingredients := []*dto.Ingredient{
		{Name: "Pâtes", Description: "Pâtes italiennes", Category: "Féculents"},
		{Name: "Parmesan", Description: "Fromage italien", Category: "Produits laitiers"},
		{Name: "Œufs", Description: "Œufs frais", Category: "Protéines"},
		{Name: "Lardons", Description: "Lardons fumés", Category: "Viandes"},
	}

	for _, ingredient := range ingredients {
		if err := ormService.IngredientRepository.Create(ctx, ingredient); err != nil {
			log.Printf("Erreur lors de la création de l'ingrédient %s: %v", ingredient.Name, err)
		} else {
			log.Printf("Ingrédient '%s' créé avec l'ID: %d", ingredient.Name, ingredient.ID)
		}
	}

	// Exemple 3: Créer une recette avec des étapes
	log.Println("\n=== Création d'une recette ===")
	recipe := &dto.Recipe{
		Title:       "Pâtes Carbonara",
		Description: "Recette traditionnelle de pâtes carbonara italiennes",
		Instructions: dto.RecipeSteps{
			{
				StepNumber:  1,
				Title:       "Préparation de l'eau",
				Description: "Faire bouillir une grande casserole d'eau salée",
				Duration:    5,
				Tips:        "L'eau doit être bien salée, comme la mer",
			},
			{
				StepNumber:  2,
				Title:       "Préparation de la sauce",
				Description: "Mélanger les œufs, le parmesan râpé et le poivre dans un bol",
				Duration:    3,
				Tips:        "Utiliser des œufs à température ambiante",
			},
			{
				StepNumber:  3,
				Title:       "Cuisson des lardons",
				Description: "Faire revenir les lardons dans une poêle jusqu'à ce qu'ils soient dorés",
				Duration:    5,
				Temperature: 180,
			},
			{
				StepNumber:  4,
				Title:       "Cuisson des pâtes",
				Description: "Cuire les pâtes selon les indications du paquet jusqu'à ce qu'elles soient al dente",
				Duration:    10,
				Tips:        "Goûter pour vérifier la cuisson",
			},
			{
				StepNumber:  5,
				Title:       "Assemblage",
				Description: "Égoutter les pâtes, les mélanger avec les lardons et la sauce aux œufs hors du feu",
				Duration:    2,
				Tips:        "Le mélange doit se faire hors du feu pour éviter de cuire les œufs",
			},
		},
		PrepTime:   10,
		CookTime:   15,
		Servings:   4,
		Difficulty: "medium",
		AuthorID:   user.ID,
		IsPublic:   true,
	}

	if err := ormService.RecipeRepository.Create(ctx, recipe); err != nil {
		log.Printf("Erreur lors de la création de la recette: %v", err)
	} else {
		log.Printf("Recette '%s' créée avec l'ID: %d", recipe.Title, recipe.ID)
		log.Printf("Temps total calculé: %d minutes", recipe.TotalTime)
	}

	// Exemple 4: Rechercher des ingrédients
	log.Println("\n=== Recherche d'ingrédients ===")
	foundIngredients, err := ormService.IngredientRepository.SearchByName(ctx, "pât", 5)
	if err != nil {
		log.Printf("Erreur lors de la recherche: %v", err)
	} else {
		log.Printf("Trouvé %d ingrédients correspondant à 'pât':", len(foundIngredients))
		for _, ing := range foundIngredients {
			log.Printf("  - %s (ID: %d)", ing.Name, ing.ID)
		}
	}

	// Exemple 5: Lister les recettes publiques
	log.Println("\n=== Liste des recettes publiques ===")
	publicRecipes, total, err := ormService.RecipeRepository.GetPublicRecipes(ctx, 10, 0)
	if err != nil {
		log.Printf("Erreur lors de la récupération des recettes: %v", err)
	} else {
		log.Printf("Trouvé %d recettes publiques (total: %d):", len(publicRecipes), total)
		for _, r := range publicRecipes {
			log.Printf("  - '%s' par %s (%d étapes)", r.Title, r.Author.Username, len(r.Instructions))
		}
	}

	// Exemple 6: Vérifier l'état de la base de données
	log.Println("\n=== État de la base de données ===")
	if err := ormService.HealthCheck(ctx); err != nil {
		log.Printf("Health check échoué: %v", err)
	} else {
		log.Println("Health check réussi ✓")
	}

	stats, err := ormService.GetStats()
	if err != nil {
		log.Printf("Erreur lors de la récupération des stats: %v", err)
	} else {
		log.Printf("Statistiques DB: Connexions ouvertes=%d, En cours=%d, Inactives=%d",
			stats.OpenConnections, stats.InUse, stats.Idle)
	}

	log.Println("\n=== Exemple terminé avec succès ===")
}
