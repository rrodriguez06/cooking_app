import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, Plus, ChefHat, ShoppingCart, ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import { Layout, Card, CardContent, CardHeader, Button, AddMealModal, ShoppingListModal, GeneratePlanModal, useConfirm } from '../components';
import { MealCard, GenerationRecapDialog, type GenerationRecap } from '../components/planning';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from '../components/ui/sonner';
import { mealPlanService, mealPlanGenerator } from '../services';
import { formatDate, getCurrentDate, addDays, getStartOfWeek } from '../utils';
import { cn } from '../utils';
import type { MealPlan } from '../types';
import type { GenerationOptions } from '../components/GeneratePlanModal';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const MEAL_TIMES: Record<MealType, string> = {
  breakfast: '08:00:00.000Z',
  lunch: '12:30:00.000Z',
  dinner: '19:00:00.000Z',
  snack: '15:30:00.000Z',
};

const MEAL_TYPES: { key: MealType; label: string; accent: string }[] = [
  { key: 'breakfast', label: 'Petit-déjeuner', accent: 'border-amber-200 bg-amber-50 text-amber-900' },
  { key: 'lunch', label: 'Déjeuner', accent: 'border-sky-200 bg-sky-50 text-sky-900' },
  { key: 'dinner', label: 'Dîner', accent: 'border-primary-200 bg-primary-50 text-primary-900' },
  { key: 'snack', label: 'Collation', accent: 'border-herb-200 bg-herb-50 text-herb-700' },
];

const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

const dateOf = (meal: MealPlan) => meal.planned_date.split('T')[0];
const buildPlannedDate = (date: string, mealType: MealType) => new Date(`${date}T${MEAL_TIMES[mealType]}`).toISOString();

export const PlanningPage: React.FC = () => {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(getStartOfWeek(getCurrentDate()));
  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [showShoppingListModal, setShowShoppingListModal] = useState(false);
  const [showGeneratePlanModal, setShowGeneratePlanModal] = useState(false);
  const [mealToEdit, setMealToEdit] = useState<MealPlan | undefined>(undefined);
  const [currentMealContext, setCurrentMealContext] = useState<{ date?: string; mealType?: MealType }>({});
  const [recap, setRecap] = useState<GenerationRecap | null>(null);
  const [showRecap, setShowRecap] = useState(false);
  const [expandedDay, setExpandedDay] = useState<string>(getCurrentDate());

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const loadMealPlans = async () => {
    const response = await mealPlanService.getWeeklyMealPlan(currentWeek);
    const all: MealPlan[] = [];
    if (response.success && response.data?.meal_plans) {
      Object.values(response.data.meal_plans).forEach((dayMealPlans) => {
        if (Array.isArray(dayMealPlans)) all.push(...dayMealPlans);
      });
    }
    setMealPlans(all);
  };

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      setIsLoading(true);
      try {
        await loadMealPlans();
      } catch {
        if (!cancelled) setMealPlans([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetch();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWeek]);

  const refreshMealPlans = async () => {
    try {
      await loadMealPlans();
    } catch {
      /* rafraîchissement best-effort */
    }
  };

  const deleteMealPlan = async (mealPlanId: number) => {
    const ok = await confirm({
      title: 'Supprimer le repas',
      description: 'Êtes-vous sûr de vouloir retirer ce repas du planning ?',
      confirmLabel: 'Supprimer',
      destructive: true,
    });
    if (!ok) return;
    try {
      await mealPlanService.deleteMealPlan(mealPlanId);
      await refreshMealPlans();
      toast.success('Repas retiré du planning.');
    } catch {
      toast.error('Erreur lors de la suppression du repas.');
    }
  };

  const markMealAsCompleted = async (mealPlanId: number) => {
    try {
      await mealPlanService.markMealAsCompleted(mealPlanId);
      await refreshMealPlans();
    } catch {
      toast.error('Impossible de mettre à jour le repas.');
    }
  };

  const handleGeneratePlan = async (options: GenerationOptions) => {
    try {
      const result = await mealPlanGenerator.generateWeeklyPlan(currentWeek, options);
      if (!result.success) {
        toast.error(result.message || 'Erreur lors de la génération du planning.');
        setShowGeneratePlanModal(false);
        return;
      }

      let successCount = 0;
      for (const mealPlan of result.mealPlans) {
        try {
          await mealPlanService.createMealPlan(mealPlan);
          successCount++;
        } catch {
          /* comptabilisé comme échec ci-dessous */
        }
      }

      setShowGeneratePlanModal(false);
      await refreshMealPlans();

      setRecap({
        added: successCount,
        recipesUsed: result.stats.recipesUsed,
        diversityScore: result.stats.diversityScore,
        skipped: result.stats.skippedSlots.length,
        failed: result.mealPlans.length - successCount,
        sourceType: result.stats.sourceType,
      });
      setShowRecap(true);
    } catch {
      toast.error('Erreur lors de la génération du planning.');
      setShowGeneratePlanModal(false);
    }
  };

  const moveMeal = async (meal: MealPlan, date: string, mealType: MealType) => {
    if (dateOf(meal) === date && meal.meal_type === mealType) return;
    const occupied = mealPlans.some((m) => m.id !== meal.id && dateOf(m) === date && m.meal_type === mealType);
    if (occupied) {
      toast.error('Ce créneau est déjà occupé.');
      return;
    }
    const planned_date = buildPlannedDate(date, mealType);
    setMealPlans((prev) => prev.map((m) => (m.id === meal.id ? { ...m, planned_date, meal_type: mealType } : m)));
    try {
      await mealPlanService.updateMealPlan(meal.id, { planned_date, meal_type: mealType });
      toast.success('Repas déplacé.');
      refreshMealPlans();
    } catch {
      toast.error('Impossible de déplacer le repas.');
      refreshMealPlans();
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const meal = active.data.current?.meal as MealPlan | undefined;
    const target = over.data.current as { date: string; mealType: MealType } | undefined;
    if (meal && target) moveMeal(meal, target.date, target.mealType);
  };

  const openAdd = (date: string, mealType: MealType) => {
    setCurrentMealContext({ date, mealType });
    setShowAddMealModal(true);
  };

  const openEdit = (meal: MealPlan) => {
    setMealToEdit(meal);
    setCurrentMealContext({ date: dateOf(meal), mealType: meal.meal_type });
    setShowAddMealModal(true);
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));
  const weekEndDate = addDays(currentWeek, 6);
  const mealAt = (date: string, mealType: MealType) =>
    mealPlans.find((m) => dateOf(m) === date && m.meal_type === mealType);

  const mealHandlers = (meal: MealPlan) => ({
    onView: () => navigate(`/recipe/${meal.recipe.id}`),
    onEdit: () => openEdit(meal),
    onDelete: () => deleteMealPlan(meal.id),
    onComplete: () => markMealAsCompleted(meal.id),
  });

  return (
    <Layout>
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Planning des repas</h1>
            <p className="mt-1 text-muted-foreground">Organisez vos repas pour la semaine.</p>
          </div>
          <Button onClick={() => setShowAddMealModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Ajouter un repas
          </Button>
        </div>

        {/* Navigation semaine */}
        <Card>
          <CardContent className="flex items-center justify-between p-3 sm:p-4">
            <Button variant="ghost" size="sm" onClick={() => setCurrentWeek(addDays(currentWeek, -7))} className="gap-1">
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Précédente</span>
            </Button>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Semaine du {formatDate(currentWeek, 'dd MMMM yyyy')}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setCurrentWeek(addDays(currentWeek, 7))} className="gap-1">
              <span className="hidden sm:inline">Suivante</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Planning */}
        {isLoading ? (
          <PlanningSkeleton />
        ) : (
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            {/* Vue tableau (desktop) */}
            <Card className="hidden overflow-hidden lg:block">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="w-24 border-r border-border p-3 text-left text-xs font-semibold">Repas</th>
                        {weekDays.map((date, dayIndex) => (
                          <th key={dayIndex} className="border-r border-border p-2 text-center last:border-r-0">
                            <div className="text-xs font-semibold">{DAY_NAMES[dayIndex].substring(0, 3)}</div>
                            <div className="text-xs font-normal text-muted-foreground">{formatDate(date, 'dd/MM')}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {MEAL_TYPES.map((mealType) => (
                        <tr key={mealType.key} className="border-b border-border last:border-b-0">
                          <td className="border-r border-border bg-muted/50 p-3 align-top text-xs font-medium text-muted-foreground">
                            {mealType.label}
                          </td>
                          {weekDays.map((date, dayIndex) => {
                            const meal = mealAt(date, mealType.key);
                            return (
                              <td key={dayIndex} className="border-r border-border p-2 align-top last:border-r-0">
                                <DroppableCell date={date} mealType={mealType.key}>
                                  {meal ? (
                                    <DraggableMeal id={`meal::${meal.id}`} meal={meal}>
                                      {(handle) => (
                                        <MealCard meal={meal} accent={mealType.accent} dragHandle={handle} {...mealHandlers(meal)} />
                                      )}
                                    </DraggableMeal>
                                  ) : (
                                    <EmptyCell onClick={() => openAdd(date, mealType.key)} />
                                  )}
                                </DroppableCell>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Vue jour par jour (mobile / tablette) */}
            <div className="space-y-3 lg:hidden">
              {weekDays.map((date, dayIndex) => {
                const isOpen = expandedDay === date;
                const dayMealCount = MEAL_TYPES.filter((mt) => mealAt(date, mt.key)).length;
                return (
                  <Card key={date} className="overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedDay(isOpen ? '' : date)}
                      className="flex w-full items-center justify-between p-4 text-left"
                      aria-expanded={isOpen}
                    >
                      <div>
                        <div className="font-semibold">{DAY_NAMES[dayIndex]}</div>
                        <div className="text-sm text-muted-foreground">{formatDate(date, 'dd MMMM')}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{dayMealCount}/4</span>
                        <ChevronRight className={cn('h-5 w-5 text-muted-foreground transition-transform', isOpen && 'rotate-90')} />
                      </div>
                    </button>
                    {isOpen && (
                      <CardContent className="grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-2">
                        {MEAL_TYPES.map((mealType) => {
                          const meal = mealAt(date, mealType.key);
                          return (
                            <div key={mealType.key}>
                              <div className="mb-1 text-xs font-medium text-muted-foreground">{mealType.label}</div>
                              {meal ? (
                                <MealCard meal={meal} accent={mealType.accent} {...mealHandlers(meal)} />
                              ) : (
                                <EmptyCell onClick={() => openAdd(date, mealType.key)} />
                              )}
                            </div>
                          );
                        })}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          </DndContext>
        )}

        {/* Actions rapides */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold">Actions rapides</h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Button variant="secondary" className="h-auto justify-start p-4" onClick={() => setShowGeneratePlanModal(true)}>
                <ChefHat className="mr-3 h-6 w-6" />
                <span className="text-left">
                  <span className="block font-medium">Générer un planning</span>
                  <span className="block text-sm text-muted-foreground">Basé sur vos recettes favorites</span>
                </span>
              </Button>
              <Button variant="secondary" className="h-auto justify-start p-4" onClick={() => setShowShoppingListModal(true)}>
                <ShoppingCart className="mr-3 h-6 w-6" />
                <span className="text-left">
                  <span className="block font-medium">Liste de courses</span>
                  <span className="block text-sm text-muted-foreground">Générer pour cette semaine</span>
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <AddMealModal
        isOpen={showAddMealModal}
        onClose={() => {
          setShowAddMealModal(false);
          setCurrentMealContext({});
          setMealToEdit(undefined);
        }}
        initialDate={currentMealContext.date}
        initialMealType={currentMealContext.mealType}
        existingMeal={mealToEdit}
        onSuccess={() => refreshMealPlans()}
      />

      <ShoppingListModal
        isOpen={showShoppingListModal}
        onClose={() => setShowShoppingListModal(false)}
        startDate={currentWeek}
        endDate={weekEndDate}
      />

      <GeneratePlanModal
        isOpen={showGeneratePlanModal}
        onClose={() => setShowGeneratePlanModal(false)}
        onGenerate={handleGeneratePlan}
        currentWeekStart={currentWeek}
      />

      <GenerationRecapDialog recap={recap} open={showRecap} onOpenChange={setShowRecap} />
    </Layout>
  );
};

/** Cellule cible de dépôt (drag & drop d'un repas). */
function DroppableCell({ date, mealType, children }: { date: string; mealType: MealType; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `cell::${date}::${mealType}`, data: { date, mealType } });
  return (
    <div ref={setNodeRef} className={cn('rounded-md transition-colors', isOver && 'ring-2 ring-primary ring-offset-1')}>
      {children}
    </div>
  );
}

/** Repas déplaçable ; la poignée seule initie le drag (les boutons restent cliquables). */
function DraggableMeal({
  id,
  meal,
  children,
}: {
  id: string;
  meal: MealPlan;
  children: (handle: React.ReactNode) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id, data: { meal } });
  const handle = (
    <button
      type="button"
      className="cursor-grab touch-none text-muted-foreground/60 hover:text-foreground active:cursor-grabbing"
      aria-label="Déplacer le repas"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(isDragging && 'z-10 opacity-60')}
    >
      {children(handle)}
    </div>
  );
}

function EmptyCell({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[72px] w-full items-center justify-center rounded-md border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      aria-label="Ajouter un repas"
    >
      <Plus className="h-4 w-4" />
    </button>
  );
}

function PlanningSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {Array.from({ length: 8 }).map((_, j) => (
              <Skeleton key={j} className="h-20" />
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
