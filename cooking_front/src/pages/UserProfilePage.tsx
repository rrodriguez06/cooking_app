import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout, Card, CardContent, Button, RecipeListDetailModal } from '../components';
import { userFollowService } from '../services/userFollowService';
import { formatRelativeTime, formatTime } from '../utils';
import { getFullImageUrl } from '../utils/imageUtils';
import type { UserProfileResponse } from '../types/user';
import type { Recipe, RecipeList } from '../types';
import { Clock, Users, ChefHat, Star, UserPlus, UserMinus, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const UserProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<UserProfileResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [selectedList, setSelectedList] = useState<RecipeList | null>(null);
  const [isListDetailModalOpen, setIsListDetailModalOpen] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  const fetchProfile = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const response = await userFollowService.getUserProfile(userId);
      if (response.success) {
        setProfile(response.data);
      } else {
        setError('Impossible de charger le profil');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setError('Erreur lors du chargement du profil');
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!userId || !profile) return;

    try {
      setFollowLoading(true);
      const response = profile.is_following 
        ? await userFollowService.unfollowUser(userId)
        : await userFollowService.followUser(userId);

      if (response.success) {
        setProfile(prev => prev ? {
          ...prev,
          is_following: response.is_following,
          followers_count: response.is_following 
            ? prev.followers_count + 1 
            : prev.followers_count - 1
        } : null);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleViewList = (list: RecipeList) => {
    setSelectedList(list);
    setIsListDetailModalOpen(true);
  };

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-8">
          <div className="bg-card rounded-lg p-6">
            <div className="flex items-center space-x-4">
              <div className="w-24 h-24 bg-muted rounded-full" />
              <div className="space-y-2">
                <div className="h-6 bg-muted rounded w-32" />
                <div className="h-4 bg-muted rounded w-48" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-muted h-64 rounded-lg" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !profile) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {error || 'Utilisateur non trouvé'}
          </h2>
          <Link to="/search">
            <Button>Retour à la recherche</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const isOwnProfile = currentUser?.id === userId;

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header du profil */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="flex items-center space-x-4 mb-4 md:mb-0">
                <div className="w-24 h-24 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {profile.user.avatar ? (
                    <img 
                      src={getFullImageUrl(profile.user.avatar)} 
                      alt={profile.user.username}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    profile.user.username.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-foreground font-display">
                    {profile.user.username}
                  </h1>
                  <p className="text-muted-foreground">
                    Membre depuis {formatRelativeTime(profile.user.created_at || '')}
                  </p>
                </div>
              </div>

              {!isOwnProfile && currentUser && (
                <Button
                  onClick={handleFollowToggle}
                  disabled={followLoading}
                  variant={profile.is_following ? "secondary" : "primary"}
                  className="flex items-center space-x-2"
                >
                  {profile.is_following ? (
                    <>
                      <UserMinus className="h-4 w-4" />
                      <span>Ne plus suivre</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      <span>Suivre</span>
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Statistiques */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">{profile.recipe_count}</div>
                <div className="text-sm text-muted-foreground">Recettes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">{profile.followers_count}</div>
                <div className="text-sm text-muted-foreground">Abonnés</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">{profile.following_count}</div>
                <div className="text-sm text-muted-foreground">Abonnements</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recettes publiques */}
        {profile.public_recipes && profile.public_recipes.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground flex items-center">
                <ChefHat className="h-6 w-6 mr-2" />
                Recettes publiques
              </h2>
              {profile.public_recipes && profile.public_recipes.length >= 6 && (
                <Link to={`/search?author=${profile.user.username}`}>
                  <Button variant="ghost">Voir tout</Button>
                </Link>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {profile.public_recipes && profile.public_recipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          </section>
        )}

        {/* Listes publiques */}
        {profile.public_lists && profile.public_lists.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground flex items-center">
                <BookOpen className="h-6 w-6 mr-2" />
                Listes publiques
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {profile.public_lists && profile.public_lists.map((list) => (
                <Card 
                  key={list.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleViewList(list)}
                >
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg mb-2">{list.name}</h3>
                    {list.description && (
                      <p className="text-muted-foreground text-sm mb-3">{list.description}</p>
                    )}
                    <div className="flex items-center text-sm text-muted-foreground">
                      <span>{list.items?.length || 0} recettes</span>
                      <span className="mx-2">•</span>
                      <span>{formatRelativeTime(list.created_at)}</span>
                    </div>

                    {/* Click indicator */}
                    <div className="mt-3 pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground text-center">
                        Cliquer pour voir les recettes
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Message si aucun contenu */}
        {(!profile.public_recipes || profile.public_recipes.length === 0) && 
         (!profile.public_lists || profile.public_lists.length === 0) && (
          <div className="text-center py-12">
            <ChefHat className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Aucun contenu public
            </h3>
            <p className="text-muted-foreground">
              {isOwnProfile 
                ? 'Vous n\'avez pas encore de recettes ou listes publiques.'
                : `${profile.user.username} n'a pas encore de contenu public.`
              }
            </p>
          </div>
        )}
      </div>

      {/* Recipe List Detail Modal */}
      <RecipeListDetailModal
        isOpen={isListDetailModalOpen}
        onClose={() => {
          setIsListDetailModalOpen(false);
          setSelectedList(null);
        }}
        list={selectedList}
        canEdit={false} // Les utilisateurs ne peuvent pas modifier les listes des autres
      />
    </Layout>
  );
};

// Composant pour afficher une recette
interface RecipeCardProps {
  recipe: Recipe;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe }) => {
  return (
    <Card className="hover:shadow-lg transition-shadow duration-200 group">
      <Link to={`/recipe/${recipe.id}`} className="block">
        <div className="aspect-w-16 aspect-h-9 bg-muted rounded-t-lg overflow-hidden">
          {recipe.image_url ? (
            <img
              src={getFullImageUrl(recipe.image_url)}
              alt={recipe.title}
              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-200"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = `
                  <div class="w-full h-48 bg-muted flex items-center justify-center">
                    <svg class="h-12 w-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253z" />
                    </svg>
                  </div>
                `;
              }}
            />
          ) : (
            <div className="w-full h-48 bg-muted flex items-center justify-center">
              <ChefHat className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
        </div>
        
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
              {recipe.title}
            </h3>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              recipe.difficulty === 'easy'
                ? 'bg-herb-100 text-herb-700'
                : recipe.difficulty === 'medium'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-destructive/15 text-destructive'
            }`}>
              {recipe.difficulty === 'easy' ? 'Facile' : 
               recipe.difficulty === 'medium' ? 'Moyen' : 'Difficile'}
            </span>
          </div>

          {recipe.description && (
            <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
              {recipe.description}
            </p>
          )}

          {/* Rating Display */}
          <div className="flex items-center mb-3">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    recipe.average_rating && star <= recipe.average_rating
                      ? 'text-amber-400 fill-current'
                      : 'text-muted-foreground'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground ml-2">
              {recipe.average_rating && recipe.average_rating > 0 
                ? `${recipe.average_rating.toFixed(1)} (${recipe.rating_count || 0})`
                : 'Aucune note'
              }
            </span>
          </div>

          <div className="flex items-center text-sm text-muted-foreground mb-3 space-x-4">
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              <span>{formatTime(recipe.total_time)}</span>
            </div>
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-1" />
              <span>{recipe.servings} portions</span>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            {formatRelativeTime(recipe.created_at)}
          </div>
        </CardContent>
      </Link>
    </Card>
  );
};
