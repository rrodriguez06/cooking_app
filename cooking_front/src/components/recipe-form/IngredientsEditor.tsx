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
import { Carrot, GripVertical, Plus, Trash2, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Combobox } from '@/components/ui/combobox';
import { Input } from '@/components/ui/Input';
import { cn } from '@/utils';
import type { Ingredient } from '@/types';
import { FormSection } from './FormSection';
import { UNIT_OPTIONS, withCustomValue } from './units';
import type { RecipeFormData } from './schema';

interface IngredientsEditorProps {
  ingredients: Ingredient[];
  onCreateIngredient: () => void;
}

/** Bloc « Ingrédients » : lignes réordonnables (drag & drop), groupes, unités normalisées. */
export function IngredientsEditor({ ingredients, onCreateIngredient }: IngredientsEditorProps) {
  const {
    control,
    watch,
    formState: { errors },
  } = useFormContext<RecipeFormData>();
  const { fields, append, remove, move } = useFieldArray({ control, name: 'ingredients' });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const watched = watch('ingredients') ?? [];
  const groupOf = (i: number) => (watched[i]?.group ?? '').trim();

  // Groupes déjà utilisés (pour les proposer dans le combobox de groupe).
  const existingGroups = React.useMemo(() => {
    const set = new Set<string>();
    watched.forEach((ing) => {
      const g = (ing?.group ?? '').trim();
      if (g) set.add(g);
    });
    return Array.from(set).map((g) => ({ value: g, label: g }));
  }, [watched]);

  const ingredientOptions = React.useMemo(
    () =>
      ingredients.map((ing) => ({
        value: String(ing.id),
        label: ing.name,
        icon: ing.icon ? <span className="text-base">{ing.icon}</span> : undefined,
        keywords: ing.category ? [ing.category] : undefined,
      })),
    [ingredients],
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = fields.findIndex((f) => f.id === active.id);
    const newIndex = fields.findIndex((f) => f.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) move(oldIndex, newIndex);
  };

  const rootError = typeof errors.ingredients?.message === 'string' ? errors.ingredients.message : undefined;

  return (
    <FormSection
      id="ingredients"
      title="Ingrédients"
      icon={<Carrot className="h-5 w-5 text-primary" />}
      description="Glissez pour réordonner. Nommez un groupe (ex. « Pour la pâte ») pour créer des sections."
      action={
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCreateIngredient}
          className="gap-1.5"
          title="Créer un ingrédient absent du catalogue (base de données)"
        >
          <Plus className="h-4 w-4" />
          Créer un ingrédient
        </Button>
      }
      className="xl:flex xl:max-h-[calc(100vh-7rem)] xl:flex-col xl:overflow-hidden"
    >
      {/* En-tête & bouton "Ajouter" restent épinglés ; seule la liste défile
          (le panneau ne dépasse jamais la hauteur de l'écran, même avec beaucoup
          d'ingrédients). */}
      <div className="xl:flex xl:min-h-0 xl:flex-1 xl:flex-col">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-1">
            {fields.map((field, index) => {
              const showHeader = groupOf(index) !== '' && groupOf(index) !== groupOf(index - 1);
              return (
                <React.Fragment key={field.id}>
                  {showHeader && (
                    <div className="px-1 pt-3 text-sm font-semibold text-primary first:pt-0">
                      {groupOf(index)}
                    </div>
                  )}
                  <SortableIngredientRow
                    id={field.id}
                    index={index}
                    ingredientOptions={ingredientOptions}
                    existingGroups={existingGroups}
                    onCreateIngredient={onCreateIngredient}
                    canRemove={fields.length > 1}
                    onRemove={() => remove(index)}
                    hadNotes={!!field.notes}
                  />
                </React.Fragment>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {rootError && <p className="mt-2 text-sm text-destructive">{rootError}</p>}

      <div className="mt-4 border-t border-border pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() =>
            append({ ingredient_id: 0, quantity: 1, unit: '', notes: '', group: groupOf(fields.length - 1) })
          }
          className="gap-1.5 text-primary hover:text-primary"
        >
          <Plus className="h-4 w-4" />
          Ajouter un ingrédient
        </Button>
      </div>
      </div>
    </FormSection>
  );
}

interface RowProps {
  id: string;
  index: number;
  ingredientOptions: { value: string; label: string; icon?: React.ReactNode; keywords?: string[] }[];
  existingGroups: { value: string; label: string }[];
  onCreateIngredient: () => void;
  canRemove: boolean;
  onRemove: () => void;
  hadNotes: boolean;
}

function SortableIngredientRow({
  id,
  index,
  ingredientOptions,
  existingGroups,
  onCreateIngredient,
  canRemove,
  onRemove,
  hadNotes,
}: RowProps) {
  const { control, register, watch } = useFormContext<RecipeFormData>();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const [showNotes, setShowNotes] = React.useState(hadNotes);

  const currentUnit = watch(`ingredients.${index}.unit`);
  const currentGroup = watch(`ingredients.${index}.group`);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'rounded-xl border border-border bg-card p-3',
        isDragging && 'z-10 opacity-80 shadow-soft-lg',
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-2 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
          aria-label="Réordonner l'ingrédient"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>

        {/* Ingrédient sur sa propre ligne (pleine largeur), puis qté/unité/groupe
            sur une ligne dédiée : lisible même dans le panneau étroit. */}
        <div className="min-w-0 flex-1 space-y-2">
          <Controller
            control={control}
            name={`ingredients.${index}.ingredient_id`}
            render={({ field, fieldState }) => (
              <Combobox
                options={ingredientOptions}
                value={field.value ? String(field.value) : ''}
                onChange={(v) => field.onChange(Number(v))}
                onCreate={onCreateIngredient}
                createLabel={(input) => `Créer l'ingrédient « ${input} »`}
                placeholder="Ingrédient…"
                searchPlaceholder="Rechercher un ingrédient…"
                error={!!fieldState.error}
              />
            )}
          />

          <div className="grid grid-cols-[minmax(0,4rem)_minmax(0,1fr)_minmax(0,1fr)] gap-2">
            {/* Quantité */}
            <Input
              type="number"
              step="0.1"
              min="0"
              aria-label="Quantité"
              placeholder="Qté"
              {...register(`ingredients.${index}.quantity`, { valueAsNumber: true })}
            />

            {/* Unité */}
            <Controller
              control={control}
              name={`ingredients.${index}.unit`}
              render={({ field }) => (
                <Combobox
                  options={withCustomValue(UNIT_OPTIONS, currentUnit)}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onCreate={(label) => field.onChange(label)}
                  createLabel={(input) => `Utiliser « ${input} »`}
                  placeholder="Unité"
                  searchPlaceholder="g, ml, c. à s…"
                />
              )}
            />

            {/* Groupe */}
            <Controller
              control={control}
              name={`ingredients.${index}.group`}
              render={({ field }) => (
                <Combobox
                  options={withCustomValue(existingGroups, currentGroup)}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onCreate={(label) => field.onChange(label)}
                  createLabel={(input) => `Groupe « ${input} »`}
                  placeholder="Groupe"
                  searchPlaceholder="Pour la pâte…"
                  emptyText="Aucun groupe. Tapez pour en créer un."
                />
              )}
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8', showNotes && 'text-primary')}
            aria-label="Ajouter une note"
            title="Note (optionnel)"
            onClick={() => setShowNotes((s) => !s)}
          >
            <StickyNote className="h-4 w-4" />
          </Button>
          {canRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              aria-label="Supprimer l'ingrédient"
              onClick={onRemove}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {showNotes && (
        <div className="mt-2 pl-7">
          <Input
            aria-label="Note sur l'ingrédient"
            placeholder="Note (ex. « à température ambiante », « tamisée »)…"
            {...register(`ingredients.${index}.notes`)}
          />
        </div>
      )}
    </div>
  );
}
