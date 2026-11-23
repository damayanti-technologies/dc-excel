import React, { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface DividerProps {
  children?: ReactNode;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export const Divider: React.FC<DividerProps> = ({
  children,
  orientation = 'horizontal',
  className
}) => {
  if (orientation === 'vertical') {
    return <div className={cn('w-px h-full bg-border self-stretch', className)} />;
  }

  if (children) {
    return (
      <div className={cn('relative flex items-center w-full my-4', className)}>
        <div className="flex-grow border-t border-border" />
        <span className="shrink-0 px-3 text-[11px] font-semibold text-foreground-muted uppercase tracking-wider">
          {children}
        </span>
        <div className="flex-grow border-t border-border" />
      </div>
    );
  }

  return <hr className={cn('w-full border-t border-border my-3', className)} />;
};
