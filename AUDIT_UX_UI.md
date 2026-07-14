# Audit UI/UX — CookingApp

> Audit réalisé le **2026-07-14**. Objectif : assainir l'application avant d'ajouter de nouvelles fonctionnalités.
> Ce document **répertorie les problèmes** (UI/UX, fonctionnels, cohérence, features manquantes, sécurité) et leur **sévérité**.
> Il **ne propose pas de solutions** — il rassemble les informations utiles à la future résolution (fichiers/lignes, description détaillée, logs, comportement observé).

---

## Légende des sévérités

| Sévérité | Signification |
|----------|---------------|
| 🔴 **Critique** | Bloque un usage, casse une fonctionnalité, perte de données ou faille de sécurité. À traiter en priorité. |
| 🟠 **Majeur** | Dégrade nettement l'expérience, ou une fonctionnalité importante est incomplète/incohérente/non branchée. |
| 🟡 **Mineur** | Gêne ponctuelle, incohérence visible mais contournable. |
| 🔵 **Cosmétique** | Détail visuel/finition, sans impact fonctionnel. |

## Méthode

- **Parcours navigateur** de l'app en production (`https://cooking.rrodriguez.dev`), connecté avec un compte réel, sur : Accueil, Recherche (+filtres, empty state), Détail recette, Planning (+liste de courses), Frigo, Profil (+onglets), Création de recette.
- **Lecture du code** frontend (`cooking_front`, React 19 / TS / Tailwind) et cartographie de l'API backend (`cooking_server`, Go/Gin).
- **Inspection** console navigateur, requêtes réseau (onglet Network), et tests d'interaction.
- **Limite** : le test responsive mobile visuel n'a pas pu être capturé de façon fiable via l'outil (screenshots à résolution fixe) ; les constats responsive proviennent donc de la revue de code (et sont marqués comme tels).

## Cartographie de l'application

**Pages routées** (`src/App.tsx`) : `/login`, `/` (Home), `/search`, `/planning`, `/fridge`, `/profile`, `/user/:userId`, `/recipe/:id`, `/recipe/:id/edit`, `/recipe/new`, `*` → redirection `/`.

**API backend** (Go/Gin) — entités exposées : `users` (+ follow/followers/following, reset-password), `recipes` (+ search, copy, user/:id), `ingredients`, `equipment`, `categories`, `tags`, `comments`, `meal-plans` (weekly/daily/upcoming/shopping-list/complete), `favorites`, `recipe-lists`, `feed` (following, following/grouped), `upload`, `fridge` (+ stats, clear, expired), `recipes/extract-from-image` (extraction IA).

---

## 🎯 Top priorités (à traiter en premier)

| # | Problème | Sévérité | Réf. |
|---|----------|----------|------|
| 1 | Réinitialisation de mot de passe **sans vérification** (email + nouveau mdp → reset direct) | 🔴 Critique | [SEC-1](#sec-1) |
| 2 | Token JWT complet **écrit en clair dans la console** (prod) | 🟠 Majeur | [SEC-2](#sec-2) |
| 3 | Aucun **système de notification/toast** — `alert()`/`confirm()` natifs + succès silencieux | 🟠 Majeur | [FB-1](#fb-1) |
| 4 | Changement de mot de passe **sans mot de passe actuel** | 🟠 Majeur | [SEC-3](#sec-3) |
| 5 | 2 pages sans header/navigation (**Frigo**, **Création/édition recette**) | 🟠 Majeur | [NAV-1](#nav-1) |
| 6 | Boutons **sans action** (Frigo « Voir/Planifier », « Planifier par lot », CRUD Data) | 🟠 Majeur | [NAV-3](#nav-3) |
| 7 | Pages **orphelines** non routées (DataManagement, UserRecipes) | 🟠 Majeur | [NAV-2](#nav-2) |
| 8 | Erreurs API masquées en **empty states trompeurs** (Home, Search, Profil…) | 🟠 Majeur | [ERR-3](#err-3) |
| 9 | **Requêtes réseau redondantes massives** sur les listes de cartes (N+1) | 🟠 Majeur | [PERF-1](#perf-1) |
| 10 | Bugs du **générateur de planning** (fuseau horaire, catégories accents, diversification inopérante) | 🟠 Majeur | [GEN-1](#gen-1) |
| 11 | Dates affichées **en anglais** (Home, Détail, Planning) + incohérences fr/en | 🟠 Majeur | [I18N-1](#i18n-1) |
| 12 | Modales **non accessibles** (focus trap, ESC, ARIA) + `Select` non utilisable au clavier | 🟠 Majeur | [A11Y-1](#a11y-1) |

**Récapitulatif volumétrie** : ~1 critique · ~30 majeurs · ~40 mineurs · ~15 cosmétiques.

---

# 1. Sécurité

<a id="sec-1"></a>
### 🔴 SEC-1 — Réinitialisation de mot de passe sans aucune vérification
- **Fichiers** : `src/components/ForgotPasswordModal.tsx:32-58`, `src/services/auth.ts:73-76`, backend `users.POST("/reset-password")`.
- **Problème** : Le flux « Mot de passe oublié » demande **email + nouveau mot de passe** et réinitialise directement, **sans e-mail de confirmation ni token de vérification**. N'importe qui connaissant l'adresse e-mail d'un compte peut en changer le mot de passe et prendre le contrôle du compte.
- **Impact** : Prise de contrôle de compte triviale. À confirmer côté backend (le handler `ResetPassword` applique-t-il une vérification ?), mais le front expose ce flux tel quel.

<a id="sec-2"></a>
### 🟠 SEC-2 — Token JWT loggé en clair dans la console (production)
- **Fichiers** : `src/services/auth.ts:23` (`console.log('authService: Storing token:', response.data.token)`), `:25` ; `src/context/AuthContext.tsx:68-75` (log des réponses d'auth avec données user).
- **Problème** : Le jeton de session complet est imprimé dans la console navigateur, non conditionné à l'environnement, non supprimé au build. Toute extension/capture de logs récupère un token valide.

### 🟠 SEC-3 — Changement de mot de passe sans re-authentification {#sec-3}
- **Fichiers** : `src/components/PasswordChangeForm.tsx:23-29,39-41` (`userService.updateUser(id, { password })`).
- **Problème** : Le formulaire « Changer le mot de passe » (onglet Sécurité du profil) ne demande **pas le mot de passe actuel**. Une session laissée ouverte permet à un tiers de changer le mot de passe. Le mot de passe transite via un `updateUser` de profil générique (pas d'endpoint dédié).

### 🟠 SEC-4 — Token & user stockés en `localStorage` (exposition XSS)
- **Fichiers** : `src/services/auth.ts:23-24,37-38,52-53,62-70` ; `src/services/api.ts:16`.
- **Problème** : `auth_token` en `localStorage`, accessible par tout script JS. Combiné à la CSP permissive (voir [CFG-1](#cfg-1)), toute faille XSS permet l'exfiltration du token. Un cookie `HttpOnly`/`Secure`/`SameSite` serait préférable.

### 🟡 SEC-5 — Politique de mot de passe très faible
- **Fichiers** : `src/utils/validation.ts:6,12,25-26,33-34` (`min(6)` uniquement).
- **Problème** : 6 caractères minimum, aucune exigence de complexité.

### 🔵 SEC-6 — CSP quasi inopérante & headers de sécurité manquants
- **Fichiers** : `nginx.conf:70-74` (voir aussi [CFG-1](#cfg-1)).
- **Problème** : `Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'"` n'impose presque aucune restriction. Absence de HSTS, `Permissions-Policy` ; `X-XSS-Protection` déprécié ; `Referrer-Policy` laxiste. (Classé bas ici car surtout config ; à relever si exposition publique.)

---

# 2. Feedback utilisateur & gestion d'erreurs

<a id="fb-1"></a>
### 🟠 FB-1 — Aucun système de notification/toast : `alert()`/`confirm()` natifs + succès silencieux
- **C'est le manque UX transversal le plus important.** Aucune lib de toast (`package.json`), aucun provider de notification.
- **`alert()` natif** : `RecipeDetailPage.tsx:87`, `Timer.tsx:43`, `PlanningPage.tsx:116,153`, `ProfilePage.tsx:206`, `AddFridgeItemModal.tsx:92`, `GeneratePlanModal.tsx:105`, `RecipeListDetailModal.tsx:100,103`.
- **`window.confirm()` natif** : `RecipeDetailPage.tsx:78`, `CommentItem.tsx:50`, `ProfilePage.tsx:194,677`, `PlanningPage.tsx:87`, `RecipeListDetailModal.tsx:83`.
- **Succès silencieux** (seulement un `console.log` « … successfully! ») : ajout à une liste `RecipeActions.tsx:74-92`, ajout au planning `RecipeDetailPage.tsx:534-537`, suppression recette `ProfilePage.tsx:200-205`, changement mot de passe `ProfilePage.tsx:864`, favoris `FavoriteButton.tsx:67`.
- **Impact** : dialogues bloquants non thémés, incohérents avec le design system ; l'utilisateur ne sait souvent pas si son action a réussi ou échoué.

<a id="err-3"></a>
### 🟠 ERR-3 — Erreurs API masquées en empty states trompeurs
- **Fichiers** : `HomePage.tsx:136-160` (catch → `console.error`, grille vide), `SearchPage.tsx:194-198` (affiche « Aucune recette trouvée » sur erreur serveur), `ProfilePage.tsx:62-64,84-86,125-127,140-142,154-156` (tous les catch → `console.error` → états vides « Vous n'avez pas encore… »).
- **Problème** : En cas d'échec réseau/serveur, l'UI affiche un **état vide** indiscernable d'un « 0 résultat ». Aucun état d'erreur, aucun bouton « Réessayer ». L'utilisateur croit ne rien avoir alors que c'est une panne.

### 🟠 ERR-1 — Gestion globale des erreurs API limitée au 401
- **Fichiers** : `src/services/api.ts:28-39`.
- **Problème** : L'intercepteur ne traite que le `401`. Les `403/404/500/503`, timeouts et erreurs réseau ne sont pas centralisés : chaque appelant gère (mal) l'erreur.

### 🟠 ERR-2 — Redirection 401 par rechargement complet (casse la SPA)
- **Fichiers** : `src/services/api.ts:31-36` (`window.location.href = '/login'`).
- **Problème** : Hard reload qui (1) casse le routage React Router, (2) perd le `location.from` de `ProtectedRoute.tsx:24` (retour post-login), (3) risque de boucle si le login lui-même renvoie 401.

### 🟠 ERR-4 — Échecs partiels silencieux lors de la génération de planning
- **Fichiers** : `PlanningPage.tsx:124-132` (`for … try { createMealPlan } catch { console.error }`).
- **Problème** : Chaque création de repas en erreur est avalée ; si 5 repas sur 10 échouent, l'utilisateur croit tout planifié. `successCount` diverge sans être remonté.

### 🟠 ERR-5 — Sauvegarde de recette : aucun feedback en cas d'échec
- **Fichiers** : `RecipeEditPage.tsx:354-356` (catch → `console.error`, « on reste sur la page »).
- **Problème** : Si `createRecipe`/`updateRecipe` échoue, le bouton se réactive sans message. L'utilisateur ne comprend pas pourquoi « Créer » ne fait rien.

### 🟡 ERR-6 — Pas de refresh token ni contrôle d'expiration côté client
- **Fichiers** : `src/services/api.ts` (global), `src/services/auth.ts:57-59` (`isAuthenticated()` vérifie juste la présence du token, sans décoder l'`exp`), `src/context/AuthContext.tsx:33`.
- **Problème** : Un token expiré est « valide » jusqu'au premier 401 → déconnexion brutale en pleine action, sans refresh.

### 🟡 ERR-7 — Autres catch silencieux
- Follow/Unfollow `UserProfilePage.tsx:47-70` ; édition profil `ProfilePage.tsx:165-177` ; modales repas `AddMealModal.tsx:171-175`, `PlanRecipeModal.tsx:61-65` ; chargement ingrédients `AddFridgeItemModal.tsx:66-68` ; `getStoredUser` `JSON.parse` sans try/catch `auth.ts:62-65` (peut casser le démarrage de l'app si `localStorage` corrompu).

---

# 3. Navigation & structure de l'app

<a id="nav-1"></a>
### 🟠 NAV-1 — Pages sans `<Layout>` : perte totale de la navigation
- **Fichiers** : `FridgePage.tsx:151` (`return <div className="container…">` au lieu de `<Layout>`), et **`RecipeEditPage`** (`/recipe/new` et `/recipe/:id/edit`) — **confirmé au parcours** : ces pages s'affichent **sans header/nav**.
- **Problème** : Sur `/fridge`, `/recipe/new`, `/recipe/:id/edit`, l'utilisateur perd la barre de navigation principale. Rupture visuelle et fonctionnelle ; seul « Annuler » permet de sortir de l'édition.
- **Cause racine** : `App.tsx` monte les pages directement, sans layout de route (`<Outlet>`) ; chaque page doit s'envelopper elle-même dans `<Layout>`, un oubli = pas de header. Cf. [ARCH-1](#arch-1).

<a id="nav-2"></a>
### 🟠 NAV-2 — Pages orphelines jamais routées
- **`DataManagementPage`** (`src/pages/DataManagementPage.tsx`) : page complète d'admin (CRUD catégories/tags/ingrédients/équipements, pagination, recherche) exportée (`pages/index.ts:6`) mais **absente de toute `<Route>`** et sans aucun lien entrant. Totalement inaccessible.
- **`UserRecipesPage`** (`src/pages/UserRecipesPage.tsx:11-12`) : lit `userId` via `useParams` (conçue pour `/user/:userId/recipes`), route inexistante. `UserProfilePage.tsx:194-198` renvoie « Voir tout » vers `/search?author=…` au lieu de cette page → doublon abandonné.

<a id="nav-3"></a>
### 🟠 NAV-3 — Boutons sans handler (fonctionnalités mortes)
- **Frigo** : boutons « Voir » et « Planifier » sur chaque suggestion — `FridgePage.tsx:385-391` **sans `onClick`**. La fonction clé de la page (agir sur une suggestion) ne fait rien.
- **Planning** : action rapide « Planifier par lot / Ajouter plusieurs repas » — `PlanningPage.tsx:404-410` **sans `onClick`** (bouton décoratif).
- **DataManagement** : boutons « Ajouter » (`:155-158`), « Modifier » (`:192-199`), « Supprimer » (`:200-207`) **sans handler** — page en lecture seule même si elle était accessible.

### 🟠 NAV-4 — DataManagement : logique de service & pagination bancales
- **Fichiers** : `DataManagementPage.tsx:54-61` (chaîne de ternaires `(service as any).getCategories ? …`), `:63-72` (pagination simulée client `Math.ceil(response.data.length / 20)` alors que l'API pagine), `:218`.
- **Problème** : Dispatch non typé et fragile ; nombre de pages faux ; l'onglet Ingrédients risque de casser car `getIngredients` renvoie désormais un **format paginé** (commits récents) traité ici comme un tableau (`.length`, `.map`).

### 🟡 NAV-5 — Header : couverture & état actif incomplets
- **Fichiers** : `src/components/layout/Header.tsx:23-33,59-63`.
- **Problèmes** : (a) La nav expose seulement Accueil/Recherche/Planning/Frigo/Nouvelle recette ; **listes de recettes/courses** ne sont atteignables que via les onglets internes du Profil (hub caché), DataManagement/UserRecipes n'ont aucun point d'entrée. (b) `isCurrentPath` en égalité stricte (`===`) : aucun item n'est surligné sur `/recipe/123`, `/user/5`, etc. (pas de `startsWith`).

### 🟡 NAV-6 — Pas de vraie page 404
- **Fichiers** : `src/App.tsx:70` (`<Route path="*" element={<Navigate to="/" replace />} />`).
- **Problème** : Toute URL inconnue redirige silencieusement vers l'accueil (masque les liens cassés, désoriente).

### 🟡 NAV-7 — Navigations en `window.location.href` (rechargement complet)
- **Fichiers** : `ProfilePage.tsx:547,817` (`window.location.href = '/search'`), `CommentSection.tsx:170-172` (`<a href="/login">` au lieu de `<Link>`).
- **Problème** : Rechargement complet de la SPA (flash blanc, perte d'état) au lieu de `navigate()`/`<Link>`.

### 🔵 NAV-8 — Pas de footer
- **Observation parcours** : aucune des pages ne comporte de pied de page (mentions, liens, version, aide).

---

# 4. Cohérence linguistique (fr/en) & formats

<a id="i18n-1"></a>
### 🟠 I18N-1 — Dates affichées en anglais dans une UI française
- **Observé au parcours** :
  - Accueil / cartes recettes : « 10 months ago », « 29 days ago », « about 2 months ago ».
  - Détail recette (en-tête auteur) : « September 7th, 2025 » — alors que la **date de commentaire est en français** (« 11 septembre 2025 à 18:30 ») → incohérence dans la **même page**.
  - Planning : « Semaine du 13 **July** 2026 » (mois anglais).
- **Cause probable** : `date-fns` utilisé sans locale `fr` (`src/utils/date.ts`), et deux méthodes de formatage coexistent (`formatDate` vs `formatRelativeTime`).

### 🟠 I18N-2 — Messages de validation de formulaire en anglais
- **Fichiers** : `src/utils/validation.ts:5-6,10-13,25-26,33-34` (« Invalid email address », « Password must be at least 6 characters », « Passwords don't match »).
- **Problème** : Sous des champs français (« Mot de passe »), l'utilisateur voit des erreurs en anglais (Login, Register, ForgotPassword, PasswordChange).

### 🟡 I18N-3 — Textes anglais résiduels dans l'UI
- **Timer** : boutons « Start » (`Timer.tsx:108-109`), « Pause » (`:121`), « Stop » (`:129`) mélangés avec « Reprendre » (`:125`, français).
- **Frigo** : filtre de suggestions affiche la valeur brute « **any** » (devrait être « Tous ») — observé au parcours.
- **Import photo** : difficulté affichée en anglais brut « Difficulté: easy/medium/hard » — `RecipePhotoImport.tsx:244`.
- **Planning** : suffixe interne « - **popular** » visible sur les cartes générées (« Généré automatiquement - popular ») — observé au parcours ; fuite d'une valeur de stratégie interne.

### 🟡 I18N-4 — Format de date US dans les inputs & incohérence « Membre depuis »
- **Frigo, ajout d'ingrédient** : `<input type="date">` affiche le placeholder **mm/dd/yyyy** (format US) — observé au parcours.
- **Profil** : « **Membre depuis Date inconnue** » — bug visible (voir [PROF-1](#prof-1)). Par ailleurs `UserProfilePage.tsx:141` affiche « Membre depuis il y a 3 ans » (temps relatif) alors que `ProfilePage.tsx:313` vise « MMMM yyyy » → deux formats pour la même info.

---

# 5. Performance perçue

<a id="perf-1"></a>
### 🟠 PERF-1 — Requêtes réseau redondantes massives (N+1) sur les cartes
- **Observé au parcours (onglet Network, page d'accueil)** : sur un seul chargement, `GET /api/v1/recipe-lists?page=1&limit=10` est appelé **~25 fois à l'identique**, et `GET /api/v1/favorites/{id}/status` **une fois par carte**.
- **Cause** : `src/components/RecipeActions.tsx:29-58` — chaque carte monte un `RecipeActions` qui déclenche `loadFavoriteStatus` **et** `loadUserLists` (les listes de l'utilisateur, pourtant identiques pour toutes les cartes). Sur SearchPage (jusqu'à 20 cartes) : ~40 requêtes au montage.
- **Impact** : charge serveur inutile, latence perceptible, malgré la présence de `@tanstack/react-query` non mis à profit pour dédupliquer.

### 🟡 PERF-2 — `useApi` vide les données au début de chaque appel
- **Fichiers** : `src/hooks/useApi.ts:16-17` (`setState({ data: null, loading: true })`).
- **Problème** : Refetch/pagination provoquent un « flash » vide (démontage de la liste) au lieu d'un chargement superposé.

### 🟡 PERF-3 — Chargements sur-dimensionnés côté client
- `AddFridgeItemModal.tsx:56-69` : charge **jusqu'à 1000 ingrédients** à chaque ouverture pour filtrer côté client (une recherche serveur existe ailleurs).
- `SearchPage.tsx:146-151` : mapping ingrédient/équipement de la smart search plafonné à `limit:100` → au-delà, le filtre est silencieusement ignoré ([SRCH-4](#srch-4)).
- `PlanningPage.tsx:167-182,271` : `getMealsForDate` re-filtre tout `mealPlans` **à chaque cellule** (+ `console.log`), O(jours×types×repas) par rendu.

### 🟡 PERF-4 — `useDebouncedCallback` bugué (timer en `useState`)
- **Fichiers** : `src/hooks/useDebounce.ts:19-49`.
- **Problème** : Le timer est en `useState` et dans les deps du `useCallback` → chaque set recrée la callback (closures périmées, cleanup relancé), anti-rebond peu fiable. Devrait utiliser `useRef`.

---

# 6. Accessibilité

<a id="a11y-1"></a>
### 🟠 A11Y-1 — Modales sans focus trap / ARIA / ESC / bouton fermer
- **Composant partagé** `src/components/ui/Modal.tsx:46-74` : pas de `role="dialog"`, `aria-modal`, `aria-labelledby` ; pas de focus trap ni de restauration de focus ; backdrop = `<div onClick>` non focusable ; **pas de bouton croix** (fermeture seulement backdrop/ESC). ESC et scroll-lock présents. Scroll-lock cassé en cas de modales empilées (`:26-34`, remet `overflow:'unset'` inconditionnellement).
- **Modales custom** (n'utilisent pas le composant partagé) : `PlanRecipeModal`, `AddMealModal`, `GeneratePlanModal`, `ShoppingListModal`, `RecipeListModal`, `RecipeListDetailModal`, `QuickCreateListModal`, `RecipePhotoImport`, `AddIngredientModal`, `AddEquipmentModal` — `<div fixed inset-0>` bruts, pas d'ARIA, pas de focus trap, pas de fermeture ESC ni backdrop, boutons X sans `aria-label`. Incohérence : `AddFridgeItemModal` et `ForgotPasswordModal` utilisent, eux, le `Modal` partagé.

### 🟠 A11Y-2 — `Select` maison non utilisable au clavier
- **Fichiers** : `src/components/ui/Select.tsx:56-146`.
- **Problème** : Construit en `<button>`, sans `role=combobox/listbox/option`, sans `aria-expanded/selected/activedescendant`. Pas de navigation flèches ni sélection clavier (souris uniquement) ; fermeture seulement au `mousedown` extérieur. Inutilisable au clavier/lecteur d'écran. De plus `SelectValue` affiche la **valeur brute** et non le libellé (`:148-156`).

### 🟡 A11Y-3 — Boutons icônes sans label accessible
- `RecipeActions.tsx:110-140` (Favori/Liste en mode `showLabels=false`, utilisé sur toutes les cartes), `StarRating.tsx:31-51` (étoiles), boutons X des modales, boutons Eye/Edit/Trash de `ProfilePage`, `FridgePage:279-286`, `PlanningPage:294-344`, `DataManagementPage:192-207`. `title=` présent par endroits mais non fiable pour lecteurs d'écran.

### 🟡 A11Y-4 — Zones cliquables `<div>` non accessibles au clavier
- Upload : `ImageUpload.tsx:164-169`, `ProfileImageUpload.tsx:161-166` (`<div onClick>` sans `role="button"`/`tabIndex`/gestion clavier).
- Comboboxes de recherche : `SmartSearchBar.tsx:249-302`, `IngredientSearch.tsx:166-198`, `AddFridgeItemModal.tsx:142-183` — pas de sémantique combobox/listbox/option ; élément surligné non scrollé dans la vue.

### 🟡 A11Y-5 — Menu mobile & champs
- Hamburger `Header.tsx:106-117` : pas d'`aria-label`/`aria-expanded`/`aria-controls`, pas de focus trap, pas de fermeture ESC/au changement de route.
- `Input.tsx:18,30-44` : pas d'`aria-invalid` ni `aria-describedby` sur erreur ; `id` dérivé du label → **doublons d'`id`** si deux inputs portent le même label.

---

# 7. Détail par page

## 7.1 Accueil (`HomePage.tsx`)
- 🟠 **HOME-1** — Pas d'état d'erreur/feedback si chargement échoue (`:136-160`) → grille vide. Voir [ERR-3](#err-3).
- 🟡 **HOME-2** — Pas d'empty state pour « Recettes populaires »/« Dernières recettes » (`:232-238,263-269`) : titre suivi de vide.
- 🟡 **HOME-3** — Fallback image via injection `innerHTML` hors cycle React (`:28-37`), dupliqué (voir [IMG-1](#img-1)).
- 🔵 **HOME-4** — Étoiles sans arrondi/demi-étoile (`:72-81`) : 3,7 affiche 3 étoiles pleines (sous-évalue la note).

## 7.2 Recherche (`SearchPage.tsx`)
- 🟠 **SRCH-1** — Empty state trompeur sur erreur (`:194-198`). Voir [ERR-3](#err-3).
- 🟠 **SRCH-2** — Incohérence compteur de filtres ↔ chips supprimables : `getActiveFiltersCount:311-323` compte `max_prep_time`, `max_cook_time`, `ingredients`, mais `getAllActiveTags:331-479` ne crée **aucun chip** pour ces trois filtres → le badge indique « 3 » mais l'utilisateur ne peut pas les retirer sans rouvrir le panneau.
- 🟠 **SRCH-3** — Le chevron à côté de « Catégories » (`:664-670`) toggle `showFilters` → il **ferme tout le panneau** au lieu de replier la liste des catégories. Comportement inattendu.
- 🟡 **SRCH-4** {#srch-4} — Smart search plafonnée à 100 ingr./équip. (`:146-151`) : au-delà, le filtre est ignoré silencieusement.
- 🟡 **SRCH-5** — Filtres non synchronisés dans l'URL (setSearchParams seulement dans `clearFilters:294`) : recherche non partageable, bouton Précédent inopérant, rechargement perd les filtres.
- 🟡 **SRCH-6** — Param de tri `sort` (envoyé par Home `:214,245`) non lu par SearchPage qui attend `sort_by` (`:135`) : le tri populaire/récent est ignoré à l'arrivée.
- 🟡 **SRCH-7** — La **touche Entrée ne lance pas la recherche** (observé au parcours) : dans la smart search, il faut cliquer une suggestion ; presser Entrée ne soumet rien.
- 🔵 **SRCH-8** — Bouton « Appliquer les filtres » quasi no-op (`:715-717`) : les filtres s'appliquent déjà réactivement, le bouton ne fait que fermer le panneau (libellé trompeur).

## 7.3 Détail recette (`RecipeDetailPage.tsx`)
- 🟠 **DET-1** — « Copier et modifier » sans feedback d'échec (`:61-73`, catch → `console.error`) : clic sans effet visible en cas d'erreur.
- 🟡 **DET-2** — Suppression via `window.confirm`/`alert` natifs (`:78,87`). Voir [FB-1](#fb-1).
- 🟡 **DET-3** — Rendu fragile si l'API renvoie `null` : `:331` (`ingredients.map`), `:355` (`instructions.map`), `:423` (`equipments.length`) sans garde `?.` → crash possible de la page.
- 🟡 **DET-4** — Bouton « Retour » en dur vers `/` (`:129-132`) alors qu'on vient souvent de la recherche (devrait `navigate(-1)`).
- 🟡 **DET-5** — `currentUser` (pour `isOwner`) vient de `getStoredUser()` (`:36`) tandis que d'autres composants utilisent `useAuth()` → `isOwner` peut être obsolète sans rechargement.

## 7.4 Création / édition recette (`RecipeEditPage.tsx`)
- 🟠 **EDIT-1** — Page **sans header/navigation** (voir [NAV-1](#nav-1)).
- 🟠 **EDIT-2** — Aucun feedback en cas d'échec de sauvegarde (`:354-356`). Voir [ERR-5](#err-5).
- 🟠 **EDIT-3** — ~27 `console.log` de debug en prod, incluant les **données complètes** de la recette (`:330`) et la liste d'ingrédients (`:230`). Lignes : 154,157,165,178,189,193,197,201,206,211,213,230,252,255,291,298,307,330,335-355…
- 🟡 **EDIT-4** — `ingredient_id: 1` codé en dur comme fallback (`:84,248,411,781`) : si aucun ingrédient d'ID 1, référence invalide potentiellement sauvegardée.
- 🟡 **EDIT-5** — Import photo : ingrédient non reconnu → mappé au **1er ingrédient de la base** (`:406-415`, `matchingIngredient?.id || ingredients[0]?.id || 1`) sans avertir → recette enregistrée avec de mauvais ingrédients.
- 🟡 **EDIT-6** — Tout équipement forcé `is_required: true` (`:314-318`) : le formulaire n'offre pas « facultatif », donc le badge « Obligatoire » du détail (`RecipeDetailPage:445-447`) est systématique et inutile.
- 🟡 **EDIT-7** — Pas de garde « modifications non enregistrées » sur « Annuler » (`:956-961`, `navigate(-1)`) : formulaire long perdu sans confirmation.
- 🟡 **EDIT-8** — Erreurs d'upload d'image non affichées (`:545-548`, catch → `console.error`) : validations de `ImageUpload` silencieuses.
- 🟡 **EDIT-9** — `setTimeout(…,100)` de contournement avant navigation (`:349-353`) : délai perceptible, fragile.

## 7.5 Planning (`PlanningPage.tsx`)
- 🟠 **PLAN-1** — **Tableau non responsive** (revue de code) : `:248` `<table class="table-fixed">` 8 colonnes sans conteneur `overflow-x-auto` → écrasé/débordant sur mobile.
- 🟠 **PLAN-2** — Résultat de génération invisible : tout le compte-rendu (repas ajoutés, score de diversité, créneaux sautés `skippedSlots`) part en `console.log` (`:138-149`), pas de modale/toast récap.
- 🟠 **PLAN-3** — Échecs partiels de création silencieux (voir [ERR-4](#err-4)).
- 🟠 **PLAN-4** — Boutons morts / textes trompeurs : « Planifier par lot » sans handler ([NAV-3](#nav-3)) ; sous-titre « Générer un planning » = « **Basé sur vos recettes favorites** » (`:388`) alors que la modale propose 4 sources.
- 🟡 **PLAN-5** — Fuite de valeur interne « - popular » sur les cartes générées (observé). Voir [I18N-3](#i18n-3).
- 🟡 **PLAN-6** — Repas « terminé » non réversible (`:331-344`, `disabled={is_completed}`, pas de toggle « dé-marquer »).
- 🟡 **PLAN-7** — Injection HTML brute en fallback d'image de carte repas (`AddMealModal:249-255,305-311`, `PlanRecipeModal:105-111`, `UserProfilePage:297-306`). Voir [IMG-1](#img-1).

## 7.6 Liste de courses (`ShoppingListModal.tsx`)
- 🟡 **SHOP-1** — **Vue seule** (observé) : aucune action « cocher les articles achetés », « envoyer au frigo », export.
- 🟡 **SHOP-2** — « Imprimer » = `window.print()` de **toute la page** (overlay + arrière-plan), sans feuille de style d'impression ; icône incongrue (`Clock`) ; TODO « export » non fait (`:199-210`).
- 🟡 **SHOP-3** — Quantités brutes non lisibles (observé) : « 2.5 pièce », « 666.67 g », « 0.67 paquet » — pas d'arrondi ni de pluriel (« pièce(s) »).
- 🟡 **SHOP-4** — Données non filtrées : « Parmesan 52 pièce » (une recette saisit « 50 pièce » de parmesan) — erreur de saisie recette qui pollue la liste (voir [DATA-1](#data-1)).
- 🔵 **SHOP-5** — « Grouper par catégorie » non implémenté (`groupItemsByCategory:66-70` ne fait qu'un tri alphabétique).
- 🟡 **SHOP-6** — État d'erreur sans bouton « Réessayer » (`:111-115`) : il faut refermer/rouvrir.

## 7.7 Frigo (`FridgePage.tsx`)
- 🟠 **FRIDGE-1** — Page **sans `<Layout>`** (voir [NAV-1](#nav-1)).
- 🟠 **FRIDGE-2** — Boutons « Voir »/« Planifier » sans handler (voir [NAV-3](#nav-3)).
- 🟡 **FRIDGE-3** — Filtre « **any** » brut en anglais (observé). Voir [I18N-3](#i18n-3).
- 🟡 **FRIDGE-4** — Backend : la route de **suggestions basées sur le frigo est un TODO commenté** (`fridge_routes.go`, `// fridge.GET("/suggestions", …)`). À clarifier : les suggestions affichées sont-elles calculées côté client ou non fonctionnelles ?
- 🟡 **FRIDGE-5** — Unité en **texte libre** au modal d'ajout (observé, source des incohérences d'unités, cf. [DATA-1](#data-1)) ; chargement 1000 ingrédients ([PERF-3](#perf-3)).

## 7.8 Profil (`ProfilePage.tsx` / `UserProfilePage.tsx`)
<a id="prof-1"></a>
- 🟠 **PROF-1** — Bug visible « **Membre depuis Date inconnue** » (observé) : la date d'inscription n'est pas résolue (champ non renvoyé/mal parsé). Voir [I18N-4](#i18n-4).
- 🟡 **PROF-2** — Incohérence de comptage : carte stat « **4 Abonnements** » vs onglet « **Abonnements (8)** » (observé). L'onglet regroupe Abonnés (4) + Abonnements (4) = 8 sous un même libellé « Abonnements » → déroutant.
- 🟠 **PROF-3** — Édition de profil **sans validation** (username/email, `:165-177,267-277`) : soumission d'un username vide ou email invalide possible ; échec → `console.error` seul ; succès → aucune confirmation.
- 🟡 **PROF-4** — Après suppression de recette : liste locale filtrée mais `totalCount` (stat `:328`, onglet `:378`) non décrémenté → compteur faux ; page courante non rechargée.
- 🟡 **PROF-5** — Follow/Unfollow sans feedback d'erreur (`UserProfilePage:47-70`).
- 🟡 **PROF-6** — « Voir tout » → `/search?author=…` (`UserProfilePage:194-198`) suppose que SearchPage gère `author` (la page dédiée `UserRecipesPage` aurait été la cible, mais orpheline — [NAV-2](#nav-2)).
- 🔵 **PROF-7** — Grille de 5 stats (`:324 grid-cols-5`) et 5 onglets (`:368 flex space-x-8`) serrées / débordantes sur tablette-mobile (revue de code).

## 7.9 Connexion / Inscription (`LoginPage.tsx`)
- 🟡 **LOGIN-1** — Erreurs de validation en anglais (voir [I18N-2](#i18n-2)).
- 🟡 **LOGIN-2** — `ProfileImageUpload` sans `onError` à l'inscription (`:193-196`) : upload échoué → aperçu réinitialisé silencieusement.
- 🔵 **LOGIN-3** — `console.log('login completed, isAuthenticated:', …)` (`:56`) avec valeur périmée (closure), + logs `:24,27,54,59`.

## 7.10 Timer de cuisine (`Timer.tsx`)
- 🟡 **TIMER-1** — Mélange fr/en des boutons (Start/Pause/Stop vs Reprendre). Voir [I18N-3](#i18n-3).
- 🟡 **TIMER-2** — `alert('Temps écoulé !')` bloquant si notifications refusées (`:43`).
- 🟡 **TIMER-3** — « Notification sonore » annoncée (commentaire `:35`) mais **aucun son joué** — manque réel en cuisine.
- 🟡 **TIMER-4** — Deux instances Timer (mobile/desktop, `RecipeDetailPage:144,470`) à états séparés ; un redimensionnement peut démarrer le timer masqué (`:23-31`).

---

# 8. Générateur de plan de repas (`mealPlanGenerator.ts`)

<a id="gen-1"></a>
### 🟠 GEN-1 — Bug de fuseau horaire (repas au mauvais jour)
- **Fichiers** : `:371` (`date.toISOString().split('T')[0]`), `:405-416` (`new Date(dateString + 'T08:00:00.000Z')`).
- **Problème** : Conversion locale→UTC via `toISOString()` : à l'est de Greenwich, minuit local peut basculer la veille en UTC. Heures de repas fixées en `Z` → un petit-déj « 08:00Z » s'affiche 10:00 en France, et pour un fuseau négatif la date recule d'un jour. Des repas peuvent apparaître le mauvais jour.

### 🟠 GEN-2 — Mapping catégorie→repas cassé par les accents
- **Fichiers** : `CATEGORY_TO_MEAL_TYPE:18-41` (clé `'pates'`), lookup `category.name.toLowerCase()` (`:50,64,176`).
- **Problème** : Clés sans accent (`'pates'`) vs catégorie réelle « Pâtes » → `toLowerCase()` = `'pâtes'` ne matche pas → fallback lunch/dinner. Affectation aux créneaux faussée.

### 🟠 GEN-3 — Option « Diversifier les catégories » quasi sans effet
- **Fichiers** : `diversifySelection:77-119` (condition `selected.length > count/2` `:102`), appelée avec `count=1` (`:259-264`).
- **Problème** : Comme la sélection se fait 1 recette à la fois, `selected.length` = 0 → la branche de diversification ne se déclenche jamais. L'option (cochée par défaut) n'a pratiquement aucun impact.

### 🟡 GEN-4 — Répétition possible malgré « Éviter les répétitions »
- `:251-256` : quand toutes les recettes adaptées sont déjà utilisées, on retombe sur toutes (y compris déjà planifiées) sans avertir.

### 🟡 GEN-5 — Repas supprimés silencieusement si `maxRecipesPerDay` < nb de types
- `:224-228` : 4 types demandés + « max 3/jour » → le 4e créneau est ignoré chaque jour, sans message.

### 🟠 GEN-6 — Incohérence modèle `list.items` vs `list.recipes`
- **Fichiers** : `GeneratePlanModal.tsx:229` (`list.recipes?.length`) et `mealPlanGenerator.ts:336` (`data.recipes`) vs `ProfilePage:701`, `UserProfilePage:232`, `RecipeListDetailModal:46-48` (`list.items`).
- **Problème** : Le compteur « (X recettes) » du sélecteur de liste affichera « 0 » ; pire, la génération à partir d'une liste peut ne **jamais trouver de recettes** si l'API renvoie `items`.
- 🟡 **GEN-7** — Génération « liste » lançable sans liste sélectionnée (`GeneratePlanModal:101-117,208-234`) → « Aucune recette » sans indice.

### 🔵 GEN-8 — Divers qualité
- Docstring d'en-tête corrompue (fragments de code collés, `:5-13`) ; `getDefaultServings:378-386` code mort ; shuffle biaisé (`:85 sort(() => Math.random()-0.5)`).

---

# 9. Qualité des données

<a id="data-1"></a>
### 🟡 DATA-1 — Unités en texte libre → incohérences
- **Observé** : le modal d'ajout au frigo et les recettes utilisent des **unités libres** (`pièce`, `cac`, `paquet`, `g`, `cl`…), d'où des agrégats étranges dans la liste de courses (« 52 pièce » de parmesan, « 0.67 paquet »). Pas de référentiel d'unités ni de normalisation.

### 🟡 DATA-2 — Erreurs de saisie non détectées
- Ex. « Salade César » → 50 « pièce » de parmesan. Aucune validation de plausibilité des quantités à la création de recette.

---

# 10. Configuration & déploiement

<a id="cfg-1"></a>
### 🟡 CFG-1 — Images de fallback inexistantes (icônes cassées)
- `public/` ne contient que `chef-hat.svg`, `vite.svg`. Or :
  - `index.html:6` référence `/favicon.ico` **absent** → 404 systématique sur navigateurs sans support SVG.
  - `src/utils/imageUtils.tsx:47` : fallback `'/placeholder-recipe.jpg'` **absent** → le fallback lui-même renvoie 404 (icône cassée sur les recettes sans photo). *(Sur le parcours, les recettes sans image affichent un placeholder « chef-hat » — vérifier quel chemin est réellement rendu.)*

### 🟡 CFG-2 — Headers de sécurité perdus sur les assets & CSP faible (nginx)
- `nginx.conf:55-58` (bloc assets avec son propre `add_header Cache-Control`) fait **perdre l'héritage** des `add_header` de sécurité du bloc `server` (`:70-74`) → JS/CSS/images servis sans `X-Frame-Options`/`X-Content-Type-Options`/CSP. CSP globale permissive (voir [SEC-6](#sec-6)).
- `:50-52,55-58` : `index.html` non couvert par un `Cache-Control: no-cache` explicite → risque de servir d'anciens bundles hashés après déploiement.

### 🔵 CFG-3 — Pas de manifest PWA / métadonnées mobiles
- `index.html:3-10` : pas de `manifest.webmanifest`, `theme-color`, `apple-touch-icon`, ni `og:`/Twitter cards. `lang="fr"`, `viewport`, `description` présents (bon point).

### 🔵 CFG-4 — Nom de l'app incohérent
- « **CookingApp** » (logo `Header.tsx:47`) vs « **Cooking App** » (`index.html:9` `<title>`).

### 🔵 CFG-5 — `vite.config.ts` minimal
- Pas de `server.proxy` dev pour `/api` (repose sur CORS backend), pas d'alias, pas de config build (ex. `esbuild.drop: ['console']` pour purger les logs).

---

# 11. Composants UI & code mort

### 🟡 UI-1 — Fallback image dupliqué via `innerHTML` au lieu du composant existant {#img-1}
- Hack `e.currentTarget.parentElement.innerHTML = '<svg…>'` dupliqué dans `HomePage:28-37`, `SearchPage:21-30`, `RecipeDetailPage:209-218`, `UserProfilePage:297-306`, `PlanRecipeModal:105-111`, `AddMealModal:249-255,305-311`. Or un composant propre **`RecipeImage`** (avec `onError`→fallback) existe dans `utils/imageUtils.tsx` mais **n'est jamais utilisé**. `RecipeListDetailModal:189-197` utilise, lui, une approche propre → incohérence.

### 🟡 UI-2 — Duplication de composants
- **Modales de création de liste** : `RecipeListModal.tsx` et `QuickCreateListModal.tsx` quasi identiques (libellés/styles divergents). `QuickCreateListModal:36-58` : si l'ajout de recette échoue après création de la liste, message d'erreur faux (« Erreur lors de la création ») et `onListCreated` non appelé.
- **Modales d'ajout** : `AddIngredientModal.tsx` ≈ `AddEquipmentModal.tsx` (seules diffèrent l'URL et les libellés).
- **Spinner** réimplémenté dans `Button.tsx:45-65` et `Loading.tsx:16-38`.

### 🟡 UI-3 — Code mort / non utilisé
- `FavoriteButton.tsx` (jamais importé ; favoris gérés par `RecipeActions`) — de plus libellé inversé « Favoris »/« Favori » (`:90`).
- `imageUtils.tsx` → `RecipeImage` (voir UI-1).
- `recipeExtractionService.ts:115-129` `formatForRecipeForm` ; `commentService.ts:89-97` `getCommentReplies` ; `favoriteService.ts:26-35` `addToFavorites`/`removeFromFavorites` (appellent `toggleFavorite` → sémantique cassée si jamais utilisés).
- `mealPlanGenerator.ts:378-386` `getDefaultServings`.
- Doublons d'export : `components/ui/index.ts:6-9` (Badge, Select exportés 2×).

### 🟡 UI-4 — Commentaires
- `CommentSection.tsx:101-103` : moyenne recalculée côté client **en incluant les réponses** (biais vs `recipe.average_rating` backend). `:18` note par défaut **5/5** (biais si l'utilisateur ne touche pas aux étoiles). `:39-40` pas de longueur max. `CommentItem.tsx:110-123,162-175` : pas d'état de soumission (double-envoi possible) ; `:31,66` indentation `marginLeft` en `rem` non responsive.

### 🟡 UI-5 — Pagination : `itemsPerPage` incohérent
- `Pagination.tsx:22,72-74` : défaut 20 ; `UserRecipesPage:188` n'envoie pas la valeur (charge par 12) → ligne « Affichage de X à Y sur N » fausse (page orpheline de toute façon).

### 🔵 UI-6 — Divers
- `Button` sans `aria-busy` en chargement (`:34-67`) ; `CommentsectionProps` mal nommé (`CommentSection.tsx:8,12`) ; validation `mealPlanCreateSchema` (`validation.ts:97`, `YYYY-MM-DD`) incompatible avec l'ISO envoyé (schéma jamais appliqué) ; `maxLength={2}` sur les champs emoji (`AddIngredientModal:163`) peu fiable (emojis composés) ; palette : `primary` = rouge en collision sémantique avec `danger`/erreur (`tailwind.config.js:9-22`).

---

# 12. Architecture (dette structurelle)

<a id="arch-1"></a>
### 🟡 ARCH-1 — Pas de layout de route centralisé
- `App.tsx:10-71` monte les pages directement ; chaque page doit s'envelopper dans `<Layout>` → oublis (Frigo, RecipeEdit → [NAV-1](#nav-1)). Un layout de route React Router (`<Outlet>`) supprimerait la duplication et le risque d'oubli du header.

### 🟡 ARCH-2 — `console.log`/`DEBUG` massifs en production (~200+ occurrences)
- Concentrations : `RecipeEditPage` (~27), `PlanningPage` (~30), `ProfilePage` (~26), `mealPlanGenerator` (~20), `RecipeListDetailModal:43-63` (8× « DEBUG »), `AuthContext:68-75`, `auth.ts:23,25` (dont le **token**, [SEC-2](#sec-2)), `recipe.ts:61-65` (dont la réponse complète). Aucun strip au build. Bruit + fuite d'infos.

---

## Annexe — Notes de parcours (production)

- Compte de test : recettes réelles présentes (Tarte Banane chocolat, etc.), 9 recettes créées, 3 favoris, 4 abonnés / 4 abonnements.
- **Points positifs relevés** : panneau de filtres de recherche riche (difficulté, note, temps, catégories, tags) ; empty state de recherche soigné (« Aucune recette trouvée » + CTA) ; liste de courses agrégée fonctionnelle (regroupe par ingrédient, indique où chaque quantité est utilisée) ; détail recette complet (ingrédients avec emojis, instructions avec recette référencée, équipement, commentaires notés, timer) ; feed « Vos abonnements » groupé par utilisateur ; extraction de recette depuis photo (IA) présente.
- Toutes les requêtes API observées répondaient **200** ; aucune erreur console bloquante détectée sur les pages parcourues (les problèmes sont surtout des redondances réseau et des comportements UX, pas des 500).

---

_Fin de l'audit. Prochaine étape suggérée : prioriser la section « Top priorités », puis traiter par lots thématiques (sécurité → feedback/toasts → navigation/pages mortes → i18n → générateur → a11y)._
