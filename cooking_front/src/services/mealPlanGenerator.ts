import { recipeService, favoriteService, recipeListService, mealPlanService } from './index';
import type { Recipe, MealPlanCreateRequest } from '../types';
import type { GenerationOptions } from '../components/GeneratePlanModal';
import { addDays, buildPlannedDate, formatDate, type MealTimeType } from '../utils';

/**
 * Service de génération automatique de planning de repas.
 *
 * Algorithme :
 * 1. Récupère les repas existants de la semaine pour ne pas écraser les créneaux occupés.
 * 2. Récupère les recettes selon la source (favoris, liste, populaires, tendances).
 * 3. Filtre les recettes « Ingrédient » (pâte brisée, etc.) qui ne sont pas des plats.
 * 4. Mappe chaque recette aux types de repas adaptés via ses catégories.
 * 5. Pour chaque jour et chaque type de repas demandé, choisit une recette adaptée en
 *    évitant les répétitions et en diversifiant les catégories si demandé.
 */

// Mapping catégories -> types de repas. Clés en minuscules AVEC accents pour matcher
// les vraies catégories du système (Entrées, Plats principaux, Pâtes, Végétarien, …).
const CATEGORY_TO_MEAL_TYPE: Record<string, string[]> = {
  'petit-déjeuner': ['breakfast'],
  'entrées': ['lunch', 'dinner'],
  'plats principaux': ['lunch', 'dinner'],
  'soupes': ['lunch', 'dinner'],
  'salades': ['lunch', 'dinner'],
  'pâtes': ['lunch', 'dinner'],
  'viandes': ['lunch', 'dinner'],
  'poissons': ['lunch', 'dinner'],
  'desserts': ['snack', 'lunch', 'dinner'],
  'apéritifs': ['snack'],
  'boissons': ['snack'],
  'végétarien': ['breakfast', 'lunch', 'dinner', 'snack'],
  'ingrédient': [],
};

const INGREDIENT_CATEGORY = 'ingrédient';

// Forme minimale d'un repas existant renvoyé par l'API (suffisante pour la détection de conflits).
interface ExistingMeal {
  planned_date: string;
  meal_type: string;
  recipe_id?: number;
}

// Types de repas adaptés à une recette, d'après ses catégories.
const getRecipeMealTypes = (recipe: Recipe): string[] => {
  const mealTypes = new Set<string>();
  recipe.categories?.forEach((category) => {
    CATEGORY_TO_MEAL_TYPE[category.name.toLowerCase()]?.forEach((mt) => mealTypes.add(mt));
  });
  if (mealTypes.size === 0) {
    const onlyIngredient = recipe.categories?.every((c) => c.name.toLowerCase() === INGREDIENT_CATEGORY);
    if (!onlyIngredient) {
      mealTypes.add('lunch');
      mealTypes.add('dinner');
    }
  }
  return Array.from(mealTypes);
};

// Mélange de Fisher-Yates (non biaisé, contrairement à sort(() => Math.random() - 0.5)).
const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Sélectionne UNE recette parmi les candidates. Si `diversify`, préfère celle dont les
// catégories sont les moins utilisées jusqu'ici dans la semaine (rend l'option réellement
// effective — corrige GEN-3).
const selectRecipe = (
  candidates: Recipe[],
  categoryUsage: Map<string, number>,
  diversify: boolean,
): Recipe | null => {
  if (candidates.length === 0) return null;
  const shuffled = shuffle(candidates);
  if (!diversify) return shuffled[0];
  let best = shuffled[0];
  let bestScore = Infinity;
  for (const recipe of shuffled) {
    const score = (recipe.categories ?? []).reduce((sum, c) => sum + (categoryUsage.get(c.name) ?? 0), 0);
    if (score < bestScore) {
      bestScore = score;
      best = recipe;
    }
  }
  return best;
};

// Libellés FR des sources (évite la fuite « - popular » sur les cartes de repas — I18N-3).
const SOURCE_LABELS: Record<string, string> = {
  favorites: 'favoris',
  list: 'liste',
  popular: 'recettes populaires',
  trending: 'tendances',
};

// Résultat de génération.
export interface GenerationResult {
  success: boolean;
  message?: string;
  mealPlans: MealPlanCreateRequest[];
  stats: {
    totalMeals: number;
    recipesUsed: number;
    sourceType: string;
    diversityScore: number; // 0-1, diversité des catégories
    skippedSlots: string[]; // créneaux déjà occupés
    repeated: number; // repas dont la recette a dû être réutilisée faute d'assez de recettes uniques
  };
}

export const mealPlanGenerator = {
  async generateWeeklyPlan(weekStart: string, options: GenerationOptions): Promise<GenerationResult> {
    try {
      // 1. Créneaux déjà occupés (repas existants).
      const existingMealPlans = await this.getExistingMealPlans(weekStart);
      const occupiedSlots = this.createOccupiedSlotsMap(existingMealPlans);

      // 2. Recettes de la source, sans les recettes « Ingrédient ».
      const rawRecipes = await this.getRecipesBySource(options.source);
      const recipes = rawRecipes.filter((recipe) => {
        if (!recipe.categories || recipe.categories.length === 0) return true;
        return !recipe.categories.every((c) => c.name.toLowerCase() === INGREDIENT_CATEGORY);
      });

      if (recipes.length === 0) {
        return {
          success: false,
          message: 'Aucune recette adaptée trouvée pour la source sélectionnée (après filtrage des ingrédients).',
          mealPlans: [],
          stats: { totalMeals: 0, recipesUsed: 0, sourceType: options.source.type, diversityScore: 0, skippedSlots: [], repeated: 0 },
        };
      }

      // 3. Recettes déjà planifiées (à éviter si demandé).
      const alreadyPlannedRecipeIds = new Set<number>();
      if (options.settings.avoidRepetition) {
        existingMealPlans.forEach((mp) => {
          if (mp.recipe_id) alreadyPlannedRecipeIds.add(mp.recipe_id);
        });
      }

      // 4. Génération jour par jour.
      const mealPlans: MealPlanCreateRequest[] = [];
      const usedRecipes = new Set<number>(alreadyPlannedRecipeIds);
      const categoryStats = new Map<string, number>();
      const skippedSlots: string[] = [];
      let repeated = 0;

      const requestedMealTypes = Object.entries(options.mealTypes)
        .filter(([, enabled]) => enabled)
        .map(([mealType]) => mealType);

      for (const day of this.getWeekDays(weekStart)) {
        let dailyMealCount = 0;

        for (const mealType of requestedMealTypes) {
          if (dailyMealCount >= options.settings.maxRecipesPerDay) break;

          const slotKey = `${day}_${mealType}`;
          if (occupiedSlots.has(slotKey)) {
            skippedSlots.push(`${this.formatDateForDisplay(day)} - ${this.getMealTypeLabel(mealType)}`);
            continue;
          }

          const suitableRecipes = recipes.filter((r) => getRecipeMealTypes(r).includes(mealType));
          if (suitableRecipes.length === 0) continue;

          const unused = options.settings.avoidRepetition
            ? suitableRecipes.filter((r) => !usedRecipes.has(r.id))
            : suitableRecipes;
          const isRepeat = unused.length === 0;
          const candidates = isRepeat ? suitableRecipes : unused;

          const selectedRecipe = selectRecipe(candidates, categoryStats, options.settings.diversifyCategories);
          if (!selectedRecipe) continue;
          if (isRepeat && options.settings.avoidRepetition) repeated++;

          mealPlans.push({
            recipe_id: selectedRecipe.id,
            planned_date: buildPlannedDate(day, mealType as MealTimeType),
            meal_type: mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
            servings: options.settings.defaultServings,
            notes: `Généré automatiquement — ${SOURCE_LABELS[options.source.type] ?? options.source.type}`,
          });

          usedRecipes.add(selectedRecipe.id);
          selectedRecipe.categories?.forEach((c) =>
            categoryStats.set(c.name, (categoryStats.get(c.name) || 0) + 1),
          );
          dailyMealCount++;
        }
      }

      const diversityScore = this.calculateDiversityScore(categoryStats, mealPlans.length);

      return {
        success: true,
        mealPlans,
        stats: {
          totalMeals: mealPlans.length,
          recipesUsed: usedRecipes.size - alreadyPlannedRecipeIds.size,
          sourceType: options.source.type,
          diversityScore,
          skippedSlots,
          repeated,
        },
      };
    } catch {
      return {
        success: false,
        message: 'Erreur lors de la génération du planning.',
        mealPlans: [],
        stats: { totalMeals: 0, recipesUsed: 0, sourceType: options.source.type, diversityScore: 0, skippedSlots: [], repeated: 0 },
      };
    }
  },

  // Recettes selon la source choisie.
  async getRecipesBySource(source: GenerationOptions['source']): Promise<Recipe[]> {
    try {
      switch (source.type) {
        case 'favorites': {
          const res = await favoriteService.getUserFavorites(1, 100);
          return res.success ? res.data.recipes : [];
        }
        case 'list': {
          if (!source.listId) return [];
          const res = await recipeListService.getRecipeList(source.listId);
          if (!res.success) return [];
          // L'API peuple `items` (RecipeListItem[]), pas `recipes` (corrige GEN-6).
          const fromItems = (res.data.items ?? [])
            .map((item) => item.recipe)
            .filter((r): r is Recipe => Boolean(r));
          return fromItems.length > 0 ? fromItems : (res.data.recipes ?? []);
        }
        case 'popular': {
          const res = await recipeService.listRecipes({ sort_by: 'rating', sort_order: 'desc', limit: 50 });
          return res.success ? res.data.recipes : [];
        }
        case 'trending': {
          const res = await recipeService.listRecipes({ sort_by: 'created_at', sort_order: 'desc', limit: 30 });
          return res.success ? res.data.recipes : [];
        }
        default:
          return [];
      }
    } catch {
      return [];
    }
  },

  // 7 jours à partir du début de semaine (réutilise addDays, cohérent avec PlanningPage — corrige GEN-1).
  getWeekDays(weekStart: string): string[] {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  },

  // Score de diversité (entropie de Shannon normalisée) selon la répartition des catégories.
  calculateDiversityScore(categoryStats: Map<string, number>, totalMeals: number): number {
    if (totalMeals === 0 || categoryStats.size === 0) return 0;
    let entropy = 0;
    for (const count of categoryStats.values()) {
      const p = count / totalMeals;
      entropy -= p * Math.log2(p);
    }
    const maxEntropy = Math.log2(categoryStats.size);
    return maxEntropy > 0 ? entropy / maxEntropy : 0;
  },

  // Repas existants de la semaine, aplatis en tableau.
  async getExistingMealPlans(weekStart: string): Promise<ExistingMeal[]> {
    try {
      const response = await mealPlanService.getWeeklyMealPlan(weekStart);
      if (response.success && response.data && response.data.meal_plans) {
        const all: ExistingMeal[] = [];
        Object.values(response.data.meal_plans).forEach((dayMealPlans) => {
          if (Array.isArray(dayMealPlans)) all.push(...(dayMealPlans as ExistingMeal[]));
        });
        return all;
      }
      return [];
    } catch {
      return [];
    }
  },

  // Map des créneaux occupés (date_mealType -> repas).
  createOccupiedSlotsMap(existingMealPlans: ExistingMeal[]): Map<string, ExistingMeal> {
    const occupied = new Map<string, ExistingMeal>();
    existingMealPlans.forEach((mp) => {
      const dateOnly = mp.planned_date.split('T')[0];
      occupied.set(`${dateOnly}_${mp.meal_type}`, mp);
    });
    return occupied;
  },

  // Date lisible « 7 juillet » (locale FR).
  formatDateForDisplay(dateString: string): string {
    return formatDate(dateString, 'd MMMM');
  },

  // Libellé FR d'un type de repas.
  getMealTypeLabel(mealType: string): string {
    const labels: Record<string, string> = {
      breakfast: 'Petit-déjeuner',
      lunch: 'Déjeuner',
      dinner: 'Dîner',
      snack: 'Collation',
    };
    return labels[mealType] || mealType;
  },
};
