import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Refrigerator, Search, Calendar, Trash2, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { PlanRecipeModal } from '../components';
import { toast } from '../components/ui/sonner';
import { fridgeService, recipeService } from '../services';
import AddFridgeItemModal from '../components/AddFridgeItemModal';
import type { Recipe } from '../types';
import type { 
  FridgeItem, 
  RecipeSuggestion, 
  FridgeStats,
  RecipeSearchByIngredientsRequest,
  FridgeItemCreateRequest 
} from '../types';

const FridgePage: React.FC = () => {
  // États principaux
  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>([]);
  const [recipeSuggestions, setRecipeSuggestions] = useState<RecipeSuggestion[]>([]);
  const [stats, setStats] = useState<FridgeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // États pour la modal d'ajout
  const [showAddModal, setShowAddModal] = useState(false);

  // Navigation + planification depuis une suggestion (NAV-3)
  const navigate = useNavigate();
  const [plannedRecipe, setPlannedRecipe] = useState<Recipe | null>(null);

  const handlePlanSuggestion = async (recipeId: number) => {
    try {
      const res = await recipeService.getRecipe(recipeId);
      if (res.success && res.data) setPlannedRecipe(res.data);
      else toast.error('Impossible de charger la recette.');
    } catch {
      toast.error('Impossible de charger la recette.');
    }
  };

  // États pour les filtres et recherche
  const [searchTerm, setSearchTerm] = useState('');
  const [filterExpiring, setFilterExpiring] = useState(false);
  const [suggestionParams, setSuggestionParams] = useState<Partial<RecipeSearchByIngredientsRequest>>({
    match_type: 'any',
    max_missing_ingredients: 3,
    exclude_categories: ['Ingrédient'],
    limit: 20
  });

  // Charger les données initiales
  useEffect(() => {
    loadFridgeData();
  }, []);

  // Recharger les suggestions quand les items du frigo changent
  useEffect(() => {
    if (fridgeItems.length > 0) {
      loadRecipeSuggestions();
    }
  }, [fridgeItems, suggestionParams]);

  const loadFridgeData = async () => {
    setLoading(true);
    try {
      const [itemsData, statsData] = await Promise.all([
        fridgeService.getFridgeItems(),
        fridgeService.getFridgeStats()
      ]);

      setFridgeItems(itemsData);
      setStats(statsData);
    } catch (error) {
      console.error('Erreur lors du chargement des données du frigo:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecipeSuggestions = async () => {
    setSuggestionsLoading(true);
    try {
      const suggestions = await fridgeService.getRecipeSuggestions(suggestionParams);
      setRecipeSuggestions(suggestions);
    } catch (error) {
      console.error('Erreur lors du chargement des suggestions:', error);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const handleDeleteItem = async (id: number) => {
    try {
      await fridgeService.deleteFridgeItem(id);
      setFridgeItems(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    }
  };

  const handleRemoveExpired = async () => {
    try {
      await fridgeService.removeExpiredItems();
      await loadFridgeData(); // Recharger toutes les données
    } catch (error) {
      console.error('Erreur lors de la suppression des items expirés:', error);
    }
  };

  const handleAddFridgeItem = async (item: FridgeItemCreateRequest) => {
    try {
      await fridgeService.addFridgeItem(item);
      await loadFridgeData(); // Recharger les données
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'item:', error);
      throw error; // Rethrow pour que le modal puisse gérer l'erreur
    }
  };

  // Filtrer les items selon la recherche et les filtres
  const filteredItems = fridgeItems.filter(item => {
    const matchesSearch = item.ingredient.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterExpiring) {
      const expiryDate = item.expiry_date ? new Date(item.expiry_date) : null;
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      
      const isExpiring = expiryDate && expiryDate <= threeDaysFromNow;
      return matchesSearch && isExpiring;
    }
    
    return matchesSearch;
  });

  const getExpiryStatus = (expiryDate?: string) => {
    if (!expiryDate) return null;
    
    const expiry = new Date(expiryDate);
    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);
    
    if (expiry < now) {
      return { status: 'expired', label: 'Expiré', color: 'bg-destructive/15 text-destructive' };
    } else if (expiry <= threeDaysFromNow) {
      return { status: 'expiring', label: 'Expire bientôt', color: 'bg-amber-100 text-amber-700' };
    }
    
    return { status: 'fresh', label: 'Frais', color: 'bg-herb-100 text-herb-700' };
  };

  if (loading) {
    return (
      <>
        <div className="flex h-64 items-center justify-center">
          <div className="text-lg text-muted-foreground">Chargement de votre frigo...</div>
        </div>
      </>
    );
  }

  return (
    <>
    <div className="space-y-6">
      {/* En-tête avec statistiques */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <Refrigerator className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold font-display text-foreground">Mon Frigo</h1>
            <p className="text-muted-foreground">Gérez vos ingrédients et découvrez des recettes</p>
          </div>
        </div>
        
        {stats && (
          <div className="flex gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.total_items}</div>
              <div className="text-sm text-muted-foreground">Ingrédients</div>
            </div>
            {stats.expiring_soon > 0 && (
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">{stats.expiring_soon}</div>
                <div className="text-sm text-muted-foreground">À consommer</div>
              </div>
            )}
            {stats.expired > 0 && (
              <div className="text-center">
                <div className="text-2xl font-bold text-destructive">{stats.expired}</div>
                <div className="text-sm text-muted-foreground">Expirés</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions principales */}
      <div className="flex flex-wrap gap-3">
        <Button className="flex items-center gap-2" onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4" />
          Ajouter un ingrédient
        </Button>
        
        {stats && stats.expired > 0 && (
          <Button 
            variant="secondary" 
            className="flex items-center gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={handleRemoveExpired}
          >
            <Trash2 className="h-4 w-4" />
            Supprimer les expirés ({stats.expired})
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section des ingrédients du frigo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Refrigerator className="h-5 w-5" />
              Mes ingrédients ({filteredItems.length})
            </CardTitle>
            
            {/* Filtres et recherche */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Rechercher un ingrédient..."
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setFilterExpiring(!filterExpiring)}
                  className={filterExpiring ? 'bg-amber-50 border-amber-200' : ''}
                >
                  <Clock className="h-4 w-4" />
                  {filterExpiring ? 'Tous' : 'Expiration'}
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {filteredItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {fridgeItems.length === 0 ? (
                  <>
                    <Refrigerator className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p>Votre frigo est vide</p>
                    <p className="text-sm">Ajoutez des ingrédients pour voir des suggestions de recettes !</p>
                  </>
                ) : (
                  <p>Aucun ingrédient ne correspond aux filtres</p>
                )}
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredItems.map(item => {
                  const expiryStatus = getExpiryStatus(item.expiry_date);
                  return (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.ingredient.name}</span>
                          {item.quantity && (
                            <span className="text-sm text-muted-foreground">
                              {item.quantity} {item.unit || ''}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 mt-1">
                          {expiryStatus && (
                            <Badge className={`text-xs ${expiryStatus.color}`}>
                              {expiryStatus.status === 'expired' && <AlertTriangle className="h-3 w-3 mr-1" />}
                              {expiryStatus.label}
                            </Badge>
                          )}
                          {item.notes && (
                            <span className="text-xs text-muted-foreground">{item.notes}</span>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section des suggestions de recettes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Suggestions de recettes
            </CardTitle>
            
            {/* Paramètres de suggestion */}
            <div className="flex gap-2">
              <Select 
                value={suggestionParams.match_type} 
                onValueChange={(value: string) => 
                  setSuggestionParams(prev => ({ ...prev, match_type: value as 'any' | 'all' }))
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Au moins un</SelectItem>
                  <SelectItem value="all">Tous les ingrédients</SelectItem>
                </SelectContent>
              </Select>
              
              <Select 
                value={suggestionParams.max_missing_ingredients?.toString() || '3'} 
                onValueChange={(value: string) => 
                  setSuggestionParams(prev => ({ ...prev, max_missing_ingredients: parseInt(value) }))
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0 manquant</SelectItem>
                  <SelectItem value="1">1 manquant</SelectItem>
                  <SelectItem value="3">3 manquants</SelectItem>
                  <SelectItem value="5">5 manquants</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          
          <CardContent>
            {suggestionsLoading ? (
              <div className="text-center py-8">
                <div className="text-sm text-muted-foreground">Recherche de recettes...</div>
              </div>
            ) : recipeSuggestions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p>Aucune suggestion trouvée</p>
                <p className="text-sm">Ajoutez plus d'ingrédients ou modifiez les filtres</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {recipeSuggestions.map(suggestion => (
                  <div key={suggestion.recipe.id} className="p-3 border rounded-lg hover:bg-muted">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium">{suggestion.recipe.title}</h3>
                        {suggestion.recipe.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {suggestion.recipe.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={`text-xs ${
                            suggestion.canCook
                              ? 'bg-herb-100 text-herb-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {suggestion.matchPercentage}% compatible
                          </Badge>
                          
                          <span className="text-xs text-muted-foreground">
                            {suggestion.matchingIngredients}/{suggestion.totalIngredients} ingrédients
                          </span>
                          
                          {suggestion.missingIngredients.length > 0 && (
                            <span className="text-xs text-amber-600">
                              {suggestion.missingIngredients.length} manquant(s)
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-1 ml-3">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate(`/recipe/${suggestion.recipe.id}`)}
                        >
                          Voir
                        </Button>
                        <Button
                          size="sm"
                          className="flex items-center gap-1"
                          onClick={() => handlePlanSuggestion(suggestion.recipe.id)}
                        >
                          <Calendar className="h-3 w-3" />
                          Planifier
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal d'ajout d'ingrédient */}
      <AddFridgeItemModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddFridgeItem}
      />

      {/* Planifier une recette suggérée */}
      {plannedRecipe && (
        <PlanRecipeModal
          isOpen={!!plannedRecipe}
          recipe={plannedRecipe}
          onClose={() => setPlannedRecipe(null)}
          onSuccess={() => {
            toast.success('Recette ajoutée au planning.');
            setPlannedRecipe(null);
          }}
        />
      )}
    </div>
    </>
  );
};

export { FridgePage };