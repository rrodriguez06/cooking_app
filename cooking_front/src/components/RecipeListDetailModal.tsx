import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Heart, Clock, Users, Eye, Trash2, ChefHat } from 'lucide-react';
import { Button, Card, CardContent } from './ui';
import { recipeListService } from '../services';
import { formatDate, getFullImageUrl } from '../utils';
import type { RecipeList, Recipe } from '../types';

interface RecipeListDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  list: RecipeList | null;
  canEdit?: boolean; // Nouvelle prop pour indiquer si l'utilisateur peut modifier la liste
  onRecipeRemoved?: (listId: number, recipeId: number) => void; // Callback quand une recette est supprimée
}

export const RecipeListDetailModal: React.FC<RecipeListDetailModalProps> = ({
  isOpen,
  onClose,
  list,
  canEdit = false,
  onRecipeRemoved,
}) => {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingRecipeId, setRemovingRecipeId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && list) {
      fetchListRecipes();
    }
  }, [isOpen, list]);

  const fetchListRecipes = async () => {
    if (!list) return;

    setIsLoading(true);
    setError(null);
    
    try {
      // Si la liste a déjà ses recettes, les utiliser
      if (list.items && list.items.length > 0) {
        const listRecipes = list.items.map(item => item.recipe).filter(Boolean);
        setRecipes(listRecipes as Recipe[]);
      } else {
        // Sinon, récupérer les détails de la liste depuis l'API
        const response = await recipeListService.getRecipeList(list.id);
        if (response.success && response.data.items) {
          const listRecipes = response.data.items.map(item => item.recipe).filter(Boolean);
          setRecipes(listRecipes as Recipe[]);
        } else {
          setRecipes([]);
        }
      }
    } catch (err) {
      console.error('Error fetching list recipes:', err);
      setError('Erreur lors du chargement des recettes');
      setRecipes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecipeClick = (recipeId: number) => {
    navigate(`/recipe/${recipeId}`);
  };

  const handleRemoveRecipe = async (recipeId: number, recipeTitle: string) => {
    if (!list || !canEdit) return;

    if (!window.confirm(`Êtes-vous sûr de vouloir retirer "${recipeTitle}" de cette liste ?`)) {
      return;
    }

    setRemovingRecipeId(recipeId);
    try {
      const response = await recipeListService.removeRecipeFromList(list.id, recipeId);
      if (response.success) {
        // Mettre à jour la liste locale en retirant la recette
        setRecipes(prev => prev.filter(recipe => recipe.id !== recipeId));
        
        // Notifier le parent que la recette a été supprimée
        if (onRecipeRemoved) {
          onRecipeRemoved(list.id, recipeId);
        }
      } else {
        console.error('Error removing recipe from list:', response);
        alert('Erreur lors de la suppression de la recette de la liste');
      }
    } catch (error) {
      console.error('Error removing recipe from list:', error);
      alert('Erreur lors de la suppression de la recette de la liste');
    } finally {
      setRemovingRecipeId(null);
    }
  };

  if (!isOpen || !list) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{list.name}</h2>
            {list.description && (
              <p className="text-gray-600 mt-1">{list.description}</p>
            )}
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
              <span>{recipes.length} recette{recipes.length !== 1 ? 's' : ''}</span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                list.is_public 
                  ? 'bg-green-100 text-green-600' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {list.is_public ? 'Publique' : 'Privée'}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="flex-shrink-0"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Chargement des recettes...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600">{error}</p>
              <Button
                variant="ghost"
                onClick={fetchListRecipes}
                className="mt-2"
              >
                Réessayer
              </Button>
            </div>
          ) : recipes.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucune recette dans cette liste
              </h3>
              <p className="text-gray-500 mb-4">
                Commencez à ajouter des recettes à votre liste en naviguant sur le site et en utilisant le bouton "Ajouter à une liste".
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recipes.map((recipe) => (
                <Card
                  key={recipe.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleRecipeClick(recipe.id)}
                >
                  <CardContent className="p-4">
                    {/* Recipe Image */}
                    <div className="mb-3">
                      {recipe.image_url ? (
                        <img
                          src={getFullImageUrl(recipe.image_url)}
                          alt={recipe.title}
                          className="w-full h-32 object-cover rounded-md"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling as HTMLElement;
                            if (fallback) {
                              fallback.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <div 
                        className="w-full h-32 bg-gray-200 rounded-md flex items-center justify-center"
                        style={{ display: recipe.image_url ? 'none' : 'flex' }}
                      >
                        <ChefHat className="h-8 w-8 text-gray-400" />
                      </div>
                    </div>

                    {/* Recipe Info */}
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                      {recipe.title}
                    </h3>
                    
                    {recipe.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {recipe.description}
                      </p>
                    )}

                    {/* Recipe Meta */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{recipe.prep_time + recipe.cook_time} min</span>
                        </div>
                        {recipe.servings && (
                          <div className="flex items-center space-x-1">
                            <Users className="h-4 w-4" />
                            <span>{recipe.servings} pers.</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">
                          Par {recipe.author?.username || 'Anonyme'}
                        </span>
                        <span className="text-gray-400">
                          {formatDate(recipe.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRecipeClick(recipe.id);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Voir la recette
                        </Button>
                        
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveRecipe(recipe.id, recipe.title);
                            }}
                            disabled={removingRecipeId === recipe.id}
                            title="Retirer de la liste"
                          >
                            {removingRecipeId === recipe.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
