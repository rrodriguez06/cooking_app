import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { favoriteService } from '../services';
import { useAuth } from '../context';

interface FavoriteButtonProps {
  recipeId: number;
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  recipeId,
  className = '',
  showText = false,
  size = 'md'
}) => {
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Tailles pour l'icône
  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  // Classes de base pour le bouton
  const baseClasses = `
    inline-flex items-center justify-center rounded-full transition-all duration-200
    ${size === 'sm' ? 'p-1' : size === 'md' ? 'p-2' : 'p-3'}
    ${isFavorite 
      ? 'text-red-600 bg-red-50 hover:bg-red-100' 
      : 'text-gray-400 bg-gray-50 hover:bg-gray-100 hover:text-red-500'
    }
    ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    ${className}
  `;

  // Charger le statut favori au montage du composant
  useEffect(() => {
    const loadFavoriteStatus = async () => {
      if (!user) return;
      
      try {
        const response = await favoriteService.getFavoriteStatus(recipeId);
        setIsFavorite(response.is_favorite);
      } catch (error) {
        console.error('Error loading favorite status:', error);
      }
    };

    loadFavoriteStatus();
  }, [recipeId, user]);

  const handleToggleFavorite = async () => {
    if (!user || isLoading) return;

    setIsLoading(true);
    try {
      const response = await favoriteService.toggleFavorite(recipeId);
      setIsFavorite(response.is_favorite);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Optionnel: afficher une notification d'erreur
    } finally {
      setIsLoading(false);
    }
  };

  // Ne pas afficher le bouton si l'utilisateur n'est pas connecté
  if (!user) {
    return null;
  }

  return (
    <button
      onClick={handleToggleFavorite}
      disabled={isLoading}
      className={baseClasses}
      title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
    >
      <Heart 
        className={`${iconSizes[size]} ${isFavorite ? 'fill-current' : ''}`}
      />
      {showText && (
        <span className={`${size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'} ml-1`}>
          {isFavorite ? 'Favoris' : 'Favori'}
        </span>
      )}
    </button>
  );
};
