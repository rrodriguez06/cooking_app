import api from './api';
import type {
  RecipeCreateRequest,
  RecipeUpdateRequest,
  RecipeResponse,
  RecipeListResponse,
  SearchFilters,
  QueryParams,
} from '../types';

// Helper function to format search filters for backend
const formatSearchParams = (filters: SearchFilters): URLSearchParams => {
  const params = new URLSearchParams();
  
  // Add simple string/number parameters
  if (filters.q) params.append('q', filters.q);
  if (filters.difficulty) params.append('difficulty', filters.difficulty);
  if (filters.max_prep_time) params.append('max_prep_time', filters.max_prep_time.toString());
  if (filters.max_cook_time) params.append('max_cook_time', filters.max_cook_time.toString());
  if (filters.max_total_time) params.append('max_total_time', filters.max_total_time.toString());
  if (filters.min_rating) params.append('min_rating', filters.min_rating.toString());
  if (filters.author_id) params.append('author_id', filters.author_id.toString());
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.sort_by) params.append('sort_by', filters.sort_by);
  if (filters.sort_order) params.append('sort_order', filters.sort_order);
  
  // Add array parameters - Go expects multiple parameters with the same name
  if (filters.categories && filters.categories.length > 0) {
    filters.categories.forEach(cat => params.append('categories', cat));
  }
  if (filters.tags && filters.tags.length > 0) {
    filters.tags.forEach(tag => params.append('tags', tag));
  }
  if (filters.ingredients && filters.ingredients.length > 0) {
    filters.ingredients.forEach(ing => params.append('ingredients', ing));
  }
  if (filters.equipments && filters.equipments.length > 0) {
    filters.equipments.forEach(eq => params.append('equipments', eq));
  }
  
  return params;
};

export const recipeService = {
  // Get recipe by ID
  async getRecipe(id: number): Promise<RecipeResponse> {
    const response = await api.get<RecipeResponse>(`/recipes/${id}`);
    return response.data;
  },

  // List recipes
  async listRecipes(params?: QueryParams): Promise<RecipeListResponse> {
    const response = await api.get<RecipeListResponse>('/recipes', { params });
    return response.data;
  },

  // Search recipes
  async searchRecipes(filters: SearchFilters): Promise<RecipeListResponse> {
    const params = formatSearchParams(filters);
    const response = await api.get<RecipeListResponse>(`/recipes/search?${params.toString()}`);
    return response.data;
  },

  // Get user recipes
  async getUserRecipes(userId: number, params?: QueryParams): Promise<RecipeListResponse> {
    const response = await api.get<RecipeListResponse>(`/recipes/user/${userId}`, { params });
    return response.data;
  },

  // Create recipe
  async createRecipe(recipeData: RecipeCreateRequest): Promise<RecipeResponse> {
    const response = await api.post<RecipeResponse>('/recipes', recipeData);
    return response.data;
  },

  // Update recipe
  async updateRecipe(id: number, recipeData: RecipeUpdateRequest): Promise<RecipeResponse> {
    const response = await api.put<RecipeResponse>(`/recipes/${id}`, recipeData);
    return response.data;
  },

  // Delete recipe
  async deleteRecipe(id: number): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/recipes/${id}`);
    return response.data;
  },

  // Copy recipe
  async copyRecipe(id: number): Promise<RecipeResponse> {
    const response = await api.post<RecipeResponse>(`/recipes/${id}/copy`);
    return response.data;
  },

  // Get latest recipes for feed
  async getLatestRecipes(limit: number = 10): Promise<RecipeListResponse> {
    const response = await api.get<RecipeListResponse>('/recipes', {
      params: { page: 1, limit, sort: 'created_at', order: 'desc' }
    });
    return response.data;
  },

  // Get popular recipes
  async getPopularRecipes(limit: number = 10): Promise<RecipeListResponse> {
    const response = await api.get<RecipeListResponse>('/recipes', {
      params: { page: 1, limit, sort: 'popularity', order: 'desc' }
    });
    return response.data;
  },
};
