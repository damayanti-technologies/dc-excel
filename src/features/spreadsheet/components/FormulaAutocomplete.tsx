import React from 'react';
import { FunctionDefinition } from '@/engine/calculation/types';
import { cn } from '@/utils/cn';

interface FormulaAutocompleteProps {
  suggestions: FunctionDefinition[];
  selectedIndex: number;
  onSelect: (funcDef: FunctionDefinition) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const FormulaAutocomplete: React.FC<FormulaAutocompleteProps> = ({
  suggestions,
  selectedIndex,
  onSelect,
  className,
  style
}) => {
  if (suggestions.length === 0) return null;

  return (
    <div
      role="listbox"
      aria-label="Formula Autocomplete Suggestions"
      style={style}
      className={cn(
        'z-50 w-80 max-h-64 overflow-y-auto rounded-lg border border-border bg-surface shadow-xl py-1 text-xs select-none backdrop-blur-sm',
        className
      )}
    >
      <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-foreground-muted border-b border-border/50 flex justify-between items-center">
        <span>Suggested Functions</span>
        <span className="font-mono text-[9px] text-foreground-muted/80">Tab / Enter to select</span>
      </div>

      {suggestions.map((fn, idx) => {
        const isSelected = idx === selectedIndex;

        return (
          <div
            key={fn.name}
            role="option"
            aria-selected={isSelected}
            onClick={() => onSelect(fn)}
            className={cn(
              'px-2.5 py-1.5 cursor-pointer transition-colors border-l-2',
              isSelected
                ? 'bg-accent/15 border-accent text-foreground'
                : 'border-transparent text-foreground/90 hover:bg-surface-secondary'
            )}
          >
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <span className="font-mono font-bold text-[12px] text-accent tracking-wide">
                {fn.name}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-tertiary text-foreground-muted font-medium">
                {fn.category}
              </span>
            </div>

            <p className="text-[11px] text-foreground-muted truncate mb-0.5">
              {fn.description}
            </p>

            <div className="font-mono text-[10px] text-foreground-muted/70 truncate bg-surface-secondary/60 px-1 py-0.5 rounded">
              ={fn.name}({fn.args.map((a) => (a.optional ? `[${a.name}]` : a.name)).join(', ')})
            </div>
          </div>
        );
      })}
    </div>
  );
};
