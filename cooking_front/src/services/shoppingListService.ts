import { api } from './api';

export interface ShoppingListItem {
  ingredient_id: number;
  ingredient_name: string;
  total_quantity: number;
  unit: string;
  recipes: {
    recipe_id: number;
    recipe_name: string;
    quantity: number;
    date: string;
    meal_type: string;
  }[];
}

export interface WeeklyShoppingList {
  start_date: string;
  end_date: string;
  items: ShoppingListItem[];
  total_recipes: number;
}

export interface WeeklyShoppingListResponse {
  success: boolean;
  data: WeeklyShoppingList;
}

export const shoppingListService = {
  // Récupérer la liste de courses pour une semaine
  getWeeklyShoppingList: async (startDate: string, endDate?: string): Promise<WeeklyShoppingList> => {
    const params = new URLSearchParams({ start_date: startDate });
    if (endDate) {
      params.append('end_date', endDate);
    }
    
    const response = await api.get<WeeklyShoppingListResponse>(`/meal-plans/shopping-list?${params}`);
    return response.data.data;
  },
};
