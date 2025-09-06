import api from './api';
import type {
  RecipeListCreateRequest,
  RecipeListUpdateRequest,
  AddRecipeToListRequest,
  CustomRecipeListResponse,
  CustomRecipeListsResponse,
} from '../types';

export const recipeListService = {
  // Créer une nouvelle liste de recettes
  async createRecipeList(listData: RecipeListCreateRequest): Promise<CustomRecipeListResponse> {
    const response = await api.post<CustomRecipeListResponse>('/recipe-lists', listData);
    return response.data;
  },

  // Récupérer une liste de recettes par son ID
  async getRecipeList(listId: number): Promise<CustomRecipeListResponse> {
    const response = await api.get<CustomRecipeListResponse>(`/recipe-lists/${listId}`);
    return response.data;
  },

  // Récupérer toutes les listes de l'utilisateur connecté
  async getUserRecipeLists(page: number = 1, limit: number = 10): Promise<CustomRecipeListsResponse> {
    const response = await api.get<CustomRecipeListsResponse>('/recipe-lists', {
      params: { page, limit }
    });
    return response.data;
  },

  // Mettre à jour une liste de recettes
  async updateRecipeList(listId: number, listData: RecipeListUpdateRequest): Promise<CustomRecipeListResponse> {
    const response = await api.put<CustomRecipeListResponse>(`/recipe-lists/${listId}`, listData);
    return response.data;
  },

  // Supprimer une liste de recettes
  async deleteRecipeList(listId: number): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/recipe-lists/${listId}`);
    return response.data;
  },

  // Ajouter une recette à une liste
  async addRecipeToList(listId: number, recipeData: AddRecipeToListRequest): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/recipe-lists/${listId}/recipes`, recipeData);
    return response.data;
  },

  // Supprimer une recette d'une liste
  async removeRecipeFromList(listId: number, recipeId: number): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/recipe-lists/${listId}/recipes/${recipeId}`);
    return response.data;
  },

  // Helper method pour créer une liste de favoris par défaut
  async createFavoritesList(): Promise<CustomRecipeListResponse> {
    return this.createRecipeList({
      name: 'Mes Favoris',
      description: 'Mes recettes préférées',
      is_public: false,
    });
  },

  // Helper method pour créer une liste "À essayer"
  async createToTryList(): Promise<CustomRecipeListResponse> {
    return this.createRecipeList({
      name: 'À Essayer',
      description: 'Recettes que je veux essayer',
      is_public: false,
    });
  },

  // Helper method pour créer une liste "Planning de la semaine"
  async createWeeklyPlanList(): Promise<CustomRecipeListResponse> {
    return this.createRecipeList({
      name: 'Planning de la semaine',
      description: 'Mes repas planifiés pour cette semaine',
      is_public: false,
    });
  },
};
