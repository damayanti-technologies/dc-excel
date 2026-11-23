import { forwardRef, useEffect, useRef, InputHTMLAttributes } from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
  indeterminate?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ checked, indeterminate = false, label, description, disabled, className, id, onChange, ...props }, ref) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const checkboxId = id || (label ? `cb-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    useEffect(() => {
      if (inputRef.current) {
        inputRef.current.indeterminate = indeterminate;
      }
    }, [indeterminate]);

    return (
      <div className={cn('inline-flex items-start gap-2.5 select-none', className)}>
        <div className="relative flex items-center pt-0.5">
          <input
            ref={(node) => {
              inputRef.current = node;
              if (typeof ref === 'function') ref(node);
              else if (ref) ref.current = node;
            }}
            id={checkboxId}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={onChange}
            className="peer sr-only"
            {...props}
          />
          <div
            onClick={() => !disabled && inputRef.current?.click()}
            className={cn(
              'w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2',
              'peer-disabled:opacity-40 peer-disabled:cursor-not-allowed',
              checked || indeterminate
                ? 'bg-accent border-accent text-white'
                : 'bg-surface border-border-strong hover:border-accent'
            )}
          >
            {indeterminate ? (
              <Minus className="w-3 h-3 stroke-[3]" />
            ) : checked ? (
              <Check className="w-3 h-3 stroke-[3]" />
            ) : null}
          </div>
        </div>

        {(label || description) && (
          <label htmlFor={checkboxId} className="cursor-pointer space-y-0.5 text-left">
            {label && <div className="text-xs font-medium text-foreground">{label}</div>}
            {description && <div className="text-[11px] text-foreground-muted">{description}</div>}
          </label>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
