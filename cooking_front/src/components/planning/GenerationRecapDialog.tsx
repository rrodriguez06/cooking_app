import { Sparkles, CheckCircle2, BookOpen, Shuffle, CalendarClock, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';

export interface GenerationRecap {
  added: number;
  recipesUsed: number;
  diversityScore: number; // 0..1
  skipped: number;
  repeated: number;
  failed: number;
  sourceType: string;
}

const sourceLabels: Record<string, string> = {
  favorites: 'Favoris',
  list: 'Liste de recettes',
  popular: 'Recettes populaires',
  trending: 'Tendances',
};

/** Récapitulatif visuel après génération d'un planning (remplace les console.log — PLAN-2). */
export function GenerationRecapDialog({
  recap,
  open,
  onOpenChange,
}: {
  recap: GenerationRecap | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!recap) return null;
  const diversityPct = Math.round(recap.diversityScore * 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Planning généré
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Stat icon={<CheckCircle2 className="h-5 w-5 text-herb-600 dark:text-herb-400" />} value={recap.added} label={`repas ajouté${recap.added > 1 ? 's' : ''}`} />
            <Stat icon={<BookOpen className="h-5 w-5 text-primary" />} value={recap.recipesUsed} label={`recette${recap.recipesUsed > 1 ? 's' : ''} utilisée${recap.recipesUsed > 1 ? 's' : ''}`} />
          </div>

          <div className="rounded-xl border border-border bg-muted/40 p-3">
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Shuffle className="h-4 w-4 text-muted-foreground" />
                Diversité des recettes
              </span>
              <span className="font-semibold text-foreground">{diversityPct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${diversityPct}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">Source : {sourceLabels[recap.sourceType] || recap.sourceType}</p>
          </div>

          {recap.skipped > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
              <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {recap.skipped} créneau{recap.skipped > 1 ? 'x' : ''} déjà occupé{recap.skipped > 1 ? 's' : ''} — vos repas existants ont été conservés.
              </span>
            </div>
          )}

          {recap.repeated > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
              <Shuffle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {recap.repeated} repas réutilise{recap.repeated > 1 ? 'nt' : ''} une recette déjà planifiée — pas assez de recettes uniques dans la source.
              </span>
            </div>
          )}

          {recap.failed > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {recap.failed} repas n'ont pas pu être ajoutés. Réessayez ou ajoutez-les manuellement.
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Voir le planning</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      {icon}
      <div>
        <div className="text-2xl font-semibold leading-none text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
