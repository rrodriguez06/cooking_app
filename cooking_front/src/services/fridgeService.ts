import type { ApiResponse } from '../types/api';
import type { 
  FridgeItem, 
  FridgeItemCreateRequest, 
  FridgeItemUpdateRequest,
  FridgeListResponse,
  RecipeSearchByIngredientsRequest,
  RecipeSuggestionsResponse,
  FridgeStats
} from '../types/fridge';
import { api } from './api';

/**
 * Service pour la gestion du frigo virtuel
 */
export const fridgeService = {
  /**
   * Récupérer tous les items du frigo de l'utilisateur
   */
  async getFridgeItems(): Promise<ApiResponse<FridgeListResponse>> {
    try {
      const response = await api.get('/fridge');
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.error || 'Erreur lors de la récupération des items du frigo'
      };
    }
  },

  /**
   * Ajouter un item au frigo
   */
  async addFridgeItem(item: FridgeItemCreateRequest): Promise<ApiResponse<FridgeItem>> {
    try {
      const response = await api.post('/fridge', item);
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.error || 'Erreur lors de l\'ajout de l\'item au frigo'
      };
    }
  },

  /**
   * Mettre à jour un item du frigo
   */
  async updateFridgeItem(id: number, updates: FridgeItemUpdateRequest): Promise<ApiResponse<FridgeItem>> {
    try {
      const response = await api.put(`/fridge/${id}`, updates);
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.error || 'Erreur lors de la mise à jour de l\'item'
      };
    }
  },

  /**
   * Supprimer un item du frigo
   */
  async deleteFridgeItem(id: number): Promise<ApiResponse<void>> {
    try {
      await api.delete(`/fridge/${id}`);
      return {
        success: true
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.error || 'Erreur lors de la suppression de l\'item'
      };
    }
  },

  /**
   * Obtenir des suggestions de recettes basées sur les ingrédients du frigo
   */
  async getRecipeSuggestions(params?: Partial<RecipeSearchByIngredientsRequest>): Promise<ApiResponse<RecipeSuggestionsResponse>> {
    try {
      const searchParams = new URLSearchParams();
      
      if (params?.match_type) {
        searchParams.append('match_type', params.match_type);
      }
      if (params?.max_missing_ingredients !== undefined) {
        searchParams.append('max_missing_ingredients', params.max_missing_ingredients.toString());
      }
      if (params?.exclude_categories?.length) {
        params.exclude_categories.forEach(cat => searchParams.append('exclude_categories', cat));
      }
      if (params?.limit) {
        searchParams.append('limit', params.limit.toString());
      }

      const queryString = searchParams.toString();
      const url = `/fridge/suggestions${queryString ? `?${queryString}` : ''}`;
      
      const response = await api.get(url);
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.error || 'Erreur lors de la récupération des suggestions'
      };
    }
  },

  /**
   * Obtenir les statistiques du frigo
   */
  async getFridgeStats(): Promise<ApiResponse<FridgeStats>> {
    try {
      const response = await api.get('/fridge/stats');
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.error || 'Erreur lors de la récupération des statistiques'
      };
    }
  },

  /**
   * Vider le frigo (supprimer tous les items)
   */
  async clearFridge(): Promise<ApiResponse<void>> {
    try {
      await api.delete('/fridge/clear');
      return {
        success: true
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.error || 'Erreur lors du vidage du frigo'
      };
    }
  },

  /**
   * Supprimer les items expirés du frigo
   */
  async removeExpiredItems(): Promise<ApiResponse<{ removed_count: number }>> {
    try {
      const response = await api.delete('/fridge/expired');
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.error || 'Erreur lors de la suppression des items expirés'
      };
    }
  }
};