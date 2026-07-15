import { useState, useEffect } from 'react';
import { ShoppingCart, Calendar, ChefHat, Printer, Check } from 'lucide-react';
import { shoppingListService } from '../services';
import type { WeeklyShoppingList, ShoppingListItem } from '../services';
import { Button } from './ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { cn } from '../utils';

interface ShoppingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  startDate: string;
  endDate: string;
}

const mealTypeLabels: Record<string, string> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  dinner: 'Dîner',
  snack: 'Collation',
};

// Unités dénombrables qui prennent un « s » au pluriel (les abréviations de mesure restent invariables).
const PLURALIZABLE = new Set(['pièce', 'gousse', 'tranche', 'pincée', 'verre', 'sachet', 'botte']);

function formatQuantity(quantity: number, unit: string) {
  const rounded = Math.round(quantity * 100) / 100;
  let displayUnit = unit || 'pièce';
  if (rounded > 1 && PLURALIZABLE.has(displayUnit)) displayUnit += 's';
  return `${rounded} ${displayUnit}`;
}

function formatDateLong(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export function ShoppingListModal({ isOpen, onClose, startDate, endDate }: ShoppingListModalProps) {
  const [shoppingList, setShoppingList] = useState<WeeklyShoppingList | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    const fetchShoppingList = async () => {
      try {
        setLoading(true);
        setError('');
        const list = await shoppingListService.getWeeklyShoppingList(startDate, endDate);
        setShoppingList(list);
        setChecked(new Set());
      } catch {
        setError('Erreur lors du chargement de la liste de courses.');
      } finally {
        setLoading(false);
      }
    };
    fetchShoppingList();
  }, [isOpen, startDate, endDate, retryToken]);

  const toggleChecked = (ingredientId: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(ingredientId)) next.delete(ingredientId);
      else next.add(ingredientId);
      return next;
    });
  };

  const items: ShoppingListItem[] = shoppingList
    ? [...shoppingList.items].sort((a, b) => a.ingredient_name.localeCompare(b.ingredient_name))
    : [];
  const checkedCount = items.filter((i) => checked.has(i.ingredient_id)).length;
  const dayCount = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden p-0">
        <div className="print-sheet flex max-h-[90vh] flex-col">
          <DialogHeader className="border-b border-border p-6">
            <DialogTitle className="flex items-center gap-3">
              <ShoppingCart className="h-6 w-6 text-primary" />
              <div>
                <span className="block font-display text-xl font-semibold">Liste de courses</span>
                <span className="block text-sm font-normal text-muted-foreground">
                  Du {formatDateLong(startDate)} au {formatDateLong(endDate)}
                </span>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6">
            {loading && (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <div className="mr-3 h-6 w-6 animate-spin rounded-full border-2 border-primary border-b-transparent" />
                Chargement de la liste…
              </div>
            )}

            {error && (
              <div className="mb-4 flex flex-col items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
                <span>{error}</span>
                <Button variant="secondary" size="sm" onClick={() => setRetryToken((t) => t + 1)}>
                  Réessayer
                </Button>
              </div>
            )}

            {shoppingList && !loading && (
              <div className="space-y-6">
                {/* Résumé */}
                <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {dayCount} jour{dayCount > 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <ChefHat className="h-4 w-4" />
                    {shoppingList.total_recipes} recettes
                  </span>
                  <span className="flex items-center gap-1.5">
                    <ShoppingCart className="h-4 w-4" />
                    {items.length} ingrédients
                  </span>
                  {items.length > 0 && (
                    <span className="ml-auto font-medium text-foreground">
                      {checkedCount}/{items.length} coché{checkedCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {items.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <ShoppingCart className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
                    <p>Aucun ingrédient pour cette période.</p>
                    <p className="text-sm">Planifiez des recettes pour générer votre liste.</p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {items.map((item) => {
                      const isChecked = checked.has(item.ingredient_id);
                      return (
                        <li key={item.ingredient_id} className="rounded-lg border border-border">
                          <label className="flex cursor-pointer items-center gap-3 p-3">
                            <span
                              className={cn(
                                'grid h-5 w-5 shrink-0 place-items-center rounded border transition-colors',
                                isChecked ? 'border-herb-500 bg-herb-500 text-white' : 'border-input',
                              )}
                            >
                              {isChecked && <Check className="h-3.5 w-3.5" />}
                            </span>
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={isChecked}
                              onChange={() => toggleChecked(item.ingredient_id)}
                            />
                            <span className={cn('flex-1 font-medium', isChecked && 'text-muted-foreground line-through')}>
                              {item.ingredient_name}
                            </span>
                            <span className={cn('font-semibold text-primary', isChecked && 'text-muted-foreground line-through')}>
                              {formatQuantity(item.total_quantity, item.unit)}
                            </span>
                          </label>

                          {item.recipes.length > 0 && (
                            <details className="print-hidden group border-t border-border">
                              <summary className="cursor-pointer px-3 py-2 text-xs text-muted-foreground hover:text-foreground">
                                Utilisé dans {item.recipes.length} recette{item.recipes.length > 1 ? 's' : ''}
                              </summary>
                              <div className="space-y-1 px-3 pb-3">
                                {item.recipes.map((recipe) => (
                                  <div
                                    key={`${recipe.recipe_id}-${recipe.date}-${recipe.meal_type}`}
                                    className="flex items-center justify-between rounded bg-muted/50 px-3 py-2 text-xs text-muted-foreground"
                                  >
                                    <span className="flex flex-wrap items-center gap-x-2">
                                      <span className="font-medium text-foreground">{recipe.recipe_name}</span>
                                      <span>• {mealTypeLabels[recipe.meal_type] || recipe.meal_type}</span>
                                      <span>• {new Date(recipe.date).toLocaleDateString('fr-FR')}</span>
                                    </span>
                                    <span>{formatQuantity(recipe.quantity, item.unit)}</span>
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="print-hidden border-t border-border bg-muted/40 p-4">
            <Button variant="ghost" onClick={onClose}>
              Fermer
            </Button>
            {items.length > 0 && (
              <Button onClick={() => window.print()} className="gap-2">
                <Printer className="h-4 w-4" />
                Imprimer la liste
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
