import type { ComboboxOption } from '@/components/ui/combobox';

/** Référentiel d'unités normalisées (saisie libre toujours possible via « Créer »). */
export const UNIT_OPTIONS: ComboboxOption[] = [
  { value: 'g', label: 'g · grammes', keywords: ['gramme', 'grammes'] },
  { value: 'kg', label: 'kg · kilogrammes', keywords: ['kilo', 'kilogramme'] },
  { value: 'mg', label: 'mg · milligrammes', keywords: ['milligramme'] },
  { value: 'ml', label: 'ml · millilitres', keywords: ['millilitre'] },
  { value: 'cl', label: 'cl · centilitres', keywords: ['centilitre'] },
  { value: 'l', label: 'l · litres', keywords: ['litre'] },
  { value: 'c. à café', label: 'c. à café', keywords: ['cuillere', 'cuillère', 'cac', 'cc', 'cafe'] },
  { value: 'c. à soupe', label: 'c. à soupe', keywords: ['cuillere', 'cuillère', 'cas', 'cs', 'soupe'] },
  { value: 'pièce', label: 'pièce(s)', keywords: ['piece', 'unite', 'unité', 'u'] },
  { value: 'pincée', label: 'pincée', keywords: ['pincee'] },
  { value: 'gousse', label: 'gousse(s)', keywords: ['ail'] },
  { value: 'tranche', label: 'tranche(s)' },
  { value: 'verre', label: 'verre' },
  { value: 'sachet', label: 'sachet' },
  { value: 'botte', label: 'botte' },
];

/** Ajoute la valeur libre courante aux options si elle n'y figure pas (pour l'afficher). */
export function withCustomValue(options: ComboboxOption[], value?: string): ComboboxOption[] {
  const v = value?.trim();
  if (!v || options.some((o) => o.value === v)) return options;
  return [...options, { value: v, label: v }];
}
