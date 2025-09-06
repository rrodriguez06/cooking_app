# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

# CookingApp Frontend

Frontend React/TypeScript pour l'application CookingApp - Une application complète de gestion de recettes et de planification de repas.

## 🚀 Fonctionnalités

### ✅ Implémentées
- **Authentification** : Connexion/Inscription avec JWT
- **Page d'accueil** : Feed avec dernières recettes et suggestions
- **Profil utilisateur** : Gestion du compte et visualisation des recettes créées
- **Détail de recette** : Affichage complet avec ingrédients, instructions, équipements
- **Recherche** : Recherche de recettes avec filtres (difficulté, temps, etc.)
- **Planning** : Vue calendrier pour planifier les repas de la semaine
- **Design responsive** : Compatible desktop et mobile
- **Navigation intuitive** : Menu adaptatif avec états actifs

### 🔄 À développer
- **Création/Édition de recettes** : Formulaires pour créer et modifier des recettes
- **Mode cuisine** : Interface step-by-step pour suivre une recette en cuisinant
- **Gestion des favoris** : Système de favoris pour les recettes
- **Liste de courses** : Génération automatique basée sur le planning
- **Notifications** : Rappels pour les repas planifiés
- **Partage social** : Partage de recettes entre utilisateurs

## 🛠️ Technologies utilisées

- **React 18** : Framework UI avec hooks
- **TypeScript** : Typage statique
- **Vite** : Build tool et dev server
- **React Router** : Navigation SPA
- **Tailwind CSS** : Framework CSS utility-first
- **Axios** : Client HTTP pour l'API
- **React Hook Form** : Gestion des formulaires
- **Zod** : Validation des schemas
- **Lucide React** : Icônes
- **Date-fns** : Manipulation des dates

## 📁 Structure du projet

```
src/
├── components/          # Composants réutilisables
│   ├── ui/             # Composants UI de base (Button, Input, Card, etc.)
│   ├── layout/         # Composants de layout (Header, Layout)
│   └── ProtectedRoute.tsx
├── pages/              # Pages de l'application
│   ├── HomePage.tsx    # Page d'accueil
│   ├── LoginPage.tsx   # Connexion/Inscription
│   ├── ProfilePage.tsx # Profil utilisateur
│   ├── RecipeDetailPage.tsx # Détail d'une recette
│   ├── SearchPage.tsx  # Recherche de recettes
│   └── PlanningPage.tsx # Planning des repas
├── services/           # Services API
│   ├── api.ts         # Configuration Axios
│   ├── auth.ts        # Service d'authentification
│   ├── recipe.ts      # Service des recettes
│   ├── mealPlan.ts    # Service du planning
│   └── data.ts        # Services des données (catégories, tags, etc.)
├── context/           # React Context
│   └── AuthContext.tsx # Contexte d'authentification
├── hooks/             # Custom hooks
│   ├── useApi.ts      # Hook pour les appels API
│   ├── useDebounce.ts # Hook de debouncing
│   └── useLocalStorage.ts # Hook pour localStorage
├── types/             # Types TypeScript
│   ├── user.ts        # Types utilisateur
│   ├── recipe.ts      # Types recette
│   ├── mealPlan.ts    # Types planning
│   └── api.ts         # Types API génériques
├── utils/             # Utilitaires
│   ├── cn.ts          # Utilitaire pour les classes CSS
│   ├── date.ts        # Utilitaires de dates
│   └── validation.ts  # Schemas de validation Zod
└── App.tsx            # Composant racine avec routing
```

## 🔗 API Backend

L'application se connecte au backend Go via l'API REST :
- **Base URL** : `http://localhost:8080/api/v1`
- **Documentation Swagger** : `http://localhost:8080/swagger/index.html`
- **Authentification** : JWT tokens dans les headers Authorization

## 🚀 Installation et lancement

1. **Installer les dépendances**
```bash
npm install
```

2. **Configuration**
Créer/modifier le fichier `.env` :
```
VITE_API_URL=http://localhost:8080/api/v1
```

3. **Lancer le serveur de développement**
```bash
npm run dev
```

L'application sera accessible sur `http://localhost:5173`

## 📱 Responsive Design

- **Mobile First** : Design optimisé pour mobile puis étendu
- **Navigation mobile** : Menu hamburger avec sidebar
- **Grids adaptatives** : 1 colonne mobile → 4 colonnes desktop
- **Touch-friendly** : Boutons et zones de clic optimisés

## 🔐 Sécurité

- **JWT Tokens** : Stockage sécurisé en localStorage
- **Routes protégées** : Redirection automatique vers login si non authentifié
- **Validation client** : Schemas Zod pour tous les formulaires

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
