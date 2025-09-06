import { useState, useEffect } from 'react';
import { X, ShoppingCart, Calendar, Clock, ChefHat } from 'lucide-react';
import { shoppingListService } from '../services';
import type { WeeklyShoppingList, ShoppingListItem } from '../services';
import { Button } from './ui';

interface ShoppingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  startDate: string;
  endDate: string;
}

export function ShoppingListModal({ isOpen, onClose, startDate, endDate }: ShoppingListModalProps) {
  const [shoppingList, setShoppingList] = useState<WeeklyShoppingList | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      fetchShoppingList();
    }
  }, [isOpen, startDate, endDate]);

  const fetchShoppingList = async () => {
    try {
      setLoading(true);
      setError('');
      const list = await shoppingListService.getWeeklyShoppingList(startDate, endDate);
      setShoppingList(list);
    } catch (err) {
      console.error('Error fetching shopping list:', err);
      setError('Erreur lors du chargement de la liste de courses');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatQuantity = (quantity: number, unit: string) => {
    // Arrondir à 2 décimales si nécessaire
    const rounded = Math.round(quantity * 100) / 100;
    return `${rounded} ${unit}`;
  };

  const getMealTypeLabel = (mealType: string) => {
    const labels = {
      breakfast: 'Petit-déjeuner',
      lunch: 'Déjeuner',
      dinner: 'Dîner',
      snack: 'Collation',
    };
    return labels[mealType as keyof typeof labels] || mealType;
  };

  const groupItemsByCategory = (items: ShoppingListItem[]) => {
    // Pour l'instant, on groupe simplement par ordre alphabétique
    // Plus tard, on pourrait ajouter des catégories d'ingrédients
    return items.sort((a, b) => a.ingredient_name.localeCompare(b.ingredient_name));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ShoppingCart className="h-6 w-6 text-blue-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Liste de courses
                </h2>
                <p className="text-sm text-gray-500">
                  Du {formatDate(startDate)} au {formatDate(endDate)}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Chargement de la liste de courses...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {shoppingList && !loading && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-4 text-sm text-blue-700">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>{Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} jours</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <ChefHat className="h-4 w-4" />
                    <span>{shoppingList.total_recipes} recettes</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <ShoppingCart className="h-4 w-4" />
                    <span>{shoppingList.items.length} ingrédients</span>
                  </div>
                </div>
              </div>

              {/* Shopping list items */}
              {shoppingList.items.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Aucun ingrédient trouvé pour cette période.</p>
                  <p className="text-sm">Planifiez des recettes pour générer votre liste de courses.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {groupItemsByCategory(shoppingList.items).map((item) => (
                    <div
                      key={item.ingredient_id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-gray-900 text-lg">
                          {item.ingredient_name}
                        </h3>
                        <span className="text-lg font-semibold text-blue-600">
                          {formatQuantity(item.total_quantity, item.unit)}
                        </span>
                      </div>
                      
                      {/* Recipe details */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700">
                          Utilisé dans :
                        </h4>
                        <div className="space-y-1">
                          {item.recipes.map((recipe) => (
                            <div
                              key={`${recipe.recipe_id}-${recipe.date}-${recipe.meal_type}`}
                              className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 rounded px-3 py-2"
                            >
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{recipe.recipe_name}</span>
                                <span className="text-gray-400">•</span>
                                <span>{getMealTypeLabel(recipe.meal_type)}</span>
                                <span className="text-gray-400">•</span>
                                <span>{new Date(recipe.date).toLocaleDateString('fr-FR')}</span>
                              </div>
                              <span className="text-gray-500">
                                {formatQuantity(recipe.quantity, item.unit)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex justify-end space-x-3">
            <Button variant="ghost" onClick={onClose}>
              Fermer
            </Button>
            {shoppingList && shoppingList.items.length > 0 && (
              <Button
                onClick={() => {
                  // TODO: Implémenter l'export ou l'impression
                  window.print();
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Clock className="h-4 w-4 mr-2" />
                Imprimer
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
