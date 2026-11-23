import React, { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface RadioOption {
  value: string;
  label: ReactNode;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: RadioOption[];
  direction?: 'vertical' | 'horizontal';
  className?: string;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  value,
  onChange,
  options,
  direction = 'vertical',
  className
}) => {
  return (
    <div
      role="radiogroup"
      className={cn(
        'flex gap-3',
        direction === 'vertical' ? 'flex-col' : 'flex-row flex-wrap',
        className
      )}
    >
      {options.map((option) => {
        const isChecked = option.value === value;
        const radioId = `${name}-${option.value}`;

        return (
          <div
            key={option.value}
            onClick={() => !option.disabled && onChange(option.value)}
            className={cn(
              'inline-flex items-start gap-2.5 cursor-pointer select-none',
              option.disabled && 'opacity-40 cursor-not-allowed'
            )}
          >
            <div className="relative flex items-center pt-0.5">
              <input
                id={radioId}
                type="radio"
                name={name}
                value={option.value}
                checked={isChecked}
                disabled={option.disabled}
                onChange={() => onChange(option.value)}
                className="peer sr-only"
              />
              <div
                className={cn(
                  'w-4 h-4 rounded-full border flex items-center justify-center transition-colors',
                  'peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2',
                  isChecked
                    ? 'border-accent bg-accent text-white'
                    : 'border-border-strong bg-surface hover:border-accent'
                )}
              >
                {isChecked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            </div>

            <label htmlFor={radioId} className="cursor-pointer space-y-0.5 text-left">
              <div className="text-xs font-medium text-foreground">{option.label}</div>
              {option.description && (
                <div className="text-[11px] text-foreground-muted">{option.description}</div>
              )}
            </label>
          </div>
        );
      })}
    </div>
  );
};

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
  description?: string;
}

export const Radio: React.FC<RadioProps> = ({ label, description, className, id, ...props }) => {
  const radioId = id || (typeof label === 'string' ? `radio-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className={cn('inline-flex items-start gap-2.5 cursor-pointer select-none', className)}>
      <div className="relative flex items-center pt-0.5">
        <input id={radioId} type="radio" className="peer sr-only" {...props} />
        <div
          className={cn(
            'w-4 h-4 rounded-full border flex items-center justify-center transition-colors',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2',
            props.checked
              ? 'border-accent bg-accent text-white'
              : 'border-border-strong bg-surface hover:border-accent'
          )}
        >
          {props.checked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
        </div>
      </div>

      {(label || description) && (
        <label htmlFor={radioId} className="cursor-pointer space-y-0.5 text-left">
          {label && <div className="text-xs font-medium text-foreground">{label}</div>}
          {description && <div className="text-[11px] text-foreground-muted">{description}</div>}
        </label>
      )}
    </div>
  );
};
