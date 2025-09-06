import api from './api';
import type {
  MealPlanCreateRequest,
  MealPlanUpdateRequest,
  MealPlanResponse,
  MealPlanListResponse,
  WeeklyMealPlanResponse,
  DailyMealPlanResponse,
  QueryParams,
} from '../types';

export const mealPlanService = {
  // Get meal plan by ID
  async getMealPlan(id: number): Promise<MealPlanResponse> {
    const response = await api.get<MealPlanResponse>(`/meal-plans/${id}`);
    return response.data;
  },

  // Get user meal plans
  async getUserMealPlans(params?: QueryParams): Promise<MealPlanListResponse> {
    const response = await api.get<MealPlanListResponse>('/meal-plans', { params });
    return response.data;
  },

  // Get weekly meal plan
  async getWeeklyMealPlan(date: string): Promise<WeeklyMealPlanResponse> {
    const response = await api.get<WeeklyMealPlanResponse>('/meal-plans/weekly', {
      params: { date }
    });
    return response.data;
  },

  // Get daily meal plan
  async getDailyMealPlan(date: string): Promise<DailyMealPlanResponse> {
    const response = await api.get<DailyMealPlanResponse>('/meal-plans/daily', {
      params: { date }
    });
    return response.data;
  },

  // Get upcoming meals
  async getUpcomingMeals(days: number = 7): Promise<MealPlanListResponse> {
    const response = await api.get<MealPlanListResponse>('/meal-plans/upcoming', {
      params: { days }
    });
    return response.data;
  },

  // Create meal plan
  async createMealPlan(mealPlanData: MealPlanCreateRequest): Promise<MealPlanResponse> {
    console.log('mealPlanService.createMealPlan: Sending data:', mealPlanData);
    try {
      const response = await api.post<MealPlanResponse>('/meal-plans', mealPlanData);
      console.log('mealPlanService.createMealPlan: Success response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('mealPlanService.createMealPlan: Error:', error);
      console.error('mealPlanService.createMealPlan: Error response:', error.response?.data);
      throw error;
    }
  },

  // Update meal plan
  async updateMealPlan(id: number, mealPlanData: MealPlanUpdateRequest): Promise<MealPlanResponse> {
    console.log('mealPlanService.updateMealPlan: Request ID:', id);
    console.log('mealPlanService.updateMealPlan: Request data:', mealPlanData);
    const response = await api.put<MealPlanResponse>(`/meal-plans/${id}`, mealPlanData);
    console.log('mealPlanService.updateMealPlan: Response:', response.data);
    return response.data;
  },

  // Delete meal plan
  async deleteMealPlan(id: number): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/meal-plans/${id}`);
    return response.data;
  },

  // Mark meal as completed
  async markMealAsCompleted(id: number): Promise<MealPlanResponse> {
    const response = await api.patch<MealPlanResponse>(`/meal-plans/${id}/complete`);
    return response.data;
  },
};
