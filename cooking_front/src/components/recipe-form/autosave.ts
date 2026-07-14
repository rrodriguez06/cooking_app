import { useEffect, useRef, useState } from 'react';
import type { UseFormWatch } from 'react-hook-form';
import type { RecipeFormData } from './schema';

const PREFIX = 'cooking:recipe-draft:';

interface StoredDraft {
  savedAt: number;
  data: RecipeFormData;
}

export function draftKey(id?: string): string {
  return `${PREFIX}${id && id !== 'new' ? id : 'new'}`;
}

/** Lit un brouillon local ; renvoie null si absent ou illisible. */
export function loadRecipeDraft(key: string): StoredDraft | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDraft;
    if (!parsed?.data) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearRecipeDraft(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* stockage indisponible : rien à faire */
  }
}

interface UseAutosaveOptions {
  key: string;
  watch: UseFormWatch<RecipeFormData>;
  enabled: boolean;
  delay?: number;
}

/** Sauvegarde debouncée du formulaire en localStorage ; renvoie l'horodatage du dernier enregistrement. */
export function useAutosave({ key, watch, enabled, delay = 800 }: UseAutosaveOptions): Date | null {
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const subscription = watch((value) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        try {
          const now = Date.now();
          const payload: StoredDraft = { savedAt: now, data: value as RecipeFormData };
          localStorage.setItem(key, JSON.stringify(payload));
          setSavedAt(new Date(now));
        } catch {
          /* quota dépassé / stockage indisponible : on ignore silencieusement */
        }
      }, delay);
    });
    return () => {
      subscription.unsubscribe();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [key, watch, enabled, delay]);

  return savedAt;
}
