import { api } from './api';
import type { 
  UserProfileResponse, 
  UserFollowResponse, 
  UserFollowListResponse 
} from '../types/user';

class UserFollowService {
  // Récupérer le profil public d'un utilisateur
  async getUserProfile(userId: string): Promise<UserProfileResponse> {
    const response = await api.get(`/users/${userId}/profile`);
    return response.data;
  }

  // Suivre un utilisateur
  async followUser(userId: string): Promise<UserFollowResponse> {
    const response = await api.post(`/users/${userId}/follow`);
    return response.data;
  }

  // Arrêter de suivre un utilisateur
  async unfollowUser(userId: string): Promise<UserFollowResponse> {
    const response = await api.delete(`/users/${userId}/follow`);
    return response.data;
  }

  // Récupérer les suiveurs d'un utilisateur
  async getFollowers(userId: string, page: number = 1, limit: number = 10): Promise<UserFollowListResponse> {
    const response = await api.get(`/users/${userId}/followers`, {
      params: { page, limit }
    });
    return response.data;
  }

  // Récupérer les utilisateurs suivis
  async getFollowing(userId: string, page: number = 1, limit: number = 10): Promise<UserFollowListResponse> {
    const response = await api.get(`/users/${userId}/following`, {
      params: { page, limit }
    });
    return response.data;
  }
}

export const userFollowService = new UserFollowService();
