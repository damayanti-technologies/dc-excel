import React, { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className
}) => {
  return (
    <div
      className={cn(
        'w-full max-w-md mx-auto p-8 rounded-2xl bg-surface border border-border text-center flex flex-col items-center justify-center space-y-4 shadow-xs',
        className
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-surface-secondary border border-border flex items-center justify-center text-foreground-muted shadow-xs">
        {icon}
      </div>

      <div className="space-y-1.5 max-w-sm">
        <h3 className="text-base font-bold tracking-tight text-foreground">{title}</h3>
        <p className="text-xs text-foreground-muted leading-relaxed">{description}</p>
      </div>

      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
};
