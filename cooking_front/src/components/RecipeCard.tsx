import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Users, ChefHat, Star, StarHalf } from 'lucide-react';
import { Card, CardContent } from './ui';
import { RecipeActions } from './RecipeActions';
import { UserLink } from './UserLink';
import { formatRelativeTime, formatTime } from '../utils';
import { getFullImageUrl } from '../utils/imageUtils';
import type { Recipe } from '../types';

interface RecipeCardProps {
  recipe: Recipe;
  showAuthor?: boolean;
  className?: string;
  /** Aperçu non interactif (pas de lien ni d'actions) — utilisé dans l'éditeur de recette. */
  preview?: boolean;
}

const difficultyMeta: Record<Recipe['difficulty'], { label: string; className: string }> = {
  easy: { label: 'Facile', className: 'bg-herb-100 text-herb-700 dark:bg-herb-500/15 dark:text-herb-300' },
  medium: { label: 'Moyen', className: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300' },
  hard: { label: 'Difficile', className: 'bg-destructive/10 text-destructive' },
};

/** Étoiles de notation avec demi-crans. */
export const RatingStars: React.FC<{ rating?: number; className?: string }> = ({ rating = 0, className }) => (
  <div className={className} aria-hidden="true">
    <div className="flex items-center">
      {[1, 2, 3, 4, 5].map((i) => {
        if (rating >= i) return <Star key={i} className="h-4 w-4 text-amber-400 fill-current" />;
        if (rating >= i - 0.5) return <StarHalf key={i} className="h-4 w-4 text-amber-400 fill-current" />;
        return <Star key={i} className="h-4 w-4 text-muted-foreground/40" />;
      })}
    </div>
  </div>
);

/** Carte recette partagée (accueil, recherche, profils, aperçu formulaire). */
export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, showAuthor = true, className, preview = false }) => {
  const [imgError, setImgError] = useState(false);
  const showImage = recipe.image_url && !imgError;
  const difficulty = difficultyMeta[recipe.difficulty] ?? difficultyMeta.medium;
  const hasRating = recipe.average_rating && recipe.average_rating > 0;

  const Wrapper = preview ? 'div' : Link;
  const wrapperProps = preview ? { className: 'group block' } : { to: `/recipe/${recipe.id}`, className: 'group block' };

  return (
    <Card interactive={!preview} className={className}>
      <Wrapper {...(wrapperProps as { to: string; className: string })}>
        <div className="relative h-48 w-full overflow-hidden rounded-t-2xl bg-muted">
          {showImage ? (
            <img
              src={getFullImageUrl(recipe.image_url)}
              alt={recipe.title}
              loading="lazy"
              onError={() => setImgError(true)}
              className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-48 w-full items-center justify-center bg-gradient-to-br from-muted to-secondary">
              <ChefHat className="h-12 w-12 text-muted-foreground/50" />
            </div>
          )}
          <span
            className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-xs font-medium shadow-sm ${difficulty.className}`}
          >
            {difficulty.label}
          </span>
        </div>

        <CardContent className="p-4 pb-2">
          <h3 className="mb-2 line-clamp-2 text-lg font-semibold text-foreground transition-colors group-hover:text-primary">
            {recipe.title}
          </h3>

          {recipe.description && (
            <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{recipe.description}</p>
          )}

          <div className="mb-3 flex items-center gap-2">
            <RatingStars rating={recipe.average_rating} />
            <span className="text-sm text-muted-foreground">
              {hasRating ? `${recipe.average_rating.toFixed(1)} (${recipe.rating_count || 0})` : 'Aucune note'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatTime(recipe.total_time)}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {recipe.servings} portions
            </span>
          </div>
        </CardContent>
      </Wrapper>

      {!preview && (
        <CardContent className="px-4 pb-4 pt-0">
          <div className="text-sm text-muted-foreground">
            {showAuthor ? (
              <>
                Par <UserLink user={recipe.author} /> • {formatRelativeTime(recipe.created_at)}
              </>
            ) : (
              formatRelativeTime(recipe.created_at)
            )}
          </div>
          <div className="mt-2">
            <RecipeActions recipeId={recipe.id} size="sm" showLabels={false} />
          </div>
        </CardContent>
      )}
    </Card>
  );
};
