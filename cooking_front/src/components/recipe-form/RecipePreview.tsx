import { useFormContext } from 'react-hook-form';
import { Carrot, ListOrdered, Eye, EyeOff } from 'lucide-react';
import { RecipeCard } from '@/components/RecipeCard';
import type { Recipe } from '@/types';
import type { RecipeFormData } from './schema';

/** Aperçu en temps réel : carte recette telle qu'elle apparaîtra + mini récapitulatif. */
export function RecipePreview() {
  const { watch } = useFormContext<RecipeFormData>();
  const values = watch();

  const ingredientCount = (values.ingredients ?? []).filter((i) => i.ingredient_id > 0).length;
  const stepCount = (values.instructions ?? []).filter((s) => (s.description ?? '').trim().length > 0).length;

  const previewRecipe = {
    id: 0,
    title: values.title?.trim() || 'Titre de la recette',
    description: values.description?.trim() || '',
    image_url: values.image_url || '',
    difficulty: values.difficulty ?? 'medium',
    total_time: (values.prep_time ?? 0) + (values.cook_time ?? 0),
    servings: values.servings ?? 0,
    average_rating: 0,
    rating_count: 0,
    created_at: new Date().toISOString(),
  } as unknown as Recipe;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-muted-foreground">Aperçu</p>
      <RecipeCard recipe={previewRecipe} preview />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Carrot className="h-4 w-4" />
          {ingredientCount} ingrédient{ingredientCount > 1 ? 's' : ''}
        </span>
        <span className="flex items-center gap-1.5">
          <ListOrdered className="h-4 w-4" />
          {stepCount} étape{stepCount > 1 ? 's' : ''}
        </span>
        <span className="flex items-center gap-1.5">
          {values.is_public ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          {values.is_public ? 'Publique' : 'Privée'}
        </span>
      </div>
    </div>
  );
}
