import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Layout, Card, CardContent, Button, RecipeActions, UserLink } from '../components';
import { recipeService, categoryService, tagService, ingredientService, equipmentService } from '../services';
import { useDebounce } from '../hooks';
import { formatTime } from '../utils';
import { getFullImageUrl } from '../utils/imageUtils';
import type { Recipe, SearchFilters, Category, Tag, Ingredient, Equipment } from '../types';
import { Search, Filter, Clock, Users, ChefHat, Star, X, ChevronDown, ChevronUp } from 'lucide-react';

const RecipeCard: React.FC<{ recipe: Recipe }> = ({ recipe }) => (
  <Card className="hover:shadow-lg transition-shadow duration-200 group">
    <Link to={`/recipe/${recipe.id}`} className="block">
      <div className="aspect-w-16 aspect-h-9">
        {recipe.image_url ? (
          <img
            src={getFullImageUrl(recipe.image_url)}
            alt={recipe.title}
            className="w-full h-48 object-cover rounded-t-lg group-hover:scale-105 transition-transform duration-200"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement!.innerHTML = `
                <div class="w-full h-48 bg-gray-200 rounded-t-lg flex items-center justify-center">
                  <svg class="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253z" />
                  </svg>
                </div>
              `;
            }}
          />
        ) : (
          <div className="w-full h-48 bg-gray-200 rounded-t-lg flex items-center justify-center">
            <ChefHat className="h-12 w-12 text-gray-400" />
          </div>
        )}
      </div>
      
      <CardContent className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
          {recipe.title}
        </h3>
        
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
            <span>{recipe.servings}</span>
          </div>
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
      </CardContent>
    </Link>
    
    {/* Section auteur en dehors du lien principal */}
    <CardContent className="px-4 pb-2 pt-0">
      <span className="text-sm text-gray-500">Par <UserLink user={recipe.author} /></span>
    </CardContent>
    
    {/* Actions en dehors du lien pour éviter les conflits */}
    <div className="px-4 pb-4 -mt-2">
      <RecipeActions recipeId={recipe.id} size="sm" showLabels={false} />
    </div>
  </Card>
);

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [showFilters, setShowFilters] = useState(false);
  
  // Reference data
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);

  const [filters, setFilters] = useState<SearchFilters>({
    difficulty: searchParams.get('difficulty') as any || undefined,
    max_prep_time: searchParams.get('max_prep_time') ? parseInt(searchParams.get('max_prep_time')!) : undefined,
    max_cook_time: searchParams.get('max_cook_time') ? parseInt(searchParams.get('max_cook_time')!) : undefined,
    max_total_time: searchParams.get('max_total_time') ? parseInt(searchParams.get('max_total_time')!) : undefined,
    min_rating: searchParams.get('min_rating') ? parseFloat(searchParams.get('min_rating')!) : undefined,
    categories: searchParams.get('categories') ? searchParams.get('categories')!.split(',') : [],
    tags: searchParams.get('tags') ? searchParams.get('tags')!.split(',') : [],
    ingredients: searchParams.get('ingredients') ? searchParams.get('ingredients')!.split(',') : [],
    equipments: searchParams.get('equipments') ? searchParams.get('equipments')!.split(',') : [],
    sort_by: searchParams.get('sort_by') || 'created_at',
    sort_order: searchParams.get('sort_order') as 'asc' | 'desc' || 'desc',
  });

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Load reference data on component mount
  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        const [categoriesRes, tagsRes, ingredientsRes, equipmentsRes] = await Promise.all([
          categoryService.getCategories({ limit: 100 }),
          tagService.getTags({ limit: 100 }),
          ingredientService.getIngredients({ limit: 100 }),
          equipmentService.getEquipments({ limit: 100 }),
        ]);

        if (categoriesRes.success) setCategories(categoriesRes.data);
        if (tagsRes.success) setTags(tagsRes.data);
        if (ingredientsRes.success) setIngredients(ingredientsRes.data);
        if (equipmentsRes.success) setEquipments(equipmentsRes.data);
      } catch (error) {
        console.error('Error loading reference data:', error);
      }
    };

    loadReferenceData();
  }, []);

  useEffect(() => {
    const searchRecipes = async () => {
      setIsLoading(true);
      try {
        const searchFilters: SearchFilters = {
          q: debouncedSearchQuery || undefined,
          ...filters,
          page: 1,
          limit: 20,
        };

        const response = await recipeService.searchRecipes(searchFilters);
        if (response.success) {
          setRecipes(response.data.recipes);
        }
      } catch (error) {
        console.error('Error searching recipes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    searchRecipes();
  }, [debouncedSearchQuery, filters]);

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleMultiSelectChange = (key: keyof SearchFilters, value: string, checked: boolean) => {
    setFilters(prev => {
      const currentArray = (prev[key] as string[]) || [];
      if (checked) {
        return { ...prev, [key]: [...currentArray, value] };
      } else {
        return { ...prev, [key]: currentArray.filter(item => item !== value) };
      }
    });
  };

  const clearFilters = () => {
    setFilters({
      sort_by: 'created_at',
      sort_order: 'desc'
    });
    setSearchQuery('');
    setSearchParams({});
  };

  const removeFilter = (key: keyof SearchFilters, value?: string) => {
    if (value && Array.isArray(filters[key])) {
      handleMultiSelectChange(key, value, false);
    } else {
      handleFilterChange(key, undefined);
    }
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.difficulty) count++;
    if (filters.max_prep_time) count++;
    if (filters.max_cook_time) count++;
    if (filters.max_total_time) count++;
    if (filters.min_rating) count++;
    if (filters.categories?.length) count++;
    if (filters.tags?.length) count++;
    if (filters.ingredients?.length) count++;
    if (filters.equipments?.length) count++;
    return count;
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Search Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Rechercher des recettes</h1>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Trouvez la recette parfaite selon vos goûts et contraintes
          </p>
        </div>

        {/* Search Bar */}
        <Card>
          <CardContent className="p-6">
            <div className="flex space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher par nom, ingrédient..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={() => setShowFilters(!showFilters)}
                className="relative"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtres
                {getActiveFiltersCount() > 0 && (
                  <span className="absolute -top-2 -right-2 bg-primary-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {getActiveFiltersCount()}
                  </span>
                )}
              </Button>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="mt-6 p-6 bg-gray-50 rounded-lg">
                {/* Quick filter tags */}
                <div className="mb-6">
                  <div className="flex flex-wrap gap-2">
                    {filters.difficulty && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                        Difficulté: {filters.difficulty === 'easy' ? 'Facile' : filters.difficulty === 'medium' ? 'Moyen' : 'Difficile'}
                        <button
                          onClick={() => removeFilter('difficulty')}
                          className="ml-2 hover:text-blue-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                    {filters.min_rating && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
                        Note min: {filters.min_rating} ⭐
                        <button
                          onClick={() => removeFilter('min_rating')}
                          className="ml-2 hover:text-yellow-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                    {filters.max_total_time && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                        Max {filters.max_total_time}min
                        <button
                          onClick={() => removeFilter('max_total_time')}
                          className="ml-2 hover:text-green-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                    {filters.categories?.map(catId => {
                      const category = categories.find(c => c.id.toString() === catId);
                      return category ? (
                        <span key={catId} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                          {category.name}
                          <button
                            onClick={() => removeFilter('categories', catId)}
                            className="ml-2 hover:text-purple-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ) : null;
                    })}
                    {filters.tags?.map(tagId => {
                      const tag = tags.find(t => t.id.toString() === tagId);
                      return tag ? (
                        <span key={tagId} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-800">
                          {tag.name}
                          <button
                            onClick={() => removeFilter('tags', tagId)}
                            className="ml-2 hover:text-indigo-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ) : null;
                    })}
                    {filters.ingredients?.map(ingId => {
                      const ingredient = ingredients.find(i => i.id.toString() === ingId);
                      return ingredient ? (
                        <span key={ingId} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800">
                          🥕 {ingredient.name}
                          <button
                            onClick={() => removeFilter('ingredients', ingId)}
                            className="ml-2 hover:text-orange-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ) : null;
                    })}
                    {filters.equipments?.map(eqId => {
                      const equipment = equipments.find(e => e.id.toString() === eqId);
                      return equipment ? (
                        <span key={eqId} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
                          🔧 {equipment.name}
                          <button
                            onClick={() => removeFilter('equipments', eqId)}
                            className="ml-2 hover:text-gray-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>

                {/* Filter Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column - Basic Filters */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Critères de base</h3>
                    
                    {/* Difficulty */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Difficulté
                      </label>
                      <select
                        value={filters.difficulty || ''}
                        onChange={(e) => handleFilterChange('difficulty', e.target.value || undefined)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">Toutes</option>
                        <option value="easy">Facile</option>
                        <option value="medium">Moyen</option>
                        <option value="hard">Difficile</option>
                      </select>
                    </div>

                    {/* Rating */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Note minimale
                      </label>
                      <div className="flex items-center space-x-2">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button
                            key={rating}
                            onClick={() => handleFilterChange('min_rating', rating === filters.min_rating ? undefined : rating)}
                            className={`p-1 rounded ${
                              filters.min_rating && rating <= filters.min_rating
                                ? 'text-yellow-400'
                                : 'text-gray-300 hover:text-yellow-400'
                            }`}
                          >
                            <Star className="h-6 w-6 fill-current" />
                          </button>
                        ))}
                        {filters.min_rating && (
                          <span className="text-sm text-gray-600 ml-2">
                            {filters.min_rating}+ étoiles
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Sort */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Trier par
                      </label>
                      <div className="flex space-x-2">
                        <select
                          value={filters.sort_by || 'created_at'}
                          onChange={(e) => handleFilterChange('sort_by', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="created_at">Date de création</option>
                          <option value="title">Nom</option>
                          <option value="total_time">Temps total</option>
                          <option value="average_rating">Note</option>
                          <option value="difficulty">Difficulté</option>
                          <option value="popularity">Popularité</option>
                        </select>
                        <select
                          value={filters.sort_order || 'desc'}
                          onChange={(e) => handleFilterChange('sort_order', e.target.value as 'asc' | 'desc')}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="desc">Décroissant</option>
                          <option value="asc">Croissant</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Middle Column - Time Filters */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Temps (minutes)</h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Temps de préparation max
                      </label>
                      <input
                        type="number"
                        placeholder="30"
                        value={filters.max_prep_time || ''}
                        onChange={(e) => handleFilterChange('max_prep_time', e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Temps de cuisson max
                      </label>
                      <input
                        type="number"
                        placeholder="60"
                        value={filters.max_cook_time || ''}
                        onChange={(e) => handleFilterChange('max_cook_time', e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Temps total max
                      </label>
                      <input
                        type="number"
                        placeholder="90"
                        value={filters.max_total_time || ''}
                        onChange={(e) => handleFilterChange('max_total_time', e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>

                  {/* Right Column - Advanced Filters */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Filtres avancés</h3>
                    
                    {/* Categories */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Catégories
                        <button
                          type="button"
                          className="ml-2 text-xs text-primary-600 hover:text-primary-700"
                          onClick={() => setShowFilters(!showFilters)}
                        >
                          {showFilters ? <ChevronUp className="h-3 w-3 inline" /> : <ChevronDown className="h-3 w-3 inline" />}
                        </button>
                      </label>
                      <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2">
                        {categories.map((category) => (
                          <label key={category.id} className="flex items-center space-x-2 py-1">
                            <input
                              type="checkbox"
                              checked={filters.categories?.includes(category.id.toString()) || false}
                              onChange={(e) => handleMultiSelectChange('categories', category.id.toString(), e.target.checked)}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-sm text-gray-700">{category.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Tags */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tags
                      </label>
                      <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2">
                        {tags.map((tag) => (
                          <label key={tag.id} className="flex items-center space-x-2 py-1">
                            <input
                              type="checkbox"
                              checked={filters.tags?.includes(tag.id.toString()) || false}
                              onChange={(e) => handleMultiSelectChange('tags', tag.id.toString(), e.target.checked)}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-sm text-gray-700">{tag.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Filters - Ingredients & Equipment */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <details className="group">
                    <summary className="flex justify-between items-center cursor-pointer text-lg font-medium text-gray-900 mb-4">
                      <span>Ingrédients et équipements</span>
                      <ChevronDown className="h-5 w-5 text-gray-500 group-open:rotate-180 transition-transform" />
                    </summary>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                      {/* Ingredients */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Ingrédients requis
                        </label>
                        <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
                          {ingredients.map((ingredient) => (
                            <label key={ingredient.id} className="flex items-center space-x-2 py-1">
                              <input
                                type="checkbox"
                                checked={filters.ingredients?.includes(ingredient.id.toString()) || false}
                                onChange={(e) => handleMultiSelectChange('ingredients', ingredient.id.toString(), e.target.checked)}
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                              <span className="text-sm text-gray-700">{ingredient.name}</span>
                              {ingredient.category && (
                                <span className="text-xs text-gray-500">({ingredient.category})</span>
                              )}
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Equipment */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Équipements disponibles
                        </label>
                        <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
                          {equipments.map((equipment) => (
                            <label key={equipment.id} className="flex items-center space-x-2 py-1">
                              <input
                                type="checkbox"
                                checked={filters.equipments?.includes(equipment.id.toString()) || false}
                                onChange={(e) => handleMultiSelectChange('equipments', equipment.id.toString(), e.target.checked)}
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                              <span className="text-sm text-gray-700">{equipment.name}</span>
                              {equipment.category && (
                                <span className="text-xs text-gray-500">({equipment.category})</span>
                              )}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </details>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                  <Button variant="ghost" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Effacer tous les filtres
                  </Button>
                  <Button onClick={() => setShowFilters(false)}>
                    Appliquer les filtres
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        <div>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
          ) : recipes.length === 0 ? (
            <div className="text-center py-12">
              <ChefHat className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">Aucune recette trouvée</h3>
              <p className="text-gray-600 mb-6">
                Essayez de modifier vos critères de recherche
              </p>
              <Button onClick={clearFilters}>
                Voir toutes les recettes
              </Button>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {recipes.length} recette{recipes.length > 1 ? 's' : ''} trouvée{recipes.length > 1 ? 's' : ''}
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {recipes.map((recipe) => (
                  <RecipeCard key={recipe.id} recipe={recipe} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};
