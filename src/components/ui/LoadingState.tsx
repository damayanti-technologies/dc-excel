import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface LoadingStateProps {
  message?: string;
  description?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  description,
  className
}) => {
  return (
    <div
      className={cn(
        'min-h-[220px] flex flex-col items-center justify-center p-6 text-center space-y-3',
        className
      )}
    >
      <Loader2 className="w-8 h-8 animate-spin text-accent" />
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-foreground">{message}</h4>
        {description && <p className="text-xs text-foreground-muted max-w-xs">{description}</p>}
      </div>
    </div>
  );
};

export interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  isRounded?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  width,
  height,
  isRounded = false
}) => {
  return (
    <div
      style={{ width, height }}
      className={cn(
        'animate-pulse bg-surface-secondary dark:bg-slate-800',
        isRounded ? 'rounded-full' : 'rounded-md',
        className
      )}
    />
  );
};
