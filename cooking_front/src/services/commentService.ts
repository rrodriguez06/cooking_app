import api from './api';

export interface Comment {
  id: number;
  content: string;
  rating: number;
  recipe_id: number;
  user_id: number;
  parent_id?: number;
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    username: string;
    email: string;
  };
  replies?: Comment[];
}

export interface CreateCommentRequest {
  content: string;
  rating: number;
  recipe_id: number;
  parent_id?: number;
}

export interface UpdateCommentRequest {
  content: string;
  rating: number;
}

export interface CommentListResponse {
  success: boolean;
  data: {
    comments: Comment[];
    total_count: number;
    current_page: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export const commentService = {
  // Récupérer les commentaires d'une recette
  getCommentsByRecipe: async (recipeId: number): Promise<Comment[]> => {
    try {
      const response = await api.get<CommentListResponse>(`/comments/recipe/${recipeId}`);
      return response.data.data.comments || [];
    } catch (error) {
      console.error('Error fetching comments:', error);
      throw error;
    }
  },

  // Créer un nouveau commentaire
  createComment: async (comment: CreateCommentRequest): Promise<Comment> => {
    try {
      const response = await api.post<{ success: boolean; data: Comment }>('/comments', comment);
      return response.data.data;
    } catch (error) {
      console.error('Error creating comment:', error);
      throw error;
    }
  },

  // Mettre à jour un commentaire
  updateComment: async (commentId: number, comment: UpdateCommentRequest): Promise<Comment> => {
    try {
      const response = await api.put<{ success: boolean; data: Comment }>(`/comments/${commentId}`, comment);
      return response.data.data;
    } catch (error) {
      console.error('Error updating comment:', error);
      throw error;
    }
  },

  // Supprimer un commentaire
  deleteComment: async (commentId: number): Promise<void> => {
    try {
      await api.delete(`/comments/${commentId}`);
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  },

  // Récupérer les réponses d'un commentaire
  getCommentReplies: async (commentId: number): Promise<Comment[]> => {
    try {
      const response = await api.get<CommentListResponse>(`/comments/${commentId}/replies`);
      return response.data.data.comments || [];
    } catch (error) {
      console.error('Error fetching comment replies:', error);
      throw error;
    }
  },
};
