import React from 'react';
import { cn } from '../../utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'danger';
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  className, 
  variant = 'default',
  ...props 
}) => {
  const variantClasses = {
    default: 'bg-muted text-muted-foreground',
    secondary: 'bg-primary/10 text-primary',
    success: 'bg-herb-100 text-herb-700 dark:bg-herb-500/15 dark:text-herb-300',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300',
    danger: 'bg-destructive/10 text-destructive',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};