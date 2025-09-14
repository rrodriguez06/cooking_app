import api from './api';
import type { 
  FridgeItem, 
  FridgeItemCreateRequest, 
  FridgeItemUpdateRequest,
  RecipeSearchByIngredientsRequest,
  RecipeSuggestion,
  FridgeStats
} from '../types';

/**
 * Service pour la gestion du frigo virtuel
 */
export const fridgeService = {
  /**
   * Récupérer tous les items du frigo de l'utilisateur
   */
  async getFridgeItems(): Promise<FridgeItem[]> {
    const response = await api.get('/fridge');
    return response.data;
  },

  /**
   * Ajouter un item au frigo
   */
  async addFridgeItem(item: FridgeItemCreateRequest): Promise<FridgeItem> {
    const response = await api.post('/fridge', item);
    return response.data;
  },

  /**
   * Mettre à jour un item du frigo
   */
  async updateFridgeItem(id: number, updates: FridgeItemUpdateRequest): Promise<FridgeItem> {
    const response = await api.put(`/fridge/${id}`, updates);
    return response.data;
  },

  /**
   * Supprimer un item du frigo
   */
  async deleteFridgeItem(id: number): Promise<void> {
    await api.delete(`/fridge/${id}`);
  },

  /**
   * Obtenir des suggestions de recettes basées sur les ingrédients du frigo
   */
  async getRecipeSuggestions(params?: Partial<RecipeSearchByIngredientsRequest>): Promise<RecipeSuggestion[]> {
    const response = await api.get('/fridge/suggestions', { params });
    return response.data.suggestions || [];
  },

  /**
   * Obtenir les statistiques du frigo
   */
  async getFridgeStats(): Promise<FridgeStats> {
    const response = await api.get('/fridge/stats');
    return response.data;
  },

  /**
   * Vider le frigo (supprimer tous les items)
   */
  async clearFridge(): Promise<void> {
    await api.delete('/fridge/clear');
  },

  /**
   * Supprimer les items expirés du frigo
   */
  async removeExpiredItems(): Promise<{ removed_count: number }> {
    const response = await api.delete('/fridge/expired');
    return response.data;
  }
};