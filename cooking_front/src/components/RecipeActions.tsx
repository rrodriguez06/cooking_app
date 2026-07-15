import React, { useState } from 'react';
import { Heart, BookmarkPlus, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from './ui';
import { toast } from './ui/sonner';
import { favoriteService, recipeListService } from '../services';
import { useAuth } from '../context';
import { QuickCreateListModal } from './QuickCreateListModal';
import { cn } from '../utils';

interface RecipeActionsProps {
  recipeId: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
}

export const RecipeActions: React.FC<RecipeActionsProps> = ({ recipeId, className = '', size = 'md', showLabels = true }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showListMenu, setShowListMenu] = useState(false);
  const [showCreateListModal, setShowCreateListModal] = useState(false);

  // Statut favori : mis en cache par recette (évite un refetch en revenant sur la page).
  const { data: favoriteData } = useQuery({
    queryKey: ['favorite', recipeId],
    queryFn: () => favoriteService.getFavoriteStatus(recipeId),
    enabled: !!user,
  });
  const isFavorite = favoriteData?.is_favorite ?? false;

  // Listes de l'utilisateur : clé partagée → une seule requête pour toutes les cartes (corrige PERF-1).
  const { data: listsData } = useQuery({
    queryKey: ['userRecipeLists'],
    queryFn: () => recipeListService.getUserRecipeLists(),
    enabled: !!user,
  });
  const userLists = listsData?.success ? listsData.data.lists : [];

  const toggleFavorite = useMutation({
    mutationFn: () => favoriteService.toggleFavorite(recipeId),
    onSuccess: (response) => queryClient.setQueryData(['favorite', recipeId], { is_favorite: response.is_favorite }),
    onError: () => toast.error('Impossible de mettre à jour les favoris.'),
  });

  const addToList = useMutation({
    mutationFn: (listId: number) => recipeListService.addRecipeToList(listId, { recipe_id: recipeId, notes: '', position: 0 }),
    onSuccess: () => {
      setShowListMenu(false);
      toast.success('Recette ajoutée à la liste.');
    },
    onError: () => toast.error("Erreur lors de l'ajout à la liste."),
  });

  const handleListCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['userRecipeLists'] });
    setShowListMenu(false);
  };

  if (!user) return null;

  const busy = toggleFavorite.isPending || addToList.isPending;
  const buttonSize = size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md';
  const iconSize = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Favori */}
      <Button
        variant="outline"
        size={buttonSize}
        onClick={() => toggleFavorite.mutate()}
        disabled={busy}
        aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        aria-pressed={isFavorite}
        className={cn(
          'gap-2',
          isFavorite ? 'border-destructive bg-destructive/10 text-destructive hover:bg-destructive/15' : 'hover:border-destructive hover:text-destructive',
        )}
      >
        <Heart className={cn(iconSize, isFavorite && 'fill-current')} />
        {showLabels && <span>{isFavorite ? 'Favori' : 'Ajouter aux favoris'}</span>}
      </Button>

      {/* Ajouter à une liste */}
      <div className="relative">
        <Button
          variant="outline"
          size={buttonSize}
          onClick={() => setShowListMenu((s) => !s)}
          disabled={busy}
          aria-label="Ajouter à une liste"
          aria-haspopup="menu"
          aria-expanded={showListMenu}
          className="gap-2 hover:border-primary hover:text-primary"
        >
          <BookmarkPlus className={iconSize} />
          {showLabels && <span>Ajouter à une liste</span>}
        </Button>

        {showListMenu && (
          <div className="absolute left-0 top-full z-50 mt-1 min-w-48 rounded-lg border border-border bg-card shadow-soft-lg">
            <div className="border-b border-border p-2">
              <p className="text-sm font-medium text-foreground">Ajouter à une liste</p>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {userLists.length === 0 ? (
                <div className="p-3 text-center text-sm text-muted-foreground">Aucune liste créée</div>
              ) : (
                userLists.map((list) => (
                  <button
                    key={list.id}
                    onClick={() => addToList.mutate(list.id)}
                    disabled={busy}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <BookmarkPlus className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{list.name}</div>
                      {list.description && <div className="truncate text-xs text-muted-foreground">{list.description}</div>}
                    </div>
                  </button>
                ))
              )}
            </div>
            <div className="border-t border-border p-2">
              <button
                onClick={() => {
                  setShowListMenu(false);
                  setShowCreateListModal(true);
                }}
                className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm text-primary hover:bg-primary/10"
              >
                <Plus className="h-4 w-4" />
                Créer une nouvelle liste
              </button>
            </div>
          </div>
        )}
      </div>

      {showListMenu && <div className="fixed inset-0 z-40" onClick={() => setShowListMenu(false)} />}

      <QuickCreateListModal
        isOpen={showCreateListModal}
        onClose={() => setShowCreateListModal(false)}
        onListCreated={handleListCreated}
        recipeId={recipeId}
      />
    </div>
  );
};
