import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  Button,
  Loading,
  PlanRecipeModal,
  CommentSection,
  RecipeActions,
  UserLink,
  Timer,
  RatingStars,
  useConfirm,
} from '../components';
import { CookMode } from '../components/recipe-detail';
import { Stepper } from '../components/ui/stepper';
import { toast } from '../components/ui/sonner';
import type { TimerRef } from '../components/Timer';
import { recipeService, authService } from '../services';
import { formatTime, formatDate } from '../utils';
import { getFullImageUrl } from '../utils/imageUtils';
import type { Recipe, User } from '../types';
import {
  Clock,
  Users,
  ChefHat,
  Edit,
  Copy,
  ArrowLeft,
  Calendar,
  Trash2,
  ChevronRight,
  Flame,
  CookingPot,
  Lightbulb,
  BookOpen,
} from 'lucide-react';

const difficultyMeta: Record<Recipe['difficulty'], { label: string; className: string }> = {
  easy: { label: 'Facile', className: 'text-herb-600' },
  medium: { label: 'Moyen', className: 'text-amber-600' },
  hard: { label: 'Difficile', className: 'text-destructive' },
};

/** Met à l'échelle une quantité selon le facteur de portions, arrondie proprement. */
const scaleQuantity = (quantity: number, factor: number) => Math.round(quantity * factor * 100) / 100;

export const RecipeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [cookMode, setCookMode] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [servings, setServings] = useState(1);
  const [imgError, setImgError] = useState(false);
  const timerRef = useRef<TimerRef>(null);
  const mobileTimerRef = useRef<TimerRef>(null);

  const handleStepTimerClick = (duration: number) => {
    const isMobile = window.innerWidth < 1024;
    const activeTimerRef = isMobile ? mobileTimerRef : timerRef;
    activeTimerRef.current?.startTimer(duration);
  };

  useEffect(() => {
    setCurrentUser(authService.getStoredUser());
  }, []);

  useEffect(() => {
    const fetchRecipe = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const response = await recipeService.getRecipe(parseInt(id));
        if (response.success) {
          setRecipe(response.data);
          setServings(response.data.servings || 1);
          setImgError(false);
        } else {
          setError('Recette non trouvée');
        }
      } catch {
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
      if (response.success) navigate(`/recipe/${response.data.id}/edit`);
    } catch {
      toast.error('Impossible de copier cette recette. Réessayez.');
    }
  };

  const handleDeleteRecipe = async () => {
    if (!recipe) return;
    const ok = await confirm({
      title: 'Supprimer la recette',
      description: `Êtes-vous sûr de vouloir supprimer « ${recipe.title} » ? Cette action est irréversible et supprimera aussi les commentaires et liens associés.`,
      confirmLabel: 'Supprimer',
      destructive: true,
    });
    if (!ok) return;
    try {
      const response = await recipeService.deleteRecipe(recipe.id);
      if (response.success) {
        toast.success('Recette supprimée.');
        navigate('/');
      }
    } catch {
      toast.error('Erreur lors de la suppression de la recette.');
    }
  };

  if (isLoading) {
    return (
      <>
        <div className="flex min-h-96 items-center justify-center">
          <Loading size="lg" />
        </div>
      </>
    );
  }

  if (error || !recipe) {
    return (
      <>
        <div className="py-12 text-center">
          <ChefHat className="mx-auto mb-4 h-16 w-16 text-muted-foreground/50" />
          <h2 className="mb-2 font-display text-2xl font-bold">Recette non trouvée</h2>
          <p className="mb-6 text-muted-foreground">{error}</p>
          <Button onClick={() => navigate('/')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Retour à l'accueil
          </Button>
        </div>
      </>
    );
  }

  const isOwner = currentUser && parseInt(currentUser.id) === recipe.author_id;
  const ingredients = recipe.ingredients ?? [];
  const instructions = recipe.instructions ?? [];
  const equipments = recipe.equipments ?? [];
  const factor = recipe.servings > 0 ? servings / recipe.servings : 1;
  const difficulty = difficultyMeta[recipe.difficulty] ?? difficultyMeta.medium;
  const showImage = recipe.image_url && !imgError;

  return (
    <>
      <div className="mx-auto max-w-7xl">
        <div className="lg:flex lg:gap-6">
          {/* Contenu principal */}
          <div className="space-y-6 lg:flex-1">
            {/* Retour */}
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </button>

            {/* Actions rapides — version mobile */}
            <div className="lg:hidden">
              <Card>
                <CardContent className="p-4">
                  <Timer ref={mobileTimerRef} className="mb-4" />
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="secondary" size="sm" className="justify-center" onClick={() => setShowPlanModal(true)}>
                      <Calendar className="mr-2 h-4 w-4" />
                      Planning
                    </Button>
                    {isOwner ? (
                      <Link to={`/recipe/${recipe.id}/edit`} className="block">
                        <Button variant="ghost" size="sm" className="w-full justify-center">
                          <Edit className="mr-2 h-4 w-4" />
                          Modifier
                        </Button>
                      </Link>
                    ) : (
                      <Button variant="ghost" size="sm" className="justify-center" onClick={handleCopyAndEdit}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copier
                      </Button>
                    )}
                  </div>
                  <div className="mt-4 border-t border-border pt-4">
                    <h4 className="mb-3 text-sm font-medium">Mes listes</h4>
                    <RecipeActions recipeId={recipe.id} size="sm" />
                  </div>
                  {isOwner && (
                    <div className="mt-4 border-t border-border pt-4">
                      <Button variant="ghost" size="sm" className="w-full justify-center text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleDeleteRecipe}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Supprimer la recette
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* En-tête recette */}
            <Card className="overflow-hidden">
              {showImage ? (
                <img
                  src={getFullImageUrl(recipe.image_url)}
                  alt={recipe.title}
                  onError={() => setImgError(true)}
                  className="h-64 w-full object-cover"
                />
              ) : (
                <div className="flex h-64 w-full items-center justify-center bg-gradient-to-br from-muted to-secondary">
                  <ChefHat className="h-16 w-16 text-muted-foreground/50" />
                </div>
              )}

              <CardContent className="p-6">
                <h1 className="mb-3 font-display text-3xl font-bold">{recipe.title}</h1>
                {recipe.description && <p className="mb-4 text-lg text-muted-foreground">{recipe.description}</p>}

                <div className="mb-4 flex items-center gap-3">
                  <RatingStars rating={recipe.average_rating} className="[&_svg]:h-5 [&_svg]:w-5" />
                  <span className="text-sm text-muted-foreground">
                    {recipe.average_rating && recipe.average_rating > 0
                      ? `${recipe.average_rating.toFixed(1)} (${recipe.rating_count || 0} avis)`
                      : 'Aucune note pour le moment'}
                  </span>
                </div>

                {/* Méta */}
                <div className="grid grid-cols-2 gap-4 rounded-xl bg-muted/50 p-4 md:grid-cols-4">
                  <MetaItem icon={<Clock className="h-5 w-5" />} value={formatTime(recipe.prep_time)} label="Préparation" />
                  <MetaItem icon={<Flame className="h-5 w-5" />} value={formatTime(recipe.cook_time)} label="Cuisson" />
                  <MetaItem icon={<Users className="h-5 w-5" />} value={String(recipe.servings)} label="Portions" />
                  <MetaItem
                    icon={<ChefHat className="h-5 w-5" />}
                    value={difficulty.label}
                    valueClassName={difficulty.className}
                    label="Difficulté"
                  />
                </div>

                <div className="mt-4 text-sm text-muted-foreground">
                  Par <UserLink user={recipe.author} /> • {formatDate(recipe.created_at)}
                </div>

                {!recipe.is_original && recipe.original_recipe && (
                  <div className="mt-3 rounded-r border-l-4 border-primary bg-primary/5 p-3">
                    <div className="flex items-center gap-2">
                      <Copy className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">Adaptation de la recette originale :</span>
                    </div>
                    <Link
                      to={`/recipe/${recipe.original_recipe.id}`}
                      className="mt-1 inline-flex items-center text-sm font-medium text-primary hover:underline"
                    >
                      <span>{recipe.original_recipe.title}</span>
                      <ChevronRight className="ml-1 h-3 w-3" />
                    </Link>
                    {recipe.original_recipe.author && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        par <UserLink user={recipe.original_recipe.author} />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ingrédients + Instructions */}
            <div className="lg:grid lg:grid-cols-3 lg:items-start lg:gap-6">
              {/* Ingrédients (sticky sur desktop) */}
              <Card className="mb-6 lg:sticky lg:top-6 lg:mb-0">
                <CardHeader className="space-y-3">
                  <h2 className="text-xl font-bold">Ingrédients</h2>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Portions</span>
                    <Stepper value={servings} onChange={setServings} min={1} max={99} ariaLabel="Nombre de portions" />
                  </div>
                </CardHeader>
                <CardContent>
                  {ingredients.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun ingrédient renseigné.</p>
                  ) : (
                    <ul className="space-y-1">
                      {ingredients.map((ingredient, index) => {
                        const group = (ingredient.group ?? '').trim();
                        const prevGroup = (ingredients[index - 1]?.group ?? '').trim();
                        const showHeader = group !== '' && group !== prevGroup;
                        return (
                          <React.Fragment key={index}>
                            {showHeader && (
                              <li className="pt-3 text-sm font-semibold text-primary first:pt-0">{group}</li>
                            )}
                            <li className="flex items-center justify-between gap-2 border-b border-border/60 py-2 last:border-b-0">
                              <span className="flex items-center gap-2">
                                {ingredient.ingredient?.icon && <span className="text-lg">{ingredient.ingredient.icon}</span>}
                                <span>{ingredient.ingredient?.name}</span>
                              </span>
                              <span className="shrink-0 text-sm font-medium text-muted-foreground">
                                {scaleQuantity(ingredient.quantity, factor)} {ingredient.unit || 'pièce'}
                              </span>
                            </li>
                          </React.Fragment>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {/* Instructions */}
              <Card className="lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <h2 className="text-xl font-bold">Instructions</h2>
                  {instructions.length > 0 && (
                    <Button size="sm" onClick={() => setCookMode(true)} className="gap-2">
                      <CookingPot className="h-4 w-4" />
                      Mode cuisine
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {instructions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune étape renseignée.</p>
                  ) : (
                    <div className="space-y-5">
                      {instructions.map((step, index) => (
                        <div key={index} className="flex gap-4">
                          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                            {step.step_number || index + 1}
                          </div>
                          <div className="flex-1">
                            {step.title && <h3 className="mb-1 font-semibold">{step.title}</h3>}
                            <p className="text-foreground/90">{step.description}</p>
                            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                              {step.duration ? (
                                <button
                                  onClick={() => handleStepTimerClick(step.duration!)}
                                  className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-primary"
                                  title="Lancer le minuteur"
                                >
                                  <Clock className="h-3.5 w-3.5" />
                                  {formatTime(step.duration)}
                                </button>
                              ) : null}
                              {step.temperature ? (
                                <span className="inline-flex items-center gap-1 text-muted-foreground">
                                  <Flame className="h-3.5 w-3.5" />
                                  {step.temperature} °C
                                </span>
                              ) : null}
                            </div>
                            {step.tips && (
                              <p className="mt-1.5 inline-flex items-start gap-1.5 text-sm italic text-amber-700">
                                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
                                {step.tips}
                              </p>
                            )}
                            {step.referenced_recipe && (
                              <div className="mt-2 rounded-lg border border-border bg-muted/40 p-3">
                                <p className="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                                  <BookOpen className="h-4 w-4" />
                                  Recette liée :
                                </p>
                                <Link
                                  to={`/recipe/${step.referenced_recipe.id}`}
                                  className="inline-flex items-center gap-2 font-medium text-primary hover:underline"
                                >
                                  <ChefHat className="h-4 w-4" />
                                  <span>{step.referenced_recipe.title}</span>
                                </Link>
                                <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {step.referenced_recipe.prep_time + step.referenced_recipe.cook_time} min
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {step.referenced_recipe.servings} portions
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Équipement */}
            {equipments.length > 0 && (
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-bold">Équipement</h2>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    {equipments.map((equipment, index) => (
                      <div
                        key={index}
                        className={`rounded-lg border p-3 ${
                          equipment.is_optional
                            ? 'border-border bg-muted text-muted-foreground'
                            : 'border-primary-200 bg-primary-50 text-primary-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {equipment.equipment?.icon && <span className="text-lg">{equipment.equipment.icon}</span>}
                          <div className="font-medium">{equipment.equipment?.name}</div>
                        </div>
                        <div className="text-xs">{equipment.is_optional ? 'Optionnel' : 'Obligatoire'}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Commentaires */}
            <CommentSection recipeId={recipe.id} />
          </div>

          {/* Sidebar actions — desktop */}
          <div className="hidden w-64 flex-shrink-0 lg:block">
            <div className="sticky top-6 space-y-4">
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">Actions</h3>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Timer ref={timerRef} className="mb-4" />
                  <Button variant="secondary" size="sm" className="w-full justify-start" onClick={() => setShowPlanModal(true)}>
                    <Calendar className="mr-2 h-4 w-4" />
                    Ajouter au planning
                  </Button>
                  {isOwner ? (
                    <>
                      <Link to={`/recipe/${recipe.id}/edit`} className="block">
                        <Button variant="ghost" size="sm" className="w-full justify-start">
                          <Edit className="mr-2 h-4 w-4" />
                          Modifier la recette
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={handleDeleteRecipe}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Supprimer la recette
                      </Button>
                    </>
                  ) : (
                    <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleCopyAndEdit}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copier et modifier
                    </Button>
                  )}
                </CardContent>
              </Card>

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

        <PlanRecipeModal
          isOpen={showPlanModal}
          onClose={() => setShowPlanModal(false)}
          recipe={recipe}
          onSuccess={() => toast.success('Recette ajoutée au planning.')}
        />
      </div>

      {cookMode && <CookMode steps={instructions} title={recipe.title} onClose={() => setCookMode(false)} />}
    </>
  );
};

function MetaItem({
  icon,
  value,
  label,
  valueClassName,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  valueClassName?: string;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-1 flex justify-center text-muted-foreground">{icon}</div>
      <div className={`text-sm font-medium ${valueClassName ?? 'text-foreground'}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
