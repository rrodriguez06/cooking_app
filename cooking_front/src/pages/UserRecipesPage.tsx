import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout, Pagination, Card } from '../components';
import { recipeService, userService } from '../services';
import { usePagination } from '../hooks';
import { getFullImageUrl } from '../utils/imageUtils';
import { formatDate } from '../utils';
import type { Recipe, User } from '../types';
import { ChefHat, Clock, Users, Eye } from 'lucide-react';

export const UserRecipesPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pagination = usePagination(1);

  const loadRecipes = async (page: number = 1) => {
    if (!userId) return;

    try {
      setIsLoading(true);
      const response = await recipeService.getUserRecipes(parseInt(userId), {
        page,
        limit: 12
      });

      if (response.success) {
        setRecipes(response.data.recipes);
        pagination.setPaginationData({
          currentPage: response.data.current_page,
          totalPages: response.data.total_pages,
          totalCount: response.data.total_count,
          hasNext: response.data.has_next,
          hasPrev: response.data.has_prev
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des recettes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUser = async () => {
    if (!userId) return;

    try {
      const response = await userService.getUser(parseInt(userId));
      if (response.success) {
        setUser(response.data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'utilisateur:', error);
    }
  };

  useEffect(() => {
    if (userId) {
      loadUser();
      loadRecipes(1);
    }
  }, [userId]);

  const handlePageChange = (page: number) => {
    pagination.goToPage(page);
    loadRecipes(page);
    // Scroll vers le haut lors du changement de page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading && recipes.length === 0) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto p-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-gray-200 h-64 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-4">
        {/* En-tête avec informations utilisateur */}
        {user && (
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-4">
              {user.avatar && (
                <img
                  src={getFullImageUrl(user.avatar)}
                  alt={user.username}
                  className="w-16 h-16 rounded-full object-cover"
                />
              )}
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Recettes de {user.username}
                </h1>
                <p className="text-gray-600">
                  {pagination.pagination.totalCount} recette{pagination.pagination.totalCount > 1 ? 's' : ''} publiée{pagination.pagination.totalCount > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Grille des recettes */}
        {recipes.length === 0 ? (
          <Card className="p-8 text-center">
            <ChefHat className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Aucune recette publiée
            </h3>
            <p className="text-gray-600">
              {user?.username} n'a pas encore publié de recettes.
            </p>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {recipes.map((recipe) => (
                <Card
                  key={recipe.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow duration-200 cursor-pointer"
                  onClick={() => navigate(`/recipe/${recipe.id}`)}
                >
                  {recipe.image_url && (
                    <div className="aspect-w-16 aspect-h-9">
                      <img
                        src={getFullImageUrl(recipe.image_url)}
                        alt={recipe.title}
                        className="w-full h-48 object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                      {recipe.title}
                    </h3>
                    
                    {recipe.description && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {recipe.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{recipe.prep_time + recipe.cook_time} min</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Users className="w-4 h-4" />
                          <span>{recipe.servings}</span>
                        </div>
                      </div>
                      <span className="text-xs">{formatDate(recipe.created_at)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="inline-block px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded-full">
                        {recipe.difficulty === 'easy' ? 'Facile' : 
                         recipe.difficulty === 'medium' ? 'Moyen' : 'Difficile'}
                      </span>
                      
                      <div className="flex items-center text-primary-600 text-sm font-medium">
                        <Eye className="w-4 h-4 mr-1" />
                        Voir la recette
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={pagination.pagination.currentPage}
              totalPages={pagination.pagination.totalPages}
              totalCount={pagination.pagination.totalCount}
              onPageChange={handlePageChange}
              className="mt-8"
            />
          </>
        )}
      </div>
    </Layout>
  );
};

export default UserRecipesPage;