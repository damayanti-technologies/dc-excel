import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { ButtonVariant, ButtonSize } from './Button';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  'aria-label': string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isRounded?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      'aria-label': ariaLabel,
      className,
      variant = 'ghost',
      size = 'md',
      isRounded = false,
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center transition-colors select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.96]';

    const variants: Record<ButtonVariant, string> = {
      primary: 'bg-brand text-foreground-inverse hover:bg-brand-light shadow-xs',
      accent: 'bg-accent text-white hover:bg-accent-hover shadow-xs',
      secondary:
        'bg-surface-secondary text-foreground hover:bg-surface-tertiary border border-border shadow-xs',
      outline:
        'bg-transparent text-foreground hover:bg-surface-secondary border border-border-strong',
      ghost:
        'bg-transparent text-foreground-secondary hover:text-foreground hover:bg-surface-secondary',
      danger: 'bg-red-600 text-white hover:bg-red-700 shadow-xs'
    };

    const sizes: Record<ButtonSize, string> = {
      xs: 'w-6 h-6 text-xs',
      sm: 'w-7 h-7 text-xs',
      md: 'w-8 h-8 text-sm',
      lg: 'w-10 h-10 text-base'
    };

    return (
      <button
        ref={ref}
        type={type}
        aria-label={ariaLabel}
        title={ariaLabel}
        disabled={disabled}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          isRounded ? 'rounded-full' : 'rounded-lg',
          className
        )}
        {...props}
      >
        {icon}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
