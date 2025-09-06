import { api } from './api';
import type { RecipeListResponse } from '../types/recipe';
import type { User, Recipe } from '../types';

export interface UserFeed {
  user: User;
  recipes: Recipe[];
}

export interface GroupedFeedResponse {
  success: boolean;
  data: UserFeed[];
}

class FeedService {
  // Récupérer le feed des utilisateurs suivis
  async getFollowingFeed(page: number = 1, limit: number = 10): Promise<RecipeListResponse> {
    const response = await api.get('/feed/following', {
      params: { page, limit }
    });
    return response.data;
  }

  // Récupérer le feed groupé par utilisateur
  async getFollowingFeedGrouped(): Promise<GroupedFeedResponse> {
    const response = await api.get('/feed/following/grouped');
    return response.data;
  }
}

export const feedService = new FeedService();
