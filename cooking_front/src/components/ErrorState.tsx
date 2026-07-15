import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './ui';
import { cn } from '../utils';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

/** État d'erreur réutilisable (distinct d'un « 0 résultat ») avec bouton Réessayer — cf. ERR-3. */
export const ErrorState: React.FC<ErrorStateProps> = ({
  message = 'Une erreur est survenue lors du chargement.',
  onRetry,
  className,
}) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-muted/30 p-8 text-center',
      className,
    )}
  >
    <AlertTriangle className="h-8 w-8 text-destructive" />
    <p className="text-sm text-muted-foreground">{message}</p>
    {onRetry && (
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Réessayer
      </Button>
    )}
  </div>
);
