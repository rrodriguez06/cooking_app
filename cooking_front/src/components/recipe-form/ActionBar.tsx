import { ArrowLeft, Check, Cloud, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ActionBarProps {
  title: string;
  isSubmitting: boolean;
  savedAt: Date | null;
  isDirty: boolean;
  submitLabel: string;
  onBack: () => void;
  onTogglePreview: () => void;
}

/** Barre d'action collante : retour, statut d'autosave, aperçu (mobile), enregistrement. */
export function ActionBar({
  title,
  isSubmitting,
  savedAt,
  isDirty,
  submitLabel,
  onBack,
  onTogglePreview,
}: ActionBarProps) {
  return (
    <div className="sticky top-0 z-30 -mx-4 mb-6 border-b border-border bg-background/80 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button type="button" variant="ghost" size="icon" onClick={onBack} aria-label="Retour">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="truncate font-display text-lg font-semibold sm:text-xl">{title}</h1>
        </div>

        <div className="flex items-center gap-2">
          <AutosaveStatus savedAt={savedAt} isDirty={isDirty} />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onTogglePreview}
            aria-label="Aperçu"
            className="gap-1.5"
          >
            <Eye className="h-5 w-5" />
            <span className="hidden sm:inline">Aperçu</span>
          </Button>
          <Button type="submit" isLoading={isSubmitting} className="gap-1.5">
            {!isSubmitting && <Check className="h-4 w-4" />}
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AutosaveStatus({ savedAt, isDirty }: { savedAt: Date | null; isDirty: boolean }) {
  if (!isDirty && !savedAt) return null;
  return (
    <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
      {isDirty && !savedAt ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Modifications en cours…
        </>
      ) : (
        <>
          <Cloud className="h-3.5 w-3.5" />
          {savedAt
            ? `Brouillon enregistré à ${savedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
            : 'Brouillon à jour'}
        </>
      )}
    </span>
  );
}
