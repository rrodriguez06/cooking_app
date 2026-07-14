import { Minus, Plus } from 'lucide-react';
import { cn } from '@/utils';

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Suffixe affiché à droite de la valeur (ex. "min", "portions"). */
  suffix?: string;
  ariaLabel?: string;
  className?: string;
}

/** Champ numérique tactile "– n +" (temps, portions, quantités). */
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
  suffix,
  ariaLabel,
  className,
}: StepperProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const safeValue = Number.isFinite(value) ? value : min;

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-lg border border-input bg-background focus-within:ring-2 focus-within:ring-ring',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onChange(clamp(safeValue - step))}
        disabled={safeValue <= min}
        aria-label="Diminuer"
        className="grid h-10 w-10 place-items-center rounded-l-lg text-muted-foreground transition-colors hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <Minus className="h-4 w-4" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        aria-label={ariaLabel}
        value={Number.isFinite(value) ? value : ''}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
        className="w-12 border-0 bg-transparent p-0 text-center font-medium text-foreground focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      {suffix && <span className="whitespace-nowrap pr-1 text-sm text-muted-foreground">{suffix}</span>}
      <button
        type="button"
        onClick={() => onChange(clamp(safeValue + step))}
        disabled={safeValue >= max}
        aria-label="Augmenter"
        className="grid h-10 w-10 place-items-center rounded-r-lg text-muted-foreground transition-colors hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
