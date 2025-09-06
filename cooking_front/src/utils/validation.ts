import { z } from 'zod';

// User validation schemas
export const userLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const userRegisterSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username must be less than 50 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  avatar: z.string().url().optional().or(z.literal('')),
});

export const userUpdateSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  avatar: z.string().url().optional().or(z.literal('')),
});

export const userPasswordResetSchema = z.object({
  email: z.string().email('Invalid email address'),
  new_password: z.string().min(6, 'Password must be at least 6 characters'),
  confirm_password: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

export const userPasswordChangeSchema = z.object({
  new_password: z.string().min(6, 'Password must be at least 6 characters'),
  confirm_password: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

// Recipe validation schemas
export const recipeStepSchema = z.object({
  step_number: z.number().min(1),
  title: z.string().max(100).optional(),
  description: z.string().min(1, 'Description is required').max(1000),
  duration: z.number().min(0).optional(),
  temperature: z.number().min(0).optional(),
  tips: z.string().max(500).optional(),
  referenced_recipe_id: z.union([z.number().min(1), z.literal('')]).optional().transform((val: number | string | undefined) => val === '' ? undefined : val),
});

export const recipeIngredientSchema = z.object({
  ingredient_id: z.number().min(1),
  quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
  unit: z.string().min(1, 'Unit is required'),
  notes: z.string().optional(),
});

export const recipeEquipmentSchema = z.object({
  equipment_id: z.number().min(1),
  is_required: z.boolean(),
  notes: z.string().optional(),
});

export const recipeCreateSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().max(1000).optional(),
  instructions: z.array(recipeStepSchema).min(1, 'At least one instruction is required'),
  prep_time: z.number().min(0),
  cook_time: z.number().min(0),
  servings: z.number().min(1, 'Servings must be at least 1'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  image_url: z.string().url().optional().or(z.literal('')),
  is_public: z.boolean(),
  ingredients: z.array(recipeIngredientSchema).min(1, 'At least one ingredient is required'),
  equipments: z.array(recipeEquipmentSchema),
  tag_ids: z.array(z.number()),
  category_ids: z.array(z.number()),
});

export const recipeUpdateSchema = recipeCreateSchema.partial();

// Search validation schema
export const searchFiltersSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  max_prep_time: z.number().min(0).optional(),
  max_cook_time: z.number().min(0).optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
});

// Meal plan validation schemas
export const mealPlanCreateSchema = z.object({
  recipe_id: z.number().min(1),
  planned_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  servings: z.number().min(1),
  notes: z.string().optional(),
});

export const mealPlanUpdateSchema = mealPlanCreateSchema.partial().extend({
  is_completed: z.boolean().optional(),
});

// Validation helper types
export type UserLoginData = z.infer<typeof userLoginSchema>;
export type UserRegisterData = z.infer<typeof userRegisterSchema>;
export type UserUpdateData = z.infer<typeof userUpdateSchema>;
export type UserPasswordResetData = z.infer<typeof userPasswordResetSchema>;
export type UserPasswordChangeData = z.infer<typeof userPasswordChangeSchema>;
export type RecipeCreateData = z.infer<typeof recipeCreateSchema>;
export type RecipeUpdateData = z.infer<typeof recipeUpdateSchema>;
export type SearchFiltersData = z.infer<typeof searchFiltersSchema>;
export type MealPlanCreateData = z.infer<typeof mealPlanCreateSchema>;
export type MealPlanUpdateData = z.infer<typeof mealPlanUpdateSchema>;
