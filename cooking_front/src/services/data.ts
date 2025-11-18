import api from './api';
import type {
  Category,
  Tag,
  Ingredient,
  Equipment,
  QueryParams,
} from '../types';

// Categories service
export const categoryService = {
  async getCategories(params?: QueryParams): Promise<{ success: boolean; data: Category[] }> {
    const response = await api.get('/categories', { params });
    return {
      success: response.data.success,
      data: response.data.data?.categories || []
    };
  },

  async getCategory(id: number): Promise<{ success: boolean; data: Category }> {
    const response = await api.get(`/categories/${id}`);
    return response.data;
  },

  async createCategory(data: Omit<Category, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; data: Category }> {
    const response = await api.post('/categories', data);
    return response.data;
  },

  async updateCategory(id: number, data: Partial<Category>): Promise<{ success: boolean; data: Category }> {
    const response = await api.put(`/categories/${id}`, data);
    return response.data;
  },

  async deleteCategory(id: number): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/categories/${id}`);
    return response.data;
  },
};

// Tags service
export const tagService = {
  async getTags(params?: QueryParams): Promise<{ success: boolean; data: Tag[] }> {
    const response = await api.get('/tags', { params });
    return {
      success: response.data.success,
      data: response.data.data?.tags || []
    };
  },

  async getTag(id: number): Promise<{ success: boolean; data: Tag }> {
    const response = await api.get(`/tags/${id}`);
    return response.data;
  },

  async createTag(data: Omit<Tag, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; data: Tag }> {
    const response = await api.post('/tags', data);
    return response.data;
  },

  async updateTag(id: number, data: Partial<Tag>): Promise<{ success: boolean; data: Tag }> {
    const response = await api.put(`/tags/${id}`, data);
    return response.data;
  },

  async deleteTag(id: number): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/tags/${id}`);
    return response.data;
  },
};

// Ingredients service
export const ingredientService = {
  async getIngredients(params?: QueryParams): Promise<{ 
    success: boolean; 
    data: Ingredient[] | {
      ingredients: Ingredient[];
      total_count?: number;
      current_page?: number;
      total_pages?: number;
      has_next?: boolean;
      has_prev?: boolean;
    }
  }> {
    const response = await api.get('/ingredients', { params });
    // Si on passe des paramètres de pagination, retourner la structure paginée complète
    if (params && (params.page || params.limit)) {
      return {
        success: response.data.success,
        data: response.data.data || { ingredients: [] }
      };
    }
    // Sinon, retourner juste le tableau (compatibilité avec l'ancien code)
    return {
      success: response.data.success,
      data: response.data.data?.ingredients || []
    };
  },

  async getIngredient(id: number): Promise<{ success: boolean; data: Ingredient }> {
    const response = await api.get(`/ingredients/${id}`);
    return response.data;
  },

  async createIngredient(data: Omit<Ingredient, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; data: Ingredient }> {
    const response = await api.post('/ingredients', data);
    return response.data;
  },

  async updateIngredient(id: number, data: Partial<Ingredient>): Promise<{ success: boolean; data: Ingredient }> {
    const response = await api.put(`/ingredients/${id}`, data);
    return response.data;
  },

  async deleteIngredient(id: number): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/ingredients/${id}`);
    return response.data;
  },
};

// Equipment service
export const equipmentService = {
  async getEquipments(params?: QueryParams): Promise<{ success: boolean; data: Equipment[] }> {
    const response = await api.get('/equipment', { params });
    return {
      success: response.data.success,
      data: response.data.data?.equipment || []
    };
  },

  async getEquipment(id: number): Promise<{ success: boolean; data: Equipment }> {
    const response = await api.get(`/equipment/${id}`);
    return response.data;
  },

  async createEquipment(data: Omit<Equipment, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; data: Equipment }> {
    const response = await api.post('/equipment', data);
    return response.data;
  },

  async updateEquipment(id: number, data: Partial<Equipment>): Promise<{ success: boolean; data: Equipment }> {
    const response = await api.put(`/equipment/${id}`, data);
    return response.data;
  },

  async deleteEquipment(id: number): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/equipment/${id}`);
    return response.data;
  },
};
