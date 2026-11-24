import React from 'react';
import { ArgumentHelpContext } from '@/engine/calculation/formula-assist';
import { cn } from '@/utils/cn';

interface FormulaArgumentHelpProps {
  context: ArgumentHelpContext;
  className?: string;
  style?: React.CSSProperties;
}

export const FormulaArgumentHelp: React.FC<FormulaArgumentHelpProps> = ({
  context,
  className,
  style
}) => {
  const { functionDef: fn, activeArgIndex } = context;

  // Determine active argument definition (handling repeating arguments if applicable)
  const argDefs = fn.args;
  let activeArg = argDefs[activeArgIndex];
  if (!activeArg && argDefs.length > 0 && argDefs[argDefs.length - 1]?.repeating) {
    activeArg = argDefs[argDefs.length - 1];
  }

  return (
    <div
      role="tooltip"
      aria-label="Formula Argument Helper"
      style={style}
      className={cn(
        'z-50 max-w-sm rounded-lg border border-border bg-surface shadow-xl p-2.5 text-xs select-none backdrop-blur-sm',
        className
      )}
    >
      {/* Signature line with active argument highlighted */}
      <div className="font-mono text-[11px] mb-1.5 pb-1 border-b border-border/50 text-foreground flex flex-wrap items-center gap-1">
        <span className="font-bold text-accent">{fn.name}(</span>
        {argDefs.length === 0 ? (
          <span className="text-foreground-muted">)</span>
        ) : (
          argDefs.map((arg, idx) => {
            const isActive =
              idx === activeArgIndex ||
              (idx === argDefs.length - 1 && activeArgIndex >= idx && arg.repeating);

            const displayLabel = arg.optional ? `[${arg.name}]` : arg.name;

            return (
              <React.Fragment key={arg.name}>
                <span
                  className={cn(
                    'px-1 py-0.2 rounded transition-all',
                    isActive
                      ? 'bg-accent font-bold text-accent-foreground ring-1 ring-accent'
                      : 'text-foreground-muted font-normal'
                  )}
                >
                  {displayLabel}
                </span>
                {idx < argDefs.length - 1 && <span className="text-foreground-muted">, </span>}
              </React.Fragment>
            );
          })
        )}
        {argDefs.length > 0 && <span className="font-bold text-accent">)</span>}
      </div>

      {/* Active Argument Details */}
      {activeArg ? (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-semibold text-foreground text-[11px]">
              {activeArg.name}:
            </span>
            <span
              className={cn(
                'text-[9px] px-1 py-0.2 rounded font-medium',
                activeArg.optional
                  ? 'bg-surface-tertiary text-foreground-muted'
                  : 'bg-accent/15 text-accent font-bold'
              )}
            >
              {activeArg.optional ? 'Optional' : 'Required'}
            </span>
            {activeArg.type && (
              <span className="text-[9px] text-foreground-muted">({activeArg.type})</span>
            )}
          </div>

          <p className="text-[11px] text-foreground-muted leading-relaxed">
            {activeArg.description}
          </p>

          {fn.examples.length > 0 && (
            <div className="mt-1 text-[10px] text-foreground-muted/70 font-mono bg-surface-secondary/60 px-1.5 py-0.5 rounded truncate">
              Example: {fn.examples[0]}
            </div>
          )}
        </div>
      ) : (
        <p className="text-[11px] text-foreground-muted leading-relaxed">
          {fn.description}
        </p>
      )}
    </div>
  );
};
