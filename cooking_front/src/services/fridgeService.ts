import type { 
  FridgeItem, 
  FridgeItemCreateRequest, 
  FridgeItemUpdateRequest,
  RecipeSearchByIngredientsRequest,
  RecipeSuggestion,
  FridgeStats
} from '../types';

// Données de test temporaires pour le développement
const mockFridgeItems: FridgeItem[] = [
  {
    id: 1,
    ingredient_id: 1,
    ingredient: {
      id: 1,
      name: 'Tomate',
      category: 'Légumes',
      icon: '🍅',
      unit_type: 'pièces',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    quantity: 3,
    unit: 'pièces',
    expiry_date: '2024-09-20',
    notes: 'Tomates bien mûres',
    created_at: '2024-09-14T00:00:00Z',
    updated_at: '2024-09-14T00:00:00Z'
  },
  {
    id: 2,
    ingredient_id: 2,
    ingredient: {
      id: 2,
      name: 'Lait',
      category: 'Produits laitiers',
      icon: '🥛',
      unit_type: 'L',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    quantity: 1,
    unit: 'L',
    expiry_date: '2024-09-16',
    notes: undefined,
    created_at: '2024-09-14T00:00:00Z',
    updated_at: '2024-09-14T00:00:00Z'
  }
];

const mockStats: FridgeStats = {
  totalItems: 2,
  expiringSoon: 1,
  expired: 0,
  categoriesCount: 2
};

const mockSuggestions: RecipeSuggestion[] = [
  {
    recipe: {
      id: 1,
      title: 'Salade de tomates',
      description: 'Une salade fraîche avec des tomates',
      imageUrl: '/images/salade-tomates.jpg',
      categories: ['Entrée', 'Végétarien'],
      cookingTime: 15,
      servings: 2,
      averageRating: 4.5
    },
    matchingIngredients: 1,
    totalIngredients: 3,
    missingIngredients: [],
    matchPercentage: 33,
    canCook: false
  }
];

/**
 * Service pour la gestion du frigo virtuel
 * NOTE: Actuellement en mode mock car les routes backend n'existent pas encore
 */
export const fridgeService = {
  /**
   * Récupérer tous les items du frigo de l'utilisateur
   */
  async getFridgeItems(): Promise<FridgeItem[]> {
    // TODO: Remplacer par un vrai appel API quand les routes backend seront prêtes
    console.log('MODE MOCK: getFridgeItems');
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockFridgeItems), 500);
    });
  },

  /**
   * Ajouter un item au frigo
   */
  async addFridgeItem(item: FridgeItemCreateRequest): Promise<FridgeItem> {
    // TODO: Remplacer par un vrai appel API quand les routes backend seront prêtes
    console.log('MODE MOCK: addFridgeItem', item);
    return new Promise((resolve) => {
      setTimeout(() => {
        const newItem: FridgeItem = {
          id: Math.max(...mockFridgeItems.map(i => i.id)) + 1,
          ingredient_id: item.ingredient_id,
          ingredient: {
            id: item.ingredient_id,
            name: 'Nouvel ingrédient',
            category: 'Test',
            icon: '🥕',
            unit_type: 'pièces',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          quantity: item.quantity,
          unit: item.unit,
          expiry_date: item.expiry_date,
          notes: item.notes,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        mockFridgeItems.push(newItem);
        resolve(newItem);
      }, 500);
    });
  },

  /**
   * Mettre à jour un item du frigo
   */
  async updateFridgeItem(id: number, updates: FridgeItemUpdateRequest): Promise<FridgeItem> {
    // TODO: Remplacer par un vrai appel API quand les routes backend seront prêtes
    console.log('MODE MOCK: updateFridgeItem', id, updates);
    return new Promise((resolve) => {
      setTimeout(() => {
        const item = mockFridgeItems.find(i => i.id === id);
        if (item) {
          Object.assign(item, updates);
          item.updated_at = new Date().toISOString();
          resolve(item);
        }
      }, 500);
    });
  },

  /**
   * Supprimer un item du frigo
   */
  async deleteFridgeItem(id: number): Promise<void> {
    // TODO: Remplacer par un vrai appel API quand les routes backend seront prêtes
    console.log('MODE MOCK: deleteFridgeItem', id);
    return new Promise((resolve) => {
      setTimeout(() => {
        const index = mockFridgeItems.findIndex(i => i.id === id);
        if (index > -1) {
          mockFridgeItems.splice(index, 1);
        }
        resolve();
      }, 500);
    });
  },

  /**
   * Obtenir des suggestions de recettes basées sur les ingrédients du frigo
   */
  async getRecipeSuggestions(params?: Partial<RecipeSearchByIngredientsRequest>): Promise<RecipeSuggestion[]> {
    // TODO: Remplacer par un vrai appel API quand les routes backend seront prêtes
    console.log('MODE MOCK: getRecipeSuggestions', params);
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockSuggestions), 500);
    });
  },

  /**
   * Obtenir les statistiques du frigo
   */
  async getFridgeStats(): Promise<FridgeStats> {
    // TODO: Remplacer par un vrai appel API quand les routes backend seront prêtes
    console.log('MODE MOCK: getFridgeStats');
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockStats), 500);
    });
  },

  /**
   * Vider le frigo (supprimer tous les items)
   */
  async clearFridge(): Promise<void> {
    // TODO: Remplacer par un vrai appel API quand les routes backend seront prêtes
    console.log('MODE MOCK: clearFridge');
    return new Promise((resolve) => {
      setTimeout(() => {
        mockFridgeItems.length = 0;
        resolve();
      }, 500);
    });
  },

  /**
   * Supprimer les items expirés du frigo
   */
  async removeExpiredItems(): Promise<{ removed_count: number }> {
    // TODO: Remplacer par un vrai appel API quand les routes backend seront prêtes
    console.log('MODE MOCK: removeExpiredItems');
    return new Promise((resolve) => {
      setTimeout(() => {
        const today = new Date();
        const expiredItems = mockFridgeItems.filter(item => {
          if (!item.expiry_date) return false;
          return new Date(item.expiry_date) < today;
        });
        expiredItems.forEach(item => {
          const index = mockFridgeItems.findIndex(i => i.id === item.id);
          if (index > -1) mockFridgeItems.splice(index, 1);
        });
        resolve({ removed_count: expiredItems.length });
      }, 500);
    });
  }
};