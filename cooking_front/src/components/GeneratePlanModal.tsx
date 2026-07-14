import React, { useState, useEffect } from 'react';
import { Clock, ChefHat, Heart, List, TrendingUp, Settings, Shuffle, Info } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { recipeListService } from '../services';
import { toast } from './ui/sonner';
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
    defaultServings: number; // Nombre de portions par défaut pour tous les repas
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
    considerDifficulty: false,
    defaultServings: 4
  });

  // États pour les données
  const [userLists, setUserLists] = useState<RecipeList[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Charger les données nécessaires
  useEffect(() => {
    if (isOpen) {
      loadData();
      setIsLoading(false); // Réinitialiser l'état de chargement à l'ouverture
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
      toast.error('Veuillez sélectionner au moins un type de repas à générer.');
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

  const weekDates = formatWeekDates(currentWeekStart);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Générer un planning</DialogTitle>
          <DialogDescription>
            Du {weekDates.start} au {weekDates.end}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Section 1: Types de repas */}
          <div>
            <h3 className="text-lg font-medium text-foreground mb-4 flex items-center">
              <Clock className="h-5 w-5 mr-2 text-primary" />
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
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-border'
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
            <h3 className="text-lg font-medium text-foreground mb-4 flex items-center">
              <ChefHat className="h-5 w-5 mr-2 text-herb-600" />
              À partir de quelles recettes ?
            </h3>
            <div className="space-y-3">
              {/* Favoris */}
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-muted">
                <input
                  type="radio"
                  name="source"
                  checked={source.type === 'favorites'}
                  onChange={() => handleSourceChange({ type: 'favorites' })}
                  className="mr-3"
                />
                <Heart className="h-5 w-5 mr-3 text-destructive" />
                <div>
                  <div className="font-medium">Mes recettes favorites</div>
                  <div className="text-sm text-muted-foreground">Utiliser vos recettes mises en favoris</div>
                </div>
              </label>

              {/* Liste personnalisée */}
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-muted">
                <input
                  type="radio"
                  name="source"
                  checked={source.type === 'list'}
                  onChange={() => handleSourceChange({ type: 'list', listId: userLists[0]?.id })}
                  className="mr-3"
                />
                <List className="h-5 w-5 mr-3 text-primary" />
                <div className="flex-1">
                  <div className="font-medium">Une de mes listes</div>
                  <div className="text-sm text-muted-foreground">Choisir une liste personnalisée</div>
                  {source.type === 'list' && (
                    <select
                      value={source.listId || ''}
                      onChange={(e) => handleSourceChange({
                        type: 'list',
                        listId: parseInt(e.target.value)
                      })}
                      className="mt-2 block w-full px-3 py-1 border border-border rounded-md text-sm"
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
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-muted">
                <input
                  type="radio"
                  name="source"
                  checked={source.type === 'popular'}
                  onChange={() => handleSourceChange({ type: 'popular' })}
                  className="mr-3"
                />
                <TrendingUp className="h-5 w-5 mr-3 text-amber-500" />
                <div>
                  <div className="font-medium">Recettes populaires</div>
                  <div className="text-sm text-muted-foreground">Les recettes les plus appréciées du site</div>
                </div>
              </label>

              {/* Recettes tendance */}
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-muted">
                <input
                  type="radio"
                  name="source"
                  checked={source.type === 'trending'}
                  onChange={() => handleSourceChange({ type: 'trending' })}
                  className="mr-3"
                />
                <Shuffle className="h-5 w-5 mr-3 text-primary" />
                <div>
                  <div className="font-medium">Découverte</div>
                  <div className="text-sm text-muted-foreground">Mélange de recettes tendance et nouvelles</div>
                </div>
              </label>
            </div>
          </div>

          {/* Section 3: Paramètres avancés */}
          <div>
            <h3 className="text-lg font-medium text-foreground mb-4 flex items-center">
              <Settings className="h-5 w-5 mr-2 text-muted-foreground" />
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
                  <div className="text-sm text-muted-foreground">Ne pas proposer la même recette plusieurs fois dans la semaine</div>
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
                  <div className="text-sm text-muted-foreground">Varier les types de plats (asiatique, italien, français...)</div>
                </div>
              </label>

              {/* Limite par jour */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
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
                <p className="text-xs text-muted-foreground mt-1">
                  Recommandé: 2-4 recettes par jour
                </p>
              </div>

              {/* Nombre de portions */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Nombre de portions par repas
                </label>
                <Input
                  type="number"
                  min="1"
                  max="12"
                  value={settings.defaultServings}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    defaultServings: parseInt(e.target.value) || 4
                  }))}
                  className="w-20"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Nombre de personnes pour chaque repas généré
                </p>
              </div>
            </div>
          </div>

          {/* Info sur l'algorithme */}
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
            <div className="flex items-start">
              <Info className="h-5 w-5 text-primary mr-3 mt-0.5" />
              <div>
                <h4 className="font-medium text-primary mb-2">Comment fonctionne la génération ?</h4>
                <ul className="text-sm text-primary space-y-1">
                  <li>• Les recettes sont sélectionnées selon les catégories (petit-déjeuner, plat principal, etc.)</li>
                  <li>• L'algorithme évite les répétitions et diversifie les choix selon vos paramètres</li>
                  <li>• Vous pourrez modifier individuellement chaque suggestion après génération</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border">
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
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
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
      </DialogContent>
    </Dialog>
  );
};
