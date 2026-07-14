import { format, parseISO, isValid, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

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
