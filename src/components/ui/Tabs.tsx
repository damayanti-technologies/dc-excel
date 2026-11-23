import React, { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface TabOption {
  id: string;
  label: string;
  icon?: ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabOption[];
  activeTabId: string;
  onChange: (tabId: string) => void;
  variant?: 'line' | 'pill' | 'ribbon';
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTabId,
  onChange,
  variant = 'line',
  className
}) => {
  return (
    <div
      role="tablist"
      className={cn(
        'flex items-center overflow-x-auto no-scrollbar',
        variant === 'line' && 'border-b border-border gap-6',
        variant === 'pill' && 'bg-surface-secondary p-1 rounded-xl gap-1 border border-border',
        variant === 'ribbon' && 'bg-surface border-b border-border gap-0.5 px-2 pt-1.5',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;

        if (variant === 'pill') {
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              disabled={tab.disabled}
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={cn(
                'px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all select-none',
                isActive
                  ? 'bg-surface text-foreground shadow-xs'
                  : 'text-foreground-muted hover:text-foreground hover:bg-surface-tertiary',
                tab.disabled && 'opacity-40 cursor-not-allowed'
              )}
            >
              {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-tertiary text-foreground-secondary">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        }

        if (variant === 'ribbon') {
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              disabled={tab.disabled}
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={cn(
                'px-3.5 py-1.5 text-xs font-medium rounded-t-md transition-colors select-none flex items-center gap-1.5 border-t-2',
                isActive
                  ? 'bg-surface-secondary text-foreground border-accent font-semibold'
                  : 'border-transparent text-foreground-muted hover:text-foreground hover:bg-surface-hover',
                tab.disabled && 'opacity-40 cursor-not-allowed'
              )}
            >
              {tab.icon && <span className="w-3.5 h-3.5">{tab.icon}</span>}
              <span>{tab.label}</span>
            </button>
          );
        }

        // Line variant (default)
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            disabled={tab.disabled}
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              'pb-2.5 text-xs font-medium flex items-center gap-2 border-b-2 transition-colors select-none -mb-px',
              isActive
                ? 'border-accent text-accent font-semibold'
                : 'border-transparent text-foreground-muted hover:text-foreground hover:border-border-strong',
              tab.disabled && 'opacity-40 cursor-not-allowed'
            )}
          >
            {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-secondary border border-border text-foreground-muted">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
