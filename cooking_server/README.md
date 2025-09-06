# Cooking Server API

Une API REST complète pour la gestion de recettes de cuisine avec ingrédients, équipements, catégories, tags et commentaires.

## Architecture

L'API suit une architecture modulaire avec séparation des responsabilités :

- **`internal/api/`** : Couche API avec handlers, routes, middleware
- **`internal/services/orm/`** : Service ORM avec repositories et migrations
- **`internal/dto/`** : Data Transfer Objects avec validation
- **`docs/`** : Documentation Swagger générée automatiquement

## Fonctionnalités

### Entités principales
- **Utilisateurs** : Gestion des comptes utilisateurs avec authentification
- **Recettes** : CRUD complet avec étapes structurées, recherche avancée
- **Ingrédients** : Gestion des ingrédients avec autocomplétion
- **Équipements** : Matériel de cuisine nécessaire pour les recettes
- **Catégories** : Classification des recettes
- **Tags** : Étiquettes pour organiser les recettes
- **Commentaires** : Système de commentaires hiérarchique avec notes

### API Features
- **CRUD complet** pour toutes les entités
- **Pagination** sur toutes les listes
- **Recherche avancée** pour les recettes
- **Validation automatique** des données d'entrée
- **Gestion d'erreurs** typée et détaillée
- **Documentation Swagger** complète

## Installation et Lancement

### Prérequis
- Go 1.21+
- PostgreSQL
- swag CLI pour la génération de documentation

### Installation des dépendances
```bash
go mod download
go install github.com/swaggo/swag/cmd/swag@latest
```

### Configuration base de données
Créer une base de données PostgreSQL et configurer les variables d'environnement :
```bash
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=postgres
export DB_PASSWORD=your_password
export DB_NAME=cooking_db
export DB_SSLMODE=disable
export PORT=8080
export ENV=development
```

### Génération de la documentation Swagger
```bash
swag init
```

### Lancement du serveur
```bash
go run main.go
```

## Documentation API

Une fois le serveur lancé, la documentation Swagger est accessible à :
- **Interface Swagger UI** : http://localhost:8080/swagger/index.html
- **JSON Swagger** : http://localhost:8080/swagger/doc.json
- **YAML Swagger** : http://localhost:8080/swagger/swagger.yaml

## Endpoints principaux

### Utilisateurs (`/api/v1/users`)
- `POST /users` - Créer un utilisateur
- `GET /users/{id}` - Récupérer un utilisateur
- `PUT /users/{id}` - Mettre à jour un utilisateur
- `DELETE /users/{id}` - Supprimer un utilisateur
- `GET /users` - Lister les utilisateurs (avec pagination)
- `POST /users/login` - Authentification

### Recettes (`/api/v1/recipes`)
- `POST /recipes` - Créer une recette
- `GET /recipes/{id}` - Récupérer une recette
- `PUT /recipes/{id}` - Mettre à jour une recette
- `DELETE /recipes/{id}` - Supprimer une recette
- `GET /recipes` - Lister les recettes (avec pagination et filtres)
- `GET /recipes/search` - Recherche avancée
- `GET /recipes/user/{user_id}` - Recettes d'un utilisateur
- `POST /recipes/{id}/copy` - Copier une recette

### Commentaires (`/api/v1/comments`)
- `POST /comments` - Créer un commentaire
- `GET /comments/{id}` - Récupérer un commentaire
- `PUT /comments/{id}` - Mettre à jour un commentaire
- `DELETE /comments/{id}` - Supprimer un commentaire
- `GET /comments/recipe/{recipe_id}` - Commentaires d'une recette
- `GET /comments/{id}/replies` - Réponses à un commentaire

### Autres entités
- **Ingrédients** : `/api/v1/ingredients`
- **Équipements** : `/api/v1/equipment`
- **Catégories** : `/api/v1/categories`
- **Tags** : `/api/v1/tags`

## Structures de données

### Recette avec étapes structurées
```json
{
  "title": "Pâtes à la carbonara",
  "description": "Recette italienne traditionnelle",
  "prep_time": 15,
  "cook_time": 20,
  "difficulty": "intermediate",
  "servings": 4,
  "instructions": [
    {
      "step_number": 1,
      "title": "Préparation des ingrédients",
      "description": "Casser les œufs et séparer les jaunes",
      "duration": 5,
      "tips": "Utilisez des œufs à température ambiante"
    }
  ],
  "ingredients": [
    {
      "ingredient_id": 1,
      "quantity": "400",
      "unit": "g"
    }
  ]
}
```

## Middleware et sécurité

- **CORS** : Configuration pour permettre les requêtes cross-origin
- **Request ID** : Traçabilité des requêtes avec UUID
- **Logging** : Journalisation des requêtes HTTP
- **Recovery** : Récupération automatique des paniques
- **Validation** : Validation automatique avec le package validator

## Développement

### Génération de documentation
Après modification des commentaires Swagger :
```bash
swag init
```

### Structure des commentaires Swagger
```go
// @Summary      Description courte
// @Description  Description détaillée
// @Tags         nom_du_tag
// @Accept       json
// @Produce      json
// @Param        name  path/query/body  type  required  "Description"
// @Success      200   {object}  ResponseType  "Description du succès"
// @Failure      400   {object}  ErrorType     "Description de l'erreur"
// @Router       /path [method]
```

## Santé du service

- **Health check** : `GET /health` - Vérifie l'état du serveur et de la base de données

## Future améliorations

- Authentification JWT complète
- Upload d'images pour les recettes
- Système de favoris
- Notifications en temps réel
- Cache Redis pour les performances
- Tests unitaires et d'intégration
