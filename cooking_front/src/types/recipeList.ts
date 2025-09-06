// Import des types existants
import type { User } from './user';
import type { Recipe } from './recipe';

export interface RecipeList {
  id: number;
  name: string;
  description: string;
  is_public: boolean;
  user_id: number;
  created_at: string;
  updated_at: string;
  user?: User;
  items?: RecipeListItem[];
  recipes?: Recipe[];
}

export interface RecipeListItem {
  recipe_list_id: number;
  recipe_id: number;
  recipe?: Recipe;
}

export interface UserFavoriteRecipe {
  user_id: number;
  recipe_id: number;
  user?: User;
  recipe?: Recipe;
}

// Request types
export interface RecipeListCreateRequest {
  name: string;
  description?: string;
  is_public?: boolean;
}

export interface RecipeListUpdateRequest {
  name?: string;
  description?: string;
  is_public?: boolean;
}

export interface AddRecipeToListRequest {
  recipe_id: number;
  notes?: string;
  position?: number;
}

export interface UpdateRecipeInListRequest {
  notes?: string;
  position?: number;
}

// Response types
export interface CustomRecipeListResponse {
  success: boolean;
  message?: string;
  data: RecipeList;
}

export interface CustomRecipeListsResponse {
  success: boolean;
  data: {
    lists: RecipeList[];
    total_count: number;
    current_page: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface FavoriteRecipesResponse {
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

export interface FavoriteStatusResponse {
  success: boolean;
  is_favorite: boolean;
}
