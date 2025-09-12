import { recipeService, favoriteService, recipeListService, mealPlanService } from './index';
import type { Recipe, MealPlanCreateRequest } from '../types';
import type { GenerationOptions } from '../components/GeneratePlanModal';

/**
 * Service pour la génération automatique de p        case 'popular':
          const popularResponse = await recipeService.getPopularRecipes(50);
          return popularResponse.success ? popularResponse.data.recipes : [];
          
        case 'trending':
          const trendingResponse = await recipeService.getLatestRecipes(30);
          return trendingResponse.success ? trendingResponse.data.recipes : [];s
 */

// Mapping entre les catégories de recettes et les types de repas
// Basé sur les catégories réelles du système (avec majuscules) : Entrées, Plats principaux, Desserts, Apéritifs, 
// Soupes, Salades, Pates, Viandes, Poissons, Végétarien, Boissons, Petit-déjeuner, Ingrédient
const CATEGORY_TO_MEAL_TYPE: Record<string, string[]> = {
  // Catégories spécifiques au petit-déjeuner
  'petit-déjeuner': ['breakfast'],
  
  // Catégories pour déjeuner et dîner (repas principaux)
  'entrées': ['lunch', 'dinner'],
  'plats principaux': ['lunch', 'dinner'],
  'soupes': ['lunch', 'dinner'],
  'salades': ['lunch', 'dinner'], // Salades peuvent être légères pour le dîner aussi
  'pates': ['lunch', 'dinner'],
  'viandes': ['lunch', 'dinner'],
  'poissons': ['lunch', 'dinner'],
  
  // Catégories pour collations/desserts
  'desserts': ['snack', 'lunch', 'dinner'], // Desserts peuvent finir un repas ou être une collation
  'apéritifs': ['snack'],
  'boissons': ['snack'], // Smoothies, boissons nutritives
  
  // Catégories transversales (s'adaptent selon le contexte)
  'végétarien': ['breakfast', 'lunch', 'dinner', 'snack'],
  
  // Catégories à ignorer complètement
  'ingrédient': [] // Les recettes d'ingrédients (pâte brisée, etc.) ne sont pas des plats
};

// Fonction pour déterminer quels types de repas conviennent à une recette
const getRecipeMealTypes = (recipe: Recipe): string[] => {
  const mealTypes = new Set<string>();
  
  // Analyser les catégories de la recette
  if (recipe.categories && recipe.categories.length > 0) {
    recipe.categories.forEach(category => {
      const categoryName = category.name.toLowerCase();
      const mappedMealTypes = CATEGORY_TO_MEAL_TYPE[categoryName];
      
      if (mappedMealTypes && mappedMealTypes.length > 0) {
        mappedMealTypes.forEach(mealType => mealTypes.add(mealType));
      }
    });
  }
  
  // Si aucune catégorie correspondante ou que des catégories "ingrédient", 
  // considérer comme plat principal par défaut (sauf si catégorie ingrédient uniquement)
  if (mealTypes.size === 0) {
    // Vérifier si la recette n'a que des catégories "Ingrédient"
    const hasOnlyIngredientCategory = recipe.categories?.every(cat => 
      cat.name.toLowerCase() === 'ingrédient'
    );
    
    if (!hasOnlyIngredientCategory) {
      mealTypes.add('lunch');
      mealTypes.add('dinner');
    }
  }
  
  return Array.from(mealTypes);
};

// Fonction pour éviter les répétitions intelligemment
const diversifySelection = (recipes: Recipe[], count: number, avoidRepetition: boolean, diversifyCategories: boolean): Recipe[] => {
  if (recipes.length === 0) return [];
  
  const selected: Recipe[] = [];
  const usedRecipes = new Set<number>();
  const usedCategories = new Set<string>();
  
  // Créer une copie mélangée des recettes
  const shuffledRecipes = [...recipes].sort(() => Math.random() - 0.5);
  
  for (const recipe of shuffledRecipes) {
    if (selected.length >= count) break;
    
    // Éviter les répétitions si demandé
    if (avoidRepetition && usedRecipes.has(recipe.id)) {
      continue;
    }
    
    // Diversifier les catégories si demandé
    if (diversifyCategories && recipe.categories) {
      const recipeCategories = recipe.categories.map(cat => cat.name);
      const hasUsedCategory = recipeCategories.some(cat => usedCategories.has(cat));
      
      // Si on a déjà beaucoup de recettes et qu'on veut diversifier,
      // éviter les catégories déjà utilisées (sauf si on n'a pas le choix)
      if (hasUsedCategory && selected.length > count / 2 && 
          shuffledRecipes.filter(r => !usedRecipes.has(r.id)).length > count - selected.length) {
        continue;
      }
    }
    
    // Ajouter la recette
    selected.push(recipe);
    usedRecipes.add(recipe.id);
    
    // Marquer les catégories comme utilisées
    if (recipe.categories) {
      recipe.categories.forEach(cat => usedCategories.add(cat.name));
    }
  }
  
  return selected;
};

// Interface pour les résultats de génération
export interface GenerationResult {
  success: boolean;
  message?: string;
  mealPlans: MealPlanCreateRequest[];
  stats: {
    totalMeals: number;
    recipesUsed: number;
    sourceType: string;
    diversityScore: number; // 0-1, mesure de la diversité des catégories
    skippedSlots: string[]; // Créneaux qui étaient déjà occupés
  };
}

/**
 * Génère un planning de repas automatiquement
 * 
 * Algorithme transparent (mis à jour):
 * 1. Récupère les meal plans existants pour éviter les conflits de créneaux
 * 2. Si "éviter la répétition" est activé, identifie les recettes déjà planifiées à éviter
 * 3. Récupère les recettes selon la source choisie (favoris, liste, populaires)
 * 4. Filtre les recettes "ingrédient" qui ne sont pas des plats complets
 * 5. Filtre les recettes selon leurs catégories réelles pour les assigner aux bons types de repas
 * 6. Pour chaque jour de la semaine et chaque type de repas demandé :
 *    - Vérifie si le créneau est libre (pas de repas déjà planifié)
 *    - Sélectionne une recette appropriée au créneau en évitant les répétitions
 *    - Diversifie les catégories si demandé
 * 7. Retourne un planning équilibré et varié avec les créneaux sautés
 * 
 * ✨ Améliorations: 
 * - Respecte les choix existants de l'utilisateur
 * - Évite de reproposer des plats déjà prévus
 * - Utilise les vraies catégories du système pour une meilleure adéquation créneau/plat
 * - Filtre automatiquement les recettes "ingrédient" inappropriées
 */
export const mealPlanGenerator = {
  async generateWeeklyPlan(weekStart: string, options: GenerationOptions): Promise<GenerationResult> {
    try {
      console.log('🎯 Génération de planning:', { weekStart, options });
      
      // 1. Récupérer les meal plans existants pour la semaine
      const existingMealPlans = await this.getExistingMealPlans(weekStart);
      const occupiedSlots = this.createOccupiedSlotsMap(existingMealPlans);
      
      console.log(`📋 ${existingMealPlans.length} repas déjà planifiés trouvés`);
      console.log('🚫 Créneaux occupés:', Array.from(occupiedSlots.keys()));
      
      // 2. Récupérer les recettes selon la source
      const rawRecipes = await this.getRecipesBySource(options.source);
      
      // Filtrer les recettes "ingrédient" qui ne sont pas des plats complets
      const recipes = rawRecipes.filter(recipe => {
        if (!recipe.categories || recipe.categories.length === 0) return true;
        
        // Exclure les recettes qui n'ont QUE la catégorie "Ingrédient"
        const onlyIngredientCategory = recipe.categories.every(cat => 
          cat.name.toLowerCase() === 'ingrédient'
        );
        
        return !onlyIngredientCategory;
      });
      
      console.log(`📚 ${rawRecipes.length} recettes récupérées, ${recipes.length} après filtrage des ingrédients`);
      
      if (recipes.length === 0) {
        return {
          success: false,
          message: 'Aucune recette adaptée trouvée pour la source sélectionnée (après filtrage des ingrédients).',
          mealPlans: [],
          stats: { totalMeals: 0, recipesUsed: 0, sourceType: options.source.type, diversityScore: 0, skippedSlots: [] }
        };
      }

      // 3. Récupérer les recettes déjà planifiées si on veut éviter la répétition
      const alreadyPlannedRecipeIds = new Set<number>();
      if (options.settings.avoidRepetition) {
        existingMealPlans.forEach(mealPlan => {
          if (mealPlan.recipe_id) {
            alreadyPlannedRecipeIds.add(mealPlan.recipe_id);
          }
        });
        console.log(`🚫 ${alreadyPlannedRecipeIds.size} recettes déjà planifiées à éviter`);
      }

      // 4. Générer le planning jour par jour en évitant les créneaux occupés
      const mealPlans: MealPlanCreateRequest[] = [];
      const usedRecipes = new Set<number>(alreadyPlannedRecipeIds); // Commencer avec les recettes déjà planifiées
      const categoryStats = new Map<string, number>();
      const skippedSlots: string[] = [];
      
      // Obtenir les jours de la semaine
      const weekDays = this.getWeekDays(weekStart);
      
      for (const day of weekDays) {
        console.log(`📅 Génération pour ${day}`);
        
        // Pour chaque type de repas demandé
        const requestedMealTypes = Object.entries(options.mealTypes)
          .filter(([_, enabled]) => enabled)
          .map(([mealType, _]) => mealType);
        
        let dailyMealCount = 0;
        
        for (const mealType of requestedMealTypes) {
          if (dailyMealCount >= options.settings.maxRecipesPerDay) {
            console.log(`⏹️  Limite quotidienne atteinte (${options.settings.maxRecipesPerDay})`);
            break;
          }
          
          // Vérifier si ce créneau est déjà occupé
          const slotKey = `${day}_${mealType}`;
          if (occupiedSlots.has(slotKey)) {
            const existingMeal = occupiedSlots.get(slotKey);
            console.log(`🚫 Créneau ${day} ${mealType} déjà occupé par: ${existingMeal?.recipe?.title || 'repas existant'}`);
            skippedSlots.push(`${this.formatDateForDisplay(day)} - ${this.getMealTypeLabel(mealType)}`);
            continue;
          }
          
          // Filtrer les recettes appropriées pour ce type de repas
          const suitableRecipes = recipes.filter(recipe => {
            const recipeMealTypes = getRecipeMealTypes(recipe);
            return recipeMealTypes.includes(mealType);
          });
          
          if (suitableRecipes.length === 0) {
            console.log(`⚠️  Aucune recette appropriée pour ${mealType}`);
            continue;
          }
          
          // Sélectionner une recette en évitant les répétitions
          const availableRecipes = options.settings.avoidRepetition 
            ? suitableRecipes.filter(recipe => !usedRecipes.has(recipe.id))
            : suitableRecipes;
          
          // Si plus de recettes disponibles après filtrage, utiliser toutes les recettes
          const recipesToChooseFrom = availableRecipes.length > 0 ? availableRecipes : suitableRecipes;
          
          // Diversifier la sélection
          const selectedRecipes = diversifySelection(
            recipesToChooseFrom, 
            1, 
            options.settings.avoidRepetition,
            options.settings.diversifyCategories
          );
          
          if (selectedRecipes.length > 0) {
            const selectedRecipe = selectedRecipes[0];
            
            mealPlans.push({
              recipe_id: selectedRecipe.id,
              planned_date: this.formatDateTimeForMealType(day, mealType),
              meal_type: mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
              servings: options.settings.defaultServings,
              notes: `Généré automatiquement - ${options.source.type}`
            });
            
            // Marquer comme utilisée et comptabiliser les catégories
            usedRecipes.add(selectedRecipe.id);
            selectedRecipe.categories?.forEach(cat => {
              categoryStats.set(cat.name, (categoryStats.get(cat.name) || 0) + 1);
            });
            
            dailyMealCount++;
            
            console.log(`✅ ${mealType}: ${selectedRecipe.title}`);
          }
        }
      }
      
      // 5. Calculer les statistiques
      const diversityScore = this.calculateDiversityScore(categoryStats, mealPlans.length);
      
      console.log('📊 Génération terminée:', {
        totalMeals: mealPlans.length,
        recipesUsed: usedRecipes.size - alreadyPlannedRecipeIds.size, // Exclure les recettes déjà planifiées du compte
        diversityScore: Math.round(diversityScore * 100) / 100,
        skippedExistingRecipes: alreadyPlannedRecipeIds.size
      });
      
      return {
        success: true,
        mealPlans,
        stats: {
          totalMeals: mealPlans.length,
          recipesUsed: usedRecipes.size - alreadyPlannedRecipeIds.size, // Nouvelles recettes utilisées seulement
          sourceType: options.source.type,
          diversityScore,
          skippedSlots
        }
      };
      
    } catch (error) {
      console.error('❌ Erreur lors de la génération:', error);
      return {
        success: false,
        message: 'Erreur lors de la génération du planning.',
        mealPlans: [],
        stats: { totalMeals: 0, recipesUsed: 0, sourceType: options.source.type, diversityScore: 0, skippedSlots: [] }
      };
    }
  },
  
  // Récupérer les recettes selon la source choisie
  async getRecipesBySource(source: GenerationOptions['source']): Promise<Recipe[]> {
    console.log('🔍 Récupération des recettes:', source);
    
    try {
      switch (source.type) {
        case 'favorites':
          const favoritesResponse = await favoriteService.getUserFavorites(1, 100);
          return favoritesResponse.success ? favoritesResponse.data.recipes : [];
          
        case 'list':
          if (!source.listId) return [];
          const listResponse = await recipeListService.getRecipeList(source.listId);
          return listResponse.success ? (listResponse.data.recipes || []) : [];
          
        case 'popular':
          const popularResponse = await recipeService.listRecipes({
            sort_by: 'rating',
            sort_order: 'desc',
            limit: 50
          });
          return popularResponse.success ? popularResponse.data.recipes : [];
          
        case 'trending':
          const trendingResponse = await recipeService.listRecipes({
            sort_by: 'created_at',
            sort_order: 'desc',
            limit: 30
          });
          return trendingResponse.success ? trendingResponse.data.recipes : [];
          
        default:
          return [];
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des recettes:', error);
      return [];
    }
  },
  
  // Obtenir les 7 jours de la semaine à partir du début
  getWeekDays(weekStart: string): string[] {
    const days: string[] = [];
    const startDate = new Date(weekStart);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date.toISOString().split('T')[0]); // Format YYYY-MM-DD
    }
    
    return days;
  },
  
  // Obtenir le nombre de portions par défaut selon le type de repas
  getDefaultServings(mealType: string): number {
    switch (mealType) {
      case 'breakfast': return 1;
      case 'lunch': return 2;
      case 'dinner': return 4;
      case 'snack': return 1;
      default: return 2;
    }
  },
  
  // Calculer un score de diversité basé sur la répartition des catégories
  calculateDiversityScore(categoryStats: Map<string, number>, totalMeals: number): number {
    if (totalMeals === 0 || categoryStats.size === 0) return 0;
    
    // Calculer l'entropie de Shannon pour mesurer la diversité
    let entropy = 0;
    for (const count of categoryStats.values()) {
      const probability = count / totalMeals;
      entropy -= probability * Math.log2(probability);
    }
    
    // Normaliser entre 0 et 1
    const maxEntropy = Math.log2(categoryStats.size);
    return maxEntropy > 0 ? entropy / maxEntropy : 0;
  },

  // Formater la date avec l'heure appropriée selon le type de repas
  formatDateTimeForMealType(dateString: string, mealType: string): string {
    // Heures par défaut selon le type de repas
    const defaultTimes = {
      breakfast: '08:00:00.000Z',
      lunch: '12:30:00.000Z', 
      dinner: '19:00:00.000Z',
      snack: '15:30:00.000Z'
    };

    const time = defaultTimes[mealType as keyof typeof defaultTimes] || '12:00:00.000Z';
    return new Date(dateString + 'T' + time).toISOString();
  },

  // Récupérer les meal plans existants pour une semaine
  async getExistingMealPlans(weekStart: string) {
    try {
      const response = await mealPlanService.getWeeklyMealPlan(weekStart);
      if (response.success && response.data && response.data.meal_plans) {
        // Convertir le map de meal plans en tableau plat
        const allMealPlans: any[] = [];
        Object.values(response.data.meal_plans).forEach(dayMealPlans => {
          if (Array.isArray(dayMealPlans)) {
            allMealPlans.push(...dayMealPlans);
          }
        });
        return allMealPlans;
      }
      return [];
    } catch (error) {
      console.error('Erreur lors de la récupération des meal plans existants:', error);
      return [];
    }
  },

  // Créer une map des créneaux occupés (date_mealType -> mealPlan)
  createOccupiedSlotsMap(existingMealPlans: any[]): Map<string, any> {
    const occupiedSlots = new Map();
    
    existingMealPlans.forEach(mealPlan => {
      // Extraire la date du planned_date (format: "2025-08-07T14:00:00+02:00")
      const dateOnly = mealPlan.planned_date.split('T')[0];
      const slotKey = `${dateOnly}_${mealPlan.meal_type}`;
      occupiedSlots.set(slotKey, mealPlan);
    });
    
    return occupiedSlots;
  },

  // Formater une date pour l'affichage (YYYY-MM-DD -> "7 août")
  formatDateForDisplay(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'long' 
    });
  },

  // Obtenir le label français d'un type de repas
  getMealTypeLabel(mealType: string): string {
    const labels = {
      breakfast: 'Petit-déjeuner',
      lunch: 'Déjeuner', 
      dinner: 'Dîner',
      snack: 'Collation'
    };
    return labels[mealType as keyof typeof labels] || mealType;
  }
};