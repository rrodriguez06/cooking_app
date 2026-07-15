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
      {/* Bande horizontale : temps, portions, difficulté et visibilité sur une
          seule ligne (pleine largeur) -> pas de colonne courte, pas d'espace mort. */}
      <div className="flex flex-col gap-6 lg:flex-row lg:flex-wrap lg:items-end lg:gap-x-8 lg:gap-y-5">
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

        <Field label="Difficulté" icon={<SlidersHorizontal className="h-4 w-4" />}>
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
        </Field>

        <Field
          label="Visibilité"
          icon={isPublic ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          className="lg:ml-auto"
        >
          <label
            className="flex h-10 cursor-pointer items-center gap-3 rounded-lg border border-border bg-muted/40 px-4"
            title={isPublic ? 'Visible par tous les utilisateurs.' : 'Visible par vous seul.'}
          >
            <Switch
              checked={isPublic}
              onCheckedChange={(v) => setValue('is_public', v, { shouldDirty: true })}
              aria-label="Recette publique"
            />
            <span className="whitespace-nowrap text-sm font-medium text-foreground">
              {isPublic ? 'Publique' : 'Privée'}
            </span>
          </label>
        </Field>
      </div>
    </FormSection>
  );
}

function Field({ label, icon, children, className }: { label: string; icon: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
        <span className="text-muted-foreground">{icon}</span>
        {label}
      </span>
      {children}
    </div>
  );
}
