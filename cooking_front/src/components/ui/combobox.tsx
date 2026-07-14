import * as React from 'react';
import { Check, ChevronsUpDown, Plus, X } from 'lucide-react';
import { cn } from '@/utils';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './command';

export interface ComboboxOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  keywords?: string[];
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  contentClassName?: string;
  disabled?: boolean;
  error?: boolean;
  /** Si fourni, propose « Créer "X" » quand la saisie ne correspond à aucune option. */
  onCreate?: (label: string) => void;
  createLabel?: (input: string) => string;
}

/** Sélecteur unique cherchable et accessible (clavier + lecteur d'écran). */
export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Sélectionner…',
  searchPlaceholder = 'Rechercher…',
  emptyText = 'Aucun résultat.',
  className,
  contentClassName,
  disabled,
  error,
  onCreate,
  createLabel = (input) => `Créer « ${input} »`,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const selected = options.find((o) => o.value === value);

  const showCreate =
    !!onCreate &&
    search.trim().length > 0 &&
    !options.some((o) => o.label.toLowerCase() === search.trim().toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 py-2 text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50',
          error && 'border-destructive focus:ring-destructive',
          className,
        )}
      >
        <span className={cn('flex items-center gap-2 truncate', !selected && 'text-muted-foreground')}>
          {selected?.icon}
          {selected ? selected.label : placeholder}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className={cn('w-[--radix-popover-trigger-width] min-w-56 p-0', contentClassName)}>
        <Command>
          <CommandInput placeholder={searchPlaceholder} value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${(option.keywords ?? []).join(' ')}`}
                  onSelect={() => {
                    onChange(option.value);
                    setSearch('');
                    setOpen(false);
                  }}
                >
                  {option.icon}
                  <span className="truncate">{option.label}</span>
                  <Check className={cn('ml-auto h-4 w-4', value === option.value ? 'opacity-100' : 'opacity-0')} />
                </CommandItem>
              ))}
              {showCreate && (
                <CommandItem
                  value={`__create__${search}`}
                  onSelect={() => {
                    onCreate?.(search.trim());
                    setSearch('');
                    setOpen(false);
                  }}
                  className="text-primary"
                >
                  <Plus className="h-4 w-4" />
                  <span className="truncate">{createLabel(search.trim())}</span>
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface MultiSelectProps {
  options: ComboboxOption[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  addLabel?: string;
  className?: string;
}

/** Sélection multiple : chips retirables + popover de recherche pour ajouter. */
export function MultiSelect({
  options,
  values,
  onChange,
  placeholder = 'Aucune sélection',
  searchPlaceholder = 'Rechercher…',
  emptyText = 'Aucun résultat.',
  addLabel = 'Ajouter',
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const selectedOptions = values
    .map((v) => options.find((o) => o.value === v))
    .filter((o): o is ComboboxOption => !!o);

  const toggle = (value: string) => {
    if (values.includes(value)) {
      onChange(values.filter((v) => v !== value));
    } else {
      onChange([...values, value]);
    }
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {selectedOptions.length === 0 && <span className="text-sm text-muted-foreground">{placeholder}</span>}
      {selectedOptions.map((option) => (
        <span
          key={option.value}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
        >
          {option.icon}
          {option.label}
          <button
            type="button"
            onClick={() => toggle(option.value)}
            className="rounded-full text-primary/70 hover:text-primary"
            aria-label={`Retirer ${option.label}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-input px-3 py-1 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring">
          <Plus className="h-3.5 w-3.5" />
          {addLabel}
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => {
                  const checked = values.includes(option.value);
                  return (
                    <CommandItem
                      key={option.value}
                      value={`${option.label} ${(option.keywords ?? []).join(' ')}`}
                      onSelect={() => toggle(option.value)}
                    >
                      <span
                        className={cn(
                          'grid h-4 w-4 place-items-center rounded border',
                          checked ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
                        )}
                      >
                        {checked && <Check className="h-3 w-3" />}
                      </span>
                      {option.icon}
                      <span className="truncate">{option.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
