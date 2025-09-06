import type { Recipe } from './recipe';

export interface MealPlan {
  id: number;
  user_id: number;
  recipe_id: number;
  planned_date: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  servings: number;
  notes?: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
  recipe: Recipe;
}

export interface MealPlanCreateRequest {
  recipe_id: number;
  planned_date: string; // ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  servings: number;
  notes?: string;
}

export interface MealPlanUpdateRequest extends Partial<MealPlanCreateRequest> {
  is_completed?: boolean;
}

export interface MealPlanResponse {
  success: boolean;
  message?: string;
  data: MealPlan;
}

export interface MealPlanListResponse {
  success: boolean;
  data: {
    meal_plans: MealPlan[];
    total_count: number;
    current_page: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface WeeklyMealPlan {
  start_date: string;
  end_date: string;
  meal_plans: { [date: string]: MealPlan[] };
}

export interface WeeklyMealPlanResponse {
  success: boolean;
  data: WeeklyMealPlan;
}

export interface DailyMealPlan {
  date: string;
  breakfast: MealPlan[];
  lunch: MealPlan[];
  dinner: MealPlan[];
  snack: MealPlan[];
}

export interface DailyMealPlanResponse {
  success: boolean;
  data: DailyMealPlan;
}
