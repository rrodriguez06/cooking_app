import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check } from 'lucide-react';
import {
  Button,
  Loading,
  AddIngredientModal,
  AddEquipmentModal,
  RecipePhotoImport,
} from '../components';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { toast } from '../components/ui/sonner';
import {
  recipeFormSchema,
  emptyRecipeForm,
  type RecipeFormData,
  draftKey,
  loadRecipeDraft,
  clearRecipeDraft,
  useAutosave,
  ActionBar,
  EssentialsSection,
  DetailsSection,
  IngredientsEditor,
  StepsEditor,
  ClassificationSection,
  RecipePreview,
} from '../components/recipe-form';
import { recipeService } from '../services/recipe';
import { categoryService, tagService, ingredientService, equipmentService } from '../services/data';
import type { RecipeCreateRequest, Category, Tag, Ingredient, Equipment, Recipe } from '../types';
import type { ExtractedRecipeData } from '../services/recipeExtractionService';

/** Transforme une recette chargée en valeurs de formulaire. */
function recipeToForm(recipe: Recipe): RecipeFormData {
  return {
    title: recipe.title,
    description: recipe.description || '',
    image_url: recipe.image_url || '',
    prep_time: recipe.prep_time,
    cook_time: recipe.cook_time,
    servings: recipe.servings,
    difficulty: recipe.difficulty,
    is_public: recipe.is_public,
    tag_ids: recipe.tags?.map((t) => t.id) || [],
    category_ids: recipe.categories?.map((c) => c.id) || [],
    equipment_ids: recipe.equipments?.map((e) => e.equipment_id) || [],
    ingredients: recipe.ingredients?.length
      ? recipe.ingredients.map((ing) => ({
          ingredient_id: ing.ingredient_id,
          quantity: ing.quantity,
          unit: ing.unit || '',
          notes: ing.notes || '',
          group: ing.group || '',
        }))
      : emptyRecipeForm.ingredients,
    instructions: recipe.instructions?.length
      ? recipe.instructions.map((inst, index) => ({
          step_number: index + 1,
          title: inst.title || '',
          description: inst.description,
          duration: inst.duration || undefined,
          temperature: inst.temperature || undefined,
          tips: inst.tips || '',
          referenced_recipe_id: inst.referenced_recipe_id ? String(inst.referenced_recipe_id) : '',
        }))
      : emptyRecipeForm.instructions,
  };
}

export const RecipeEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isCreatingNew = !id;
  const key = draftKey(id);

  const [initialLoading, setInitialLoading] = useState(!isCreatingNew);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  const [showAddIngredientModal, setShowAddIngredientModal] = useState(false);
  const [showAddEquipmentModal, setShowAddEquipmentModal] = useState(false);
  const [showPhotoImportModal, setShowPhotoImportModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const methods = useForm<RecipeFormData>({
    resolver: zodResolver(recipeFormSchema),
    defaultValues: emptyRecipeForm,
  });
  const { handleSubmit, reset, watch, setValue, formState } = methods;

  const savedAt = useAutosave({ key, watch, enabled: true });

  // Chargement des données de référence (+ recette en édition, ou brouillon en création).
  useEffect(() => {
    const fetchAllIngredients = async (): Promise<Ingredient[]> => {
      let all: Ingredient[] = [];
      let page = 1;
      let hasMore = true;
      const limit = 50;

      while (hasMore) {
        try {
          const response = await ingredientService.getIngredients({ page, limit });
          if (!response.success) break;

          if (Array.isArray(response.data)) {
            all = all.concat(response.data);
            hasMore = false;
          } else if (response.data && typeof response.data === 'object') {
            const paged = response.data as {
              ingredients?: Ingredient[];
              total_pages?: number;
              has_next?: boolean;
            };
            if (paged.ingredients && Array.isArray(paged.ingredients)) {
              all = all.concat(paged.ingredients);
              if (paged.has_next === false || paged.ingredients.length < limit) hasMore = false;
              else if (paged.total_pages && page >= paged.total_pages) hasMore = false;
              else page++;
            } else {
              hasMore = false;
            }
          } else {
            hasMore = false;
          }
        } catch {
          hasMore = false;
        }
      }
      return all;
    };

    const loadData = async () => {
      try {
        const [categoriesResponse, tagsResponse, equipmentsResponse, recipesResponse, allIngredients] =
          await Promise.all([
            categoryService.getCategories({ limit: 100 }).catch(() => ({ success: false, data: [] })),
            tagService.getTags({ limit: 100 }).catch(() => ({ success: false, data: [] })),
            equipmentService.getEquipments({ limit: 100 }).catch(() => ({ success: false, data: [] })),
            recipeService.searchRecipes({}).catch(() => ({ success: false, data: { recipes: [] } })),
            fetchAllIngredients(),
          ]);

        setCategories(Array.isArray(categoriesResponse.data) ? categoriesResponse.data : []);
        setTags(Array.isArray(tagsResponse.data) ? tagsResponse.data : []);
        setEquipments(Array.isArray(equipmentsResponse.data) ? equipmentsResponse.data : []);
        setRecipes(Array.isArray(recipesResponse.data?.recipes) ? recipesResponse.data.recipes : []);
        setIngredients(Array.isArray(allIngredients) ? allIngredients : []);

        if (id) {
          const recipeResponse = await recipeService.getRecipe(parseInt(id));
          reset(recipeToForm(recipeResponse.data));
        } else {
          const draft = loadRecipeDraft(key);
          if (draft) {
            reset(draft.data);
            toast('Brouillon restauré', {
              description: 'Nous avons retrouvé votre saisie en cours.',
            });
          }
        }
      } catch {
        toast.error('Impossible de charger les données du formulaire.');
      } finally {
        setInitialLoading(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onSubmit = async (data: RecipeFormData) => {
    try {
      const payload: RecipeCreateRequest = {
        title: data.title.trim(),
        description: data.description ? data.description.trim() : '',
        image_url: data.image_url || undefined,
        prep_time: data.prep_time,
        cook_time: data.cook_time,
        servings: data.servings,
        difficulty: data.difficulty,
        is_public: data.is_public,
        tag_ids: data.tag_ids,
        category_ids: data.category_ids,
        ingredients: data.ingredients.map((ing) => ({
          ingredient_id: ing.ingredient_id,
          quantity: ing.quantity,
          unit: ing.unit || '',
          notes: ing.notes || '',
          group: ing.group?.trim() || '',
        })),
        equipments: data.equipment_ids.map((equipment_id) => ({
          equipment_id,
          is_optional: false,
          notes: '',
        })),
        instructions: data.instructions.map((inst, index) => ({
          step_number: index + 1,
          title: inst.title || '',
          description: inst.description,
          duration: inst.duration,
          temperature: inst.temperature,
          tips: inst.tips || '',
          referenced_recipe_id: inst.referenced_recipe_id
            ? parseInt(inst.referenced_recipe_id)
            : undefined,
        })),
      };

      const recipeId = id
        ? (await recipeService.updateRecipe(parseInt(id), payload)).data.id
        : (await recipeService.createRecipe(payload)).data.id;

      clearRecipeDraft(key);
      reset(data); // marque le formulaire comme « propre » (désactive la garde de sortie)
      toast.success(id ? 'Recette mise à jour !' : 'Recette créée !');
      navigate(`/recipe/${recipeId}`);
    } catch {
      toast.error("Erreur lors de l'enregistrement. Vos saisies sont conservées.");
    }
  };

  const submit = useCallback(() => handleSubmit(onSubmit)(), [handleSubmit]); // eslint-disable-line react-hooks/exhaustive-deps

  // Raccourcis : ⌘/Ctrl+S et ⌘/Ctrl+Entrée pour enregistrer.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'Enter')) {
        e.preventDefault();
        submit();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [submit]);

  // Garde « modifications non enregistrées » à la fermeture/rafraîchissement.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (formState.isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [formState.isDirty]);

  const handleRecipeExtracted = (extracted: ExtractedRecipeData) => {
    const mappedIngredients = extracted.ingredients.map((ing) => {
      const match = findBestMatchingIngredient(ing.name, ingredients);
      return {
        ingredient_id: match?.id || 0,
        quantity: ing.quantity,
        unit: ing.unit || '',
        notes: ing.notes || '',
        group: '',
      };
    });

    setValue('title', extracted.title, { shouldDirty: true });
    setValue('description', extracted.description || '', { shouldDirty: true });
    setValue('prep_time', extracted.prep_time, { shouldDirty: true });
    setValue('cook_time', extracted.cook_time, { shouldDirty: true });
    setValue('servings', extracted.servings, { shouldDirty: true });
    setValue('difficulty', extracted.difficulty, { shouldDirty: true });
    if (mappedIngredients.length) setValue('ingredients', mappedIngredients, { shouldDirty: true });
    setValue(
      'instructions',
      extracted.instructions.map((inst, index) => ({
        step_number: index + 1,
        title: inst.title || '',
        description: inst.description,
        duration: inst.duration || undefined,
        temperature: inst.temperature || undefined,
        tips: inst.tips || '',
        referenced_recipe_id: '',
      })),
      { shouldDirty: true },
    );
    setShowPhotoImportModal(false);
    toast.success('Recette importée', { description: 'Vérifiez et ajustez les détails.' });
  };

  if (initialLoading) return <Loading />;

  const submitLabel = isCreatingNew ? 'Créer la recette' : 'Enregistrer';

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="min-h-screen pb-16">
        <ActionBar
          title={isCreatingNew ? 'Nouvelle recette' : 'Modifier la recette'}
          isSubmitting={formState.isSubmitting}
          savedAt={savedAt}
          isDirty={formState.isDirty}
          submitLabel={submitLabel}
          onBack={() => navigate(-1)}
          onTogglePreview={() => setShowPreview(true)}
        />

        <div className="mx-auto max-w-7xl space-y-6 px-4">
          {/* Mise en place : l'essentiel & les détails côte à côte, pleine largeur */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <EssentialsSection isCreating={isCreatingNew} onImportPhoto={() => setShowPhotoImportModal(true)} />
            <DetailsSection />
          </div>

          {/* Espace de travail : ingrédients (collants, visibles pendant l'écriture
              des étapes) ⇆ étapes. Chaque colonne défile indépendamment. */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.25fr)]">
            <div>
              <div className="xl:sticky xl:top-24">
                <IngredientsEditor ingredients={ingredients} onCreateIngredient={() => setShowAddIngredientModal(true)} />
              </div>
            </div>
            <StepsEditor recipes={recipes} currentRecipeId={id ? parseInt(id) : undefined} />
          </div>

          <ClassificationSection
            categories={categories}
            tags={tags}
            equipments={equipments}
            onCreateEquipment={() => setShowAddEquipmentModal(true)}
          />

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
              Annuler
            </Button>
            <Button type="submit" isLoading={formState.isSubmitting} className="gap-1.5">
              <Check className="h-4 w-4" />
              {submitLabel}
            </Button>
          </div>
        </div>
      </form>

      {/* Aperçu sur mobile / tablette */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aperçu de la recette</DialogTitle>
          </DialogHeader>
          <RecipePreview />
        </DialogContent>
      </Dialog>

      {/* Modales de création */}
      <AddIngredientModal
        isOpen={showAddIngredientModal}
        onClose={() => setShowAddIngredientModal(false)}
        onSuccess={(ingredient: Ingredient) => {
          setIngredients((prev) => [...prev, ingredient]);
          setShowAddIngredientModal(false);
        }}
      />

      <AddEquipmentModal
        isOpen={showAddEquipmentModal}
        onClose={() => setShowAddEquipmentModal(false)}
        onSuccess={(equipment: Equipment) => {
          setEquipments((prev) => [...prev, equipment]);
          setShowAddEquipmentModal(false);
        }}
      />

      {showPhotoImportModal && (
        <RecipePhotoImport
          onRecipeExtracted={handleRecipeExtracted}
          onClose={() => setShowPhotoImportModal(false)}
        />
      )}
    </FormProvider>
  );
};

/** Trouve l'ingrédient existant le plus proche d'un nom extrait. */
function findBestMatchingIngredient(extractedName: string, ingredients: Ingredient[]): Ingredient | null {
  if (!ingredients.length) return null;
  const normalized = extractedName.toLowerCase().trim();

  let match = ingredients.find((ing) => ing.name.toLowerCase() === normalized);
  if (match) return match;

  match = ingredients.find(
    (ing) =>
      ing.name.toLowerCase().includes(normalized) || normalized.includes(ing.name.toLowerCase()),
  );
  if (match) return match;

  const words = normalized.split(' ');
  match = ingredients.find((ing) => {
    const ingWords = ing.name.toLowerCase().split(' ');
    return words.some(
      (word) => word.length > 2 && ingWords.some((iw) => iw.includes(word) || word.includes(iw)),
    );
  });
  return match || null;
}
