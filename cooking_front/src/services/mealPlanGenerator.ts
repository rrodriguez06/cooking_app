import { recipeService, favoriteService, recipeListService } from './index';
import type { Recipe, MealPlanCreateRequest } from '../types';
import type { GenerationOptions } from '../components/GeneratePlanModal';

/**
 * Service pour la génération automatique de planning de repas
 */

// Mapping entre les catégories de recettes et les types de repas
const CATEGORY_TO_MEAL_TYPE: Record<string, string[]> = {
  // Catégories pour petit-déjeuner
  'petit-déjeuner': ['breakfast'],
  'breakfast': ['breakfast'],
  'brunch': ['breakfast', 'lunch'],
  
  // Catégories pour déjeuner/dîner  
  'plat principal': ['lunch', 'dinner'],
  'entrée': ['lunch', 'dinner'],
  'soupe': ['lunch', 'dinner'],
  'salade': ['lunch', 'dinner'],
  'pizza': ['lunch', 'dinner'],
  'pâtes': ['lunch', 'dinner'],
  'riz': ['lunch', 'dinner'],
  
  // Catégories pour collations
  'dessert': ['snack'],
  'collation': ['snack'],
  'boisson': ['snack'],
  'smoothie': ['snack'],
  
  // Catégories polyvalentes (peuvent aller partout selon le contexte)
  'végétarien': ['breakfast', 'lunch', 'dinner'],
  'vegan': ['breakfast', 'lunch', 'dinner'],
  'sans gluten': ['breakfast', 'lunch', 'dinner'],
};

// Fonction pour déterminer quels types de repas conviennent à une recette
const getRecipeMealTypes = (recipe: Recipe): string[] => {
  const mealTypes = new Set<string>();
  
  // Analyser les catégories de la recette
  if (recipe.categories && recipe.categories.length > 0) {
    recipe.categories.forEach(category => {
      const categoryName = category.name.toLowerCase();
      const mappedMealTypes = CATEGORY_TO_MEAL_TYPE[categoryName];
      
      if (mappedMealTypes) {
        mappedMealTypes.forEach(mealType => mealTypes.add(mealType));
      }
    });
  }
  
  // Si aucune catégorie correspondante, considérer comme plat principal par défaut
  if (mealTypes.size === 0) {
    mealTypes.add('lunch');
    mealTypes.add('dinner');
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
  };
}

/**
 * Génère un planning de repas automatiquement
 * 
 * Algorithme transparent :
 * 1. Récupère les recettes selon la source choisie (favoris, liste, populaires)
 * 2. Filtre les recettes selon leurs catégories pour les assigner aux bons types de repas
 * 3. Pour chaque jour de la semaine et chaque type de repas demandé :
 *    - Sélectionne une recette appropriée en évitant les répétitions
 *    - Diversifie les catégories si demandé
 * 4. Retourne un planning équilibré et varié
 */
export const mealPlanGenerator = {
  async generateWeeklyPlan(weekStart: string, options: GenerationOptions): Promise<GenerationResult> {
    try {
      console.log('🎯 Génération de planning:', { weekStart, options });
      
      // 1. Récupérer les recettes selon la source
      const recipes = await this.getRecipesBySource(options.source);
      
      if (recipes.length === 0) {
        return {
          success: false,
          message: 'Aucune recette trouvée pour la source sélectionnée.',
          mealPlans: [],
          stats: { totalMeals: 0, recipesUsed: 0, sourceType: options.source.type, diversityScore: 0 }
        };
      }
      
      console.log(`📚 ${recipes.length} recettes disponibles`);
      
      // 2. Générer le planning jour par jour
      const mealPlans: MealPlanCreateRequest[] = [];
      const usedRecipes = new Set<number>();
      const categoryStats = new Map<string, number>();
      
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
              planned_date: day,
              meal_type: mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
              servings: this.getDefaultServings(mealType),
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
      
      // 3. Calculer les statistiques
      const diversityScore = this.calculateDiversityScore(categoryStats, mealPlans.length);
      
      console.log('📊 Génération terminée:', {
        totalMeals: mealPlans.length,
        recipesUsed: usedRecipes.size,
        diversityScore: Math.round(diversityScore * 100) / 100
      });
      
      return {
        success: true,
        mealPlans,
        stats: {
          totalMeals: mealPlans.length,
          recipesUsed: usedRecipes.size,
          sourceType: options.source.type,
          diversityScore
        }
      };
      
    } catch (error) {
      console.error('❌ Erreur lors de la génération:', error);
      return {
        success: false,
        message: 'Erreur lors de la génération du planning.',
        mealPlans: [],
        stats: { totalMeals: 0, recipesUsed: 0, sourceType: options.source.type, diversityScore: 0 }
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
  }
};