import type { Ingredient } from './recipe';

/**
 * Types pour la gestion du frigo virtuel
 */

// Item du frigo avec les informations de base
export interface FridgeItem {
  id: number;
  ingredient_id: number;
  ingredient: Ingredient;
  quantity?: number;
  unit?: string;
  expiry_date?: string; // Format ISO pour la date d'expiration
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Requête pour créer un item du frigo
export interface FridgeItemCreateRequest {
  ingredient_id: number;
  quantity?: number;
  unit?: string;
  expiry_date?: string;
  notes?: string;
}

// Requête pour mettre à jour un item du frigo
export interface FridgeItemUpdateRequest {
  quantity?: number;
  unit?: string;
  expiry_date?: string;
  notes?: string;
}

// Réponse pour la liste des items du frigo
export interface FridgeListResponse {
  fridge_items: FridgeItem[];
  total_count: number;
}

// Paramètres pour rechercher des recettes par ingrédients
export interface RecipeSearchByIngredientsRequest {
  ingredient_ids: number[];
  match_type?: 'all' | 'any'; // 'all' = doit avoir tous les ingrédients, 'any' = au moins un
  max_missing_ingredients?: number; // Nombre max d'ingrédients manquants acceptés
  exclude_categories?: string[]; // Catégories à exclure (ex: "Ingrédient")
  limit?: number;
}

// Résultat d'une suggestion de recette basée sur les ingrédients du frigo
export interface RecipeSuggestion {
  recipe_id: number;
  recipe_title: string;
  recipe_description?: string;
  recipe_image_url?: string;
  recipe_categories?: string[];
  matching_ingredients: number; // Nombre d'ingrédients qui matchent
  total_ingredients: number; // Nombre total d'ingrédients de la recette
  missing_ingredients: Ingredient[]; // Ingrédients manquants
  match_percentage: number; // Pourcentage de match (0-100)
  can_cook: boolean; // true si on peut cuisiner avec ce qu'on a
}

// Réponse pour les suggestions de recettes
export interface RecipeSuggestionsResponse {
  suggestions: RecipeSuggestion[];
  total_fridge_items: number;
  search_parameters: RecipeSearchByIngredientsRequest;
}

// Statistiques du frigo
export interface FridgeStats {
  total_items: number;
  expiring_soon: number; // Nombre d'items qui expirent dans les 3 prochains jours
  expired: number; // Nombre d'items expirés
  categories_covered: string[]; // Catégories d'ingrédients représentées
}