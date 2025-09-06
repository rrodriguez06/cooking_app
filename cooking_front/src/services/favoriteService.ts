import api from './api';
import type { FavoriteStatusResponse, FavoriteRecipesResponse } from '../types';

export const favoriteService = {
  // Toggle le statut favori d'une recette
  async toggleFavorite(recipeId: number): Promise<FavoriteStatusResponse> {
    const response = await api.post<FavoriteStatusResponse>(`/favorites/${recipeId}`);
    return response.data;
  },

  // Vérifier le statut favori d'une recette
  async getFavoriteStatus(recipeId: number): Promise<FavoriteStatusResponse> {
    const response = await api.get<FavoriteStatusResponse>(`/favorites/${recipeId}/status`);
    return response.data;
  },

  // Récupérer les recettes favorites de l'utilisateur connecté
  async getUserFavorites(page: number = 1, limit: number = 10): Promise<FavoriteRecipesResponse> {
    const response = await api.get<FavoriteRecipesResponse>('/favorites', {
      params: { page, limit }
    });
    return response.data;
  },

  // Ajouter une recette aux favoris
  async addToFavorites(recipeId: number): Promise<FavoriteStatusResponse> {
    // On utilise toggle, mais on peut vérifier d'abord le statut si nécessaire
    return this.toggleFavorite(recipeId);
  },

  // Supprimer une recette des favoris
  async removeFromFavorites(recipeId: number): Promise<FavoriteStatusResponse> {
    // On utilise toggle, mais on peut vérifier d'abord le statut si nécessaire
    return this.toggleFavorite(recipeId);
  },
};
