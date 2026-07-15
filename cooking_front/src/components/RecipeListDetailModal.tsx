import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Clock, Users, Eye, Trash2, ChefHat } from 'lucide-react';
import { Button, Card, CardContent } from './ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { useConfirm } from './ConfirmDialog';
import { toast } from './ui/sonner';
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
  const confirm = useConfirm();
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
      console.log('DEBUG: fetchListRecipes - list:', list);

      // Si la liste a déjà ses recettes, les utiliser
      if (list.items && list.items.length > 0) {
        console.log('DEBUG: Using existing items from list:', list.items);
        const listRecipes = list.items.map(item => item.recipe).filter(Boolean);
        console.log('DEBUG: Extracted recipes from items:', listRecipes);
        setRecipes(listRecipes as Recipe[]);
      } else {
        // Sinon, récupérer les détails de la liste depuis l'API
        console.log('DEBUG: Fetching list details from API for list ID:', list.id);
        const response = await recipeListService.getRecipeList(list.id);
        console.log('DEBUG: API response:', response);

        if (response.success && response.data.items) {
          console.log('DEBUG: Items from API:', response.data.items);
          const listRecipes = response.data.items.map(item => item.recipe).filter(Boolean);
          console.log('DEBUG: Extracted recipes from API items:', listRecipes);
          setRecipes(listRecipes as Recipe[]);
        } else {
          console.log('DEBUG: No items found in API response');
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

    const ok = await confirm({
      title: 'Retirer la recette',
      description: `Êtes-vous sûr de vouloir retirer « ${recipeTitle} » de cette liste ?`,
      confirmLabel: 'Retirer',
      destructive: true,
    });
    if (!ok) return;

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
        toast.error('Erreur lors de la suppression de la recette de la liste');
      }
    } catch (error) {
      console.error('Error removing recipe from list:', error);
      toast.error('Erreur lors de la suppression de la recette de la liste');
    } finally {
      setRemovingRecipeId(null);
    }
  };

  if (!list) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{list.name}</DialogTitle>
          {list.description && (
            <DialogDescription>{list.description}</DialogDescription>
          )}
          <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
            <span>{recipes.length} recette{recipes.length !== 1 ? 's' : ''}</span>
            <span className={`px-2 py-1 rounded-full text-xs ${
              list.is_public
                ? 'bg-herb-100 text-herb-700 dark:bg-herb-500/15 dark:text-herb-300'
                : 'bg-muted text-muted-foreground'
            }`}>
              {list.is_public ? 'Publique' : 'Privée'}
            </span>
          </div>
        </DialogHeader>

        {/* Content */}
        <div>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Chargement des recettes...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-destructive">{error}</p>
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
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                Aucune recette dans cette liste
              </h3>
              <p className="text-muted-foreground mb-4">
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
                        className="w-full h-32 bg-muted rounded-md flex items-center justify-center"
                        style={{ display: recipe.image_url ? 'none' : 'flex' }}
                      >
                        <ChefHat className="h-8 w-8 text-muted-foreground" />
                      </div>
                    </div>

                    {/* Recipe Info */}
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                      {recipe.title}
                    </h3>

                    {recipe.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {recipe.description}
                      </p>
                    )}

                    {/* Recipe Meta */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
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
                        <span className="text-muted-foreground">
                          Par {recipe.author?.username || 'Anonyme'}
                        </span>
                        <span className="text-muted-foreground">
                          {formatDate(recipe.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 pt-3 border-t border-border">
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
                            className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveRecipe(recipe.id, recipe.title);
                            }}
                            disabled={removingRecipeId === recipe.id}
                            title="Retirer de la liste"
                          >
                            {removingRecipeId === recipe.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-destructive"></div>
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
      </DialogContent>
    </Dialog>
  );
};
