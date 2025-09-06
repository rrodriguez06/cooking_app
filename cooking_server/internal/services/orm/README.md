# Service ORM - Cooking Server

Ce service ORM fournit une couche d'abstraction complète pour les opérations de base de données de l'application de partage de recettes.

## Architecture

```
internal/services/orm/
├── config/              # Configuration de la base de données
│   └── database.go      # Gestion des paramètres DB via env vars
├── errors/              # Gestion des erreurs personnalisées
│   └── errors.go        # Types d'erreurs et helpers
├── interfaces/          # Interfaces pour tous les repositories
│   └── repositories.go  # Contrats d'interface pour chaque entité
├── migrations/          # Gestion des migrations et seed data
│   └── migrator.go      # Service de migration automatique
├── repositories/        # Implémentations CRUD pour chaque entité
│   ├── user_repository.go
│   ├── recipe_repository.go
│   ├── ingredient_repository.go
│   ├── equipment_repository.go
│   ├── category_repository.go
│   ├── tag_repository.go
│   ├── comment_repository.go
│   └── associations_repository.go
└── database.go          # Service principal orchestrant tout
```

## Configuration

Le service utilise les variables d'environnement suivantes :

```bash
# Configuration PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=cooking_server
DB_SSL_MODE=disable

# Configuration de performance
DB_MAX_OPEN_CONNS=25
DB_MAX_IDLE_CONNS=5
DB_DEBUG=false
```

## Utilisation

### Initialisation du service

```go
package main

import (
    "log"
    "github.com/romainrodriguez/cooking_server/internal/services/orm"
)

func main() {
    // Initialisation automatique depuis les variables d'environnement
    ormService, err := orm.NewORMServiceFromConfig()
    if err != nil {
        log.Fatal("Failed to initialize ORM service:", err)
    }
    defer ormService.Close()

    // Exécuter les migrations
    if err := ormService.Migrate(); err != nil {
        log.Fatal("Failed to run migrations:", err)
    }

    // Optionnel : Insérer des données de démonstration
    if err := ormService.SeedData(); err != nil {
        log.Fatal("Failed to seed data:", err)
    }

    // Utiliser les repositories
    userRepo := ormService.UserRepository
    recipeRepo := ormService.RecipeRepository
    // ... autres repositories
}
```

### Exemples d'utilisation des repositories

#### Utilisateurs

```go
ctx := context.Background()

// Créer un utilisateur
user := &dto.User{
    Username:  "john_doe",
    Email:     "john@example.com",
    Password:  "hashed_password",
    FirstName: "John",
    LastName:  "Doe",
}

if err := ormService.UserRepository.Create(ctx, user); err != nil {
    // Gestion d'erreur
}

// Récupérer un utilisateur
user, err := ormService.UserRepository.GetByEmail(ctx, "john@example.com")
if err != nil {
    // Gestion d'erreur
}

// Lister les utilisateurs avec pagination
users, total, err := ormService.UserRepository.List(ctx, 10, 0)
```

#### Recettes

```go
// Créer une recette avec des étapes structurées
recipe := &dto.Recipe{
    Title:       "Pâtes Carbonara",
    Description: "Recette traditionnelle italienne",
    Instructions: dto.RecipeSteps{
        {
            StepNumber:  1,
            Title:       "Préparation",
            Description: "Faire bouillir l'eau salée",
            Duration:    5,
        },
        {
            StepNumber:  2,
            Title:       "Cuisson",
            Description: "Cuire les pâtes al dente",
            Duration:    10,
        },
    },
    PrepTime:   15,
    CookTime:   15,
    Servings:   4,
    Difficulty: "medium",
    AuthorID:   user.ID,
}

if err := ormService.RecipeRepository.Create(ctx, recipe); err != nil {
    // Gestion d'erreur
}

// Recherche avancée
searchQuery := &dto.SearchQuery{
    Query:        "carbonara",
    MaxPrepTime:  30,
    Difficulty:   "medium",
    Ingredients:  []string{"pâtes", "parmesan"},
    Page:         1,
    Limit:        10,
    SortBy:       "created_at",
    SortOrder:    "desc",
}

recipes, total, err := ormService.RecipeRepository.Search(ctx, searchQuery)

// Copier une recette
copiedRecipe, err := ormService.RecipeRepository.Copy(ctx, originalRecipeID, newAuthorID)
```

#### Recherche et filtrage

```go
// Recherche d'ingrédients pour autocomplétion
ingredients, err := ormService.IngredientRepository.SearchByName(ctx, "tomat", 10)

// Récupérer les recettes d'un auteur
recipes, total, err := ormService.RecipeRepository.GetByAuthor(ctx, authorID, 10, 0)

// Commentaires d'une recette avec réponses
comments, total, err := ormService.CommentRepository.GetByRecipe(ctx, recipeID, 20, 0)
```

### Gestion des transactions

```go
// Exemple : Créer une recette avec ses ingrédients dans une transaction
err := ormService.Transaction(func(tx *gorm.DB) error {
    // Créer la recette
    if err := tx.Create(recipe).Error; err != nil {
        return err
    }

    // Ajouter les ingrédients
    for _, ingredient := range recipeIngredients {
        ingredient.RecipeID = recipe.ID
        if err := tx.Create(ingredient).Error; err != nil {
            return err
        }
    }

    return nil
})
```

### Gestion des erreurs

Le service fournit des erreurs typées pour une meilleure gestion :

```go
user, err := ormService.UserRepository.GetByID(ctx, 999)
if err != nil {
    switch {
    case errors.Is(err, ormerrors.ErrRecordNotFound):
        // Utilisateur introuvable
        return c.JSON(404, gin.H{"error": "User not found"})
    case errors.Is(err, ormerrors.ErrDuplicateEntry):
        // Entrée en doublon
        return c.JSON(409, gin.H{"error": "User already exists"})
    default:
        // Autre erreur de base de données
        return c.JSON(500, gin.H{"error": "Internal server error"})
    }
}
```

### Health Check et monitoring

```go
// Vérifier la santé de la base de données
if err := ormService.HealthCheck(ctx); err != nil {
    log.Printf("Database health check failed: %v", err)
}

// Obtenir les statistiques de connexion
stats, err := ormService.GetStats()
if err == nil {
    log.Printf("DB Stats: Open=%d, InUse=%d, Idle=%d", 
        stats.OpenConnections, stats.InUse, stats.Idle)
}
```

## Fonctionnalités avancées

### Recherche intelligente
- Recherche textuelle dans titre et description
- Filtrage multi-critères (temps, difficulté, ingrédients, équipement)
- Tri personnalisable
- Pagination efficace

### Gestion des relations
- Préchargement automatique des relations (Preload)
- Relations many-to-many optimisées
- Gestion des commentaires hiérarchiques

### Performance
- Pool de connexions configurables
- Requêtes optimisées avec index
- Pagination pour éviter les gros datasets
- Transactions pour les opérations complexes

### Extensibilité
- Architecture modulaire par entité
- Interfaces bien définies
- Facilité d'ajout de nouveaux repositories
- Support pour les migrations automatiques

Ce service ORM offre une base solide et performante pour votre application de partage de recettes, avec une architecture propre et facilement maintenable.
