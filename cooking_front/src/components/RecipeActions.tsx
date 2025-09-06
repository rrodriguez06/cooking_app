import React, { useState, useEffect } from 'react';
import { Heart, BookmarkPlus, Plus } from 'lucide-react';
import { Button } from './ui';
import { favoriteService, recipeListService } from '../services';
import { useAuth } from '../context';
import { QuickCreateListModal } from './QuickCreateListModal';
import type { RecipeList } from '../types';

interface RecipeActionsProps {
  recipeId: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
}

export const RecipeActions: React.FC<RecipeActionsProps> = ({ 
  recipeId, 
  className = '', 
  size = 'md',
  showLabels = true 
}) => {
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userLists, setUserLists] = useState<RecipeList[]>([]);
  const [showListMenu, setShowListMenu] = useState(false);
  const [showCreateListModal, setShowCreateListModal] = useState(false);

  useEffect(() => {
    if (user) {
      loadFavoriteStatus();
      loadUserLists();
    }
  }, [user, recipeId]);

  const loadFavoriteStatus = async () => {
    if (!user) return;
    
    try {
      const response = await favoriteService.getFavoriteStatus(recipeId);
      setIsFavorite(response.is_favorite);
    } catch (error) {
      console.error('Erreur lors du chargement du statut favori:', error);
    }
  };

  const loadUserLists = async () => {
    if (!user) return;
    
    try {
      const response = await recipeListService.getUserRecipeLists();
      if (response.success) {
        setUserLists(response.data.lists);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des listes:', error);
    }
  };

  const handleToggleFavorite = async () => {
    if (!user || isLoading) return;
    
    setIsLoading(true);
    try {
      const response = await favoriteService.toggleFavorite(recipeId);
      setIsFavorite(response.is_favorite);
    } catch (error) {
      console.error('Erreur lors du toggle favori:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToList = async (listId: number) => {
    if (!user || isLoading) return;
    
    setIsLoading(true);
    try {
      await recipeListService.addRecipeToList(listId, {
        recipe_id: recipeId,
        notes: '',
        position: 0
      });
      setShowListMenu(false);
      // Optionnel: Afficher une notification de succès
    } catch (error) {
      console.error('Erreur lors de l\'ajout à la liste:', error);
      // Optionnel: Afficher une notification d'erreur
    } finally {
      setIsLoading(false);
    }
  };

  const handleListCreated = (_listId: number) => {
    // Rafraîchir la liste des listes utilisateur
    loadUserLists();
    setShowListMenu(false);
  };

  if (!user) {
    return null; // N'afficher les actions que pour les utilisateurs connectés
  }

  const buttonSize = size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md';
  const iconSize = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Bouton Favori */}
      <Button
        variant="secondary"
        size={buttonSize}
        onClick={handleToggleFavorite}
        disabled={isLoading}
        className={`flex items-center gap-2 ${
          isFavorite 
            ? 'text-red-600 border-red-600 bg-red-50 hover:bg-red-100' 
            : 'hover:text-red-600 hover:border-red-600 hover:bg-red-50'
        }`}
      >
        <Heart 
          className={`${iconSize} ${isFavorite ? 'fill-current' : ''}`} 
        />
        {showLabels && (
          <span>{isFavorite ? 'Favori' : 'Ajouter aux favoris'}</span>
        )}
      </Button>

      {/* Bouton Ajouter à une liste */}
      <div className="relative">
        <Button
          variant="secondary"
          size={buttonSize}
          onClick={() => setShowListMenu(!showListMenu)}
          disabled={isLoading}
          className="flex items-center gap-2 hover:text-blue-600 hover:border-blue-600"
        >
          <BookmarkPlus className={iconSize} />
          {showLabels && <span>Ajouter à une liste</span>}
        </Button>

        {/* Menu déroulant des listes */}
        {showListMenu && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-48">
            <div className="p-2 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-700">Ajouter à une liste</p>
            </div>
            
            <div className="max-h-60 overflow-y-auto">
              {userLists.length === 0 ? (
                <div className="p-3 text-sm text-gray-500 text-center">
                  Aucune liste créée
                </div>
              ) : (
                userLists.map((list) => (
                  <button
                    key={list.id}
                    onClick={() => handleAddToList(list.id)}
                    disabled={isLoading}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <BookmarkPlus className="h-4 w-4 text-gray-400" />
                    <div>
                      <div className="font-medium">{list.name}</div>
                      {list.description && (
                        <div className="text-xs text-gray-500 truncate">{list.description}</div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
            
            <div className="p-2 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowListMenu(false);
                  setShowCreateListModal(true);
                }}
                className="w-full px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Créer une nouvelle liste
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Overlay pour fermer le menu */}
      {showListMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowListMenu(false)}
        />
      )}

      {/* Modal de création rapide de liste */}
      <QuickCreateListModal
        isOpen={showCreateListModal}
        onClose={() => setShowCreateListModal(false)}
        onListCreated={handleListCreated}
        recipeId={recipeId}
      />
    </div>
  );
};
