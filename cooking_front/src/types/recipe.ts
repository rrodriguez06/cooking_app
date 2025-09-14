import type { User } from './user';

export interface RecipeStep {
  step_number: number;
  title?: string;
  description: string;
  duration?: number;
  temperature?: number;
  tips?: string;
  referenced_recipe_id?: number;
  referenced_recipe?: Recipe;
}

export interface RecipeIngredient {
  id: number;
  recipe_id: number;
  ingredient_id: number;
  quantity: number;
  unit: string;
  notes?: string;
  ingredient: Ingredient;
}

export interface RecipeEquipment {
  id: number;
  recipe_id: number;
  equipment_id: number;
  is_required: boolean;
  notes?: string;
  equipment: Equipment;
}

export interface Ingredient {
  id: number;
  name: string;
  description?: string;
  category: string;
  icon: string;
  created_at: string;
  updated_at: string;
}

export interface Equipment {
  id: number;
  name: string;
  category?: string;
  description?: string;
  icon?: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: number;
  name: string;
  color?: string;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: number;
  recipe_id: number;
  user_id: number;
  content: string;
  rating?: number;
  created_at: string;
  updated_at: string;
  user: User;
}

export interface Recipe {
  id: number;
  title: string;
  description?: string;
  instructions: RecipeStep[];
  prep_time: number;
  cook_time: number;
  total_time: number;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  image_url?: string;
  average_rating: number;
  rating_count: number;
  is_public: boolean;
  is_original: boolean;
  original_recipe_id?: number;
  author_id: number;
  created_at: string;
  updated_at: string;
  author: User;
  original_recipe?: Recipe;
  ingredients: RecipeIngredient[];
  equipments: RecipeEquipment[];
  tags: Tag[];
  comments: Comment[];
  categories: Category[];
}

export interface RecipeStepRequest {
  step_number: number;
  title?: string;
  description: string;
  duration?: number;
  temperature?: number;
  tips?: string;
  referenced_recipe_id?: number;
}

export interface RecipeIngredientRequest {
  ingredient_id: number;
  quantity: number;
  unit?: string;
  notes?: string;
}

export interface RecipeEquipmentRequest {
  equipment_id: number;
  is_required: boolean;
  notes?: string;
}

export interface RecipeCreateRequest {
  title: string;
  description?: string;
  instructions: RecipeStepRequest[];
  prep_time: number;
  cook_time: number;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  image_url?: string;
  is_public: boolean;
  ingredients: RecipeIngredientRequest[];
  equipments: RecipeEquipmentRequest[];
  tag_ids: number[];
  category_ids: number[];
}

export interface RecipeUpdateRequest extends Partial<RecipeCreateRequest> {}

export interface RecipeResponse {
  success: boolean;
  message?: string;
  data: Recipe;
}

export interface RecipeListResponse {
  success: boolean;
  data: {
    recipes: Recipe[];
    total_count: number;
    current_page: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface SearchFilters {
  q?: string;                    // Terme de recherche général
  categories?: string[];         // IDs de catégories 
  tags?: string[];              // IDs de tags
  ingredients?: string[];       // IDs d'ingrédients
  equipments?: string[];        // IDs d'équipements
  difficulty?: 'easy' | 'medium' | 'hard';
  max_prep_time?: number;       // Temps de préparation maximum en minutes
  max_cook_time?: number;       // Temps de cuisson maximum en minutes  
  max_total_time?: number;      // Temps total maximum en minutes
  min_rating?: number;          // Note minimale (1-5)
  author_id?: number;           // ID de l'auteur
  author?: string;              // Username de l'auteur
  page?: number;
  limit?: number;
  sort_by?: string;             // Champ de tri (ex: "created_at", "rating")
  sort_order?: 'asc' | 'desc';  // Ordre de tri
}
