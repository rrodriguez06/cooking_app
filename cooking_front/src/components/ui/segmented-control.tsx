import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { cn } from '@/utils';

export interface SegmentedOption {
  value: string;
  label: React.ReactNode;
  /** Classe appliquée quand l'option est active (ex. couleur de difficulté). */
  activeClassName?: string;
}

interface SegmentedControlProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SegmentedOption[];
  className?: string;
  'aria-label'?: string;
}

/** Sélecteur à choix unique en "boutons segmentés" (ex. difficulté). */
export function SegmentedControl({
  value,
  onValueChange,
  options,
  className,
  'aria-label': ariaLabel,
}: SegmentedControlProps) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      aria-label={ariaLabel}
      onValueChange={(v) => {
        if (v) onValueChange(v);
      }}
      className={cn('inline-flex rounded-lg border border-input bg-muted/60 p-1', className)}
    >
      {options.map((o) => (
        <ToggleGroup.Item
          key={o.value}
          value={o.value}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-sm',
            value === o.value && o.activeClassName,
          )}
        >
          {o.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
