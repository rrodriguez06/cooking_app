import React from 'react';

/**
 * Utilitaires pour la gestion des images
 */

/**
 * Construit l'URL complète d'une image à partir d'une URL relative
 * @param imageUrl - URL relative de l'image (ex: "/uploads/images/filename.jpg")
 * @returns URL complète de l'image ou chaîne vide si l'URL est vide
 */
export const getFullImageUrl = (imageUrl?: string): string => {
  if (!imageUrl) {
    return '';
  }
  
  // Si c'est déjà une URL complète, la retourner telle quelle
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // Si c'est une URL relative, construire l'URL complète
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
  
  // Extraire l'URL de base (sans /api/v1) pour construire l'URL complète avec /api/v1/
  const baseUrl = apiUrl.replace(/\/api\/v1$/, '');
  
  // S'assurer que l'URL commence par "/"
  const cleanUrl = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  
  // Construire l'URL avec /api/v1/
  return `${baseUrl}/api/v1${cleanUrl}`;
};

/**
 * Composant Image avec gestion automatique des URLs
 */
interface RecipeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  imageUrl?: string;
  alt: string;
  fallback?: string; // URL d'image de fallback
}

export const RecipeImage: React.FC<RecipeImageProps> = ({ 
  imageUrl, 
  alt, 
  fallback = '/placeholder-recipe.jpg',
  ...props 
}) => {
  const fullImageUrl = getFullImageUrl(imageUrl);
  
  return (
    <img
      {...props}
      src={fullImageUrl || fallback}
      alt={alt}
      onError={(e) => {
        if (fallback && e.currentTarget.src !== fallback) {
          e.currentTarget.src = fallback;
        }
      }}
    />
  );
};
