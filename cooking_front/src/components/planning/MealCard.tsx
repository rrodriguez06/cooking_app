import { Eye, Edit2, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils';
import type { MealPlan } from '@/types';

interface MealCardProps {
  meal: MealPlan;
  accent: string;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onComplete: () => void;
  /** Poignée de drag optionnelle (desktop). */
  dragHandle?: React.ReactNode;
  className?: string;
}

/** Carte d'un repas planifié (présentation + actions), réutilisée table & accordéon. */
export function MealCard({ meal, accent, onView, onEdit, onDelete, onComplete, dragHandle, className }: MealCardProps) {
  return (
    <div className={cn('space-y-2 rounded-lg border p-2', accent, meal.is_completed && 'opacity-70', className)}>
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <h5 className="line-clamp-2 text-xs font-semibold leading-tight">{meal.recipe.title}</h5>
          <p className="text-xs opacity-80">{meal.servings} pers.</p>
          {meal.notes && <p className="line-clamp-1 text-xs opacity-70">{meal.notes}</p>}
        </div>
        {dragHandle}
      </div>

      <div className="grid grid-cols-4 gap-0.5">
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onView} title="Voir la recette" aria-label="Voir la recette">
          <Eye className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onEdit} title="Modifier" aria-label="Modifier le repas">
          <Edit2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          title="Supprimer"
          aria-label="Supprimer le repas"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className={cn('h-6 w-6', meal.is_completed ? 'text-herb-600 dark:text-herb-500' : 'text-muted-foreground hover:text-herb-600 dark:hover:text-herb-500')}
          onClick={onComplete}
          disabled={meal.is_completed}
          title={meal.is_completed ? 'Repas terminé' : 'Marquer comme terminé'}
          aria-label={meal.is_completed ? 'Repas terminé' : 'Marquer comme terminé'}
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
