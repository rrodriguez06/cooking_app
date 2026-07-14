import * as React from 'react';
import { useFormContext, useFieldArray, Controller } from 'react-hook-form';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ListOrdered, GripVertical, Plus, Trash2, ChevronDown, Clock, Thermometer, Lightbulb, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/textarea';
import { Stepper } from '@/components/ui/stepper';
import { Combobox } from '@/components/ui/combobox';
import { cn } from '@/utils';
import type { Recipe } from '@/types';
import { FormSection } from './FormSection';
import type { RecipeFormData } from './schema';

interface StepsEditorProps {
  recipes: Recipe[];
  currentRecipeId?: number;
}

/** Bloc « Étapes » : cartes réordonnables (drag & drop) + détails repliés (divulgation progressive). */
export function StepsEditor({ recipes, currentRecipeId }: StepsEditorProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext<RecipeFormData>();
  const { fields, append, remove, move } = useFieldArray({ control, name: 'instructions' });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const recipeOptions = React.useMemo(
    () =>
      recipes
        .filter((r) => r.id !== currentRecipeId)
        .map((r) => ({ value: String(r.id), label: r.title })),
    [recipes, currentRecipeId],
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = fields.findIndex((f) => f.id === active.id);
    const newIndex = fields.findIndex((f) => f.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) move(oldIndex, newIndex);
  };

  const rootError = typeof errors.instructions?.message === 'string' ? errors.instructions.message : undefined;

  return (
    <FormSection
      id="etapes"
      title="Étapes"
      icon={<ListOrdered className="h-5 w-5 text-primary" />}
      description="Décrivez chaque étape. Glissez pour réordonner ; ouvrez les détails pour préciser durée, température ou conseils."
    >
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {fields.map((field, index) => (
              <SortableStepCard
                key={field.id}
                id={field.id}
                index={index}
                recipeOptions={recipeOptions}
                canRemove={fields.length > 1}
                onRemove={() => remove(index)}
                hasDetails={!!(field.duration || field.temperature || field.tips || field.referenced_recipe_id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {rootError && <p className="mt-2 text-sm text-destructive">{rootError}</p>}

      <div className="mt-4 border-t border-border pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => append({ step_number: fields.length + 1, title: '', description: '' })}
          className="gap-1.5 text-primary hover:text-primary"
        >
          <Plus className="h-4 w-4" />
          Ajouter une étape
        </Button>
      </div>
    </FormSection>
  );
}

interface StepCardProps {
  id: string;
  index: number;
  recipeOptions: { value: string; label: string }[];
  canRemove: boolean;
  onRemove: () => void;
  hasDetails: boolean;
}

function SortableStepCard({ id, index, recipeOptions, canRemove, onRemove, hasDetails }: StepCardProps) {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<RecipeFormData>();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const [showDetails, setShowDetails] = React.useState(hasDetails);

  const descError = errors.instructions?.[index]?.description?.message;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'rounded-xl border border-border bg-card p-4',
        isDragging && 'z-10 opacity-80 shadow-soft-lg',
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          className="mt-1 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
          aria-label="Réordonner l'étape"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>

        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
          {index + 1}
        </span>

        <div className="min-w-0 flex-1 space-y-2">
          <Input
            aria-label="Titre de l'étape"
            placeholder="Titre de l'étape (optionnel)"
            {...register(`instructions.${index}.title`)}
          />
          <Textarea
            autoResize
            rows={2}
            aria-label={`Description de l'étape ${index + 1}`}
            placeholder="Décrivez ce qu'il faut faire à cette étape…"
            {...register(`instructions.${index}.description`)}
          />
          {descError && <p className="text-sm text-destructive">{descError}</p>}
        </div>

        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            aria-label={`Supprimer l'étape ${index + 1}`}
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="mt-2 pl-11">
        <button
          type="button"
          onClick={() => setShowDetails((s) => !s)}
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ChevronDown className={cn('h-4 w-4 transition-transform', showDetails && 'rotate-180')} />
          {showDetails ? 'Masquer les détails' : 'Ajouter un détail (durée, température, conseil…)'}
        </button>

        {showDetails && (
          <div className="mt-3 grid grid-cols-1 gap-4 rounded-lg bg-muted/40 p-3 sm:grid-cols-2">
            <div>
              <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Clock className="h-4 w-4 text-muted-foreground" /> Durée
              </span>
              <Controller
                control={control}
                name={`instructions.${index}.duration`}
                render={({ field }) => (
                  <Stepper
                    value={field.value ?? 0}
                    onChange={field.onChange}
                    min={0}
                    step={1}
                    suffix="min"
                    ariaLabel="Durée de l'étape"
                  />
                )}
              />
            </div>
            <div>
              <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Thermometer className="h-4 w-4 text-muted-foreground" /> Température
              </span>
              <Controller
                control={control}
                name={`instructions.${index}.temperature`}
                render={({ field }) => (
                  <Stepper
                    value={field.value ?? 0}
                    onChange={field.onChange}
                    min={0}
                    max={500}
                    step={10}
                    suffix="°C"
                    ariaLabel="Température"
                  />
                )}
              />
            </div>
            <div className="sm:col-span-2">
              <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Lightbulb className="h-4 w-4 text-muted-foreground" /> Conseil
              </span>
              <Textarea
                autoResize
                rows={2}
                aria-label="Conseil pour l'étape"
                placeholder="Astuce ou point de vigilance (optionnel)…"
                {...register(`instructions.${index}.tips`)}
              />
            </div>
            <div className="sm:col-span-2">
              <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Link2 className="h-4 w-4 text-muted-foreground" /> Recette liée
              </span>
              <Controller
                control={control}
                name={`instructions.${index}.referenced_recipe_id`}
                render={({ field }) => (
                  <Combobox
                    options={recipeOptions}
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    placeholder="Aucune recette liée"
                    searchPlaceholder="Rechercher une recette…"
                    emptyText="Aucune recette trouvée."
                  />
                )}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Ex. lier une recette de pâte à une tarte.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
