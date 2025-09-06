import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Layout, Card, CardContent, CardHeader, Button, Loading, PlanRecipeModal, CommentSection, RecipeActions, UserLink, Timer } from '../components';
import type { TimerRef } from '../components/Timer';
import { recipeService, authService } from '../services';
import { formatTime, formatDate } from '../utils';
import { getFullImageUrl } from '../utils/imageUtils';
import type { Recipe, User } from '../types';
import { Clock, Users, ChefHat, Edit, Copy, ArrowLeft, Calendar, Star, Trash2 } from 'lucide-react';

export const RecipeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const timerRef = useRef<TimerRef>(null);

  // Fonction pour démarrer le timer avec la durée d'une étape
  const handleStepTimerClick = (duration: number) => {
    if (timerRef.current) {
      timerRef.current.startTimer(duration);
      // Pas de scroll automatique pour ne pas perturber la lecture des instructions
    }
  };

  useEffect(() => {
    // Get current user
    const user = authService.getStoredUser();
    setCurrentUser(user);
  }, []);

  useEffect(() => {
    const fetchRecipe = async () => {
      if (!id) return;
      
      try {
        const response = await recipeService.getRecipe(parseInt(id));
        if (response.success) {
          setRecipe(response.data);
        } else {
          setError('Recette non trouvée');
        }
      } catch (error) {
        setError('Erreur lors du chargement de la recette');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecipe();
  }, [id]);

  const handleCopyAndEdit = async () => {
    if (!recipe) return;
    
    try {
      const response = await recipeService.copyRecipe(recipe.id);
      if (response.success) {
        // Redirect to edit the copied recipe
        navigate(`/recipe/${response.data.id}/edit`);
      }
    } catch (error) {
      console.error('Error copying recipe:', error);
    }
  };

  const handleDeleteRecipe = async () => {
    if (!recipe) return;
    
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la recette "${recipe.title}" ? Cette action est irréversible et supprimera également tous les commentaires et liens associés.`)) {
      try {
        const response = await recipeService.deleteRecipe(recipe.id);
        if (response.success) {
          // Rediriger vers la page d'accueil après suppression
          navigate('/');
        }
      } catch (error) {
        console.error('Erreur lors de la suppression de la recette:', error);
        alert('Erreur lors de la suppression de la recette');
      }
    }
  };

  const isOwner = currentUser && recipe && parseInt(currentUser.id) === recipe.author_id;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-96">
          <Loading size="lg" />
        </div>
      </Layout>
    );
  }

  if (error || !recipe) {
    return (
      <Layout>
        <div className="text-center py-12">
          <ChefHat className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Recette non trouvée</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link to="/">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour à l'accueil
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="flex gap-6">
          {/* Contenu principal */}
          <div className="flex-1 space-y-6">
            {/* Back button */}
            <Link to="/" className="inline-flex items-center text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Link>

            {/* Recipe Header */}
            <Card>
              <div className="aspect-w-16 aspect-h-9">
                {recipe.image_url ? (
                  <img
                    src={getFullImageUrl(recipe.image_url)}
                    alt={recipe.title}
                    className="w-full h-64 object-cover rounded-t-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.innerHTML = `
                        <div class="w-full h-64 bg-gray-200 rounded-t-lg flex items-center justify-center">
                          <svg class="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253z" />
                          </svg>
                        </div>
                      `;
                    }}
                  />
                ) : (
                  <div className="w-full h-64 bg-gray-200 rounded-t-lg flex items-center justify-center">
                    <ChefHat className="h-16 w-16 text-gray-400" />
                  </div>
                )}
              </div>
              
              <CardContent className="p-6">
                <div className="mb-4">
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-gray-900 mb-3">{recipe.title}</h1>
                    <p className="text-gray-600 text-lg mb-4">{recipe.description}</p>
                    
                    {/* Rating Display */}
                    <div className="flex items-center mb-4">
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-5 w-5 ${
                              recipe.average_rating && star <= recipe.average_rating
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-600 ml-3">
                        {recipe.average_rating && recipe.average_rating > 0 
                          ? `${recipe.average_rating.toFixed(1)} (${recipe.rating_count || 0} avis)`
                          : 'Aucune note pour le moment'
                        }
                      </span>
                    </div>
                    
                    {/* Recipe Meta */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <Clock className="h-5 w-5 text-gray-500 mx-auto mb-1" />
                        <div className="text-sm font-medium text-gray-900">
                          {formatTime(recipe.prep_time)}
                        </div>
                        <div className="text-xs text-gray-500">Préparation</div>
                      </div>
                      <div className="text-center">
                        <Clock className="h-5 w-5 text-gray-500 mx-auto mb-1" />
                        <div className="text-sm font-medium text-gray-900">
                          {formatTime(recipe.cook_time)}
                        </div>
                        <div className="text-xs text-gray-500">Cuisson</div>
                      </div>
                      <div className="text-center">
                        <Users className="h-5 w-5 text-gray-500 mx-auto mb-1" />
                        <div className="text-sm font-medium text-gray-900">
                          {recipe.servings}
                        </div>
                        <div className="text-xs text-gray-500">Portions</div>
                      </div>
                      <div className="text-center">
                        <ChefHat className="h-5 w-5 text-gray-500 mx-auto mb-1" />
                        <div className={`text-sm font-medium ${
                          recipe.difficulty === 'easy' ? 'text-green-600' :
                          recipe.difficulty === 'medium' ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {recipe.difficulty === 'easy' ? 'Facile' :
                           recipe.difficulty === 'medium' ? 'Moyen' : 'Difficile'}
                        </div>
                        <div className="text-xs text-gray-500">Difficulté</div>
                      </div>
                    </div>

                    <div className="mt-4 text-sm text-gray-500">
                      Par <UserLink user={recipe.author} /> • {formatDate(recipe.created_at)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Ingredients */}
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-bold">Ingrédients</h2>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {recipe.ingredients.map((ingredient, index) => (
                      <li key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                        <div className="flex items-center space-x-2">
                          {ingredient.ingredient.icon && (
                            <span className="text-lg">{ingredient.ingredient.icon}</span>
                          )}
                          <span>{ingredient.ingredient.name}</span>
                        </div>
                        <span className="text-sm text-gray-600">
                          {ingredient.quantity} {ingredient.unit}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Instructions */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <h2 className="text-xl font-bold">Instructions</h2>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recipe.instructions.map((step, index) => (
                      <div key={index} className="flex space-x-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {step.step_number}
                        </div>
                        <div className="flex-1">
                          {step.title && (
                            <h3 className="font-semibold mb-1">{step.title}</h3>
                          )}
                          <p className="text-gray-700">{step.description}</p>
                          {step.duration && (
                            <button
                              onClick={() => handleStepTimerClick(step.duration!)}
                              className="text-xs text-gray-600 hover:text-primary-600 mt-1 cursor-pointer hover:underline transition-colors"
                              title="Cliquer pour lancer le timer"
                            >
                              Durée: {formatTime(step.duration)}
                            </button>
                          )}
                          {step.temperature && (
                            <p className="text-sm text-gray-500 mt-1">
                              Température: {step.temperature}°C
                            </p>
                          )}
                          {step.tips && (
                            <p className="text-sm text-blue-600 mt-1 italic">
                              💡 {step.tips}
                            </p>
                          )}
                          {step.referenced_recipe && (
                            <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <p className="text-sm text-gray-600 mb-2">
                                📖 Recette référencée:
                              </p>
                              <Link 
                                to={`/recipe/${step.referenced_recipe.id}`}
                                className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800 font-medium"
                              >
                                <ChefHat className="h-4 w-4" />
                                <span>{step.referenced_recipe.title}</span>
                              </Link>
                              {step.referenced_recipe.description && (
                                <p className="text-sm text-gray-500 mt-1">
                                  {step.referenced_recipe.description.substring(0, 100)}
                                  {step.referenced_recipe.description.length > 100 ? '...' : ''}
                                </p>
                              )}
                              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                <span className="flex items-center space-x-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{step.referenced_recipe.prep_time + step.referenced_recipe.cook_time} min</span>
                                </span>
                                <span className="flex items-center space-x-1">
                                  <Users className="h-3 w-3" />
                                  <span>{step.referenced_recipe.servings} portions</span>
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Equipment */}
            {recipe.equipments.length > 0 && (
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-bold">Équipement</h2>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {recipe.equipments.map((equipment, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border ${
                          equipment.is_required 
                            ? 'border-red-200 bg-red-50 text-red-800' 
                            : 'border-gray-200 bg-gray-50 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          {equipment.equipment.icon && (
                            <span className="text-lg">{equipment.equipment.icon}</span>
                          )}
                          <div className="font-medium">{equipment.equipment.name}</div>
                        </div>
                        {equipment.is_required && (
                          <div className="text-xs">Obligatoire</div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Comments Section */}
            <CommentSection recipeId={recipe.id} />
          </div>

          {/* Sidebar d'actions */}
          <div className="w-64 flex-shrink-0">
            <div className="sticky top-6 space-y-4">
              {/* Actions principales */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">Actions</h3>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Timer intégré */}
                  <div data-timer>
                    <Timer ref={timerRef} className="mb-4" />
                  </div>
                  
                  <Button 
                    variant="secondary" 
                    className="w-full justify-start" 
                    size="sm" 
                    onClick={() => setShowPlanModal(true)}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Ajouter au planning
                  </Button>
                  
                  {isOwner ? (
                    <>
                      <Link to={`/recipe/${recipe.id}/edit`} className="block">
                        <Button variant="ghost" className="w-full justify-start" size="sm">
                          <Edit className="h-4 w-4 mr-2" />
                          Modifier la recette
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-red-600 hover:text-red-800 hover:bg-red-50" 
                        size="sm" 
                        onClick={handleDeleteRecipe}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer la recette
                      </Button>
                    </>
                  ) : (
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start" 
                      size="sm" 
                      onClick={handleCopyAndEdit}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copier et modifier
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Actions de la recette (favoris et listes) */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">Mes listes</h3>
                </CardHeader>
                <CardContent>
                  <RecipeActions recipeId={recipe.id} size="sm" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Plan Recipe Modal */}
        {recipe && (
          <PlanRecipeModal
            isOpen={showPlanModal}
            onClose={() => setShowPlanModal(false)}
            recipe={recipe}
            onSuccess={() => {
              // Optionally show a success message or redirect
              console.log('Recipe planned successfully!');
            }}
          />
        )}
      </div>
    </Layout>
  );
};
