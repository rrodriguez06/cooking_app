import { useFormContext, Controller } from 'react-hook-form';
import { SlidersHorizontal, Clock, Flame, Users, Eye, EyeOff } from 'lucide-react';
import { Stepper } from '@/components/ui/stepper';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Switch } from '@/components/ui/switch';
import { FormSection } from './FormSection';
import type { RecipeFormData } from './schema';

const difficultyOptions = [
  { value: 'easy', label: 'Facile', activeClassName: '!bg-herb-100 !text-herb-700 dark:!bg-herb-500/15 dark:!text-herb-300' },
  { value: 'medium', label: 'Moyen', activeClassName: '!bg-amber-100 !text-amber-700 dark:!bg-amber-400/15 dark:!text-amber-300' },
  { value: 'hard', label: 'Difficile', activeClassName: '!bg-destructive/10 !text-destructive' },
];

/** Bloc « Détails » : temps & portions (steppers), difficulté (segmenté), visibilité (switch). */
export function DetailsSection() {
  const { control, watch, setValue } = useFormContext<RecipeFormData>();
  const isPublic = watch('is_public');

  return (
    <FormSection
      id="details"
      title="Détails"
      icon={<SlidersHorizontal className="h-5 w-5 text-primary" />}
      description="Temps, portions et niveau de difficulté."
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Field label="Préparation" icon={<Clock className="h-4 w-4" />}>
            <Controller
              control={control}
              name="prep_time"
              render={({ field }) => (
                <Stepper value={field.value} onChange={field.onChange} min={0} step={5} suffix="min" ariaLabel="Temps de préparation" />
              )}
            />
          </Field>

          <Field label="Cuisson" icon={<Flame className="h-4 w-4" />}>
            <Controller
              control={control}
              name="cook_time"
              render={({ field }) => (
                <Stepper value={field.value} onChange={field.onChange} min={0} step={5} suffix="min" ariaLabel="Temps de cuisson" />
              )}
            />
          </Field>

          <Field label="Portions" icon={<Users className="h-4 w-4" />}>
            <Controller
              control={control}
              name="servings"
              render={({ field }) => (
                <Stepper value={field.value} onChange={field.onChange} min={1} step={1} suffix="pers." ariaLabel="Nombre de portions" />
              )}
            />
          </Field>
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-medium text-foreground">Difficulté</span>
          <Controller
            control={control}
            name="difficulty"
            render={({ field }) => (
              <SegmentedControl
                aria-label="Difficulté"
                value={field.value}
                onValueChange={(v) => field.onChange(v as RecipeFormData['difficulty'])}
                options={difficultyOptions}
              />
            )}
          />
        </div>

        <label className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <span className="flex items-center gap-3">
            {isPublic ? (
              <Eye className="h-5 w-5 text-herb-600 dark:text-herb-400" />
            ) : (
              <EyeOff className="h-5 w-5 text-muted-foreground" />
            )}
            <span>
              <span className="block text-sm font-medium text-foreground">
                {isPublic ? 'Recette publique' : 'Recette privée'}
              </span>
              <span className="block text-xs text-muted-foreground">
                {isPublic ? 'Visible par tous les utilisateurs.' : 'Visible par vous seul.'}
              </span>
            </span>
          </span>
          <Switch
            checked={isPublic}
            onCheckedChange={(v) => setValue('is_public', v, { shouldDirty: true })}
            aria-label="Recette publique"
          />
        </label>
      </div>
    </FormSection>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
        <span className="text-muted-foreground">{icon}</span>
        {label}
      </span>
      {children}
    </div>
  );
}
