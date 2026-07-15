import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, Button, RecipeCard, UserLink } from '../components';
import { Skeleton } from '../components/ui/skeleton';
import { loadRecipeDraft, draftKey } from '../components/recipe-form/autosave';
import { recipeService } from '../services';
import { feedService } from '../services/feedService';
import type { Recipe } from '../types';
import type { UserFeed } from '../services/feedService';
import { Clock, ChefHat, Users, Search, PlusCircle, ArrowRight, FileEdit } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/** Rail horizontal à défilement avec accroche (scroll-snap). */
const RecipeRail: React.FC<{ recipes: Recipe[]; showAuthor?: boolean }> = ({ recipes, showAuthor = true }) => (
  <div className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-4">
    {recipes.map((recipe) => (
      <div key={recipe.id} className="w-[280px] shrink-0 snap-start">
        <RecipeCard recipe={recipe} showAuthor={showAuthor} />
      </div>
    ))}
  </div>
);

const RailSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="flex gap-4 overflow-hidden pb-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="w-[280px] shrink-0">
        <Card className="overflow-hidden">
          <Skeleton className="h-48 w-full rounded-none" />
          <CardContent className="space-y-3 p-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/2" />
          </CardContent>
        </Card>
      </div>
    ))}
  </div>
);

const SectionHeader: React.FC<{ title: string; to?: string }> = ({ title, to }) => (
  <div className="mb-4 flex items-center justify-between">
    <h2 className="font-display text-2xl font-bold">{title}</h2>
    {to && (
      <Link to={to}>
        <Button variant="ghost" className="gap-1">
          Voir tout
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    )}
  </div>
);

export const HomePage: React.FC = () => {
  const { user } = useAuth();
  const [latestRecipes, setLatestRecipes] = useState<Recipe[]>([]);
  const [popularRecipes, setPopularRecipes] = useState<Recipe[]>([]);
  const [followingFeed, setFollowingFeed] = useState<UserFeed[]>([]);
  const [isLoadingLatest, setIsLoadingLatest] = useState(true);
  const [isLoadingPopular, setIsLoadingPopular] = useState(true);
  const [draft, setDraft] = useState<{ title: string; savedAt: number } | null>(null);

  useEffect(() => {
    const stored = loadRecipeDraft(draftKey('new'));
    if (stored) {
      setDraft({ title: stored.data.title?.trim() || 'Recette sans titre', savedAt: stored.savedAt });
    }
  }, []);

  useEffect(() => {
    const fetchLatestRecipes = async () => {
      try {
        const response = await recipeService.getLatestRecipes(8);
        if (response.success) setLatestRecipes(response.data.recipes);
      } catch {
        /* silencieux : la section reste vide */
      } finally {
        setIsLoadingLatest(false);
      }
    };

    const fetchPopularRecipes = async () => {
      try {
        const response = await recipeService.getPopularRecipes(8);
        if (response.success) setPopularRecipes(response.data.recipes);
      } catch {
        /* silencieux */
      } finally {
        setIsLoadingPopular(false);
      }
    };

    const fetchFollowingFeed = async () => {
      if (!user) return;
      try {
        const response = await feedService.getFollowingFeedGrouped();
        if (response.success && response.data) setFollowingFeed(response.data);
      } catch {
        setFollowingFeed([]);
      }
    };

    fetchLatestRecipes();
    fetchPopularRecipes();
    fetchFollowingFeed();
  }, [user]);

  return (
    <>
      <div className="space-y-10">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-50 via-background to-herb-50 px-6 py-14 text-center sm:py-20">
          <h1 className="mx-auto mb-4 max-w-3xl font-display text-4xl font-bold sm:text-5xl">
            Cuisinez, partagez, régalez-vous.
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
            Découvrez, enregistrez et organisez vos recettes préférées. Planifiez vos repas et cuisinez comme un chef.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/search">
              <Button size="lg" className="gap-2">
                <Search className="h-5 w-5" />
                Découvrir des recettes
              </Button>
            </Link>
            <Link to="/recipe/new">
              <Button variant="outline" size="lg" className="gap-2">
                <PlusCircle className="h-5 w-5" />
                Créer une recette
              </Button>
            </Link>
          </div>
        </div>

        {/* Reprendre (brouillon local) */}
        {draft && (
          <Link to="/recipe/new" className="block">
            <Card interactive className="flex items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <FileEdit className="h-5 w-5" />
                </span>
                <div>
                  <div className="font-semibold">Reprendre votre brouillon</div>
                  <div className="text-sm text-muted-foreground">
                    « {draft.title} » — enregistré à{' '}
                    {new Date(draft.savedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </Card>
          </Link>
        )}

        {/* Populaires */}
        <section>
          <SectionHeader title="Recettes populaires" to="/search?sort_by=popularity&sort_order=desc" />
          {isLoadingPopular ? <RailSkeleton /> : <RecipeRail recipes={popularRecipes} />}
        </section>

        {/* Dernières */}
        <section>
          <SectionHeader title="Dernières recettes" to="/search?sort_by=created_at&sort_order=desc" />
          {isLoadingLatest ? <RailSkeleton count={8} /> : <RecipeRail recipes={latestRecipes} />}
        </section>

        {/* Abonnements */}
        {followingFeed.length > 0 && (
          <section>
            <SectionHeader title="Vos abonnements" />
            <div className="space-y-8">
              {followingFeed.map((userFeed) => (
                <div key={userFeed.user.id} className="border-b border-border pb-8 last:border-b-0">
                  <div className="mb-4">
                    <UserLink user={userFeed.user} showAvatar className="text-lg font-semibold text-primary hover:text-primary/80">
                      Recettes de {userFeed.user.username}
                    </UserLink>
                  </div>
                  <RecipeRail recipes={userFeed.recipes.slice(0, 6)} showAuthor={false} />
                  {userFeed.recipes.length > 6 && (
                    <div className="mt-2 text-center">
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

        {/* Actions rapides */}
        <section className="card p-8">
          <h2 className="mb-6 text-center font-display text-2xl font-bold">Actions rapides</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <QuickAction to="/planning" icon={<Clock className="h-6 w-6" />} title="Planifier mes repas" description="Organisez votre semaine avec le planning de repas" />
            <QuickAction to="/search" icon={<ChefHat className="h-6 w-6" />} title="Trouver une recette" description="Recherchez par ingrédients, temps ou difficulté" />
            <QuickAction to="/recipe/new" icon={<Users className="h-6 w-6" />} title="Partager une recette" description="Créez et partagez vos créations culinaires" />
          </div>
        </section>
      </div>
    </>
  );
};

const QuickAction: React.FC<{ to: string; icon: React.ReactNode; title: string; description: string }> = ({ to, icon, title, description }) => (
  <Link to={to} className="group text-center">
    <div className="rounded-2xl bg-muted/60 p-6 transition-colors group-hover:bg-primary/10">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground">{icon}</div>
      <h3 className="mb-2 font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  </Link>
);
