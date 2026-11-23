import React, { forwardRef, InputHTMLAttributes } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onClear?: () => void;
  containerClassName?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onChange, onClear, placeholder = 'Search workbooks, formulas, or cells...', className, containerClassName, ...props }, ref) => {
    const hasValue = value !== undefined && value !== '' && String(value).length > 0;

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape' && onClear) {
        onClear();
      }
      props.onKeyDown?.(e);
    };

    return (
      <div className={cn('relative flex items-center w-full max-w-md', containerClassName)}>
        <Search className="absolute left-3 w-4 h-4 text-foreground-muted pointer-events-none" />
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Search"
          className={cn(
            'w-full h-9 pl-9 pr-8 text-sm bg-surface-secondary border border-border rounded-lg text-foreground placeholder:text-foreground-muted',
            'focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent focus:bg-surface transition-all duration-fast',
            className
          )}
          {...props}
        />
        {hasValue && onClear && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear search"
            className="absolute right-2.5 p-0.5 rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-tertiary transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
