import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Card, CardContent, CardHeader, Button, Input, RecipeListModal, RecipeListDetailModal, UserLink, PasswordChangeForm, ProfileImageUpload, Pagination } from '../components';
import { useAuth } from '../context';
import { userService, recipeService, favoriteService, recipeListService, userFollowService } from '../services';
import { usePagination } from '../hooks';
import { formatDate } from '../utils';
import { getFullImageUrl } from '../utils/imageUtils';
import type { Recipe, RecipeList, User as UserType } from '../types';
import { User, Mail, Calendar, ChefHat, Edit2, Heart, List, Plus, Trash2, Edit, Eye, Users, UserCheck, Shield } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [userRecipes, setUserRecipes] = useState<Recipe[]>([]);
  const [favoriteRecipes, setFavoriteRecipes] = useState<Recipe[]>([]);
  const [recipeLists, setRecipeLists] = useState<RecipeList[]>([]);
  const [followers, setFollowers] = useState<UserType[]>([]);
  const [following, setFollowing] = useState<UserType[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'recipes' | 'favorites' | 'lists' | 'follows' | 'security'>('recipes');
  const [followTab, setFollowTab] = useState<'followers' | 'following'>('followers');
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedList, setSelectedList] = useState<RecipeList | null>(null);
  const [editingList, setEditingList] = useState<RecipeList | null>(null);
  
  // Pagination pour les recettes
  const recipesPagination = usePagination(1);
  const favoritesPagination = usePagination(1);
  
  const [editForm, setEditForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
    avatar: user?.avatar || '',
  });

  // Fonctions pour charger les données avec pagination
  const loadUserRecipes = async (page: number = 1) => {
    if (!user) return;
    
    try {
      console.log('Chargement des recettes pour l\'utilisateur:', user.id, 'page:', page);
      const recipesResponse = await recipeService.getUserRecipes(parseInt(user.id), {
        page,
        limit: 12 // 12 recettes par page
      });
      console.log('Réponse getUserRecipes:', recipesResponse);
      if (recipesResponse.success) {
        setUserRecipes(recipesResponse.data.recipes);
        recipesPagination.setPaginationData({
          currentPage: recipesResponse.data.current_page,
          totalPages: recipesResponse.data.total_pages,
          totalCount: recipesResponse.data.total_count,
          hasNext: recipesResponse.data.has_next,
          hasPrev: recipesResponse.data.has_prev
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des recettes:', error);
    }
  };

  const loadFavoriteRecipes = async (page: number = 1) => {
    if (!user) return;
    
    try {
      console.log('Chargement des favoris, page:', page);
      const favoritesResponse = await favoriteService.getUserFavorites(page, 12);
      console.log('Réponse getUserFavorites:', favoritesResponse);
      if (favoritesResponse.success) {
        setFavoriteRecipes(favoritesResponse.data.recipes);
        favoritesPagination.setPaginationData({
          currentPage: favoritesResponse.data.current_page,
          totalPages: favoritesResponse.data.total_pages,
          totalCount: favoritesResponse.data.total_count,
          hasNext: favoritesResponse.data.has_next,
          hasPrev: favoritesResponse.data.has_prev
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des favoris:', error);
    }
  };

  // Gestionnaires de changement de page
  const handleRecipesPageChange = (page: number) => {
    recipesPagination.goToPage(page);
    loadUserRecipes(page);
  };

  const handleFavoritesPageChange = (page: number) => {
    favoritesPagination.goToPage(page);
    loadFavoriteRecipes(page);
  };

  useEffect(() => {
    console.log('useEffect ProfilePage déclenché, user:', user);
    const fetchUserData = async () => {
      if (!user) {
        console.log('Pas d\'utilisateur connecté, arrêt de fetchUserData');
        return;
      }
      
      console.log('fetchUserData appelée pour l\'utilisateur:', user);
      
      try {
        // Charger les recettes de l'utilisateur avec pagination
        await loadUserRecipes(1);

        // Charger les favoris avec pagination
        await loadFavoriteRecipes(1);

        // Charger les listes
        try {
          console.log('Chargement des listes');
          const listsResponse = await recipeListService.getUserRecipeLists();
          console.log('Réponse getUserRecipeLists:', listsResponse);
          if (listsResponse.success) {
            setRecipeLists(listsResponse.data.lists);
          }
        } catch (error) {
          console.error('Erreur lors du chargement des listes:', error);
        }

        // Charger les abonnés et abonnements
        try {
          console.log('Chargement des abonnés pour l\'utilisateur:', user.id);
          const followersResponse = await userFollowService.getFollowers(user.id);
          console.log('Réponse getFollowers:', followersResponse);
          if (followersResponse.success) {
            setFollowers(followersResponse.data.users);
            setFollowersCount(followersResponse.data.total_count);
          } else {
            console.error('Erreur lors du chargement des abonnés:', followersResponse);
          }
        } catch (error) {
          console.error('Erreur lors du chargement des abonnés:', error);
        }

        try {
          console.log('Chargement des abonnements pour l\'utilisateur:', user.id);
          const followingResponse = await userFollowService.getFollowing(user.id);
          console.log('Réponse getFollowing:', followingResponse);
          if (followingResponse.success) {
            setFollowing(followingResponse.data.users);
            setFollowingCount(followingResponse.data.total_count);
          } else {
            console.error('Erreur lors du chargement des abonnements:', followingResponse);
          }
        } catch (error) {
          console.error('Erreur lors du chargement des abonnements:', error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      const response = await userService.updateUser(parseInt(user.id), editForm);
      if (response.success) {
        updateUser(response.data);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditForm({
      username: user?.username || '',
      email: user?.email || '',
      avatar: user?.avatar || '',
    });
    setIsEditing(false);
  };

  const handleViewList = (list: RecipeList) => {
    setSelectedList(list);
    setIsDetailModalOpen(true);
  };

  const handleDeleteRecipe = async (recipeId: number, recipeTitle: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la recette "${recipeTitle}" ? Cette action est irréversible.`)) {
      try {
        const response = await recipeService.deleteRecipe(recipeId);
        if (response.success) {
          // Retirer la recette de la liste locale
          setUserRecipes(userRecipes.filter(recipe => recipe.id !== recipeId));
          // Optionnel: Afficher une notification de succès
          console.log('Recette supprimée avec succès');
        }
      } catch (error) {
        console.error('Erreur lors de la suppression de la recette:', error);
        // Optionnel: Afficher une notification d'erreur
        alert('Erreur lors de la suppression de la recette');
      }
    }
  };

  const handleRecipeRemovedFromList = (listId: number, recipeId: number) => {
    // Mettre à jour la liste locale pour refléter le nouveau nombre de recettes
    setRecipeLists(prev => prev.map(list => {
      if (list.id === listId && list.items) {
        return {
          ...list,
          items: list.items.filter(item => item.recipe_id !== recipeId)
        };
      }
      return list;
    }));
  };

  if (!user) {
    return <Layout><div>Chargement...</div></Layout>;
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Mon Profil</h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                {isEditing ? 'Annuler' : 'Modifier'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-start space-x-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {user.avatar ? (
                  <img
                    src={getFullImageUrl(user.avatar)}
                    alt={user.username}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="h-10 w-10 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1 space-y-4">
                {isEditing ? (
                  <div className="space-y-4">
                    <Input
                      label="Nom d'utilisateur"
                      value={editForm.username}
                      onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    />
                    <Input
                      label="Email"
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Photo de profil
                      </label>
                      <ProfileImageUpload
                        value={editForm.avatar}
                        onChange={(imageUrl) => setEditForm({ ...editForm, avatar: imageUrl })}
                        onError={(error) => {
                          console.error('Erreur upload photo de profil:', error);
                          // Optionnel : afficher l'erreur à l'utilisateur
                        }}
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button onClick={handleSaveProfile}>
                        Sauvegarder
                      </Button>
                      <Button variant="secondary" onClick={handleCancelEdit}>
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <User className="h-5 w-5 text-gray-500" />
                      <span className="text-lg font-semibold">{user.username}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Mail className="h-5 w-5 text-gray-500" />
                      <span className="text-gray-700">{user.email}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5 text-gray-500" />
                      <span className="text-gray-700">
                        Membre depuis {user.created_at ? formatDate(user.created_at, 'MMMM yyyy') : 'Date inconnue'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card>
            <CardContent className="p-6 text-center">
              <ChefHat className="h-8 w-8 text-primary-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{recipesPagination.pagination.totalCount || 0}</div>
              <div className="text-sm text-gray-500">Recettes créées</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <Heart className="h-8 w-8 text-red-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{favoritesPagination.pagination.totalCount || 0}</div>
              <div className="text-sm text-gray-500">Recettes favorites</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <List className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{recipeLists.length}</div>
              <div className="text-sm text-gray-500">Listes créées</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{followersCount || 0}</div>
              <div className="text-sm text-gray-500">Abonnés</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <UserCheck className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{followingCount || 0}</div>
              <div className="text-sm text-gray-500">Abonnements</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('recipes')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'recipes'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ChefHat className="h-4 w-4 inline mr-2" />
              Mes Recettes ({recipesPagination.pagination.totalCount || 0})
            </button>
            
            <button
              onClick={() => setActiveTab('favorites')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'favorites'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Heart className="h-4 w-4 inline mr-2" />
              Favoris ({favoritesPagination.pagination.totalCount || 0})
            </button>
            
            <button
              onClick={() => setActiveTab('lists')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'lists'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <List className="h-4 w-4 inline mr-2" />
              Mes Listes ({recipeLists.length})
            </button>
            
            <button
              onClick={() => setActiveTab('follows')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'follows'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="h-4 w-4 inline mr-2" />
              Abonnements ({(followersCount || 0) + (followingCount || 0)})
            </button>
            
            <button
              onClick={() => setActiveTab('security')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'security'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Shield className="h-4 w-4 inline mr-2" />
              Sécurité
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'recipes' && (
          <Card>
            <CardHeader>
              <h2 className="text-xl font-bold">Mes Recettes</h2>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="mt-2 text-gray-500">Chargement des recettes...</p>
                </div>
              ) : userRecipes.length === 0 ? (
                <div className="text-center py-8">
                  <ChefHat className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Vous n'avez pas encore créé de recettes</p>
                  <Button onClick={() => navigate('/recipe/new')}>
                    Créer ma première recette
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userRecipes.map((recipe) => (
                    <div
                      key={recipe.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <h3 className="font-semibold mb-2">{recipe.title}</h3>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {recipe.description}
                      </p>
                      <div className="flex justify-between items-center text-sm text-gray-500 mb-2">
                        <span>{formatDate(recipe.created_at)}</span>
                      </div>
                      <div className="flex justify-between items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/recipe/${recipe.id}`)}
                          className="flex-1"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Voir
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/recipe/${recipe.id}/edit`)}
                          className="flex-1"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Modifier
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRecipe(recipe.id, recipe.title)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Pagination pour les recettes */}
              <Pagination
                currentPage={recipesPagination.pagination.currentPage}
                totalPages={recipesPagination.pagination.totalPages}
                totalCount={recipesPagination.pagination.totalCount}
                onPageChange={handleRecipesPageChange}
                itemsPerPage={12}
                className="mt-6"
              />
            </CardContent>
          </Card>
        )}

        {activeTab === 'favorites' && (
          <Card>
            <CardHeader>
              <h2 className="text-xl font-bold">Mes Recettes Favorites</h2>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="mt-2 text-gray-500">Chargement des favoris...</p>
                </div>
              ) : favoriteRecipes.length === 0 ? (
                <div className="text-center py-8">
                  <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Vous n'avez pas encore de recettes favorites</p>
                  <Button onClick={() => window.location.href = '/search'}>
                    Découvrir des recettes
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {favoriteRecipes.map((recipe) => (
                    <div
                      key={recipe.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <h3 className="font-semibold mb-2">{recipe.title}</h3>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {recipe.description}
                      </p>
                      <div className="flex justify-between items-center text-sm text-gray-500">
                        <span>Par {recipe.author?.username}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/recipe/${recipe.id}`)}
                        >
                          Voir
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Pagination pour les favoris */}
              <Pagination
                currentPage={favoritesPagination.pagination.currentPage}
                totalPages={favoritesPagination.pagination.totalPages}
                totalCount={favoritesPagination.pagination.totalCount}
                onPageChange={handleFavoritesPageChange}
                itemsPerPage={12}
                className="mt-6"
              />
            </CardContent>
          </Card>
        )}

        {activeTab === 'lists' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Mes Listes de Recettes</h2>
                <Button
                  onClick={() => setIsListModalOpen(true)}
                  className="flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Nouvelle liste</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="mt-2 text-gray-500">Chargement des listes...</p>
                </div>
              ) : recipeLists.length === 0 ? (
                <div className="text-center py-8">
                  <List className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Vous n'avez pas encore créé de listes</p>
                  <p className="text-sm text-gray-400 mb-4">
                    Créez des listes pour organiser vos recettes par thème, occasion ou préférence
                  </p>
                  <Button onClick={() => setIsListModalOpen(true)}>
                    Créer ma première liste
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recipeLists.map((list) => (
                    <div
                      key={list.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleViewList(list)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold">{list.name}</h3>
                        <div className="flex space-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewList(list);
                            }}
                            className="p-1 text-gray-400 hover:text-blue-600"
                            title="Voir les recettes"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingList(list);
                              setIsListModalOpen(true);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            title="Modifier"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (window.confirm('Êtes-vous sûr de vouloir supprimer cette liste ?')) {
                                try {
                                  await recipeListService.deleteRecipeList(list.id);
                                  setRecipeLists(prev => prev.filter(l => l.id !== list.id));
                                } catch (error) {
                                  console.error('Error deleting list:', error);
                                }
                              }
                            }}
                            className="p-1 text-gray-400 hover:text-red-600"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      {list.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {list.description}
                        </p>
                      )}
                      
                      <div className="flex justify-between items-center text-sm text-gray-500">
                        <span>{list.items?.length || 0} recettes</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          list.is_public 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {list.is_public ? 'Publique' : 'Privée'}
                        </span>
                      </div>

                      {/* Click indicator */}
                      <div className="mt-3 pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-400 text-center">
                          Cliquer pour voir les recettes
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'follows' && (
          <Card>
            <CardHeader>
              <h2 className="text-xl font-bold">Abonnements</h2>
              {/* Sub-navigation pour Abonnés / Abonnements */}
              <div className="border-b border-gray-200 mt-4">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setFollowTab('followers')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      followTab === 'followers'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Abonnés ({followersCount || 0})
                  </button>
                  
                  <button
                    onClick={() => setFollowTab('following')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      followTab === 'following'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Abonnements ({followingCount || 0})
                  </button>
                </nav>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="mt-2 text-gray-500">Chargement...</p>
                </div>
              ) : (
                <>
                  {/* Contenu des Abonnés */}
                  {followTab === 'followers' && (
                    <>
                      {(followers?.length || 0) === 0 ? (
                        <div className="text-center py-8">
                          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500">Aucun abonné pour le moment</p>
                          <p className="text-sm text-gray-400 mt-2">
                            Partagez vos recettes pour attirer des abonnés !
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {(followers || []).map((follower) => (
                            <div
                              key={follower.id}
                              className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
                            >
                              <div className="flex flex-col items-center text-center">
                                {/* Avatar */}
                                {follower.avatar ? (
                                  <img
                                    src={getFullImageUrl(follower.avatar)}
                                    alt={follower.username}
                                    className="w-16 h-16 rounded-full object-cover mb-3"
                                  />
                                ) : (
                                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-3">
                                    <User className="h-8 w-8 text-gray-400" />
                                  </div>
                                )}
                                
                                {/* Username */}
                                <UserLink user={follower} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {/* Contenu des Abonnements */}
                  {followTab === 'following' && (
                    <>
                      {(following?.length || 0) === 0 ? (
                        <div className="text-center py-8">
                          <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500">Vous ne suivez personne pour le moment</p>
                          <p className="text-sm text-gray-400 mt-2">
                            Découvrez des cuisiniers talentueux à suivre !
                          </p>
                          <Button 
                            onClick={() => window.location.href = '/search'} 
                            className="mt-4"
                          >
                            Découvrir des utilisateurs
                          </Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {(following || []).map((followedUser) => (
                            <div
                              key={followedUser.id}
                              className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
                            >
                              <div className="flex flex-col items-center text-center">
                                {/* Avatar */}
                                {followedUser.avatar ? (
                                  <img
                                    src={getFullImageUrl(followedUser.avatar)}
                                    alt={followedUser.username}
                                    className="w-16 h-16 rounded-full object-cover mb-3"
                                  />
                                ) : (
                                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-3">
                                    <User className="h-8 w-8 text-gray-400" />
                                  </div>
                                )}
                                
                                {/* Username */}
                                <UserLink user={followedUser} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <PasswordChangeForm 
              onSuccess={() => {
                // Optionnel : vous pouvez ajouter une notification ou autre action
                console.log('Mot de passe mis à jour avec succès');
              }}
            />
            
            {/* Autres options de sécurité peuvent être ajoutées ici */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Informations de sécurité</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">Dernière connexion</span>
                    <span className="text-sm font-medium">
                      {user?.updated_at ? formatDate(user.updated_at) : 'Non disponible'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">Compte créé</span>
                    <span className="text-sm font-medium">
                      {user?.created_at ? formatDate(user.created_at) : 'Non disponible'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">Status du compte</span>
                    <span className={`text-sm font-medium ${user?.is_active ? 'text-green-600' : 'text-red-600'}`}>
                      {user?.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recipe List Modal */}
        <RecipeListModal
          isOpen={isListModalOpen}
          onClose={() => {
            setIsListModalOpen(false);
            setEditingList(null);
          }}
          onSuccess={(newList) => {
            if (editingList) {
              // Mise à jour d'une liste existante
              setRecipeLists(prev => prev.map(l => l.id === newList.id ? newList : l));
            } else {
              // Nouvelle liste
              setRecipeLists(prev => [newList, ...prev]);
            }
          }}
          editingList={editingList}
        />

        {/* Recipe List Detail Modal */}
        <RecipeListDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedList(null);
          }}
          list={selectedList}
          canEdit={true} // L'utilisateur peut modifier ses propres listes
          onRecipeRemoved={handleRecipeRemovedFromList}
        />
      </div>
    </Layout>
  );
};
