import { z } from 'zod';

/** Schéma du formulaire de recette — messages en français (cf. AUDIT I18N-2). */
export const recipeFormSchema = z.object({
  title: z
    .string()
    .min(1, 'Le titre est requis')
    .max(200, 'Le titre est trop long (200 caractères max.)'),
  description: z.string().max(1000, 'La description est trop longue (1000 caractères max.)').optional(),
  image_url: z.string().optional(),
  prep_time: z
    .number({ error: 'Indiquez un nombre de minutes' })
    .min(0, 'Le temps doit être positif'),
  cook_time: z
    .number({ error: 'Indiquez un nombre de minutes' })
    .min(0, 'Le temps doit être positif'),
  servings: z
    .number({ error: 'Indiquez un nombre de portions' })
    .min(1, 'Au moins une portion'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  is_public: z.boolean(),
  tag_ids: z.array(z.number()),
  category_ids: z.array(z.number()),
  equipment_ids: z.array(z.number()),
  ingredients: z
    .array(
      z.object({
        ingredient_id: z.number().min(1, 'Choisissez un ingrédient'),
        quantity: z
          .number({ error: 'Quantité invalide' })
          .min(0, 'La quantité doit être positive'),
        unit: z.string().optional(),
        notes: z.string().optional(),
        group: z.string().optional(),
      }),
    )
    .min(1, 'Ajoutez au moins un ingrédient'),
  instructions: z
    .array(
      z.object({
        step_number: z.number().min(1),
        title: z.string().optional(),
        description: z.string().min(1, 'Décrivez cette étape'),
        duration: z.number().optional(),
        temperature: z.number().optional(),
        tips: z.string().optional(),
        referenced_recipe_id: z.string().optional(),
      }),
    )
    .min(1, 'Ajoutez au moins une étape'),
});

export type RecipeFormData = z.infer<typeof recipeFormSchema>;
export type IngredientFormValue = RecipeFormData['ingredients'][number];
export type StepFormValue = RecipeFormData['instructions'][number];

/** Valeurs par défaut d'une nouvelle recette (pas de « 0 » parasites sur les détails d'étape). */
export const emptyRecipeForm: RecipeFormData = {
  title: '',
  description: '',
  image_url: '',
  prep_time: 15,
  cook_time: 10,
  servings: 4,
  difficulty: 'medium',
  is_public: true,
  tag_ids: [],
  category_ids: [],
  equipment_ids: [],
  ingredients: [{ ingredient_id: 0, quantity: 1, unit: '', notes: '', group: '' }],
  instructions: [{ step_number: 1, title: '', description: '' }],
};
