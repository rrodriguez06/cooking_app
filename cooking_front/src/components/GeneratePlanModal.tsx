import React, { useState, useEffect } from 'react';
import { X, Clock, ChefHat, Heart, List, TrendingUp, Settings, Shuffle, Info } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { recipeListService } from '../services';
import type { RecipeList } from '../types';

interface GeneratePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (options: GenerationOptions) => void;
  currentWeekStart: string;
}

export interface GenerationOptions {
  // Repas à générer
  mealTypes: {
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
    snack: boolean;
  };
  
  // Source des recettes
  source: {
    type: 'favorites' | 'list' | 'popular' | 'trending';
    listId?: number; // Si type = 'list'
  };
  
  // Paramètres de génération
  settings: {
    avoidRepetition: boolean; // Éviter de répéter les recettes dans la semaine
    diversifyCategories: boolean; // Diversifier les catégories
    maxRecipesPerDay: number; // Limite de recettes par jour
    considerDifficulty: boolean; // Prendre en compte la difficulté
  };
}

export const GeneratePlanModal: React.FC<GeneratePlanModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
  currentWeekStart
}) => {
  // États pour les options de génération
  const [mealTypes, setMealTypes] = useState({
    breakfast: false,
    lunch: true,
    dinner: true,
    snack: false
  });

  const [source, setSource] = useState<GenerationOptions['source']>({
    type: 'favorites'
  });

  const [settings, setSettings] = useState({
    avoidRepetition: true,
    diversifyCategories: true,
    maxRecipesPerDay: 3,
    considerDifficulty: false
  });

  // États pour les données
  const [userLists, setUserLists] = useState<RecipeList[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Charger les données nécessaires
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      const listsResponse = await recipeListService.getUserRecipeLists(1, 100);

      if (listsResponse.success && listsResponse.data) {
        setUserLists(listsResponse.data.lists || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    }
  };

  const handleMealTypeToggle = (mealType: keyof typeof mealTypes) => {
    setMealTypes(prev => ({
      ...prev,
      [mealType]: !prev[mealType]
    }));
  };

  const handleSourceChange = (newSource: GenerationOptions['source']) => {
    setSource(newSource);
  };

  const handleGenerate = () => {
    // Vérifier qu'au moins un repas est sélectionné
    const selectedMeals = Object.values(mealTypes).some(selected => selected);
    if (!selectedMeals) {
      alert('Veuillez sélectionner au moins un type de repas à générer.');
      return;
    }

    const options: GenerationOptions = {
      mealTypes,
      source,
      settings
    };

    setIsLoading(true);
    onGenerate(options);
  };

  const formatWeekDates = (weekStart: string) => {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    return {
      start: start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      end: end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    };
  };

  if (!isOpen) return null;

  const weekDates = formatWeekDates(currentWeekStart);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Générer un planning</h2>
            <p className="text-sm text-gray-500 mt-1">
              Du {weekDates.start} au {weekDates.end}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Section 1: Types de repas */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Clock className="h-5 w-5 mr-2 text-blue-600" />
              Quels repas générer ?
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { key: 'breakfast', label: 'Petit-déjeuner', icon: '🌅' },
                { key: 'lunch', label: 'Déjeuner', icon: '🍽️' },
                { key: 'dinner', label: 'Dîner', icon: '🌙' },
                { key: 'snack', label: 'Collation', icon: '🍎' }
              ].map(meal => (
                <button
                  key={meal.key}
                  onClick={() => handleMealTypeToggle(meal.key as keyof typeof mealTypes)}
                  className={`p-3 rounded-lg border-2 transition-all text-center ${
                    mealTypes[meal.key as keyof typeof mealTypes]
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{meal.icon}</div>
                  <div className="text-sm font-medium">{meal.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Source des recettes */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <ChefHat className="h-5 w-5 mr-2 text-green-600" />
              À partir de quelles recettes ?
            </h3>
            <div className="space-y-3">
              {/* Favoris */}
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="source"
                  checked={source.type === 'favorites'}
                  onChange={() => handleSourceChange({ type: 'favorites' })}
                  className="mr-3"
                />
                <Heart className="h-5 w-5 mr-3 text-red-500" />
                <div>
                  <div className="font-medium">Mes recettes favorites</div>
                  <div className="text-sm text-gray-500">Utiliser vos recettes mises en favoris</div>
                </div>
              </label>

              {/* Liste personnalisée */}
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="source"
                  checked={source.type === 'list'}
                  onChange={() => handleSourceChange({ type: 'list', listId: userLists[0]?.id })}
                  className="mr-3"
                />
                <List className="h-5 w-5 mr-3 text-blue-500" />
                <div className="flex-1">
                  <div className="font-medium">Une de mes listes</div>
                  <div className="text-sm text-gray-500">Choisir une liste personnalisée</div>
                  {source.type === 'list' && (
                    <select
                      value={source.listId || ''}
                      onChange={(e) => handleSourceChange({ 
                        type: 'list', 
                        listId: parseInt(e.target.value) 
                      })}
                      className="mt-2 block w-full px-3 py-1 border border-gray-300 rounded-md text-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="">Sélectionner une liste</option>
                      {userLists.map(list => (
                        <option key={list.id} value={list.id}>
                          {list.name} ({list.recipes?.length || 0} recettes)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </label>

              {/* Recettes populaires */}
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="source"
                  checked={source.type === 'popular'}
                  onChange={() => handleSourceChange({ type: 'popular' })}
                  className="mr-3"
                />
                <TrendingUp className="h-5 w-5 mr-3 text-orange-500" />
                <div>
                  <div className="font-medium">Recettes populaires</div>
                  <div className="text-sm text-gray-500">Les recettes les plus appréciées du site</div>
                </div>
              </label>

              {/* Recettes tendance */}
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="source"
                  checked={source.type === 'trending'}
                  onChange={() => handleSourceChange({ type: 'trending' })}
                  className="mr-3"
                />
                <Shuffle className="h-5 w-5 mr-3 text-purple-500" />
                <div>
                  <div className="font-medium">Découverte</div>
                  <div className="text-sm text-gray-500">Mélange de recettes tendance et nouvelles</div>
                </div>
              </label>
            </div>
          </div>

          {/* Section 3: Paramètres avancés */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Settings className="h-5 w-5 mr-2 text-gray-600" />
              Paramètres de génération
            </h3>
            <div className="space-y-4">
              {/* Éviter la répétition */}
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.avoidRepetition}
                  onChange={(e) => setSettings(prev => ({ ...prev, avoidRepetition: e.target.checked }))}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium">Éviter les répétitions</div>
                  <div className="text-sm text-gray-500">Ne pas proposer la même recette plusieurs fois dans la semaine</div>
                </div>
              </label>

              {/* Diversifier les catégories */}
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.diversifyCategories}
                  onChange={(e) => setSettings(prev => ({ ...prev, diversifyCategories: e.target.checked }))}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium">Diversifier les catégories</div>
                  <div className="text-sm text-gray-500">Varier les types de plats (asiatique, italien, français...)</div>
                </div>
              </label>

              {/* Limite par jour */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum de recettes par jour
                </label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.maxRecipesPerDay}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    maxRecipesPerDay: parseInt(e.target.value) || 3 
                  }))}
                  className="w-20"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Recommandé: 2-4 recettes par jour
                </p>
              </div>
            </div>
          </div>

          {/* Info sur l'algorithme */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <Info className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 mb-2">Comment fonctionne la génération ?</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Les recettes sont sélectionnées selon les catégories (petit-déjeuner, plat principal, etc.)</li>
                  <li>• L'algorithme évite les répétitions et diversifie les choix selon vos paramètres</li>
                  <li>• Vous pourrez modifier individuellement chaque suggestion après génération</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button 
            onClick={handleGenerate}
            disabled={isLoading || !Object.values(mealTypes).some(Boolean)}
            className="flex items-center"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Génération...
              </>
            ) : (
              <>
                <Shuffle className="h-4 w-4 mr-2" />
                Générer le planning
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};