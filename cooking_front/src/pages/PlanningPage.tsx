import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Card, CardContent, CardHeader, Button, AddMealModal, ShoppingListModal } from '../components';
import { mealPlanService } from '../services';
import { formatDate, getCurrentDate, addDays, getStartOfWeek } from '../utils';
import type { MealPlan } from '../types';
import { Calendar, Plus, ChefHat, ShoppingCart, Trash2, Edit2, Check, Eye } from 'lucide-react';

export const PlanningPage: React.FC = () => {
  const navigate = useNavigate();
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(getStartOfWeek(getCurrentDate()));
  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [showShoppingListModal, setShowShoppingListModal] = useState(false);
  const [mealToEdit, setMealToEdit] = useState<MealPlan | undefined>(undefined);
  const [currentMealContext, setCurrentMealContext] = useState<{
    date?: string;
    mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  }>({});

  useEffect(() => {
    const fetchMealPlans = async () => {
      console.log('PlanningPage: Fetching meal plans for week:', currentWeek);
      try {
        const response = await mealPlanService.getWeeklyMealPlan(currentWeek);
        console.log('PlanningPage: Response:', response);
        if (response.success && response.data) {
          console.log('PlanningPage: Weekly meal plan structure:', response.data);
          // Convertir le map de meal plans en tableau plat pour l'état local
          const allMealPlans: MealPlan[] = [];
          if (response.data.meal_plans) {
            Object.values(response.data.meal_plans).forEach(dayMealPlans => {
              if (Array.isArray(dayMealPlans)) {
                allMealPlans.push(...dayMealPlans);
              }
            });
          }
          console.log('PlanningPage: Meal plans loaded:', allMealPlans.length);
          setMealPlans(allMealPlans);
        } else {
          console.log('PlanningPage: No meal plans data or unsuccessful response');
          setMealPlans([]);
        }
      } catch (error) {
        console.error('PlanningPage: Error fetching meal plans:', error);
        setMealPlans([]);
      } finally {
        console.log('PlanningPage: Setting loading to false');
        setIsLoading(false);
      }
    };

    fetchMealPlans();
  }, [currentWeek]);

  const refreshMealPlans = async () => {
    console.log('PlanningPage: Refreshing meal plans for week:', currentWeek);
    try {
      const response = await mealPlanService.getWeeklyMealPlan(currentWeek);
      console.log('PlanningPage: Refresh Response:', response);
      if (response.success && response.data) {
        console.log('PlanningPage: Weekly meal plan structure:', response.data);
        // Convertir le map de meal plans en tableau plat pour l'état local
        const allMealPlans: MealPlan[] = [];
        if (response.data.meal_plans) {
          Object.values(response.data.meal_plans).forEach(dayMealPlans => {
            if (Array.isArray(dayMealPlans)) {
              allMealPlans.push(...dayMealPlans);
            }
          });
        }
        console.log('PlanningPage: Meal plans refreshed:', allMealPlans.length);
        setMealPlans(allMealPlans);
      } else {
        console.log('PlanningPage: No meal plans data or unsuccessful response');
        setMealPlans([]);
      }
    } catch (error) {
      console.error('PlanningPage: Error refreshing meal plans:', error);
    }
  };

  const deleteMealPlan = async (mealPlanId: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce repas planifié ?')) {
      try {
        await mealPlanService.deleteMealPlan(mealPlanId);
        await refreshMealPlans();
        console.log('Meal plan deleted successfully!');
      } catch (error) {
        console.error('PlanningPage: Error deleting meal plan:', error);
      }
    }
  };

  const markMealAsCompleted = async (mealPlanId: number) => {
    try {
      await mealPlanService.markMealAsCompleted(mealPlanId);
      await refreshMealPlans();
      console.log('Meal marked as completed!');
    } catch (error) {
      console.error('PlanningPage: Error marking meal as completed:', error);
    }
  };

  const getWeekDays = (startDate: string) => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(startDate, i));
    }
    console.log('PlanningPage: getWeekDays starting from', startDate, '→', days);
    return days;
  };

  const getMealsForDate = (date: string) => {
    const filteredMeals = mealPlans.filter(meal => {
      // Extract date part from meal.planned_date (format: "2025-08-07T14:00:00+02:00")
      const mealDate = meal.planned_date.split('T')[0];
      const matches = mealDate === date;
      
      if (matches) {
        console.log(`PlanningPage: Found meal for ${date}:`, meal);
      }
      
      return matches;
    });
    
    console.log(`PlanningPage: getMealsForDate(${date}) found ${filteredMeals.length} meals`);
    return filteredMeals;
  };

  const weekDays = getWeekDays(currentWeek);
  const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const mealTypes = [
    { key: 'breakfast', label: 'Petit-déjeuner', color: 'bg-yellow-50 border-yellow-200' },
    { key: 'lunch', label: 'Déjeuner', color: 'bg-blue-50 border-blue-200' },
    { key: 'dinner', label: 'Dîner', color: 'bg-purple-50 border-purple-200' },
    { key: 'snack', label: 'Collation', color: 'bg-green-50 border-green-200' },
  ];

  // Calculate the end date of the current week for shopping list
  const weekEndDate = addDays(currentWeek, 6);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Planning des repas</h1>
            <p className="text-gray-600 mt-2">Organisez vos repas pour la semaine</p>
          </div>
          <Button onClick={() => setShowAddMealModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un repas
          </Button>
        </div>

        {/* Week Navigation */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => setCurrentWeek(addDays(currentWeek, -7))}
              >
                ← Semaine précédente
              </Button>
              
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-gray-500" />
                <span className="font-medium">
                  Semaine du {formatDate(currentWeek, 'dd MMMM yyyy')}
                </span>
              </div>
              
              <Button
                variant="ghost"
                onClick={() => setCurrentWeek(addDays(currentWeek, 7))}
              >
                Semaine suivante →
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Planning Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Chargement du planning...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-4">
            {weekDays.map((date, dayIndex) => {
              const dayMeals = getMealsForDate(date);
              
              return (
                <Card key={date} className="min-h-[500px] flex flex-col w-full">
                  <CardHeader className="pb-3 flex-shrink-0">
                    <div className="text-center">
                      <h3 className="font-semibold text-gray-900 truncate">{dayNames[dayIndex]}</h3>
                      <p className="text-sm text-gray-500">
                        {formatDate(date, 'dd/MM')}
                      </p>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0 space-y-4 flex-1 flex flex-col">
                    {mealTypes.map((mealType) => {
                      const meal = dayMeals.find(m => m.meal_type === mealType.key);
                      
                      return (
                        <div key={mealType.key} className="space-y-2">
                          <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                            {mealType.label}
                          </h4>
                          
                          {meal ? (
                            <div className={`p-4 rounded-lg border ${mealType.color} space-y-3`}>
                              <div>
                                <h5 className="font-medium text-sm text-gray-900 mb-1 leading-tight">
                                  {meal.recipe.title}
                                </h5>
                                <p className="text-xs text-gray-600">
                                  {meal.servings} portion{meal.servings > 1 ? 's' : ''}
                                </p>
                                {meal.notes && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {meal.notes}
                                  </p>
                                )}
                              </div>
                              
                              {/* Actions réparties sur deux lignes */}
                              <div className="space-y-2 w-full pt-2 border-t border-gray-100">
                                {/* Première ligne : Voir et Modifier */}
                                <div className="flex justify-center gap-4">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-xs h-8 px-3 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                    onClick={() => navigate(`/recipe/${meal.recipe.id}`)}
                                    title="Voir la recette complète"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-xs h-8 px-3 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                    onClick={() => {
                                      setMealToEdit(meal);
                                      setCurrentMealContext({ 
                                        date, 
                                        mealType: mealType.key as any 
                                      });
                                      setShowAddMealModal(true);
                                    }}
                                    title="Modifier ou remplacer ce repas"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                </div>
                                
                                {/* Deuxième ligne : Supprimer et Terminé */}
                                <div className="flex justify-center gap-4">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-xs h-8 px-3 text-red-600 hover:text-red-800 hover:bg-red-50"
                                    onClick={() => deleteMealPlan(meal.id)}
                                    title="Supprimer ce repas"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                  
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className={`text-xs h-8 px-3 ${
                                      meal.is_completed 
                                        ? 'text-green-600 bg-green-50' 
                                        : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                                    }`}
                                    onClick={() => markMealAsCompleted(meal.id)}
                                    disabled={meal.is_completed}
                                    title={meal.is_completed ? 'Repas terminé ✓' : 'Marquer comme terminé'}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 border-2 border-dashed border-gray-200 rounded-lg text-center hover:border-gray-300 transition-colors">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-gray-500 hover:text-gray-700 w-full"
                                onClick={() => {
                                  setCurrentMealContext({ date, mealType: mealType.key as any });
                                  setShowAddMealModal(true);
                                }}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Ajouter un repas
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold">Actions rapides</h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="secondary" className="justify-start h-auto p-4">
                <ChefHat className="h-6 w-6 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Générer un planning</div>
                  <div className="text-sm text-gray-500">Basé sur vos recettes favorites</div>
                </div>
              </Button>
              
              <Button 
                variant="secondary" 
                className="justify-start h-auto p-4"
                onClick={() => setShowShoppingListModal(true)}
              >
                <ShoppingCart className="h-6 w-6 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Liste de courses</div>
                  <div className="text-sm text-gray-500">Générer pour cette semaine</div>
                </div>
              </Button>
              
              <Button variant="secondary" className="justify-start h-auto p-4">
                <Plus className="h-6 w-6 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Planifier par lot</div>
                  <div className="text-sm text-gray-500">Ajouter plusieurs repas</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Meal Modal */}
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
        onSuccess={() => {
          refreshMealPlans();
          console.log('Meal added/updated successfully!');
        }}
      />

      {/* Shopping List Modal */}
      <ShoppingListModal
        isOpen={showShoppingListModal}
        onClose={() => setShowShoppingListModal(false)}
        startDate={currentWeek}
        endDate={weekEndDate}
      />
    </Layout>
  );
};
