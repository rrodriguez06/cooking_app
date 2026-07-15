// Libellés FR partagés pour les valeurs d'énumération (évite les fuites d'enums bruts — I18N-3).

export const difficultyLabel = (difficulty?: string): string => {
  switch (difficulty) {
    case 'easy':
      return 'Facile';
    case 'medium':
      return 'Moyen';
    case 'hard':
      return 'Difficile';
    default:
      return difficulty || '';
  }
};

export const mealTypeLabel = (mealType?: string): string => {
  switch (mealType) {
    case 'breakfast':
      return 'Petit-déjeuner';
    case 'lunch':
      return 'Déjeuner';
    case 'dinner':
      return 'Dîner';
    case 'snack':
      return 'Collation';
    default:
      return mealType || '';
  }
};
