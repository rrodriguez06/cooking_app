import { useFormContext } from 'react-hook-form';
import { Sparkles, UtensilsCrossed } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/ImageUpload';
import { FormSection } from './FormSection';
import type { RecipeFormData } from './schema';

interface EssentialsSectionProps {
  isCreating: boolean;
  onImportPhoto: () => void;
}

/** Bloc « L'essentiel » : photo hero, titre en typo display, description. */
export function EssentialsSection({ isCreating, onImportPhoto }: EssentialsSectionProps) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<RecipeFormData>();

  return (
    <FormSection
      id="essentiel"
      title="L'essentiel"
      icon={<UtensilsCrossed className="h-5 w-5 text-primary" />}
      description="La photo et le nom qui donnent envie."
      action={
        isCreating ? (
          <Button type="button" variant="outline" size="sm" onClick={onImportPhoto} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Importer d'une photo
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-5">
        {/* Photo en héro */}
        <ImageUpload
          value={watch('image_url')}
          onChange={(imageUrl) => setValue('image_url', imageUrl, { shouldDirty: true })}
        />

        {/* Titre en typo display */}
        <div>
          <label htmlFor="recipe-title" className="mb-1 block text-sm font-medium text-foreground">
            Titre de la recette *
          </label>
          <input
            id="recipe-title"
            {...register('title')}
            placeholder="Ex. Tarte fine aux pommes"
            aria-invalid={errors.title ? true : undefined}
            className="w-full rounded-lg border border-input bg-background px-4 py-3 font-display text-2xl font-semibold text-foreground placeholder:font-sans placeholder:text-lg placeholder:font-normal placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring aria-[invalid]:border-destructive"
          />
          {errors.title && <p className="mt-1 text-sm text-destructive">{errors.title.message}</p>}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="recipe-description" className="mb-1 block text-sm font-medium text-foreground">
            Description
          </label>
          <Textarea
            id="recipe-description"
            autoResize
            rows={3}
            {...register('description')}
            placeholder="Une phrase ou deux pour présenter le plat, son origine, ce qu'on aime…"
          />
          {errors.description && (
            <p className="mt-1 text-sm text-destructive">{errors.description.message}</p>
          )}
        </div>
      </div>
    </FormSection>
  );
}
