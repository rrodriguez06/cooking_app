import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/utils';

export interface TocSection {
  id: string;
  label: string;
  complete?: boolean;
}

/** Sommaire ancré avec scroll-spy et pastilles de validité par section. */
export function FormTOC({ sections }: { sections: TocSection[] }) {
  const [active, setActive] = useState(sections[0]?.id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 },
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  const handleClick = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav aria-label="Sommaire du formulaire" className="space-y-1">
      {sections.map((s) => {
        const isActive = active === s.id;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => handleClick(s.id)}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
              isActive ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
            aria-current={isActive ? 'true' : undefined}
          >
            <span
              className={cn(
                'grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px]',
                s.complete ? 'border-herb-500 bg-herb-500 text-white' : 'border-border text-transparent',
              )}
            >
              <Check className="h-3 w-3" />
            </span>
            {s.label}
          </button>
        );
      })}
    </nav>
  );
}
