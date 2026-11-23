import { forwardRef, SelectHTMLAttributes, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  options: SelectOption[];
  containerClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      helperText,
      errorMessage,
      options,
      className,
      containerClassName,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const selectId = id || generatedId;
    const hasError = Boolean(errorMessage);

    return (
      <div className={cn('w-full flex flex-col gap-1.5 text-left', containerClassName)}>
        {label && (
          <label
            htmlFor={selectId}
            className="text-xs font-semibold text-foreground flex items-center gap-1 select-none"
          >
            {label}
            {props.required && <span className="text-red-500">*</span>}
          </label>
        )}

        <div className="relative flex items-center w-full">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            aria-invalid={hasError ? 'true' : undefined}
            className={cn(
              'w-full h-9 rounded-lg pl-3 pr-9 py-1.5 text-sm bg-surface border text-foreground appearance-none transition-all duration-fast cursor-pointer',
              'focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent',
              'disabled:opacity-50 disabled:bg-surface-secondary disabled:cursor-not-allowed',
              hasError
                ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                : 'border-border hover:border-border-strong',
              className
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>

          <ChevronDown className="absolute right-3 w-4 h-4 text-foreground-muted pointer-events-none" />
        </div>

        {hasError && (
          <p className="text-xs text-red-600 dark:text-red-400 font-medium">{errorMessage}</p>
        )}

        {!hasError && helperText && (
          <p className="text-xs text-foreground-muted">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
