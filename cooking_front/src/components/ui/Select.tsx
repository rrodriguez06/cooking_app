import React from 'react';
import { cn } from '../../utils';
import { ChevronDown } from 'lucide-react';

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

interface SelectContentProps {
  children: React.ReactNode;
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  onSelect?: (value: string) => void;
}

interface SelectValueProps {
  placeholder?: string;
}

// Context pour partager l'état du Select
const SelectContext = React.createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}>({
  isOpen: false,
  setIsOpen: () => {},
});

export const Select: React.FC<SelectProps> = ({ 
  value, 
  onValueChange, 
  children 
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <SelectContext.Provider value={{ value, onValueChange, isOpen, setIsOpen }}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  );
};

export const SelectTrigger: React.FC<SelectTriggerProps> = ({ 
  children, 
  className,
  ...props 
}) => {
  const { isOpen, setIsOpen } = React.useContext(SelectContext);

  return (
    <button
      type="button"
      className={cn(
        'flex items-center justify-between w-full px-3 py-2 text-left',
        'border border-border rounded-md shadow-sm bg-card',
        'hover:border-border focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring',
        'disabled:bg-muted/50 disabled:text-muted-foreground',
        className
      )}
      onClick={() => setIsOpen(!isOpen)}
      {...props}
    >
      {children}
      <ChevronDown className={cn(
        'h-4 w-4 transition-transform duration-200',
        isOpen && 'transform rotate-180'
      )} />
    </button>
  );
};

export const SelectContent: React.FC<SelectContentProps> = ({ children }) => {
  const { isOpen, setIsOpen } = React.useContext(SelectContext);
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, setIsOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={contentRef}
      className={cn(
        'absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg',
        'max-h-60 overflow-auto'
      )}
    >
      {children}
    </div>
  );
};

export const SelectItem: React.FC<SelectItemProps> = ({ 
  value, 
  children,
  onSelect 
}) => {
  const { value: selectedValue, onValueChange, setIsOpen } = React.useContext(SelectContext);

  const handleSelect = () => {
    onValueChange?.(value);
    onSelect?.(value);
    setIsOpen(false);
  };

  return (
    <button
      type="button"
      className={cn(
        'w-full px-3 py-2 text-left hover:bg-muted focus:bg-muted',
        'focus:outline-none transition-colors duration-150',
        selectedValue === value && 'bg-primary/10 text-primary'
      )}
      onClick={handleSelect}
    >
      {children}
    </button>
  );
};

export const SelectValue: React.FC<SelectValueProps> = ({ placeholder }) => {
  const { value } = React.useContext(SelectContext);

  if (!value && placeholder) {
    return <span className="text-muted-foreground">{placeholder}</span>;
  }

  return <span>{value}</span>;
};