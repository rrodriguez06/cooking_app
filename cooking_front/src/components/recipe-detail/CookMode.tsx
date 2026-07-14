import { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Thermometer, Lightbulb, Timer as TimerIcon, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Timer, type TimerRef } from '@/components/Timer';
import { formatTime, cn } from '@/utils';
import type { RecipeStep } from '@/types';

interface CookModeProps {
  steps: RecipeStep[];
  title: string;
  onClose: () => void;
}

/** Mode cuisine plein écran : une étape à la fois, gros texte, minuteur intégré. */
export function CookMode({ steps, title, onClose }: CookModeProps) {
  const [index, setIndex] = useState(0);
  const timerRef = useRef<TimerRef>(null);
  const step = steps[index];
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;

  const go = (dir: -1 | 1) => setIndex((i) => Math.min(steps.length - 1, Math.max(0, i + dir)));

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps.length]);

  if (!step) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* En-tête */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">
            Étape {index + 1} sur {steps.length}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Quitter le mode cuisine">
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Progression */}
      <div className="flex gap-1 px-4 py-2 sm:px-6">
        {steps.map((_, i) => (
          <span
            key={i}
            className={cn('h-1.5 flex-1 rounded-full transition-colors', i <= index ? 'bg-primary' : 'bg-muted')}
          />
        ))}
      </div>

      {/* Corps */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-6">
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
              {index + 1}
            </span>
            {step.title && <h2 className="font-display text-2xl font-semibold">{step.title}</h2>}
          </div>

          <p className="text-xl leading-relaxed text-foreground sm:text-2xl">{step.description}</p>

          {(step.temperature || step.tips) && (
            <div className="space-y-2">
              {step.temperature ? (
                <p className="flex items-center gap-2 text-lg text-muted-foreground">
                  <Thermometer className="h-5 w-5" />
                  {step.temperature} °C
                </p>
              ) : null}
              {step.tips ? (
                <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-amber-900">
                  <Lightbulb className="mt-0.5 h-5 w-5 shrink-0" />
                  {step.tips}
                </p>
              ) : null}
            </div>
          )}

          {step.duration ? (
            <div className="space-y-3 rounded-2xl border border-border bg-muted/40 p-4">
              <Button variant="secondary" onClick={() => timerRef.current?.startTimer(step.duration!)} className="gap-2">
                <TimerIcon className="h-4 w-4" />
                Lancer le minuteur ({formatTime(step.duration)})
              </Button>
              <Timer ref={timerRef} />
            </div>
          ) : (
            <Timer ref={timerRef} />
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-6">
        <Button variant="outline" onClick={() => go(-1)} disabled={isFirst} className="gap-1">
          <ChevronLeft className="h-4 w-4" />
          Précédente
        </Button>
        {isLast ? (
          <Button onClick={onClose} className="gap-1.5">
            <Check className="h-4 w-4" />
            Terminer
          </Button>
        ) : (
          <Button onClick={() => go(1)} className="gap-1">
            Suivante
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
