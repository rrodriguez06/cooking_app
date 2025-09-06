import React, { useState, useEffect } from 'react';
import { Button } from './index';
import { recipeService, mealPlanService } from '../services';
import { getFullImageUrl } from '../utils/imageUtils';
import { Calendar, Clock, Users, X, Search, ChefHat } from 'lucide-react';
import type { Recipe, MealPlanCreateRequest, MealPlan } from '../types';

interface AddMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialDate?: string;
  initialMealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  existingMeal?: MealPlan; // Pour la modification d'un repas existant
}

export const AddMealModal: React.FC<AddMealModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialDate,
  initialMealType = 'dinner',
  existingMeal
}) => {
  const [step, setStep] = useState<'search' | 'plan'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    planned_date: initialDate || '',
    meal_type: initialMealType,
    servings: 1,
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      if (existingMeal) {
        // Mode modification : pré-remplir avec les données existantes
        setStep('plan');
        setSelectedRecipe(existingMeal.recipe);
        setSearchQuery('');
        setRecipes([]);
        setFormData({
          planned_date: existingMeal.planned_date.split('T')[0], // Extraire la date
          meal_type: existingMeal.meal_type,
          servings: existingMeal.servings,
          notes: existingMeal.notes || ''
        });
      } else {
        // Mode création : valeurs par défaut
        setStep('search');
        setSelectedRecipe(null);
        setSearchQuery('');
        setRecipes([]);
        setFormData({
          planned_date: initialDate || '',
          meal_type: initialMealType,
          servings: 1,
          notes: ''
        });
      }
    }
  }, [isOpen, initialDate, initialMealType, existingMeal]);

  // Auto-search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim() && step === 'search') {
        searchRecipes();
      } else if (!searchQuery.trim()) {
        setRecipes([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, step]);

  if (!isOpen) return null;

  const searchRecipes = async () => {
    if (!searchQuery.trim()) {
      setRecipes([]);
      return;
    }
    
    setIsLoading(true);
    try {
      const searchFilters = {
        q: searchQuery,
        limit: 10
      };
      
      console.log('AddMealModal: Searching recipes with filters:', searchFilters);
      const response = await recipeService.searchRecipes(searchFilters);
      console.log('AddMealModal: Search response:', response);
      
      if (response.success) {
        setRecipes(response.data.recipes || []);
        console.log('AddMealModal: Found recipes:', response.data.recipes?.length || 0);
      }
    } catch (error) {
      console.error('AddMealModal: Error searching recipes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecipeSelect = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setFormData(prev => ({
      ...prev,
      servings: recipe.servings
    }));
    setStep('plan');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipe) return;
    
    setIsSubmitting(true);

    try {
      // Convert date to ISO string format expected by Go backend
      const plannedDate = new Date(formData.planned_date + 'T12:00:00.000Z').toISOString();
      
      if (existingMeal) {
        // Mode modification : mettre à jour le repas existant
        const updateData = {
          recipe_id: selectedRecipe.id,
          planned_date: plannedDate,
          meal_type: formData.meal_type,
          servings: formData.servings,
          notes: formData.notes || ''
        };

        console.log('AddMealModal: Updating meal plan with data:', updateData);
        console.log('AddMealModal: Existing meal ID:', existingMeal.id);
        console.log('AddMealModal: Selected recipe ID:', selectedRecipe.id);
        console.log('AddMealModal: Existing meal recipe ID:', existingMeal.recipe_id);
        
        const response = await mealPlanService.updateMealPlan(existingMeal.id, updateData);
        console.log('AddMealModal: Update response:', response);
        
        if (response.success) {
          onSuccess?.();
          onClose();
        }
      } else {
        // Mode création : créer un nouveau repas
        const requestData: MealPlanCreateRequest = {
          recipe_id: selectedRecipe.id,
          planned_date: plannedDate,
          meal_type: formData.meal_type,
          servings: formData.servings,
          notes: formData.notes || ''
        };

        console.log('AddMealModal: Creating meal plan with data:', requestData);
        const response = await mealPlanService.createMealPlan(requestData);
        
        if (response.success) {
          onSuccess?.();
          onClose();
        }
      }
    } catch (error) {
      console.error('Error planning recipe:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Get today's date in YYYY-MM-DD format for min date
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {step === 'search' 
              ? (existingMeal ? 'Changer de recette' : 'Choisir une recette')
              : (existingMeal ? 'Modifier le repas' : 'Planifier le repas')
            }
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {step === 'search' ? (
            <div className="p-6">
              {/* Search */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher une recette..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {isLoading && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Results */}
              {recipes.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900">Résultats de recherche</h3>
                  <div className="grid gap-3">
                    {recipes.map((recipe) => (
                      <div
                        key={recipe.id}
                        onClick={() => handleRecipeSelect(recipe)}
                        className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
                      >
                        <div className="flex-shrink-0">
                          {recipe.image_url ? (
                            <img
                              src={getFullImageUrl(recipe.image_url)}
                              alt={recipe.title}
                              className="h-12 w-12 rounded-lg object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement!.innerHTML = `
                                  <div class="h-12 w-12 bg-gray-300 rounded-lg flex items-center justify-center">
                                    <svg class="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253z" />
                                    </svg>
                                  </div>
                                `;
                              }}
                            />
                          ) : (
                            <div className="h-12 w-12 bg-gray-300 rounded-lg flex items-center justify-center">
                              <ChefHat className="h-6 w-6 text-gray-500" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">{recipe.title}</h4>
                          <p className="text-sm text-gray-500 line-clamp-2">{recipe.description}</p>
                          <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                            <span>{recipe.servings} portions</span>
                            <span>{recipe.prep_time + recipe.cook_time} min</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {searchQuery.trim() && recipes.length === 0 && !isLoading && (
                <div className="text-center py-8 text-gray-500">
                  Aucune recette trouvée pour "{searchQuery}"
                </div>
              )}

              {!searchQuery.trim() && (
                <div className="text-center py-8 text-gray-500">
                  Tapez pour rechercher une recette...
                </div>
              )}
            </div>
          ) : (
            <div className="p-6">
              {/* Selected Recipe Preview */}
              {selectedRecipe && (
                <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {selectedRecipe.image_url ? (
                          <img
                            src={getFullImageUrl(selectedRecipe.image_url)}
                            alt={selectedRecipe.title}
                            className="h-12 w-12 rounded-lg object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.parentElement!.innerHTML = `
                                <div class="h-12 w-12 bg-gray-300 rounded-lg flex items-center justify-center">
                                  <svg class="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253z" />
                                  </svg>
                                </div>
                              `;
                            }}
                          />
                        ) : (
                          <div className="h-12 w-12 bg-gray-300 rounded-lg flex items-center justify-center">
                            <ChefHat className="h-6 w-6 text-gray-500" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{selectedRecipe.title}</h3>
                        <p className="text-sm text-gray-500">{selectedRecipe.description}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setStep('search')}
                      className="ml-4"
                    >
                      Changer de recette
                    </Button>
                  </div>
                </div>
              )}

              {/* Planning Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="h-4 w-4 inline mr-2" />
                    Date prévue
                  </label>
                  <input
                    type="date"
                    value={formData.planned_date}
                    onChange={(e) => handleChange('planned_date', e.target.value)}
                    min={today}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Meal Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="h-4 w-4 inline mr-2" />
                    Type de repas
                  </label>
                  <select
                    value={formData.meal_type}
                    onChange={(e) => handleChange('meal_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="breakfast">Petit-déjeuner</option>
                    <option value="lunch">Déjeuner</option>
                    <option value="dinner">Dîner</option>
                    <option value="snack">Collation</option>
                  </select>
                </div>

                {/* Servings */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Users className="h-4 w-4 inline mr-2" />
                    Nombre de portions
                  </label>
                  <input
                    type="number"
                    value={formData.servings}
                    onChange={(e) => handleChange('servings', parseInt(e.target.value))}
                    min="1"
                    max="20"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (optionnel)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    rows={3}
                    placeholder="Notes personnelles pour ce planning..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStep('search')}
                    className="flex-1"
                  >
                    Retour
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={onClose}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || !formData.planned_date}
                    className="flex-1"
                  >
                    {isSubmitting 
                      ? (existingMeal ? 'Modification...' : 'Planification...') 
                      : (existingMeal ? 'Modifier' : 'Planifier')
                    }
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
