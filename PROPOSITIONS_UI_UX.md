# CookingApp — Propositions de refonte UI/UX & design

> Document rédigé le **2026-07-14**. Complémentaire à `AUDIT_UX_UI.md` (qui listait les problèmes).
> Ici, l'objectif est **constructif** : proposer une direction design et un ensemble d'améliorations concrètes pour rendre l'app **plus fluide, plus lisible, plus visuelle et plus agréable** à utiliser.
> Focus principal : **les gros formulaires**, en tête la **création de recette**. Puis : design system, autres écrans, roadmap.

---

## Sommaire

1. [Vision & direction design](#1-vision)
2. [Diagnostic du design actuel](#2-diagnostic)
3. [Fondations : le design system à mettre en place](#3-fondations)
4. [⭐ Refonte du formulaire de création de recette](#4-recette)
5. [Autres écrans à rendre plus visuels](#5-autres)
6. [Bibliothèque de composants à créer](#6-composants)
7. [Motion & micro-interactions](#7-motion)
8. [Roadmap priorisée (impact / effort)](#8-roadmap)

---

<a id="1-vision"></a>
## 1. Vision & direction design

**Constat de départ** : l'app est **fonctionnellement riche** (recettes, planning, frigo, listes, social, extraction IA) mais **visuellement plate et utilitaire**. Tout est en cartes blanches `shadow-md`, une seule couleur (rouge), une police système, aucune animation, et les écrans denses (formulaires, planning) sont fatigants.

**Direction proposée : « du fonctionnel au savoureux ».**
Transformer une UI de type « formulaire d'admin » en une expérience **chaleureuse, appétissante et guidée**, digne d'une app culinaire moderne (pense Marmiton/Jow/Kitchen Stories niveau finition). Trois principes directeurs :

1. **Guider plutôt que présenter** — remplacer les longs murs de champs par des parcours progressifs, avec hiérarchie visuelle claire et divulgation progressive (on ne montre le détail que quand on le demande).
2. **Montrer plutôt que décrire** — mettre l'image, l'aperçu et le visuel au premier plan (la nourriture, ça se regarde). Aperçu en direct, grandes photos, icônes, couleurs d'accent.
3. **Récompenser l'action** — feedback immédiat, micro-animations, états vides illustrés, transitions douces. L'app doit être « satisfaisante » à utiliser.

---

<a id="2-diagnostic"></a>
## 2. Diagnostic du design actuel

### 2.1 Ce qui fonctionne (à garder)
- Structure en **cartes** cohérente, layout centré lisible (`max-w-4xl`).
- Système d'**emojis** sur ingrédients/équipements → identité sympathique déjà amorcée.
- Composants de base propres (`Button`, `Card`, `Input`, `Badge`) réutilisables.
- Bandeau « Créer depuis une photo » (extraction IA) : bon exemple de bloc mis en avant.

### 2.2 Ce qui limite l'expérience

| Sujet | Constat | Fichier |
|-------|---------|---------|
| **Palette** | Une seule couleur de thème définie : `primary` = **rouge** (`#dc2626`). Elle sert à la fois d'action principale **et** entre en collision avec le rouge « danger/erreur ». Le reste (bleu, vert, orange) est posé au coup par coup, non tokenisé. | `tailwind.config.js:9-22` |
| **Typographie** | La police **Inter est déclarée mais jamais chargée** (aucun `<link>`/`@font-face`) → l'app tombe sur la police système. Pas d'échelle typographique, titres peu différenciés. | `index.css:8`, `index.html` |
| **Profondeur / matière** | Tout est `shadow-md` + `border-gray-200` + `rounded-lg`. Rendu « plat », uniforme, sans hiérarchie de plans. | `Card.tsx`, `index.css` |
| **Densité** | Formulaires en très long scroll, tous les champs (même optionnels) toujours visibles. Charge cognitive forte. | `RecipeEditPage.tsx` |
| **Sélections massives** | Tags / Équipements = **murs de 20+ pastilles grises identiques**, sans recherche ni regroupement. | `RecipeEditPage.tsx:633-692` |
| **Motion** | **Aucune animation** en dehors des `transition-colors`. Pas de transitions de page, d'apparition, de feedback. | global |
| **États** | Skeletons existent (`LoadingSkeleton`) mais **peu utilisés** ; états vides = texte gris sans illustration ; pas de toasts. | `Loading.tsx`, cf. audit `FB-1` |
| **Résidus** | `App.css` (non importé) contient encore le **CSS du template Vite** (`.logo`, `.read-the-docs`, `#root{text-align:center}`). À supprimer. | `App.css` |
| **Iconographie** | `lucide-react` disponible mais sous-exploité ; beaucoup de « + » textuels au lieu d'icônes. | global |

---

<a id="3-fondations"></a>
## 3. Fondations : le design system à mettre en place

Avant de refondre les écrans, poser des **tokens** cohérents. Tout le reste en découle.

### 3.1 Palette

Repositionner la couleur de marque sur une teinte **chaude et appétissante** (paprika/terracotta), et **séparer clairement** marque, accent et couleurs sémantiques (pour ne plus confondre « bouton principal » et « erreur »).

```
Marque (brand)      — paprika chaud, un peu orangé (identité food)
  brand-50  #FFF4ED   brand-500 #F26430   brand-600 #E14E1D   brand-700 #BC3C12
Accent (secondary)  — vert « herbes fraîches » pour actions secondaires / réussite douce
  accent-500 #3FA66A  accent-600 #2F8A55
Neutres (warm gray / stone) — remplacer les gris froids par des gris chauds
  stone-50 … stone-900 (Tailwind `stone` convient très bien)
Sémantiques (réservées, distinctes de la marque)
  success #16A34A   warning #D97706   danger #DC2626   info #2563EB
```

- **Règle** : le rouge pur (`danger`) n'est utilisé **que** pour destructif/erreur. Les CTA principaux passent en `brand`. Ça lève la collision actuelle.
- Décliner en variables CSS (`--color-brand-500`…) pour préparer un futur **mode sombre**.

### 3.2 Typographie

- **Charger réellement** une police (self-host via `@fontsource` pour éviter la dépendance CDN, cf. audit CSP) :
  - **Corps** : `Inter` (déjà visée) — variable.
  - **Titres (display)** : une police à caractère pour donner du « goût » — ex. **`Fraunces`** (serif moderne chaleureux) ou **`Bricolage Grotesque`**. Réservée aux `h1`/titres de section/hero.
- **Échelle** typographique explicite (ex. `text-display` 40/48, `h1` 30, `h2` 22, `h3` 18, `body` 15/16, `caption` 13) avec `tracking` et `leading` cohérents.

### 3.3 Formes, ombres, espacements

- **Radius** : monter à `rounded-xl`/`2xl` sur les cartes et champs → aspect plus doux/moderne.
- **Ombres** : remplacer `shadow-md` par des **ombres douces et diffuses** (`shadow-[0_2px_12px_rgba(0,0,0,0.05)]`), + une ombre « survol » plus marquée pour l'interactif.
- **Bordures** : bordure très légère `stone-200/60` ; s'appuyer surtout sur l'ombre + le fond.
- **Espacement** : rythme vertical constant (échelle 4/8), et **respirer** davantage dans les cartes.
- **Focus** : anneau de focus **visible et cohérent** partout (`focus-visible:ring-2 ring-brand-500 ring-offset-2`) — actuellement inégal.

### 3.4 Fond & ambiance

- Fond global `stone-50` légèrement chaud plutôt que `gray-50` froid.
- Envisager une **texture/hero subtil** en haut des pages clés (dégradé chaud très léger, motif culinaire discret) pour sortir du « blanc plat ».

---

<a id="4-recette"></a>
## 4. ⭐ Refonte du formulaire de création de recette

C'est **le** chantier ergonomique principal. Fichier : `cooking_front/src/pages/RecipeEditPage.tsx`.

### 4.1 Ce qui coince aujourd'hui (ergonomie)

Parcours réel observé sur `/recipe/new` :

1. **Un seul très long formulaire** (~6 cartes empilées, plusieurs milliers de px de scroll). Pas de repères, pas de progression, on se perd.
2. **Chaque étape d'instruction = une carte géante** (~500 px) avec **6 champs** : titre, durée, température, description, conseils, recette référencée — **tous affichés en permanence**, alors que la plupart sont optionnels. Une recette de 8 étapes = un mur de formulaires.
3. **Champs « 0 » par défaut** partout (Durée, Température, Quantité) → bruit visuel, l'utilisateur doit effacer le « 0 ».
4. **Tags & Équipements = murs de 20+ pastilles grises** identiques, sans recherche, sans regroupement, avec une **casse incohérente** (« Autocuiseur » à côté de « frigo », « passoire », « plat à tarte »).
5. **Ingrédients en grille de 5 colonnes** (ingrédient / quantité / unité / notes / supprimer) — dense, « Notes » a le même poids visuel que l'ingrédient, pas de réordonnancement, pas de regroupement (ex. « Pâte » / « Garniture »).
6. **Aucun aperçu** : on saisit à l'aveugle, sans voir le rendu final.
7. **Bouton « Créer » tout en bas**, non *sticky* : sur un formulaire long, l'action est loin et on ne sait jamais « où on en est ».
8. **Pas de brouillon / autosave** : quitter = tout perdre (cf. audit `EDIT-7`).
9. **Difficulté = `<select>` natif**, visibilité = case à cocher nue : peu engageant.

### 4.2 Parti pris recommandé : **layout 2 colonnes + navigation d'ancrage + aperçu vivant**

Plutôt qu'un assistant multi-pages (qui fragmente et multiplie les clics), garder **une seule page** mais la **structurer** :

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ← Retour        Créer une recette                 [Brouillon ✓ auto]      │  ← barre sticky
│                                          [ Aperçu ]  [ Enregistrer ▾ ]     │
├───────────────┬──────────────────────────────────────────┬───────────────┤
│  SOMMAIRE     │   CONTENU (colonne principale)            │   APERÇU LIVE  │
│  (sticky)     │                                           │   (sticky)     │
│               │   ● L'essentiel                           │  ┌──────────┐  │
│ ● L'essentiel │   ● Détails (temps/portions/difficulté)   │  │  photo   │  │
│ ○ Détails     │   ● Ingrédients                           │  │  titre    │ │
│ ○ Ingrédients │   ● Étapes                                │  │ ⏱ 🍽 ★    │  │
│ ○ Étapes      │   ● Classement (catégories/tags/matériel) │  └──────────┘  │
│ ○ Classement  │                                           │  (carte + rendu│
│               │                                           │   détail mini) │
└───────────────┴──────────────────────────────────────────┴───────────────┘
```

- **Barre d'action *sticky*** en haut : titre, statut d'autosave (« Brouillon enregistré »), bouton **Aperçu**, bouton **Enregistrer/Publier** toujours accessibles.
- **Sommaire ancré** (gauche, sticky) qui suit le scroll (`scroll-spy`) : on sait où on est, on saute où on veut. Chaque entrée peut afficher une **coche verte** quand la section est valide (ex. « Ingrédients ✓ »).
- **Aperçu live** (droite, sticky) : rendu de la **carte recette** + mini-aperçu du détail, mis à jour en temps réel. C'est le levier « visuel » le plus fort.
- Sur mobile : colonnes qui s'empilent, sommaire → onglets horizontaux *sticky*, aperçu → bouton flottant « Aperçu ».

### 4.3 Bloc par bloc

#### A. L'essentiel — mettre la **photo** au premier plan
- **Zone photo en grand, en tête** (drag & drop plein largeur, ratio 16:9), avec état vide illustré (« Glissez une photo de votre plat »). L'image est le premier réflexe d'une app food.
- Bandeau **« Créer depuis une photo » (IA)** conservé mais intégré comme **onglet/CTA secondaire** en haut (« ✍️ Saisir manuellement | 📸 Importer depuis une photo »), au lieu d'un bloc séparé.
- **Titre** en gros champ (typo display), **description** juste dessous.

#### B. Détails — visuel et tactile
- **Temps de préparation / cuisson / portions** : passer des `<input number>` nus à des **steppers** avec icônes (`⏱`, `🔥`, `🍽`) et boutons `–/+`. Optionnel : presets rapides (15/30/45/60).
- **Difficulté** : remplacer le `<select>` par un **segmented control** coloré à 3 options (`Facile` vert · `Moyen` orange · `Difficile` rouge) → choix en 1 clic, lisible.
- **Visibilité** : **toggle switch** « Publique / Privée » avec libellé explicite au lieu d'une case à cocher.

```
Avant :  Difficulté [ Moyen  ▼ ]      Après :  Difficulté  [ Facile | ●Moyen | Difficile ]
         ☐ Recette publique                    Visibilité  ( Privée  ◯━● Publique )
         Temps prép. [ 30 ]                     ⏱ Préparation   [ – ] 30 min [ + ]
```

#### C. Ingrédients — éditeur compact, réordonnable, avec **groupes**
- **Lignes compactes** : `⠿ (poignée drag)` · **ingrédient** (recherche, large) · **quantité** · **unité** · `⋯` (menu : notes, dupliquer, supprimer). Les **notes** passent en champ **replié** (rarement utilisé) au lieu d'occuper une colonne permanente.
- **Unité normalisée** : remplacer le texte libre (source d'incohérences « 52 pièce ») par un **select avec autocomplétion** sur un référentiel (g, kg, ml, cl, l, c. à café, c. à soupe, pièce, pincée…) tout en autorisant une saisie libre.
- **Réordonnancement drag & drop** (poignée) + insertion.
- **Groupes d'ingrédients** (optionnels) : sous-titres « Pour la pâte », « Pour la garniture » — très demandé sur les recettes composées.
- **Ajout inline** : un champ « Tapez pour ajouter un ingrédient… » toujours présent en bas ; si l'ingrédient n'existe pas → « Créer “X” » directement dans la liste (évite d'ouvrir une modale séparée).

```
┌ Ingrédients ───────────────────────────────────────────────┐
│ Pour la pâte                                    [+ groupe]  │
│ ⠿  🥚 Œufs            [ 3 ]  [pièce ▾]                  ⋯   │
│ ⠿  🧈 Beurre          [ 120] [g     ▾]                  ⋯   │
│ Pour la garniture                                          │
│ ⠿  🍫 Chocolat        [ 200] [g     ▾]                  ⋯   │
│ ➕  Tapez pour ajouter un ingrédient…                       │
└────────────────────────────────────────────────────────────┘
```

#### D. Étapes — **divulgation progressive** (le plus gros gain)
Le point noir actuel. Objectif : une étape = **une ligne claire** par défaut, les détails à la demande.

- **Vue compacte par défaut** : `numéro` · **description** (champ multiligne auto-hauteur) · poignée drag · menu `⋯`. Rien d'autre.
- **Détails avancés repliés** derrière un discret **« + Ajouter un détail »** : durée, température, conseils, recette liée. On ne les voit **que si on en a besoin** — fini le mur de « 0 ».
- **Pas de valeurs « 0 » par défaut** : champs vides avec placeholder ; n'envoyer au backend que ce qui est renseigné.
- **Drag & drop** pour réordonner (remplace/complète les flèches ↑↓ actuelles) + **« insérer une étape ici »** entre deux étapes.
- **Numérotation automatique** visible et vivante.

```
Avant (une étape = ~500px, 6 champs ouverts)      Après (compact, détails à la demande)
┌──────────────────────────────┐                 ┌─────────────────────────────────────┐
│ ① [Titre étape (optionnel)]   │                 │ ⠿ ① Couper les bananes en rondelles  │
│ Durée [0]   Température [0]    │                 │      et les disposer sur la pâte.  ⋯ │
│ Description * [            ]   │                 │      + Ajouter un détail (⏱ 🌡 💡 🔗) │
│ Conseils      [            ]   │                 ├─────────────────────────────────────┤
│ Recette réf.  [ Aucune    ▾]   │                 │ ⠿ ② …                                │
└──────────────────────────────┘                 │        + insérer une étape ici       │
```

#### E. Classement — catégories / tags / équipements **cherchables**
Remplacer les 3 murs de pastilles par des **multi-selects à recherche + chips** :
- Un champ « Ajouter une catégorie… » avec liste filtrable ; les éléments **choisis** s'affichent en chips colorés **en haut** (visibles d'un coup d'œil), le reste reste dans le tiroir.
- **Équipements** : grille d'icônes **filtrable** (barre de recherche), avec les emojis existants ; item sélectionné = état plein coloré. **Normaliser la casse à l'affichage** (capitaliser « frigo » → « Frigo »).
- Regrouper les trois dans **une seule carte à onglets** (« Catégories · Tags · Matériel ») pour compacter.

#### F. Aperçu live (colonne droite)
- Rendu **temps réel** de la carte recette (photo, titre, `⏱`, `🍽`, `★`, badges catégories) — exactement telle qu'elle apparaîtra dans les listes.
- Onglet « Détail » du preview : aperçu de la page recette (ingrédients + étapes) → l'utilisateur **voit ce qu'il fabrique**.

### 4.4 Confort & sécurité de saisie
- **Autosave brouillon** (localStorage + backend) avec indicateur « Enregistré à HH:MM ». Répond à `EDIT-7` (perte de saisie).
- **Validation inline en temps réel** et **messages en français** (cf. audit `I18N-2`) : coche verte quand un bloc est complet, message doux quand il manque quelque chose — au lieu d'un échec silencieux à la soumission.
- **Feedback de soumission** : bouton avec état de chargement, puis **toast de succès** + transition vers la recette (cf. `FB-1`, `ERR-5`). En cas d'erreur : toast explicite, on ne perd rien.
- **Barre d'action sticky** : « Annuler » (avec garde « modifications non enregistrées »), « Aperçu », « Enregistrer le brouillon », « Publier ».
- **Raccourcis** : `⌘/Ctrl+S` = enregistrer, `⌘/Ctrl+Entrée` = publier.

---

<a id="5-autres"></a>
## 5. Autres écrans à rendre plus visuels

### 5.1 Carte recette (composant central, partout)
- **Hover** : légère élévation + zoom image (`scale-105`) + apparition des actions (favori/liste) — actuellement statique.
- **Badges harmonisés** : temps `⏱`, portions `🍽`, difficulté (pastille colorée cohérente avec le segmented control).
- **Étoiles en demi-crans** (cf. audit `HOME-4`) : 3,7 doit afficher 3,5 étoiles, pas 3.
- **Ratio image constant** + `object-cover` + dégradé bas pour poser le titre par-dessus (style magazine) en option.
- **Placeholder appétissant** quand pas de photo (illustration douce plutôt que l'icône grise actuelle).

### 5.2 Accueil
- **Hero** plus travaillé (dégradé chaud, illustration/photo, CTA contrastés) ; aujourd'hui c'est un bloc rose pâle plat.
- **Rails horizontaux** défilables (« Populaires », « Récentes », « De vos abonnements ») avec *scroll-snap* plutôt que des grilles qui poussent la page très bas.
- **Section « Reprendre »** (brouillons de recettes, dernier planning) pour re-engager.

### 5.3 Recherche
- **Filtres en tiroir latéral** (drawer) plutôt qu'un grand panneau qui décale les résultats ; **chips actifs** au-dessus des résultats, tous supprimables (répond à `SRCH-2`).
- **Recherche = résultat instantané** (déjà réactif) : soigner l'**état de chargement** (skeletons de cartes) et l'**empty state** illustré.

### 5.4 Planning
- Refonte visuelle du **calendrier** (couleurs par type de repas déjà amorcées) ; **drag & drop** d'un repas d'une case à l'autre.
- **Responsive** : le tableau 8 colonnes est inutilisable sur mobile (`PLAN-1`) → vue « jour par jour » en accordéon sur petit écran.
- **Récap de génération visuel** (modale) au lieu des `console.log` (`PLAN-2`) : « 12 repas ajoutés · score de diversité · 2 créneaux déjà occupés ».

### 5.5 Détail recette
- **Mode cuisine** (plein écran, une étape à la fois, gros texte, timers intégrés) — killer feature pour une app de cuisine, la base est déjà là (Timer, étapes).
- **Portions ajustables** : un stepper qui **recalcule les quantités** à la volée.
- **Colonne ingrédients *sticky*** pendant qu'on lit les étapes (desktop).

### 5.6 États transverses (grosse valeur, faible coût)
- **Toasts** (succès/erreur) unifiés → supprime tous les `alert()`/`confirm()` (`FB-1`).
- **Skeletons** systématiques sur les chargements (le composant existe déjà).
- **Empty states illustrés** (frigo vide, aucune liste, aucun favori) avec une petite illustration + CTA, au lieu du texte gris.
- **Confirmations** destructives via **dialog stylé** (pas `window.confirm`).

---

<a id="6-composants"></a>
## 6. Bibliothèque de composants à créer / faire évoluer

| Composant | État actuel | Évolution proposée |
|-----------|-------------|--------------------|
| `Button` | 4 variants, pas d'icône dédiée | Ajouter `icon`/`iconOnly` (+ `aria-label`), taille `xs`, état `isLoading` avec `aria-busy` |
| `IconButton` | ❌ inexistant | Bouton icône accessible (poignées, `⋯`, favori) |
| `Card` | plate `shadow-md` | Variants (`elevated`, `interactive` avec hover), radius `2xl`, ombre douce |
| `Input` / `Textarea` | ok, sans adornments | Icônes/affixes (`min`, `€`, `⏱`), textarea auto-hauteur, `aria-invalid` |
| `Stepper` | ❌ | Champ numérique `– n +` (temps, portions, quantités) |
| `SegmentedControl` | ❌ | Difficulté, filtres — choix 1-clic |
| `Toggle` (switch) | ❌ | Visibilité publique/privée, préférences |
| `Chip` (sélectionnable/removable) | pastilles ad hoc | Chip standard (sélection, suppression `×`), couleurs sémantiques |
| `Combobox` / `MultiSelect` | recherches maison non a11y | Combobox accessible (clavier, `role=listbox`) réutilisable (ingrédients, tags, catégories, matériel) |
| `Toast` / `Toaster` | ❌ (voir `FB-1`) | Système global succès/erreur/info |
| `Dialog` (confirm) | `window.confirm` | Dialog stylé, focus-trap |
| `Modal` | pas d'a11y | focus-trap, `role=dialog`, bouton fermer, ESC (déjà) |
| `EmptyState` | texte gris | Illustration + titre + CTA, réutilisable |
| `Skeleton` | existe, sous-utilisé | Variantes carte/ligne/texte, généraliser |
| `SortableList` | flèches ↑↓ | Drag & drop (étapes, ingrédients) via `@dnd-kit` |
| `RecipeCard` | dupliqué inline | Un seul composant partagé (aujourd'hui réimplémenté dans plusieurs pages) |

> Astuce : les libs headless accessibles (**Radix UI**, **@headlessui/react**, **@dnd-kit**, **sonner** pour les toasts) permettent d'obtenir l'a11y et le drag & drop « gratuitement » et de rester cohérent avec le style Tailwind.

---

<a id="7-motion"></a>
## 7. Motion & micro-interactions

Aujourd'hui : quasi zéro animation. Quelques touches ciblées suffisent à changer la perception.

- **Transitions de contenu** : apparition douce des cartes/listes (`fade + translate-y`), collapse animé pour les « détails d'étape ».
- **Feedback tactile** : boutons qui « s'enfoncent » (`active:scale-95`), favori qui « pulse » au clic, coche animée quand une section devient valide.
- **Drag & drop** : ombre portée + placeholder pendant le déplacement.
- **Toasts** : slide-in discret en bas.
- **Squelettes → contenu** : cross-fade, pas de « saut ».
- **Respecter** `prefers-reduced-motion` (désactiver les animations non essentielles).
- Outils : `tailwindcss-animate`, ou **Framer Motion** pour les transitions riches (drag, layout, listes).

---

<a id="8-roadmap"></a>
## 8. Roadmap priorisée (impact / effort)

### 🥇 Quick wins (fort impact, faible effort)
1. **Charger la police** (Inter + display) et poser l'**échelle typo** — change instantanément le « niveau » perçu.
2. **Étendre la palette** (brand chaud + neutres chauds + sémantiques distincts) et **délier le rouge « danger » du rouge « marque »**.
3. **Système de toasts** + suppression des `alert()/confirm()` → feedback partout (transverse avec `AUDIT_UX_UI.md > FB-1`).
4. **Adoucir cartes/ombres/radius** et **fond `stone-50`**.
5. **Étoiles demi-crans**, **hover des cartes recette**, **skeletons** généralisés.
6. Supprimer `App.css` (résidus Vite) et normaliser la **casse** des tags/équipements à l'affichage.

### 🥈 Chantier central : formulaire de recette
7. **Divulgation progressive des étapes** (compact + « ajouter un détail ») et **retrait des « 0 » par défaut** — le plus gros gain de fluidité.
8. **Barre d'action sticky** + **sommaire ancré** + **autosave brouillon**.
9. **Ingrédients** : lignes compactes, **drag & drop**, **unités normalisées**, notes repliées, groupes.
10. **Catégories/Tags/Matériel** : passage aux **combobox à recherche + chips** (une carte à onglets).
11. **Détails visuels** : steppers (temps/portions), segmented control (difficulté), toggle (visibilité).
12. **Aperçu live** de la recette (colonne droite).

### 🥉 Ambitions produit (plus d'effort, fort « waouh »)
13. **Mode cuisine** plein écran + **portions ajustables** sur le détail.
14. **Planning** : drag & drop + refonte responsive + récap de génération visuel.
15. **Accueil** : hero retravaillé + rails horizontaux + section « Reprendre ».
16. **Empty states illustrés** sur toute l'app + préparation d'un **mode sombre** (via variables CSS des tokens).

---

### Note de méthode
Ces propositions sont **indépendantes** de la correction des bugs listés dans `AUDIT_UX_UI.md`, mais **plusieurs se recoupent** (feedback/toasts, i18n des validations, responsive du planning, garde de saisie du formulaire). Il est logique de traiter d'abord les **fondations design (quick wins 1-6)**, puis d'attaquer le **formulaire de recette** en corrigeant au passage les bugs associés (`EDIT-*`, `ERR-5`, `I18N-2`).

> **Étape suivante possible** : je peux produire une **maquette HTML cliquable** (artifact) du nouveau formulaire de création de recette pour visualiser concrètement la refonte (layout 2 colonnes, étapes repliables, aperçu live) avant tout développement.
