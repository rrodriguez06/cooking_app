import * as React from 'react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/utils';

interface FormSectionProps {
  id: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/** Bloc de formulaire ancrable (scroll-spy) présenté dans une carte. */
export function FormSection({ id, title, description, icon, action, children, className }: FormSectionProps) {
  return (
    <section id={id} className="scroll-mt-28">
      <Card className={cn('p-6', className)}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              {icon}
              {title}
            </h2>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          {action}
        </div>
        {children}
      </Card>
    </section>
  );
}
