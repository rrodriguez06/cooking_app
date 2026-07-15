import { z } from 'zod';

// Messages en français (cf. audit I18N-2)
const PWD_MIN_MSG = 'Le mot de passe doit contenir au moins 8 caractères';
const USERNAME_MIN_MSG = "Le nom d'utilisateur doit contenir au moins 3 caractères";
const USERNAME_MAX_MSG = "Le nom d'utilisateur doit contenir moins de 50 caractères";
const EMAIL_MSG = 'Adresse e-mail invalide';
const PWD_MISMATCH_MSG = 'Les mots de passe ne correspondent pas';

// User validation schemas
export const userLoginSchema = z.object({
  email: z.string().email(EMAIL_MSG),
  // Pas de contrainte de longueur à la connexion (ne pas bloquer les comptes existants)
  password: z.string().min(1, 'Mot de passe requis'),
});

export const userRegisterSchema = z.object({
  username: z.string().min(3, USERNAME_MIN_MSG).max(50, USERNAME_MAX_MSG),
  email: z.string().email(EMAIL_MSG),
  password: z.string().min(8, PWD_MIN_MSG),
  avatar: z.string().url('URL invalide').optional().or(z.literal('')),
});

export const userUpdateSchema = z.object({
  username: z.string().min(3, USERNAME_MIN_MSG).max(50, USERNAME_MAX_MSG).optional(),
  email: z.string().email(EMAIL_MSG).optional(),
  avatar: z.string().url('URL invalide').optional().or(z.literal('')),
});

// Mot de passe oublié — étape 1 : demande de jeton
export const passwordResetRequestSchema = z.object({
  email: z.string().email(EMAIL_MSG),
});

// Mot de passe oublié — étape 2 : confirmation via le jeton (email porté par le composant)
export const passwordResetConfirmSchema = z
  .object({
    token: z.string().min(1, 'Jeton requis'),
    new_password: z.string().min(8, PWD_MIN_MSG),
    confirm_password: z.string().min(8, PWD_MIN_MSG),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: PWD_MISMATCH_MSG,
    path: ['confirm_password'],
  });

// Changement de mot de passe authentifié (exige le mot de passe actuel)
export const userPasswordChangeSchema = z
  .object({
    current_password: z.string().min(1, 'Mot de passe actuel requis'),
    new_password: z.string().min(8, PWD_MIN_MSG),
    confirm_password: z.string().min(8, PWD_MIN_MSG),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: PWD_MISMATCH_MSG,
    path: ['confirm_password'],
  });

// Recipe validation schemas
export const recipeStepSchema = z.object({
  step_number: z.number().min(1),
  title: z.string().max(100).optional(),
  description: z.string().min(1, 'La description est requise').max(1000),
  duration: z.number().min(0).optional(),
  temperature: z.number().min(0).optional(),
  tips: z.string().max(500).optional(),
  referenced_recipe_id: z.string().optional(),
});

export const recipeIngredientSchema = z.object({
  ingredient_id: z.number().min(1),
  quantity: z.number().min(0.01, 'La quantité doit être supérieure à 0'),
  unit: z.string().optional(),
  notes: z.string().optional(),
});

export const recipeEquipmentSchema = z.object({
  equipment_id: z.number().min(1),
  is_optional: z.boolean(),
  notes: z.string().optional(),
});

export const recipeCreateSchema = z.object({
  title: z.string().min(3, 'Le titre doit contenir au moins 3 caractères').max(200),
  description: z.string().max(1000).optional(),
  instructions: z.array(recipeStepSchema).min(1, 'Au moins une étape est requise'),
  prep_time: z.number().min(0),
  cook_time: z.number().min(0),
  servings: z.number().min(1, 'Le nombre de portions doit être au moins 1'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  image_url: z.string().url().optional().or(z.literal('')),
  is_public: z.boolean(),
  ingredients: z.array(recipeIngredientSchema).min(1, 'Au moins un ingrédient est requis'),
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
  planned_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La date doit être au format YYYY-MM-DD'),
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
export type PasswordResetRequestData = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirmData = z.infer<typeof passwordResetConfirmSchema>;
export type UserPasswordChangeData = z.infer<typeof userPasswordChangeSchema>;
export type RecipeCreateData = z.infer<typeof recipeCreateSchema>;
export type RecipeUpdateData = z.infer<typeof recipeUpdateSchema>;
export type SearchFiltersData = z.infer<typeof searchFiltersSchema>;
export type MealPlanCreateData = z.infer<typeof mealPlanCreateSchema>;
export type MealPlanUpdateData = z.infer<typeof mealPlanUpdateSchema>;
