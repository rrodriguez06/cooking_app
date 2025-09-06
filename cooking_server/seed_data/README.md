# Programme de Seed des Données

Ce programme permet de remplir la base de données avec des données de test pour l'application de recettes de cuisine.

## Contenu des données générées

### Ingrédients (40+ ingrédients)
- **Légumes**: tomates, oignons, ail, carottes, pommes de terre, courgettes, etc.
- **Viandes**: bœuf haché, filet de porc, escalope de dinde, cuisses de poulet, etc.
- **Poissons**: filet de saumon, crevettes
- **Produits laitiers**: lait, beurre, crème fraîche, fromages, œufs
- **Épices et herbes**: sel, poivre, thym, basilic, persil, paprika, etc.
- **Féculents**: riz, pâtes, quinoa, farine, pain
- **Condiments**: huile d'olive, vinaigre balsamique, moutarde, sauce soja
- **Fruits**: citrons, pommes, bananes

### Équipements (25+ équipements)
- **Découpe**: couteau de chef, planche à découper
- **Cuisson**: casserole, poêle, wok, sauteuse, autocuiseur
- **Électroménager**: four, mixeur, robot de cuisine, blender, grille-pain
- **Mesure**: balance, verre doseur, cuillères à mesurer
- **Ustensiles**: fouet, spatule, râpe, presse-ail, économe
- **Pâtisserie**: moule à gâteau, rouleau à pâtisserie, poche à douille

### Catégories (12 catégories)
- Entrées, Plats principaux, Desserts
- Apéritifs, Soupes, Salades
- Pâtes, Viandes, Poissons
- Végétarien, Boissons, Petit-déjeuner

### Tags (30+ tags)
- **Difficulté**: Rapide, Facile, Économique
- **Régime**: Sans gluten, Végétalien, Santé, Bio
- **Cuisine**: Français, Italien, Asiatique, Méditerranéen, Mexicain, Indien
- **Saison**: Été, Hiver, Automne, Printemps
- **Type**: Comfort food, Fête, Épicé, Sucré, Salé
- **Cuisson**: Micro-ondes, Four, Grillé, Bouilli, Frit, Cru, Mariné, Fumé

### Recettes (7 recettes complètes)
1. **Pâtes à la carbonara** - Italien, Rapide, Facile
2. **Salade César** - Rapide, Facile, Été
3. **Bœuf bourguignon** - Français, Hiver, Comfort food
4. **Ratatouille** - Végétarien, Santé, Méditerranéen
5. **Risotto aux champignons** - Italien, Végétarien
6. **Tarte aux pommes** - Français, Dessert, Automne
7. **Saumon grillé aux légumes** - Santé, Rapide, Été

Chaque recette inclut :
- Instructions détaillées étape par étape avec durées
- Liste complète des ingrédients avec quantités et unités
- Équipements nécessaires
- Associations avec catégories et tags
- Temps de préparation, cuisson et total
- Niveau de difficulté et nombre de portions

## Prérequis

- La base de données doit être créée et migrée
- Au moins un utilisateur doit exister dans la table `users`
- Les variables d'environnement de la base de données doivent être configurées

## Utilisation

1. **Compiler le programme** :
   ```bash
   cd seed_data
   go build -o seed_data .
   ```

2. **Exécuter le programme** :
   ```bash
   ./seed_data
   ```

## Structure du programme

```
seed_data/
├── main.go              # Point d'entrée principal
├── seeder/
│   ├── seeder.go        # Service principal et seed des données de base
│   └── recipes.go       # Seed des recettes avec associations
└── README.md           # Ce fichier
```

## Fonctionnalités

- **Évite les doublons** : Le programme vérifie l'existence des données avant insertion
- **Respect des contraintes** : Toutes les foreign keys et contraintes GORM sont respectées
- **Associations complètes** : Les recettes sont créées avec toutes leurs associations (ingrédients, équipements, catégories, tags)
- **Données réalistes** : Les données générées sont cohérentes et utilisables pour les tests

## Dépannage

- **Erreur de connexion à la base** : Vérifiez vos variables d'environnement
- **Aucun utilisateur trouvé** : Créez au moins un utilisateur avant d'exécuter le seed
- **Erreur d'association** : Vérifiez que les migrations ont été exécutées correctement

## Personnalisation

Pour ajouter vos propres données de test, modifiez les slices dans les fonctions :
- `SeedIngredients()` dans `seeder.go`
- `SeedEquipments()` dans `seeder.go`
- `SeedCategories()` dans `seeder.go`
- `SeedTags()` dans `seeder.go`
- `SeedRecipes()` dans `recipes.go`
