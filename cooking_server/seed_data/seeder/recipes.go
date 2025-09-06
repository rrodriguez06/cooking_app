package seeder

import (
	"context"
	"fmt"

	"github.com/romainrodriguez/cooking_server/internal/dto"
)

// SeedRecipes crée des recettes de test
func (s *SeederService) SeedRecipes(ctx context.Context, authorID uint) error {
	// Récupérer les ingrédients, équipements, catégories et tags
	ingredients, _, err := s.ormService.IngredientRepository.List(ctx, 100, 0)
	if err != nil {
		return fmt.Errorf("erreur lors de la récupération des ingrédients: %w", err)
	}

	equipments, _, err := s.ormService.EquipmentRepository.List(ctx, 100, 0)
	if err != nil {
		return fmt.Errorf("erreur lors de la récupération des équipements: %w", err)
	}

	categories, _, err := s.ormService.CategoryRepository.List(ctx, 100, 0)
	if err != nil {
		return fmt.Errorf("erreur lors de la récupération des catégories: %w", err)
	}

	tags, _, err := s.ormService.TagRepository.List(ctx, 100, 0)
	if err != nil {
		return fmt.Errorf("erreur lors de la récupération des tags: %w", err)
	}

	// Créer des mappings pour faciliter la recherche
	ingredientMap := make(map[string]*dto.Ingredient)
	for _, ing := range ingredients {
		ingredientMap[ing.Name] = ing
	}

	equipmentMap := make(map[string]*dto.Equipment)
	for _, eq := range equipments {
		equipmentMap[eq.Name] = eq
	}

	categoryMap := make(map[string]*dto.Category)
	for _, cat := range categories {
		categoryMap[cat.Name] = cat
	}

	tagMap := make(map[string]*dto.Tag)
	for _, tag := range tags {
		tagMap[tag.Name] = tag
	}

	// Définir les recettes
	recipes := []RecipeData{
		{
			Recipe: dto.Recipe{
				Title:       "Pâtes à la carbonara",
				Description: "Un grand classique de la cuisine italienne, simple et délicieux",
				Instructions: dto.RecipeSteps{
					{StepNumber: 1, Description: "Faire cuire les pâtes dans de l'eau bouillante salée selon les instructions du paquet", Duration: 10},
					{StepNumber: 2, Description: "Pendant ce temps, faire revenir les lardons dans une poêle sans matière grasse", Duration: 5},
					{StepNumber: 3, Description: "Battre les œufs avec le parmesan râpé et du poivre", Duration: 2},
					{StepNumber: 4, Description: "Égoutter les pâtes en gardant un peu d'eau de cuisson", Duration: 1},
					{StepNumber: 5, Description: "Mélanger les pâtes chaudes avec le mélange œufs-fromage hors du feu", Duration: 2},
					{StepNumber: 6, Description: "Ajouter les lardons et servir immédiatement", Duration: 1},
				},
				PrepTime:   10,
				CookTime:   15,
				TotalTime:  25,
				Servings:   4,
				Difficulty: "easy",
				IsPublic:   true,
				AuthorID:   authorID,
			},
			Ingredients: []RecipeIngredientData{
				{Name: "Pâtes", Quantity: 400, Unit: "g"},
				{Name: "Œufs", Quantity: 3, Unit: "pièces"},
				{Name: "Parmesan", Quantity: 100, Unit: "g"},
				{Name: "Poivre noir", Quantity: 1, Unit: "pincée"},
			},
			Equipments: []string{"Casserole", "Poêle", "Fouet"},
			Categories: []string{"Plats principaux", "Pâtes"},
			Tags:       []string{"Italien", "Rapide", "Facile"},
		},
		{
			Recipe: dto.Recipe{
				Title:       "Salade César",
				Description: "Une salade fraîche et croquante avec sa sauce crémeuse caractéristique",
				Instructions: dto.RecipeSteps{
					{StepNumber: 1, Description: "Laver et essorer la salade verte", Duration: 5},
					{StepNumber: 2, Description: "Couper le pain en petits cubes et les faire griller", Duration: 8},
					{StepNumber: 3, Description: "Préparer la sauce en mélangeant mayonnaise, parmesan, ail et citron", Duration: 5},
					{StepNumber: 4, Description: "Mélanger la salade avec la sauce", Duration: 2},
					{StepNumber: 5, Description: "Ajouter les croûtons et servir", Duration: 1},
				},
				PrepTime:   15,
				CookTime:   8,
				TotalTime:  23,
				Servings:   4,
				Difficulty: "easy",
				IsPublic:   true,
				AuthorID:   authorID,
			},
			Ingredients: []RecipeIngredientData{
				{Name: "Pain", Quantity: 200, Unit: "g"},
				{Name: "Parmesan", Quantity: 50, Unit: "g"},
				{Name: "Ail", Quantity: 1, Unit: "gousse"},
				{Name: "Citrons", Quantity: 1, Unit: "pièce"},
			},
			Equipments: []string{"Couteau de chef", "Planche à découper", "Grille-pain"},
			Categories: []string{"Entrées", "Salades"},
			Tags:       []string{"Rapide", "Facile", "Été"},
		},
		{
			Recipe: dto.Recipe{
				Title:       "Bœuf bourguignon",
				Description: "Un plat traditionnel français mijoté, parfait pour les froides soirées d'hiver",
				Instructions: dto.RecipeSteps{
					{StepNumber: 1, Description: "Couper la viande en gros cubes et la faire dorer dans l'huile", Duration: 15, Temperature: 180},
					{StepNumber: 2, Description: "Ajouter les oignons et les carottes coupés en morceaux", Duration: 10},
					{StepNumber: 3, Description: "Flamber au cognac et ajouter le vin rouge", Duration: 5},
					{StepNumber: 4, Description: "Ajouter le bouquet garni et laisser mijoter 2h à couvert", Duration: 120, Temperature: 160},
					{StepNumber: 5, Description: "Faire sauter les champignons séparément", Duration: 10},
					{StepNumber: 6, Description: "Servir avec les champignons et des pommes de terre", Duration: 5},
				},
				PrepTime:   30,
				CookTime:   150,
				TotalTime:  180,
				Servings:   6,
				Difficulty: "medium",
				IsPublic:   true,
				AuthorID:   authorID,
			},
			Ingredients: []RecipeIngredientData{
				{Name: "Bœuf haché", Quantity: 1000, Unit: "g"},
				{Name: "Oignons", Quantity: 2, Unit: "pièces"},
				{Name: "Carottes", Quantity: 3, Unit: "pièces"},
				{Name: "Champignons de Paris", Quantity: 250, Unit: "g"},
				{Name: "Pommes de terre", Quantity: 800, Unit: "g"},
				{Name: "Thym", Quantity: 1, Unit: "branche"},
			},
			Equipments: []string{"Casserole", "Couteau de chef", "Planche à découper"},
			Categories: []string{"Plats principaux", "Viandes"},
			Tags:       []string{"Français", "Hiver", "Comfort food"},
		},
		{
			Recipe: dto.Recipe{
				Title:       "Ratatouille",
				Description: "Un plat végétarien coloré et savoureux de légumes du soleil",
				Instructions: dto.RecipeSteps{
					{StepNumber: 1, Description: "Laver et couper tous les légumes en dés", Duration: 20},
					{StepNumber: 2, Description: "Faire revenir les oignons et l'ail dans l'huile d'olive", Duration: 5},
					{StepNumber: 3, Description: "Ajouter les aubergines et les courgettes", Duration: 10},
					{StepNumber: 4, Description: "Incorporer les tomates et les poivrons", Duration: 10},
					{StepNumber: 5, Description: "Assaisonner avec les herbes et laisser mijoter 30 minutes", Duration: 30},
				},
				PrepTime:   25,
				CookTime:   55,
				TotalTime:  80,
				Servings:   4,
				Difficulty: "easy",
				IsPublic:   true,
				AuthorID:   authorID,
			},
			Ingredients: []RecipeIngredientData{
				{Name: "Tomates", Quantity: 4, Unit: "pièces"},
				{Name: "Courgettes", Quantity: 2, Unit: "pièces"},
				{Name: "Poivrons", Quantity: 2, Unit: "pièces"},
				{Name: "Oignons", Quantity: 1, Unit: "pièce"},
				{Name: "Ail", Quantity: 3, Unit: "gousses"},
				{Name: "Huile d'olive", Quantity: 3, Unit: "cuillères à soupe"},
				{Name: "Thym", Quantity: 1, Unit: "branche"},
				{Name: "Basilic", Quantity: 10, Unit: "feuilles"},
			},
			Equipments: []string{"Sauteuse", "Couteau de chef", "Planche à découper"},
			Categories: []string{"Plats principaux", "Végétarien"},
			Tags:       []string{"Végétarien", "Santé", "Méditerranéen", "Été"},
		},
		{
			Recipe: dto.Recipe{
				Title:       "Risotto aux champignons",
				Description: "Un risotto crémeux et parfumé aux champignons de saison",
				Instructions: dto.RecipeSteps{
					{StepNumber: 1, Description: "Faire chauffer le bouillon et le maintenir à température", Duration: 5},
					{StepNumber: 2, Description: "Faire revenir les champignons dans le beurre", Duration: 8},
					{StepNumber: 3, Description: "Dans une autre casserole, faire nacrer le riz avec l'oignon", Duration: 5},
					{StepNumber: 4, Description: "Ajouter le bouillon louche par louche en remuant constamment", Duration: 18},
					{StepNumber: 5, Description: "Incorporer les champignons et le parmesan", Duration: 2},
					{StepNumber: 6, Description: "Servir immédiatement avec du parmesan supplémentaire", Duration: 1},
				},
				PrepTime:   15,
				CookTime:   25,
				TotalTime:  40,
				Servings:   4,
				Difficulty: "medium",
				IsPublic:   true,
				AuthorID:   authorID,
			},
			Ingredients: []RecipeIngredientData{
				{Name: "Riz basmati", Quantity: 300, Unit: "g"},
				{Name: "Champignons de Paris", Quantity: 300, Unit: "g"},
				{Name: "Oignons", Quantity: 1, Unit: "pièce"},
				{Name: "Parmesan", Quantity: 80, Unit: "g"},
				{Name: "Beurre", Quantity: 40, Unit: "g"},
			},
			Equipments: []string{"Casserole", "Cuillère en bois", "Râpe"},
			Categories: []string{"Plats principaux"},
			Tags:       []string{"Italien", "Végétarien", "Comfort food"},
		},
		{
			Recipe: dto.Recipe{
				Title:       "Tarte aux pommes",
				Description: "Une tarte aux pommes classique avec sa pâte brisée maison",
				Instructions: dto.RecipeSteps{
					{StepNumber: 1, Description: "Préparer la pâte brisée et la laisser reposer 30 minutes", Duration: 40},
					{StepNumber: 2, Description: "Éplucher et couper les pommes en lamelles", Duration: 15},
					{StepNumber: 3, Description: "Étaler la pâte dans le moule et piquer le fond", Duration: 5},
					{StepNumber: 4, Description: "Disposer les pommes en rosace sur la pâte", Duration: 10},
					{StepNumber: 5, Description: "Saupoudrer de sucre et enfourner 35 minutes", Duration: 35, Temperature: 180},
				},
				PrepTime:   60,
				CookTime:   35,
				TotalTime:  95,
				Servings:   8,
				Difficulty: "medium",
				IsPublic:   true,
				AuthorID:   authorID,
			},
			Ingredients: []RecipeIngredientData{
				{Name: "Farine", Quantity: 250, Unit: "g"},
				{Name: "Beurre", Quantity: 125, Unit: "g"},
				{Name: "Pommes", Quantity: 6, Unit: "pièces"},
			},
			Equipments: []string{"Moule à gâteau", "Rouleau à pâtisserie", "Économe", "Four"},
			Categories: []string{"Desserts"},
			Tags:       []string{"Français", "Automne", "Fête"},
		},
		{
			Recipe: dto.Recipe{
				Title:       "Saumon grillé aux légumes",
				Description: "Un plat sain et coloré, parfait pour un dîner léger",
				Instructions: dto.RecipeSteps{
					{StepNumber: 1, Description: "Préchauffer le four à 200°C", Duration: 5, Temperature: 200},
					{StepNumber: 2, Description: "Couper les légumes en julienne", Duration: 10},
					{StepNumber: 3, Description: "Assaisonner le saumon avec sel, poivre et citron", Duration: 5},
					{StepNumber: 4, Description: "Faire griller le saumon 4 minutes de chaque côté", Duration: 8},
					{StepNumber: 5, Description: "Faire sauter les légumes dans l'huile d'olive", Duration: 8},
					{StepNumber: 6, Description: "Servir le saumon sur lit de légumes", Duration: 2},
				},
				PrepTime:   15,
				CookTime:   20,
				TotalTime:  35,
				Servings:   4,
				Difficulty: "easy",
				IsPublic:   true,
				AuthorID:   authorID,
			},
			Ingredients: []RecipeIngredientData{
				{Name: "Filet de saumon", Quantity: 600, Unit: "g"},
				{Name: "Courgettes", Quantity: 1, Unit: "pièce"},
				{Name: "Poivrons", Quantity: 1, Unit: "pièce"},
				{Name: "Citrons", Quantity: 1, Unit: "pièce"},
				{Name: "Huile d'olive", Quantity: 2, Unit: "cuillères à soupe"},
				{Name: "Sel", Quantity: 1, Unit: "pincée"},
				{Name: "Poivre noir", Quantity: 1, Unit: "pincée"},
			},
			Equipments: []string{"Four", "Poêle", "Couteau de chef", "Planche à découper"},
			Categories: []string{"Plats principaux", "Poissons"},
			Tags:       []string{"Santé", "Rapide", "Grillé", "Été"},
		},
	}

	// Créer les recettes
	for _, recipeData := range recipes {
		if err := s.createRecipeWithAssociations(ctx, recipeData, ingredientMap, equipmentMap, categoryMap, tagMap); err != nil {
			return fmt.Errorf("erreur lors de la création de la recette %s: %w", recipeData.Recipe.Title, err)
		}
	}

	return nil
}

// RecipeData structure pour organiser les données d'une recette
type RecipeData struct {
	Recipe      dto.Recipe
	Ingredients []RecipeIngredientData
	Equipments  []string
	Categories  []string
	Tags        []string
}

type RecipeIngredientData struct {
	Name     string
	Quantity float64
	Unit     string
	Notes    string
}

// createRecipeWithAssociations crée une recette avec toutes ses associations
func (s *SeederService) createRecipeWithAssociations(
	ctx context.Context,
	recipeData RecipeData,
	ingredientMap map[string]*dto.Ingredient,
	equipmentMap map[string]*dto.Equipment,
	categoryMap map[string]*dto.Category,
	tagMap map[string]*dto.Tag,
) error {
	// Créer la recette de base
	recipe := recipeData.Recipe
	if err := s.ormService.RecipeRepository.Create(ctx, &recipe); err != nil {
		return fmt.Errorf("erreur lors de la création de la recette: %w", err)
	}

	// Créer les associations avec les ingrédients
	for _, ingData := range recipeData.Ingredients {
		ingredient, exists := ingredientMap[ingData.Name]
		if !exists {
			continue // Ignorer si l'ingrédient n'existe pas
		}

		recipeIngredient := &dto.RecipeIngredient{
			RecipeID:     recipe.ID,
			IngredientID: ingredient.ID,
			Quantity:     ingData.Quantity,
			Unit:         ingData.Unit,
			Notes:        ingData.Notes,
			IsOptional:   false,
		}

		if err := s.ormService.RecipeIngredientRepository.Create(ctx, recipeIngredient); err != nil {
			return fmt.Errorf("erreur lors de l'association avec l'ingrédient %s: %w", ingData.Name, err)
		}
	}

	// Créer les associations avec les équipements
	for _, equipmentName := range recipeData.Equipments {
		equipment, exists := equipmentMap[equipmentName]
		if !exists {
			continue // Ignorer si l'équipement n'existe pas
		}

		recipeEquipment := &dto.RecipeEquipment{
			RecipeID:    recipe.ID,
			EquipmentID: equipment.ID,
			IsOptional:  false,
		}

		if err := s.ormService.RecipeEquipmentRepository.Create(ctx, recipeEquipment); err != nil {
			return fmt.Errorf("erreur lors de l'association avec l'équipement %s: %w", equipmentName, err)
		}
	}

	// Créer les associations avec les catégories (many-to-many via GORM)
	// Note: Cette partie dépend de l'implémentation des associations dans le repository
	// Pour l'instant, on va utiliser des requêtes SQL directes via GORM

	db := s.ormService.GetDB()

	// Associations avec les catégories
	for _, categoryName := range recipeData.Categories {
		category, exists := categoryMap[categoryName]
		if !exists {
			continue
		}

		// Insérer dans la table de liaison recipe_category_associations
		if err := db.Exec("INSERT INTO recipe_category_associations (recipe_id, category_id) VALUES (?, ?) ON CONFLICT DO NOTHING", recipe.ID, category.ID).Error; err != nil {
			return fmt.Errorf("erreur lors de l'association avec la catégorie %s: %w", categoryName, err)
		}
	}

	// Associations avec les tags - utiliser la table recipe_tags
	for _, tagName := range recipeData.Tags {
		tag, exists := tagMap[tagName]
		if !exists {
			continue
		}

		// Insérer dans la table de liaison recipe_tags
		if err := db.Exec("INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?) ON CONFLICT DO NOTHING", recipe.ID, tag.ID).Error; err != nil {
			return fmt.Errorf("erreur lors de l'association avec le tag %s: %w", tagName, err)
		}
	}

	return nil
}
