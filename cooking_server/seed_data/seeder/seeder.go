package seeder

import (
	"context"
	"fmt"
	"math/rand"
	"time"

	"github.com/romainrodriguez/cooking_server/internal/dto"
	"github.com/romainrodriguez/cooking_server/internal/services/orm"
)

type SeederService struct {
	ormService *orm.ORMService
	random     *rand.Rand
}

func NewSeederService(ormService *orm.ORMService) *SeederService {
	return &SeederService{
		ormService: ormService,
		random:     rand.New(rand.NewSource(time.Now().UnixNano())),
	}
}

// SeedIngredients crée des ingrédients de test
func (s *SeederService) SeedIngredients(ctx context.Context) error {
	ingredients := []dto.Ingredient{
		// Légumes
		{Name: "Tomates", Description: "Tomates fraîches", Category: "légume"},
		{Name: "Oignons", Description: "Oignons jaunes", Category: "légume"},
		{Name: "Ail", Description: "Gousses d'ail", Category: "légume"},
		{Name: "Carottes", Description: "Carottes fraîches", Category: "légume"},
		{Name: "Pommes de terre", Description: "Pommes de terre de consommation", Category: "légume"},
		{Name: "Courgettes", Description: "Courgettes vertes", Category: "légume"},
		{Name: "Poivrons", Description: "Poivrons de couleur", Category: "légume"},
		{Name: "Champignons de Paris", Description: "Champignons frais", Category: "légume"},
		{Name: "Épinards", Description: "Feuilles d'épinards", Category: "légume"},
		{Name: "Brocolis", Description: "Bouquets de brocolis", Category: "légume"},

		// Viandes
		{Name: "Bœuf haché", Description: "Viande de bœuf hachée", Category: "viande"},
		{Name: "Filet de porc", Description: "Filet de porc frais", Category: "viande"},
		{Name: "Escalope de dinde", Description: "Escalope de dinde", Category: "viande"},
		{Name: "Cuisses de poulet", Description: "Cuisses de poulet fermier", Category: "viande"},
		{Name: "Filet de saumon", Description: "Filet de saumon frais", Category: "poisson"},
		{Name: "Crevettes", Description: "Crevettes décortiquées", Category: "fruits de mer"},

		// Produits laitiers
		{Name: "Lait entier", Description: "Lait de vache entier", Category: "produit laitier"},
		{Name: "Beurre", Description: "Beurre doux", Category: "produit laitier"},
		{Name: "Crème fraîche", Description: "Crème fraîche épaisse", Category: "produit laitier"},
		{Name: "Fromage râpé", Description: "Emmental râpé", Category: "produit laitier"},
		{Name: "Mozzarella", Description: "Mozzarella di buffala", Category: "produit laitier"},
		{Name: "Parmesan", Description: "Parmesan AOP", Category: "produit laitier"},
		{Name: "Œufs", Description: "Œufs de poule fermiers", Category: "produit laitier"},

		// Épices et herbes
		{Name: "Sel", Description: "Sel fin de table", Category: "épice"},
		{Name: "Poivre noir", Description: "Poivre noir moulu", Category: "épice"},
		{Name: "Thym", Description: "Thym séché", Category: "herbe"},
		{Name: "Basilic", Description: "Feuilles de basilic frais", Category: "herbe"},
		{Name: "Persil", Description: "Persil plat", Category: "herbe"},
		{Name: "Paprika", Description: "Paprika doux", Category: "épice"},
		{Name: "Cumin", Description: "Cumin en poudre", Category: "épice"},
		{Name: "Origan", Description: "Origan séché", Category: "herbe"},

		// Féculents et céréales
		{Name: "Riz basmati", Description: "Riz basmati long", Category: "féculent"},
		{Name: "Pâtes", Description: "Pâtes italiennes", Category: "féculent"},
		{Name: "Quinoa", Description: "Graines de quinoa", Category: "graine"},
		{Name: "Farine", Description: "Farine de blé T55", Category: "farine"},
		{Name: "Pain", Description: "Pain de campagne", Category: "féculent"},

		// Huiles et condiments
		{Name: "Huile d'olive", Description: "Huile d'olive extra vierge", Category: "huile"},
		{Name: "Vinaigre balsamique", Description: "Vinaigre balsamique de Modène", Category: "condiment"},
		{Name: "Moutarde", Description: "Moutarde de Dijon", Category: "condiment"},
		{Name: "Sauce soja", Description: "Sauce soja japonaise", Category: "condiment"},

		// Fruits
		{Name: "Citrons", Description: "Citrons jaunes", Category: "fruit"},
		{Name: "Pommes", Description: "Pommes golden", Category: "fruit"},
		{Name: "Bananes", Description: "Bananes mûres", Category: "fruit"},
	}

	for _, ingredient := range ingredients {
		// Vérifier si l'ingrédient existe déjà
		existing, _ := s.ormService.IngredientRepository.GetByName(ctx, ingredient.Name)
		if existing == nil {
			if err := s.ormService.IngredientRepository.Create(ctx, &ingredient); err != nil {
				return fmt.Errorf("erreur lors de la création de l'ingrédient %s: %w", ingredient.Name, err)
			}
		}
	}

	return nil
}

// SeedEquipments crée des équipements de test
func (s *SeederService) SeedEquipments(ctx context.Context) error {
	equipments := []dto.Equipment{
		// Équipements de base
		{Name: "Couteau de chef", Description: "Couteau de cuisine principal", Category: "découpe"},
		{Name: "Planche à découper", Description: "Planche en bois ou plastique", Category: "découpe"},
		{Name: "Casserole", Description: "Casserole moyenne", Category: "cuisson"},
		{Name: "Poêle", Description: "Poêle antiadhésive", Category: "cuisson"},
		{Name: "Fouet", Description: "Fouet de cuisine", Category: "mélange"},
		{Name: "Spatule", Description: "Spatule en silicone", Category: "mélange"},
		{Name: "Cuillère en bois", Description: "Cuillère de cuisine en bois", Category: "mélange"},

		// Électroménager
		{Name: "Four", Description: "Four électrique ou gaz", Category: "électroménager"},
		{Name: "Mixeur", Description: "Mixeur plongeant", Category: "électroménager"},
		{Name: "Robot de cuisine", Description: "Robot multifonction", Category: "électroménager"},
		{Name: "Blender", Description: "Blender haute performance", Category: "électroménager"},

		// Mesure et pesée
		{Name: "Balance de cuisine", Description: "Balance électronique", Category: "mesure"},
		{Name: "Verre doseur", Description: "Verre gradué pour liquides", Category: "mesure"},
		{Name: "Cuillères à mesurer", Description: "Set de cuillères doseuses", Category: "mesure"},

		// Ustensiles spécialisés
		{Name: "Râpe", Description: "Râpe multifonctions", Category: "préparation"},
		{Name: "Presse-ail", Description: "Presse-ail en métal", Category: "préparation"},
		{Name: "Ouvre-boîte", Description: "Ouvre-boîte manuel", Category: "préparation"},
		{Name: "Économe", Description: "Économe pour légumes", Category: "préparation"},

		// Cuisson spécialisée
		{Name: "Wok", Description: "Wok traditionnel", Category: "cuisson"},
		{Name: "Sauteuse", Description: "Sauteuse avec couvercle", Category: "cuisson"},
		{Name: "Autocuiseur", Description: "Cocotte-minute", Category: "cuisson"},
		{Name: "Grille-pain", Description: "Grille-pain électrique", Category: "électroménager"},

		// Pâtisserie
		{Name: "Moule à gâteau", Description: "Moule rond en métal", Category: "pâtisserie"},
		{Name: "Rouleau à pâtisserie", Description: "Rouleau en bois", Category: "pâtisserie"},
		{Name: "Poche à douille", Description: "Poche en silicone", Category: "pâtisserie"},
	}

	for _, equipment := range equipments {
		// Vérifier si l'équipement existe déjà
		existing, _ := s.ormService.EquipmentRepository.GetByName(ctx, equipment.Name)
		if existing == nil {
			if err := s.ormService.EquipmentRepository.Create(ctx, &equipment); err != nil {
				return fmt.Errorf("erreur lors de la création de l'équipement %s: %w", equipment.Name, err)
			}
		}
	}

	return nil
}

// SeedCategories crée des catégories de test
func (s *SeederService) SeedCategories(ctx context.Context) error {
	categories := []dto.Category{
		{Name: "Entrées", Description: "Plats servis en début de repas", Color: "#FF6B6B", Icon: "🥗"},
		{Name: "Plats principaux", Description: "Plats de résistance", Color: "#4ECDC4", Icon: "🍽️"},
		{Name: "Desserts", Description: "Douceurs sucrées", Color: "#45B7D1", Icon: "🍰"},
		{Name: "Apéritifs", Description: "Amuse-bouches et cocktails", Color: "#96CEB4", Icon: "🍸"},
		{Name: "Soupes", Description: "Potages et veloutés", Color: "#FFEAA7", Icon: "🍲"},
		{Name: "Salades", Description: "Salades composées", Color: "#DDA0DD", Icon: "🥙"},
		{Name: "Pâtes", Description: "Plats de pâtes", Color: "#98D8C8", Icon: "🍝"},
		{Name: "Viandes", Description: "Plats à base de viande", Color: "#F7DC6F", Icon: "🥩"},
		{Name: "Poissons", Description: "Plats de poissons et fruits de mer", Color: "#85C1E9", Icon: "🐟"},
		{Name: "Végétarien", Description: "Plats sans viande", Color: "#A9DFBF", Icon: "🌱"},
		{Name: "Boissons", Description: "Boissons chaudes et froides", Color: "#F8C471", Icon: "🥤"},
		{Name: "Petit-déjeuner", Description: "Plats du matin", Color: "#D7BDE2", Icon: "🥞"},
	}

	for _, category := range categories {
		// Vérifier si la catégorie existe déjà
		existing, _ := s.ormService.CategoryRepository.GetByName(ctx, category.Name)
		if existing == nil {
			if err := s.ormService.CategoryRepository.Create(ctx, &category); err != nil {
				return fmt.Errorf("erreur lors de la création de la catégorie %s: %w", category.Name, err)
			}
		}
	}

	return nil
}

// SeedTags crée des tags de test
func (s *SeederService) SeedTags(ctx context.Context) error {
	tags := []dto.Tag{
		{Name: "Rapide", Description: "Recette rapide à préparer (moins de 30 min)"},
		{Name: "Facile", Description: "Recette simple à réaliser"},
		{Name: "Économique", Description: "Recette peu coûteuse"},
		{Name: "Santé", Description: "Recette équilibrée et nutritive"},
		{Name: "Sans gluten", Description: "Recette adaptée aux intolérants au gluten"},
		{Name: "Végétalien", Description: "Recette 100% végétale"},
		{Name: "Bio", Description: "Recette avec des ingrédients biologiques"},
		{Name: "Épicé", Description: "Recette relevée"},
		{Name: "Sucré", Description: "Recette sucrée"},
		{Name: "Salé", Description: "Recette salée"},
		{Name: "Français", Description: "Recette de la cuisine française"},
		{Name: "Italien", Description: "Recette de la cuisine italienne"},
		{Name: "Asiatique", Description: "Recette de la cuisine asiatique"},
		{Name: "Méditerranéen", Description: "Recette de la cuisine méditerranéenne"},
		{Name: "Mexicain", Description: "Recette de la cuisine mexicaine"},
		{Name: "Indien", Description: "Recette de la cuisine indienne"},
		{Name: "Comfort food", Description: "Plat réconfortant"},
		{Name: "Fête", Description: "Recette pour occasions spéciales"},
		{Name: "Été", Description: "Recette de saison estivale"},
		{Name: "Hiver", Description: "Recette de saison hivernale"},
		{Name: "Automne", Description: "Recette de saison automnale"},
		{Name: "Printemps", Description: "Recette de saison printanière"},
		{Name: "Micro-ondes", Description: "Recette au micro-ondes"},
		{Name: "Four", Description: "Recette au four"},
		{Name: "Grillé", Description: "Recette grillée"},
		{Name: "Bouilli", Description: "Recette bouillie"},
		{Name: "Frit", Description: "Recette frite"},
		{Name: "Cru", Description: "Recette crue"},
		{Name: "Mariné", Description: "Recette marinée"},
		{Name: "Fumé", Description: "Recette fumée"},
	}

	for _, tag := range tags {
		// Vérifier si le tag existe déjà
		existing, _ := s.ormService.TagRepository.GetByName(ctx, tag.Name)
		if existing == nil {
			if err := s.ormService.TagRepository.Create(ctx, &tag); err != nil {
				return fmt.Errorf("erreur lors de la création du tag %s: %w", tag.Name, err)
			}
		}
	}

	return nil
}

// UpdateIngredientsWithIcons met à jour les ingrédients existants avec des icônes
func (s *SeederService) UpdateIngredientsWithIcons(ctx context.Context) error {
	// Mapping des noms d'ingrédients vers leurs icônes
	ingredientIcons := map[string]string{
		// Légumes
		"Tomates":              "🍅",
		"Oignons":              "🧅",
		"Ail":                  "🧄",
		"Carottes":             "🥕",
		"Pommes de terre":      "🥔",
		"Courgettes":           "🥒",
		"Poivrons":             "🫑",
		"Champignons de Paris": "🍄",
		"Épinards":             "🥬",
		"Brocolis":             "🥦",

		// Viandes
		"Bœuf haché":        "🥩",
		"Filet de porc":     "🥓",
		"Escalope de dinde": "🍗",
		"Cuisses de poulet": "🍗",
		"Filet de saumon":   "🐟",
		"Crevettes":         "🦐",

		// Produits laitiers
		"Lait entier":   "🥛",
		"Beurre":        "🧈",
		"Crème fraîche": "🥛",
		"Fromage râpé":  "🧀",
		"Mozzarella":    "🧀",
		"Parmesan":      "🧀",
		"Œufs":          "🥚",

		// Épices et herbes
		"Sel":         "🧂",
		"Poivre noir": "🌶️",
		"Thym":        "🌿",
		"Basilic":     "🌿",
		"Persil":      "🌿",
		"Paprika":     "🌶️",
		"Cumin":       "🌶️",
		"Origan":      "🌿",

		// Féculents et céréales
		"Riz basmati": "🍚",
		"Pâtes":       "🍝",
		"Quinoa":      "🌾",
		"Farine":      "🌾",
		"Pain":        "🥖",

		// Huiles et condiments
		"Huile d'olive":       "🫒",
		"Vinaigre balsamique": "🍾",
		"Moutarde":            "🟡",
		"Sauce soja":          "🥢",

		// Fruits
		"Citrons": "🍋",
		"Pommes":  "🍎",
		"Bananes": "🍌",
	}

	// Mettre à jour chaque ingrédient avec son icône
	for name, icon := range ingredientIcons {
		ingredient, err := s.ormService.IngredientRepository.GetByName(ctx, name)
		if err != nil {
			// Ingrédient non trouvé, on passe au suivant
			continue
		}

		// Mettre à jour l'icône si elle n'est pas déjà définie
		if ingredient.Icon == "" {
			ingredient.Icon = icon
			if err := s.ormService.IngredientRepository.Update(ctx, ingredient); err != nil {
				return fmt.Errorf("erreur lors de la mise à jour de l'icône pour l'ingrédient %s: %w", name, err)
			}
		}
	}

	return nil
}

// UpdateEquipmentsWithIcons met à jour les équipements existants avec des icônes
func (s *SeederService) UpdateEquipmentsWithIcons(ctx context.Context) error {
	// Mapping des noms d'équipements vers leurs icônes
	equipmentIcons := map[string]string{
		// Équipements de base
		"Couteau de chef":    "🔪",
		"Planche à découper": "🪵",
		"Casserole":          "🍲",
		"Poêle":              "🍳",
		"Fouet":              "🥄",
		"Spatule":            "🥄",
		"Cuillère en bois":   "🥄",

		// Électroménager
		"Four":             "🔥",
		"Mixeur":           "🔌",
		"Robot de cuisine": "🤖",
		"Blender":          "🌪️",
		"Grille-pain":      "🍞",

		// Mesure et pesée
		"Balance de cuisine":  "⚖️",
		"Verre doseur":        "🥤",
		"Cuillères à mesurer": "🥄",

		// Ustensiles spécialisés
		"Râpe":        "🧈",
		"Presse-ail":  "🧄",
		"Ouvre-boîte": "🥫",
		"Économe":     "🔪",

		// Cuisson spécialisée
		"Wok":         "🥘",
		"Sauteuse":    "🍳",
		"Autocuiseur": "💨",

		// Pâtisserie
		"Moule à gâteau":       "🎂",
		"Rouleau à pâtisserie": "🧑‍🍳",
		"Poche à douille":      "🎂",
	}

	// Mettre à jour chaque équipement avec son icône
	for name, icon := range equipmentIcons {
		equipment, err := s.ormService.EquipmentRepository.GetByName(ctx, name)
		if err != nil {
			// Équipement non trouvé, on passe au suivant
			continue
		}

		// Mettre à jour l'icône si elle n'est pas déjà définie
		if equipment.Icon == "" {
			equipment.Icon = icon
			if err := s.ormService.EquipmentRepository.Update(ctx, equipment); err != nil {
				return fmt.Errorf("erreur lors de la mise à jour de l'icône pour l'équipement %s: %w", name, err)
			}
		}
	}

	return nil
}
