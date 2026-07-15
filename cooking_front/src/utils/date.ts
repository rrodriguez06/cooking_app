import { format, parseISO, isValid, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

// Heures (locales) par défaut de chaque type de repas — utilisées par le planning et le générateur.
export const MEAL_TIMES = {
  breakfast: '08:00:00',
  lunch: '12:30:00',
  dinner: '19:00:00',
  snack: '15:30:00',
} as const;

export type MealTimeType = keyof typeof MEAL_TIMES;

// Date locale au format YYYY-MM-DD (évite le décalage de fuseau de toISOString).
export const toLocalDateString = (date: Date): string => format(date, 'yyyy-MM-dd');

// Construit un planned_date en heure LOCALE (avec offset local, sans conversion UTC) : la date
// et l'heure du repas restent celles voulues quel que soit le fuseau (corrige GEN-1).
export const buildPlannedDate = (date: string, mealType: MealTimeType): string => {
  const local = new Date(`${date}T${MEAL_TIMES[mealType]}`);
  return format(local, "yyyy-MM-dd'T'HH:mm:ssXXX");
};

export const formatDate = (date: string | Date, formatStr: string = 'PPP'): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;

    if (!isValid(dateObj)) {
      return 'Date invalide';
    }

    return format(dateObj, formatStr, { locale: fr });
  } catch {
    return 'Date invalide';
  }
};

export const formatRelativeTime = (date: string | Date): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;

    if (!isValid(dateObj)) {
      return 'Date invalide';
    }

    return formatDistanceToNow(dateObj, { addSuffix: true, locale: fr });
  } catch {
    return 'Date invalide';
  }
};

export const formatTime = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}min`;
};

export const getCurrentDate = (): string => {
  return new Date().toISOString().split('T')[0];
};

export const addDays = (date: string, days: number): string => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().split('T')[0];
};

export const getStartOfWeek = (date: string): string => {
  const dateObj = new Date(date);
  const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  // Calculate days to subtract to get to Monday
  // If dayOfWeek is 0 (Sunday), we need to go back 6 days
  // If dayOfWeek is 1 (Monday), we need to go back 0 days
  // If dayOfWeek is 2 (Tuesday), we need to go back 1 day, etc.
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  const monday = new Date(dateObj);
  monday.setDate(monday.getDate() - daysToSubtract);
  
  return monday.toISOString().split('T')[0];
};
