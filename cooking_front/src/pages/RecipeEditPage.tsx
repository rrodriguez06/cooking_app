import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Button, Input, Card, Loading, AddIngredientModal, AddEquipmentModal, ImageUpload, IngredientSearch, RecipePhotoImport } from '../components';
import { recipeService } from '../services/recipe';
import { categoryService, tagService, ingredientService, equipmentService } from '../services/data';
import type { RecipeCreateRequest, Category, Tag, Ingredient, Equipment, Recipe } from '../types';
import type { ExtractedRecipeData } from '../services/recipeExtractionService';

const recipeSchema = z.object({
  title: z.string().min(1, 'Le titre est requis'),
  description: z.string().optional(),
  image_url: z.string().optional(),
  prep_time: z.number().min(1, 'Le temps de préparation doit être supérieur à 0'),
  cook_time: z.number().min(0, 'Le temps de cuisson doit être positif'),
  servings: z.number().min(1, 'Le nombre de portions doit être supérieur à 0'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  is_public: z.boolean(),
  tag_ids: z.array(z.number()),
  category_ids: z.array(z.number()),
  equipment_ids: z.array(z.number()),
  ingredients: z.array(z.object({
    ingredient_id: z.number().min(1, 'Un ingrédient est requis'),
    quantity: z.number().min(0, 'La quantité doit être positive'),
    unit: z.string().optional(),
    notes: z.string().optional(),
  })).min(1, 'Au moins un ingrédient est requis'),
  instructions: z.array(z.object({
    step_number: z.number().min(1),
    description: z.string().min(1, 'La description de l\'étape est requise'),
    title: z.string().optional(),
    duration: z.number().optional(),
    temperature: z.number().optional(),
    tips: z.string().optional(),
    referenced_recipe_id: z.string().optional(),
  })).min(1, 'Au moins une étape est requise'),
});

type RecipeFormData = z.infer<typeof recipeSchema>;

export const RecipeEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!id && id !== 'new');
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  
  // Vérifier si nous sommes en mode création (nouvelle recette)
  const isCreatingNew = location.pathname === '/recipe/new' || (!id || id === 'new');
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [showAddIngredientModal, setShowAddIngredientModal] = useState(false);
  const [showAddEquipmentModal, setShowAddEquipmentModal] = useState(false);
  const [showPhotoImportModal, setShowPhotoImportModal] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    getValues,
    watch
  } = useForm<RecipeFormData>({
    resolver: zodResolver(recipeSchema),
    defaultValues: {
      title: '',
      description: '',
      image_url: '',
      prep_time: 30,
      cook_time: 30,
      servings: 4,
      difficulty: 'medium',
      is_public: true,
      category_ids: [],
      tag_ids: [],
      equipment_ids: [],
      ingredients: [{ ingredient_id: 1, quantity: 0, unit: '', notes: '' }],
      instructions: [{ step_number: 1, description: '', title: '', duration: 0, temperature: 0, tips: '', referenced_recipe_id: '' }],
    }
  });

  const {
    fields: ingredientFields,
    append: addIngredient,
    remove: removeIngredient
  } = useFieldArray({
    control,
    name: 'ingredients'
  });

  const {
    fields: instructionFields,
    append: addInstruction,
    remove: removeInstruction
  } = useFieldArray({
    control,
    name: 'instructions'
  });

  // Fonctions pour déplacer les étapes
  const moveInstructionUp = (index: number) => {
    if (index === 0) return; // Déjà en haut
    
    const instructions = getValues('instructions');
    const newInstructions = [...instructions];
    
    // Échanger avec l'élément précédent
    [newInstructions[index - 1], newInstructions[index]] = [newInstructions[index], newInstructions[index - 1]];
    
    // Mettre à jour les numéros d'étapes
    newInstructions.forEach((instruction, i) => {
      instruction.step_number = i + 1;
    });
    
    setValue('instructions', newInstructions);
  };

  const moveInstructionDown = (index: number) => {
    const instructions = getValues('instructions');
    if (index === instructions.length - 1) return; // Déjà en bas
    
    const newInstructions = [...instructions];
    
    // Échanger avec l'élément suivant
    [newInstructions[index], newInstructions[index + 1]] = [newInstructions[index + 1], newInstructions[index]];
    
    // Mettre à jour les numéros d'étapes
    newInstructions.forEach((instruction, i) => {
      instruction.step_number = i + 1;
    });
    
    setValue('instructions', newInstructions);
  };

  const selectedTagIds = watch('tag_ids') || [];
  const selectedCategoryIds = watch('category_ids') || [];
  const selectedEquipmentIds = watch('equipment_ids') || [];

  useEffect(() => {
    // Fonction utilitaire pour charger tous les ingrédients paginés
    const fetchAllIngredients = async () => {
      let allIngredients: Ingredient[] = [];
      let page = 1;
      let totalPages = 1;
      const limit = 50;
      do {
        const response = await ingredientService.getIngredients({ page, limit });
        if (response.success) {
          if (Array.isArray(response.data)) {
            // API renvoie directement un tableau
            allIngredients = allIngredients.concat(response.data);
            totalPages = 1;
          } else if (response.data && Array.isArray((response.data as { ingredients: Ingredient[] }).ingredients)) {
            // API paginée
            const paged = response.data as { ingredients: Ingredient[]; total_pages?: number };
            allIngredients = allIngredients.concat(paged.ingredients);
            totalPages = paged.total_pages || 1;
          }
        }
        page++;
      } while (page <= totalPages);
      return allIngredients;
    };

    const loadData = async () => {
      console.log('RecipeEditPage: Loading data...');
      try {
        console.log('RecipeEditPage: Fetching categories, tags, ingredients, equipments, recipes...');
        const [categoriesResponse, tagsResponse, equipmentsResponse, recipesResponse, allIngredients] = await Promise.all([
          categoryService.getCategories({ limit: 100 }).catch(e => { console.error('Categories error:', e); return { success: false, data: [] }; }),
          tagService.getTags({ limit: 100 }).catch(e => { console.error('Tags error:', e); return { success: false, data: [] }; }),
          equipmentService.getEquipments({ limit: 100 }).catch(e => { console.error('Equipments error:', e); return { success: false, data: [] }; }),
          recipeService.searchRecipes({}).catch(e => { console.error('Recipes error:', e); return { success: false, data: { recipes: [] } }; }),
          fetchAllIngredients()
        ]);

        // Set data with fallbacks to empty arrays and ensure they are arrays
        const categoriesData = Array.isArray(categoriesResponse.data) ? categoriesResponse.data : [];
        const tagsData = Array.isArray(tagsResponse.data) ? tagsResponse.data : [];
        const equipmentsData = Array.isArray(equipmentsResponse.data) ? equipmentsResponse.data : [];
        const recipesData = Array.isArray(recipesResponse.data?.recipes) ? recipesResponse.data.recipes : [];
        const ingredientsData = Array.isArray(allIngredients) ? allIngredients : [];

        // Log détaillé des ingrédients récupérés (dans la portée locale)
        console.log('Ingrédients récupérés:', Array.isArray(ingredientsData) ? ingredientsData.map((ing: Ingredient) => ing.name) : []);

        setCategories(categoriesData);
        setTags(tagsData);
        setIngredients(ingredientsData);
        setEquipments(equipmentsData);
        setRecipes(recipesData);

        // S'assurer que le tableau d'ingrédients du formulaire est bien initialisé
        if (ingredientsData.length > 0) {
          const currentIngredients = getValues('ingredients');
          if (!Array.isArray(currentIngredients) || currentIngredients.length === 0) {
            setValue('ingredients', [{ ingredient_id: ingredientsData[0].id, quantity: 0, unit: '', notes: '' }]);
          } else if (!currentIngredients[0].ingredient_id) {
            setValue('ingredients.0.ingredient_id', ingredientsData[0].id);
          }
        } else {
          // Si aucun ingrédient n'est disponible, initialiser avec un id fictif
          setValue('ingredients', [{ ingredient_id: 1, quantity: 0, unit: '', notes: '' }]);
        }

        if (id && !isNaN(parseInt(id))) {
          console.log('RecipeEditPage: Loading recipe with id:', id);
          const recipeResponse = await recipeService.getRecipe(parseInt(id));
          const recipe = recipeResponse.data;
          console.log('RecipeEditPage: Recipe loaded:', recipe.title);

          setValue('title', recipe.title);
          setValue('description', recipe.description || '');
          setValue('image_url', recipe.image_url || '');
          setValue('prep_time', recipe.prep_time);
          setValue('cook_time', recipe.cook_time);
          setValue('servings', recipe.servings);
          setValue('difficulty', recipe.difficulty);
          setValue('is_public', recipe.is_public);
          setValue('tag_ids', recipe.tags?.map(tag => tag.id) || []);
          setValue('category_ids', recipe.categories?.map(cat => cat.id) || []);
          setValue('equipment_ids', recipe.equipments?.map(eq => eq.equipment_id) || []);

          if (recipe.ingredients?.length > 0) {
            setValue('ingredients', recipe.ingredients.map(ing => ({
              ingredient_id: ing.ingredient_id,
              quantity: ing.quantity,
              unit: ing.unit,
              notes: ing.notes || ''
            })));
          }

          if (recipe.instructions?.length > 0) {
            setValue('instructions', recipe.instructions.map((inst, index) => ({
              step_number: index + 1,
              description: inst.description,
              title: inst.title || '',
              duration: inst.duration || 0,
              temperature: inst.temperature || 0,
              tips: inst.tips || '',
              referenced_recipe_id: inst.referenced_recipe_id ? String(inst.referenced_recipe_id) : ''
            })));
          }
        }
      } catch (error) {
        console.error('RecipeEditPage: Erreur lors du chargement des données:', error);
        // Set fallback empty arrays in case of error
        setCategories([]);
        setTags([]);
        setIngredients([]);
        setEquipments([]);
      } finally {
        console.log('RecipeEditPage: Setting initialLoading to false');
        setInitialLoading(false);
      }
    };

    loadData();
  }, [id, setValue]);

  const onSubmit = async (data: RecipeFormData) => {
    console.log('onSubmit called with data:', data);
    setLoading(true);
    try {
      const recipeData: RecipeCreateRequest = {
        ...data,
        // Toujours envoyer la description, même si elle est vide (pour permettre la suppression)
        description: data.description ? data.description.trim() : '',
        equipments: data.equipment_ids.map(equipmentId => ({
          equipment_id: equipmentId,
          is_required: true,
          notes: ''
        })),
        instructions: data.instructions.map((instruction, index) => ({
          ...instruction,
          step_number: index + 1,
          referenced_recipe_id: instruction.referenced_recipe_id && instruction.referenced_recipe_id !== '' 
            ? (typeof instruction.referenced_recipe_id === 'string' 
                ? parseInt(instruction.referenced_recipe_id) 
                : instruction.referenced_recipe_id)
            : undefined
        }))
      };

      console.log('Recipe data prepared:', recipeData);

      let recipeId: number;
      
      if (id) {
        console.log('Updating existing recipe with ID:', id);
        const response = await recipeService.updateRecipe(parseInt(id), recipeData);
        console.log('Update response:', response);
        recipeId = response.data.id;
        console.log('Update successful, recipe ID:', recipeId);
      } else {
        console.log('Creating new recipe');
        const response = await recipeService.createRecipe(recipeData);
        console.log('Creation response:', response);
        recipeId = response.data.id;
        console.log('Creation successful, recipe ID:', recipeId);
      }

      console.log('Navigating to recipe page:', `/recipe/${recipeId}`);
      // Utiliser un délai pour s'assurer que tous les états sont mis à jour
      setTimeout(() => {
        navigate(`/recipe/${recipeId}`);
        console.log('Navigate called with timeout');
      }, 100);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      // En cas d'erreur, on reste sur la page d'édition
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tagId: number) => {
    const currentTags = selectedTagIds;
    if (currentTags.includes(tagId)) {
      setValue('tag_ids', currentTags.filter(id => id !== tagId));
    } else {
      setValue('tag_ids', [...currentTags, tagId]);
    }
  };

  const toggleCategory = (categoryId: number) => {
    const currentCategories = selectedCategoryIds;
    if (currentCategories.includes(categoryId)) {
      setValue('category_ids', currentCategories.filter(id => id !== categoryId));
    } else {
      setValue('category_ids', [...currentCategories, categoryId]);
    }
  };

  const toggleEquipment = (equipmentId: number) => {
    const currentEquipments = selectedEquipmentIds;
    if (currentEquipments.includes(equipmentId)) {
      setValue('equipment_ids', currentEquipments.filter(id => id !== equipmentId));
    } else {
      setValue('equipment_ids', [...currentEquipments, equipmentId]);
    }
  };

  const handleIngredientAdded = (ingredient: Ingredient) => {
    // Ajouter l'ingrédient à la liste locale
    setIngredients(prev => [...prev, ingredient]);
    // Fermer la modal
    setShowAddIngredientModal(false);
  };

  const handleEquipmentAdded = (equipment: Equipment) => {
    // Ajouter l'équipement à la liste locale
    setEquipments(prev => [...prev, equipment]);
    // Fermer la modal
    setShowAddEquipmentModal(false);
  };

  // Fonction pour gérer l'extraction de recette depuis une photo
  const handleRecipeExtracted = (extractedData: ExtractedRecipeData) => {
    // Mapper les ingrédients extraits avec ceux de la base de données
    const mappedIngredients = extractedData.ingredients.map(extractedIng => {
      // Chercher l'ingrédient le plus proche dans la liste existante
      const matchingIngredient = findBestMatchingIngredient(extractedIng.name);
      return {
        ingredient_id: matchingIngredient?.id || ingredients[0]?.id || 1,
        quantity: extractedIng.quantity,
        unit: extractedIng.unit || '',
        notes: extractedIng.notes || ''
      };
    });

    // Pré-remplir le formulaire avec les données extraites
    setValue('title', extractedData.title);
    setValue('description', extractedData.description || '');
    setValue('prep_time', extractedData.prep_time);
    setValue('cook_time', extractedData.cook_time);
    setValue('servings', extractedData.servings);
    setValue('difficulty', extractedData.difficulty);
    setValue('ingredients', mappedIngredients);
    setValue('instructions', extractedData.instructions.map(inst => ({
      step_number: inst.step_number,
      title: inst.title || '',
      description: inst.description,
      duration: inst.duration || 0,
      temperature: inst.temperature || 0,
      tips: inst.tips || '',
      referenced_recipe_id: ''
    })));

    // Fermer la modal
    setShowPhotoImportModal(false);
  };

  // Fonction utilitaire pour trouver l'ingrédient le plus proche
  const findBestMatchingIngredient = (extractedName: string): Ingredient | null => {
    if (!ingredients.length) return null;
    
    const normalizedExtracted = extractedName.toLowerCase().trim();
    
    // Recherche exacte d'abord
    let match = ingredients.find(ing => 
      ing.name.toLowerCase() === normalizedExtracted
    );
    
    if (match) return match;
    
    // Recherche par inclusion
    match = ingredients.find(ing => 
      ing.name.toLowerCase().includes(normalizedExtracted) ||
      normalizedExtracted.includes(ing.name.toLowerCase())
    );
    
    if (match) return match;
    
    // Recherche par mots-clés (premiers mots)
    const extractedWords = normalizedExtracted.split(' ');
    match = ingredients.find(ing => {
      const ingWords = ing.name.toLowerCase().split(' ');
      return extractedWords.some(word => 
        word.length > 2 && ingWords.some(ingWord => 
          ingWord.includes(word) || word.includes(ingWord)
        )
      );
    });
    
    return match || null;
  };

  if (initialLoading) {
    return <Loading />;
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">
            {isCreatingNew ? 'Créer une recette' : 'Modifier la recette'}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Bandeau principal d'import de photo - Visible en création */}
        {isCreatingNew && (
          <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-blue-900">🚀 Nouveau ! Créer depuis une photo</h3>
                <p className="text-sm text-blue-700">Prenez en photo votre recette et laissez l'IA la convertir automatiquement</p>
              </div>
              <Button
                type="button"
                onClick={() => setShowPhotoImportModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-lg font-medium"
              >
                📸 Importer une photo
              </Button>
            </div>
          </Card>
        )}

        {/* Informations de base */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Informations générales</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Titre *
              </label>
              <Input
                {...register('title')}
                placeholder="Nom de la recette"
                error={errors.title?.message}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                {...register('description')}
                rows={3}
                className="input-field"
                placeholder="Description de la recette"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Image de la recette
              </label>
              <ImageUpload
                value={watch('image_url')}
                onChange={(imageUrl) => setValue('image_url', imageUrl)}
                onError={(error) => {
                  console.error('Erreur upload image:', error);
                  // Optionnel : afficher l'erreur à l'utilisateur
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Temps de préparation (min) *
              </label>
              <Input
                type="number"
                {...register('prep_time', { valueAsNumber: true })}
                error={errors.prep_time?.message}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Temps de cuisson (min)
              </label>
              <Input
                type="number"
                {...register('cook_time', { valueAsNumber: true })}
                error={errors.cook_time?.message}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de portions *
              </label>
              <Input
                type="number"
                {...register('servings', { valueAsNumber: true })}
                error={errors.servings?.message}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Difficulté *
              </label>
              <select
                {...register('difficulty')}
                className="input-field"
              >
                <option value="easy">Facile</option>
                <option value="medium">Moyen</option>
                <option value="hard">Difficile</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  {...register('is_public')}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">Recette publique</span>
              </label>
            </div>
          </div>
        </Card>

        {/* Catégories */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Catégories</h2>
          <div className="flex flex-wrap gap-2">
            {(categories || []).map(category => (
              <button
                key={category.id}
                type="button"
                onClick={() => toggleCategory(category.id)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedCategoryIds.includes(category.id)
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </Card>

        {/* Tags */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {(tags || []).map(tag => (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedTagIds.includes(tag.id)
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </Card>

        {/* Équipements */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Équipements nécessaires</h2>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowAddEquipmentModal(true)}
              className="flex items-center space-x-2"
            >
              <span>+</span>
              <span>Nouvel équipement</span>
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(equipments || []).map(equipment => (
              <button
                key={equipment.id}
                type="button"
                onClick={() => toggleEquipment(equipment.id)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedEquipmentIds.includes(equipment.id)
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {equipment.icon && (
                    <span className="text-lg">{equipment.icon}</span>
                  )}
                  <span>{equipment.name}</span>
                </div>
              </button>
            ))}
          </div>
          {(equipments || []).length === 0 && (
            <p className="text-gray-500 text-sm">Aucun équipement disponible</p>
          )}
        </Card>

        {/* Ingrédients */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Ingrédients</h2>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowAddIngredientModal(true)}
              className="flex items-center space-x-2"
            >
              <span>+</span>
              <span>Nouvel ingrédient</span>
            </Button>
          </div>

          <div className="space-y-3">
            {ingredientFields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ingrédient
                  </label>
                  <IngredientSearch
                    ingredients={ingredients || []}
                    selectedIngredientId={watch(`ingredients.${index}.ingredient_id`)}
                    onSelect={(ingredient) => {
                      if (ingredient) {
                        setValue(`ingredients.${index}.ingredient_id`, ingredient.id);
                      } else {
                        setValue(`ingredients.${index}.ingredient_id`, 0);
                      }
                    }}
                    placeholder="Rechercher un ingrédient..."
                    error={errors.ingredients?.[index]?.ingredient_id?.message}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantité
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    {...register(`ingredients.${index}.quantity`, { valueAsNumber: true })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unité (optionnel)
                  </label>
                  <Input
                    {...register(`ingredients.${index}.unit`)}
                    placeholder="g, ml, cuillères... (défaut: pièce)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <Input
                    {...register(`ingredients.${index}.notes`)}
                    placeholder="Optionnel"
                  />
                </div>

                <div>
                  {ingredientFields.length > 1 && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => removeIngredient(index)}
                    >
                      Supprimer
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center mt-4 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => addIngredient({ ingredient_id: ingredients[0]?.id || 1, quantity: 0, unit: '', notes: '' })}
              className="flex items-center space-x-2"
            >
              <span>+</span>
              <span>Ajouter un ingrédient</span>
            </Button>
          </div>
        </Card>

        {/* Instructions */}
        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Instructions</h2>
            <p className="text-sm text-gray-600 mt-1">
              Décrivez les étapes de préparation. Vous pouvez réorganiser les étapes avec les boutons ↑ ↓.
            </p>
          </div>

          <div className="space-y-4">
            {instructionFields.map((field, index) => (
              <div key={field.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <Input
                      {...register(`instructions.${index}.title`)}
                      placeholder="Titre de l'étape (optionnel)"
                      className="flex-1"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* Boutons de déplacement */}
                    {instructionFields.length > 1 && (
                      <div className="flex flex-col">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => moveInstructionUp(index)}
                          disabled={index === 0}
                          className="p-1 h-6 w-6 hover:bg-gray-100"
                          title={`Déplacer l'étape ${index + 1} vers le haut`}
                        >
                          <ChevronUp className="w-3 h-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => moveInstructionDown(index)}
                          disabled={index === instructionFields.length - 1}
                          className="p-1 h-6 w-6 hover:bg-gray-100"
                          title={`Déplacer l'étape ${index + 1} vers le bas`}
                        >
                          <ChevronDown className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                    {instructionFields.length > 1 && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => removeInstruction(index)}
                        title={`Supprimer l'étape ${index + 1}`}
                      >
                        Supprimer
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Durée (min)
                    </label>
                    <Input
                      type="number"
                      {...register(`instructions.${index}.duration`, { valueAsNumber: true })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Température (°C)
                    </label>
                    <Input
                      type="number"
                      {...register(`instructions.${index}.temperature`, { valueAsNumber: true })}
                      placeholder="0"
                    />
                  </div>
                </div>
                
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    {...register(`instructions.${index}.description`)}
                    rows={3}
                    className="input-field"
                    placeholder={`Description de l'étape ${index + 1}`}
                  />
                  {errors.instructions?.[index]?.description && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.instructions[index]?.description?.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Conseils
                  </label>
                  <textarea
                    {...register(`instructions.${index}.tips`)}
                    rows={2}
                    className="input-field"
                    placeholder="Conseils pour cette étape (optionnel)"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recette référencée (optionnel)
                  </label>
                  <select
                    {...register(`instructions.${index}.referenced_recipe_id`)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Aucune recette référencée</option>
                    {recipes
                      .filter(recipe => recipe.id !== parseInt(id || '0')) // Éviter de référencer la recette en cours d'édition
                      .map(recipe => (
                        <option key={recipe.id} value={recipe.id}>
                          {recipe.title}
                        </option>
                      ))
                    }
                  </select>
                  <p className="text-sm text-gray-500 mt-1">
                    Sélectionnez une recette pour créer un lien dans cette étape (ex: recette de pâte pour une tarte)
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center mt-4 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => addInstruction({ 
                step_number: instructionFields.length + 1, 
                description: '', 
                title: '',
                duration: 0,
                temperature: 0,
                tips: '',
                referenced_recipe_id: ''
              })}
              className="flex items-center space-x-2"
            >
              <span>+</span>
              <span>Ajouter une étape</span>
            </Button>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(-1)}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={loading}
          >
            {loading ? 'Enregistrement...' : (id ? 'Modifier' : 'Créer')}
          </Button>
        </div>
      </form>

      {/* Modales d'ajout */}
      <AddIngredientModal
        isOpen={showAddIngredientModal}
        onClose={() => setShowAddIngredientModal(false)}
        onSuccess={handleIngredientAdded}
      />

      <AddEquipmentModal
        isOpen={showAddEquipmentModal}
        onClose={() => setShowAddEquipmentModal(false)}
        onSuccess={handleEquipmentAdded}
      />

      {/* Modal d'import de photo */}
      {showPhotoImportModal && (
        <RecipePhotoImport
          onRecipeExtracted={handleRecipeExtracted}
          onClose={() => setShowPhotoImportModal(false)}
        />
      )}
    </div>
  );
};
