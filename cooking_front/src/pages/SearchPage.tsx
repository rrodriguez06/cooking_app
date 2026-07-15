import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, Star, X, ChefHat, SlidersHorizontal } from 'lucide-react';
import { Card, CardContent, Button, Input, SmartSearchBar, Pagination, RecipeCard } from '../components';
import type { SearchSuggestion } from '../components/SmartSearchBar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '../components/ui/sheet';
import { SegmentedControl } from '../components/ui/segmented-control';
import { MultiSelect } from '../components/ui/combobox';
import { Skeleton } from '../components/ui/skeleton';
import { recipeService, categoryService, tagService, ingredientService, equipmentService, userService } from '../services';
import { useDebounce, usePagination } from '../hooks';
import type { Recipe, SearchFilters, Category, Tag, Ingredient, Equipment, User } from '../types';

const difficultyLabels: Record<string, string> = { easy: 'Facile', medium: 'Moyen', hard: 'Difficile' };

interface ActiveChip {
  key: string;
  label: string;
  onRemove: () => void;
}

/** Puce de filtre actif, uniforme et retirable. */
const FilterChip: React.FC<{ label: string; onRemove: () => void }> = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
    {label}
    <button type="button" onClick={onRemove} className="rounded-full text-primary/70 hover:text-primary" aria-label={`Retirer ${label}`}>
      <X className="h-3.5 w-3.5" />
    </button>
  </span>
);

/** Grille de squelettes pendant le chargement des résultats. */
const ResultsSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    {Array.from({ length: 8 }).map((_, index) => (
      <Card key={index} className="overflow-hidden">
        <Skeleton className="h-48 w-full rounded-none" />
        <CardContent className="space-y-3 p-4">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-1/2" />
        </CardContent>
      </Card>
    ))}
  </div>
);

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [showFilters, setShowFilters] = useState(false);
  const [smartSearchFilters, setSmartSearchFilters] = useState<SearchSuggestion[]>([]);

  const pagination = usePagination(1);

  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [filters, setFilters] = useState<SearchFilters>({
    difficulty: (searchParams.get('difficulty') as SearchFilters['difficulty']) || undefined,
    max_prep_time: searchParams.get('max_prep_time') ? parseInt(searchParams.get('max_prep_time')!) : undefined,
    max_cook_time: searchParams.get('max_cook_time') ? parseInt(searchParams.get('max_cook_time')!) : undefined,
    max_total_time: searchParams.get('max_total_time') ? parseInt(searchParams.get('max_total_time')!) : undefined,
    min_rating: searchParams.get('min_rating') ? parseFloat(searchParams.get('min_rating')!) : undefined,
    author: searchParams.get('author') || undefined,
    categories: searchParams.get('categories') ? searchParams.get('categories')!.split(',') : [],
    tags: searchParams.get('tags') ? searchParams.get('tags')!.split(',') : [],
    sort_by: searchParams.get('sort_by') || 'created_at',
    sort_order: (searchParams.get('sort_order') as 'asc' | 'desc') || 'desc',
  });

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        const [categoriesRes, tagsRes, ingredientsRes, equipmentsRes, usersRes] = await Promise.all([
          categoryService.getCategories({ limit: 100 }),
          tagService.getTags({ limit: 100 }),
          ingredientService.getIngredients({ limit: 100 }),
          equipmentService.getEquipments({ limit: 100 }),
          userService.listUsers({ limit: 100 }),
        ]);

        if (categoriesRes.success) setCategories(categoriesRes.data);
        if (tagsRes.success) setTags(tagsRes.data);
        if (ingredientsRes.success) {
          const ingredientsArray = Array.isArray(ingredientsRes.data)
            ? ingredientsRes.data
            : ingredientsRes.data.ingredients || [];
          setIngredients(ingredientsArray);
        }
        if (equipmentsRes.success) setEquipments(equipmentsRes.data);
        if (usersRes.success) setUsers(usersRes.data.users);
      } catch {
        /* données de référence indisponibles : la recherche reste fonctionnelle */
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
          page: pagination.pagination.currentPage,
          limit: 20,
        };
        const response = await recipeService.searchRecipes(searchFilters);
        if (response.success) {
          setRecipes(response.data.recipes);
          pagination.setPaginationData({
            currentPage: response.data.current_page,
            totalPages: response.data.total_pages,
            totalCount: response.data.total_count,
            hasNext: response.data.has_next,
            hasPrev: response.data.has_prev,
          });
        }
      } catch {
        setRecipes([]);
      } finally {
        setIsLoading(false);
      }
    };
    searchRecipes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchQuery, filters, pagination.pagination.currentPage]);

  const handleFilterChange = (key: keyof SearchFilters, value: unknown) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    pagination.resetPagination();
  };

  const setArrayFilter = (key: 'categories' | 'tags', values: string[]) => {
    setFilters((prev) => ({ ...prev, [key]: values }));
    pagination.resetPagination();
  };

  const handleSmartSearch = (suggestion: SearchSuggestion) => {
    setSmartSearchFilters((prev) => [...prev, suggestion]);
    const newFilters = { ...filters };
    switch (suggestion.type) {
      case 'recipe':
        newFilters.q = suggestion.value;
        break;
      case 'author':
        newFilters.author = suggestion.value;
        break;
      case 'ingredient': {
        const ingredient = ingredients.find((ing) => ing.name === suggestion.value);
        if (ingredient) newFilters.ingredients = [...(newFilters.ingredients || []), ingredient.id.toString()];
        break;
      }
      case 'equipment': {
        const equipment = equipments.find((eq) => eq.name === suggestion.value);
        if (equipment) newFilters.equipments = [...(newFilters.equipments || []), equipment.id.toString()];
        break;
      }
    }
    setFilters(newFilters);
    pagination.resetPagination();
  };

  const removeSmartSearchFilter = (index: number) => {
    const filterToRemove = smartSearchFilters[index];
    setSmartSearchFilters((prev) => prev.filter((_, i) => i !== index));
    const newFilters = { ...filters };
    switch (filterToRemove.type) {
      case 'recipe':
        delete newFilters.q;
        break;
      case 'author':
        delete newFilters.author;
        break;
      case 'ingredient': {
        const ingredient = ingredients.find((ing) => ing.name === filterToRemove.value);
        if (ingredient && newFilters.ingredients)
          newFilters.ingredients = newFilters.ingredients.filter((id) => id !== ingredient.id.toString());
        break;
      }
      case 'equipment': {
        const equipment = equipments.find((eq) => eq.name === filterToRemove.value);
        if (equipment && newFilters.equipments)
          newFilters.equipments = newFilters.equipments.filter((id) => id !== equipment.id.toString());
        break;
      }
    }
    if (filterToRemove.type === 'recipe') setSearchQuery('');
    setFilters(newFilters);
  };

  const clearFilters = () => {
    setFilters({ sort_by: 'created_at', sort_order: 'desc' });
    setSearchQuery('');
    setSmartSearchFilters([]);
    setSearchParams({});
    pagination.resetPagination();
  };

  const handlePageChange = (page: number) => {
    pagination.goToPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.difficulty) count++;
    if (filters.max_prep_time) count++;
    if (filters.max_cook_time) count++;
    if (filters.max_total_time) count++;
    if (filters.min_rating) count++;
    if (filters.author) count++;
    if (filters.categories?.length) count++;
    if (filters.tags?.length) count++;
    if (filters.ingredients?.length) count++;
    return count;
  };

  const isAlreadyInSmartFilters = (type: 'author', value: string) =>
    smartSearchFilters.some((filter) => filter.type === type && filter.value === value);

  // Toutes les puces actives (intelligentes + classiques), toutes retirables (SRCH-2).
  const buildActiveChips = (): ActiveChip[] => {
    const chips: ActiveChip[] = [];

    smartSearchFilters.forEach((filter, index) => {
      const prefix =
        filter.type === 'recipe' ? '📋 ' : filter.type === 'author' ? '👤 ' : filter.type === 'ingredient' ? '🥕 ' : '🔧 ';
      chips.push({ key: `smart-${index}`, label: `${prefix}${filter.label}`, onRemove: () => removeSmartSearchFilter(index) });
    });

    if (filters.difficulty)
      chips.push({
        key: 'difficulty',
        label: `Difficulté : ${difficultyLabels[filters.difficulty]}`,
        onRemove: () => handleFilterChange('difficulty', undefined),
      });
    if (filters.author && !isAlreadyInSmartFilters('author', filters.author))
      chips.push({ key: 'author', label: `Auteur : ${filters.author}`, onRemove: () => handleFilterChange('author', undefined) });
    if (filters.min_rating)
      chips.push({ key: 'min_rating', label: `Note ≥ ${filters.min_rating} ★`, onRemove: () => handleFilterChange('min_rating', undefined) });
    if (filters.max_prep_time)
      chips.push({ key: 'max_prep_time', label: `Prépa ≤ ${filters.max_prep_time} min`, onRemove: () => handleFilterChange('max_prep_time', undefined) });
    if (filters.max_cook_time)
      chips.push({ key: 'max_cook_time', label: `Cuisson ≤ ${filters.max_cook_time} min`, onRemove: () => handleFilterChange('max_cook_time', undefined) });
    if (filters.max_total_time)
      chips.push({ key: 'max_total_time', label: `Total ≤ ${filters.max_total_time} min`, onRemove: () => handleFilterChange('max_total_time', undefined) });

    filters.categories?.forEach((catId) => {
      const category = categories.find((c) => c.id.toString() === catId);
      if (category)
        chips.push({
          key: `category-${catId}`,
          label: category.name,
          onRemove: () => setArrayFilter('categories', (filters.categories || []).filter((id) => id !== catId)),
        });
    });
    filters.tags?.forEach((tagId) => {
      const tag = tags.find((t) => t.id.toString() === tagId);
      if (tag)
        chips.push({
          key: `tag-${tagId}`,
          label: tag.name,
          onRemove: () => setArrayFilter('tags', (filters.tags || []).filter((id) => id !== tagId)),
        });
    });

    return chips;
  };

  const activeChips = buildActiveChips();
  const activeCount = getActiveFiltersCount();
  const totalCount = pagination.pagination.totalCount || recipes.length;

  return (
    <>
      <div className="space-y-6">
        {/* En-tête */}
        <div className="text-center">
          <h1 className="mb-2 font-display text-3xl font-bold">Rechercher des recettes</h1>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Trouvez la recette parfaite selon vos goûts et vos contraintes.
          </p>
        </div>

        {/* Barre de recherche + bouton filtres */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex-1">
                <SmartSearchBar
                  onSearch={handleSmartSearch}
                  ingredients={ingredients}
                  equipments={equipments}
                  users={users}
                  placeholder="Rechercher une recette, un auteur, un ingrédient…"
                />
              </div>
              <Button variant="outline" onClick={() => setShowFilters(true)} className="relative gap-2 sm:w-auto">
                <Filter className="h-4 w-4" />
                Filtres
                {activeCount > 0 && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-xs font-semibold text-primary-foreground">
                    {activeCount}
                  </span>
                )}
              </Button>
            </div>

            {/* Puces actives */}
            {activeChips.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {activeChips.map((chip) => (
                  <FilterChip key={chip.key} label={chip.label} onRemove={chip.onRemove} />
                ))}
                <button
                  type="button"
                  onClick={clearFilters}
                  className="ml-1 text-sm font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  Tout effacer
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Résultats */}
        <div>
          {isLoading ? (
            <ResultsSkeleton />
          ) : recipes.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="mb-4 grid h-20 w-20 place-items-center rounded-full bg-muted">
                <ChefHat className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="mb-1 text-xl font-semibold">Aucune recette trouvée</h3>
              <p className="mb-6 text-muted-foreground">Essayez d'élargir ou de modifier vos critères.</p>
              <Button onClick={clearFilters}>Voir toutes les recettes</Button>
            </div>
          ) : (
            <>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  {totalCount} recette{totalCount > 1 ? 's' : ''} trouvée{totalCount > 1 ? 's' : ''}
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {recipes.map((recipe) => (
                  <RecipeCard key={recipe.id} recipe={recipe} />
                ))}
              </div>

              <Pagination
                currentPage={pagination.pagination.currentPage}
                totalPages={pagination.pagination.totalPages}
                totalCount={pagination.pagination.totalCount}
                onPageChange={handlePageChange}
                itemsPerPage={20}
                className="mt-8"
              />
            </>
          )}
        </div>
      </div>

      {/* Tiroir latéral de filtres */}
      <Sheet open={showFilters} onOpenChange={setShowFilters}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-primary" />
              Filtres
            </SheetTitle>
            <SheetDescription>Affinez les résultats sans quitter la page.</SheetDescription>
          </SheetHeader>

          <div className="-mx-1 flex-1 space-y-6 overflow-y-auto px-1 py-2">
            {/* Difficulté */}
            <div>
              <span className="mb-2 block text-sm font-medium text-foreground">Difficulté</span>
              <SegmentedControl
                aria-label="Difficulté"
                value={filters.difficulty ?? 'all'}
                onValueChange={(v) => handleFilterChange('difficulty', v === 'all' ? undefined : v)}
                className="w-full"
                options={[
                  { value: 'all', label: 'Toutes' },
                  { value: 'easy', label: 'Facile' },
                  { value: 'medium', label: 'Moyen' },
                  { value: 'hard', label: 'Difficile' },
                ]}
              />
            </div>

            {/* Note minimale */}
            <div>
              <span className="mb-2 block text-sm font-medium text-foreground">Note minimale</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => handleFilterChange('min_rating', rating === filters.min_rating ? undefined : rating)}
                    className={`rounded p-1 transition-colors ${
                      filters.min_rating && rating <= filters.min_rating ? 'text-amber-400' : 'text-muted-foreground/40 hover:text-amber-400'
                    }`}
                    aria-label={`${rating} étoile${rating > 1 ? 's' : ''} minimum`}
                  >
                    <Star className="h-6 w-6 fill-current" />
                  </button>
                ))}
                {filters.min_rating ? (
                  <span className="ml-2 text-sm text-muted-foreground">{filters.min_rating}+ étoiles</span>
                ) : null}
              </div>
            </div>

            {/* Temps */}
            <div>
              <span className="mb-2 block text-sm font-medium text-foreground">Temps maximum (minutes)</span>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  type="number"
                  min="0"
                  placeholder="Prépa"
                  aria-label="Préparation max"
                  value={filters.max_prep_time ?? ''}
                  onChange={(e) => handleFilterChange('max_prep_time', e.target.value ? parseInt(e.target.value) : undefined)}
                />
                <Input
                  type="number"
                  min="0"
                  placeholder="Cuisson"
                  aria-label="Cuisson max"
                  value={filters.max_cook_time ?? ''}
                  onChange={(e) => handleFilterChange('max_cook_time', e.target.value ? parseInt(e.target.value) : undefined)}
                />
                <Input
                  type="number"
                  min="0"
                  placeholder="Total"
                  aria-label="Temps total max"
                  value={filters.max_total_time ?? ''}
                  onChange={(e) => handleFilterChange('max_total_time', e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </div>
            </div>

            {/* Catégories */}
            <div>
              <span className="mb-2 block text-sm font-medium text-foreground">Catégories</span>
              <MultiSelect
                options={categories.map((c) => ({ value: c.id.toString(), label: c.name }))}
                values={filters.categories || []}
                onChange={(vals) => setArrayFilter('categories', vals)}
                placeholder="Toutes les catégories"
                addLabel="Ajouter une catégorie"
                searchPlaceholder="Rechercher une catégorie…"
              />
            </div>

            {/* Tags */}
            <div>
              <span className="mb-2 block text-sm font-medium text-foreground">Tags</span>
              <MultiSelect
                options={tags.map((t) => ({ value: t.id.toString(), label: t.name }))}
                values={filters.tags || []}
                onChange={(vals) => setArrayFilter('tags', vals)}
                placeholder="Tous les tags"
                addLabel="Ajouter un tag"
                searchPlaceholder="Rechercher un tag…"
              />
            </div>

            {/* Tri */}
            <div>
              <span className="mb-2 block text-sm font-medium text-foreground">Trier par</span>
              <div className="flex gap-2">
                <select
                  value={filters.sort_by || 'created_at'}
                  onChange={(e) => handleFilterChange('sort_by', e.target.value)}
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="desc">Décroissant</option>
                  <option value="asc">Croissant</option>
                </select>
              </div>
            </div>
          </div>

          <SheetFooter className="border-t border-border pt-4">
            <Button variant="ghost" onClick={clearFilters} className="gap-2">
              <X className="h-4 w-4" />
              Tout effacer
            </Button>
            <Button onClick={() => setShowFilters(false)}>Voir les {totalCount} résultats</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
};
