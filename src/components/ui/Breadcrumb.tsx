import React, { ReactNode } from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: ReactNode;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  showHome = true,
  className
}) => {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center text-xs select-none', className)}>
      <ol className="flex items-center gap-1.5 flex-wrap">
        {showHome && (
          <li className="flex items-center">
            <Link
              to="/"
              className="text-foreground-muted hover:text-foreground transition-colors p-1 rounded-md hover:bg-surface-secondary flex items-center"
              aria-label="Home"
            >
              <Home className="w-3.5 h-3.5" />
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-foreground-subtle mx-0.5 shrink-0" />
          </li>
        )}

        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="flex items-center gap-1.5">
              {isLast ? (
                <span
                  aria-current="page"
                  className="font-semibold text-foreground flex items-center gap-1 max-w-[180px] truncate"
                >
                  {item.icon && <span className="w-3.5 h-3.5 shrink-0">{item.icon}</span>}
                  <span className="truncate">{item.label}</span>
                </span>
              ) : item.href ? (
                <Link
                  to={item.href}
                  className="text-foreground-muted hover:text-foreground transition-colors flex items-center gap-1 max-w-[150px] truncate"
                >
                  {item.icon && <span className="w-3.5 h-3.5 shrink-0">{item.icon}</span>}
                  <span className="truncate">{item.label}</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={item.onClick}
                  className="text-foreground-muted hover:text-foreground transition-colors flex items-center gap-1 max-w-[150px] truncate"
                >
                  {item.icon && <span className="w-3.5 h-3.5 shrink-0">{item.icon}</span>}
                  <span className="truncate">{item.label}</span>
                </button>
              )}

              {!isLast && (
                <ChevronRight className="w-3.5 h-3.5 text-foreground-subtle shrink-0" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
