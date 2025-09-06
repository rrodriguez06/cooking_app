import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout, Card, CardContent, Button, RecipeActions, UserLink } from '../components';
import { recipeService } from '../services';
import { feedService } from '../services/feedService';
import { formatRelativeTime, formatTime } from '../utils';
import { getFullImageUrl } from '../utils/imageUtils';
import type { Recipe } from '../types';
import type { UserFeed } from '../services/feedService';
import { Clock, Users, ChefHat, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface RecipeCardProps {
  recipe: Recipe;
  showAuthor?: boolean;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, showAuthor = true }) => {
  return (
    <Card className="hover:shadow-lg transition-shadow duration-200 group">
      <Link to={`/recipe/${recipe.id}`} className="block">
        <div className="aspect-w-16 aspect-h-9 bg-gray-200 rounded-t-lg overflow-hidden">
          {recipe.image_url ? (
            <img
              src={getFullImageUrl(recipe.image_url)}
              alt={recipe.title}
              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-200"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = `
                  <div class="w-full h-48 bg-gray-200 flex items-center justify-center">
                    <svg class="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253z" />
                    </svg>
                  </div>
                `;
              }}
            />
          ) : (
            <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
              <ChefHat className="h-12 w-12 text-gray-400" />
            </div>
          )}
        </div>
        
        <CardContent className="p-4 pb-2">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 group-hover:text-primary-600 transition-colors">
              {recipe.title}
            </h3>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              recipe.difficulty === 'easy' 
                ? 'bg-green-100 text-green-800'
                : recipe.difficulty === 'medium'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {recipe.difficulty === 'easy' ? 'Facile' : 
               recipe.difficulty === 'medium' ? 'Moyen' : 'Difficile'}
            </span>
          </div>

          {recipe.description && (
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
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
                      ? 'text-yellow-400 fill-current'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-gray-600 ml-2">
              {recipe.average_rating && recipe.average_rating > 0 
                ? `${recipe.average_rating.toFixed(1)} (${recipe.rating_count || 0})`
                : 'Aucune note'
              }
            </span>
          </div>

          <div className="flex items-center text-sm text-gray-500 space-x-4">
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              <span>{formatTime(recipe.total_time)}</span>
            </div>
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-1" />
              <span>{recipe.servings} portions</span>
            </div>
          </div>
        </CardContent>
      </Link>
      
      {/* Section auteur et actions en dehors du lien principal */}
      <CardContent className="px-4 pb-4 pt-0">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {showAuthor ? (
              <>
                Par <UserLink user={recipe.author} /> • {formatRelativeTime(recipe.created_at)}
              </>
            ) : (
              formatRelativeTime(recipe.created_at)
            )}
          </div>
        </div>
        
        {/* Actions en dehors du lien pour éviter les conflits */}
        <div className="mt-2">
          <RecipeActions recipeId={recipe.id} size="sm" showLabels={false} />
        </div>
      </CardContent>
    </Card>
  );
};

export const HomePage: React.FC = () => {
  const { user } = useAuth();
  const [latestRecipes, setLatestRecipes] = useState<Recipe[]>([]);
  const [popularRecipes, setPopularRecipes] = useState<Recipe[]>([]);
  const [followingFeed, setFollowingFeed] = useState<UserFeed[]>([]);
  const [isLoadingLatest, setIsLoadingLatest] = useState(true);
  const [isLoadingPopular, setIsLoadingPopular] = useState(true);

  useEffect(() => {
    const fetchLatestRecipes = async () => {
      try {
        const response = await recipeService.getLatestRecipes(8);
        if (response.success) {
          setLatestRecipes(response.data.recipes);
        }
      } catch (error) {
        console.error('Error fetching latest recipes:', error);
      } finally {
        setIsLoadingLatest(false);
      }
    };

    const fetchPopularRecipes = async () => {
      try {
        const response = await recipeService.getPopularRecipes(4);
        if (response.success) {
          setPopularRecipes(response.data.recipes);
        }
      } catch (error) {
        console.error('Error fetching popular recipes:', error);
      } finally {
        setIsLoadingPopular(false);
      }
    };

    const fetchFollowingFeed = async () => {
      if (!user) {
        return;
      }
      
      try {
        const response = await feedService.getFollowingFeedGrouped();
        if (response.success && response.data) {
          setFollowingFeed(response.data);
        }
      } catch (error) {
        console.error('Error fetching following feed:', error);
        // En cas d'erreur, on garde le tableau vide pour éviter les erreurs de rendu
        setFollowingFeed([]);
      }
    };

    fetchLatestRecipes();
    fetchPopularRecipes();
    fetchFollowingFeed();
  }, [user]);

  return (
    <Layout>
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="text-center py-12 bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Bienvenue sur CookingApp
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Découvrez, partagez et organisez vos recettes préférées. 
            Planifiez vos repas et cuisinez comme un chef !
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/search">
              <Button size="lg">
                Découvrir des recettes
              </Button>
            </Link>
            <Link to="/recipe/new">
              <Button variant="secondary" size="lg">
                Créer une recette
              </Button>
            </Link>
          </div>
        </div>

        {/* Popular Recipes */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Recettes populaires</h2>
            <Link to="/search?sort=popular">
              <Button variant="ghost">Voir tout</Button>
            </Link>
          </div>

          {isLoadingPopular ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, index) => (
                <Card key={index} className="animate-pulse">
                  <div className="h-48 bg-gray-300 rounded-t-lg" />
                  <CardContent className="p-4">
                    <div className="h-4 bg-gray-300 rounded mb-2" />
                    <div className="h-3 bg-gray-300 rounded mb-3 w-3/4" />
                    <div className="h-3 bg-gray-300 rounded w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {popularRecipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          )}
        </section>

        {/* Latest Recipes */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Dernières recettes</h2>
            <Link to="/search?sort=latest">
              <Button variant="ghost">Voir tout</Button>
            </Link>
          </div>

          {isLoadingLatest ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, index) => (
                <Card key={index} className="animate-pulse">
                  <div className="h-48 bg-gray-300 rounded-t-lg" />
                  <CardContent className="p-4">
                    <div className="h-4 bg-gray-300 rounded mb-2" />
                    <div className="h-3 bg-gray-300 rounded mb-3 w-3/4" />
                    <div className="h-3 bg-gray-300 rounded w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {latestRecipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          )}
        </section>

        {/* Following Feed - Recettes des utilisateurs suivis */}
        {followingFeed && followingFeed.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Vos abonnements</h2>
            </div>

            <div className="space-y-8">
              {followingFeed.map((userFeed) => (
                <div key={userFeed.user.id} className="border-b border-gray-200 pb-8 last:border-b-0">
                  <div className="flex items-center mb-4">
                    <UserLink 
                      user={userFeed.user} 
                      showAvatar={true}
                      className="text-lg font-semibold text-primary-600 hover:text-primary-800"
                    >
                      Recettes de {userFeed.user.username}
                    </UserLink>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {userFeed.recipes.slice(0, 3).map((recipe) => (
                      <RecipeCard key={recipe.id} recipe={recipe} showAuthor={false} />
                    ))}
                  </div>
                  
                  {userFeed.recipes.length > 3 && (
                    <div className="mt-4 text-center">
                      <Link to={`/user/${userFeed.user.id}`}>
                        <Button variant="ghost" size="sm">
                          Voir toutes ses recettes ({userFeed.recipes.length})
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Quick Actions */}
        <section className="bg-white rounded-xl p-8 shadow-sm border">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Actions rapides
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link to="/planning" className="text-center group">
              <div className="bg-primary-50 p-6 rounded-lg group-hover:bg-primary-100 transition-colors">
                <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Planifier mes repas</h3>
                <p className="text-gray-600 text-sm">
                  Organisez votre semaine avec le planning de repas
                </p>
              </div>
            </Link>

            <Link to="/search" className="text-center group">
              <div className="bg-green-50 p-6 rounded-lg group-hover:bg-green-100 transition-colors">
                <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <ChefHat className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Trouver une recette</h3>
                <p className="text-gray-600 text-sm">
                  Recherchez par ingrédients, temps ou difficulté
                </p>
              </div>
            </Link>

            <Link to="/recipe/new" className="text-center group">
              <div className="bg-blue-50 p-6 rounded-lg group-hover:bg-blue-100 transition-colors">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Partager une recette</h3>
                <p className="text-gray-600 text-sm">
                  Créez et partagez vos créations culinaires
                </p>
              </div>
            </Link>
          </div>
        </section>
      </div>
    </Layout>
  );
};
