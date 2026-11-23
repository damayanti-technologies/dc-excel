import React, { useState, useRef, useEffect, ReactNode, KeyboardEvent } from 'react';
import { cn } from '@/utils/cn';

export interface DropdownItem {
  id: string;
  label: string;
  icon?: ReactNode;
  shortcut?: string;
  disabled?: boolean;
  destructive?: boolean;
  onClick: () => void;
}

export interface DropdownSection {
  title?: string;
  items: (DropdownItem | 'divider')[];
}

export interface DropdownProps {
  trigger: ReactNode;
  items?: (DropdownItem | 'divider')[];
  sections?: DropdownSection[];
  align?: 'left' | 'right';
  className?: string;
  menuClassName?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  sections,
  align = 'left',
  className,
  menuClassName
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const menuSections: DropdownSection[] = sections
    ? sections
    : items
      ? [{ items }]
      : [];

  return (
    <div
      ref={dropdownRef}
      onKeyDown={handleKeyDown}
      className={cn('relative inline-flex', className)}
    >
      <div onClick={() => setIsOpen((prev) => !prev)} className="inline-flex cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className={cn(
            'absolute top-full mt-1.5 z-40 min-w-[200px] py-1.5 bg-surface-elevated border border-border rounded-xl shadow-lg',
            'animate-in fade-in zoom-in-95 duration-100 focus:outline-none',
            align === 'right' ? 'right-0' : 'left-0',
            menuClassName
          )}
        >
          {menuSections.map((section, sIdx) => (
            <div key={section.title || sIdx} className="py-0.5">
              {section.title && (
                <div className="px-3 py-1 text-[11px] font-semibold text-foreground-muted tracking-wider uppercase">
                  {section.title}
                </div>
              )}
              {section.items.map((item, iIdx) => {
                if (item === 'divider') {
                  return <div key={`div-${iIdx}`} className="h-px bg-border my-1" />;
                }

                return (
                  <button
                    key={item.id}
                    role="menuitem"
                    disabled={item.disabled}
                    onClick={() => {
                      if (!item.disabled) {
                        item.onClick();
                        setIsOpen(false);
                      }
                    }}
                    className={cn(
                      'w-full px-3 py-1.5 text-xs text-left flex items-center justify-between gap-2.5 rounded-md transition-colors',
                      item.disabled
                        ? 'opacity-40 cursor-not-allowed text-foreground-muted'
                        : item.destructive
                          ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30'
                          : 'text-foreground hover:bg-surface-secondary'
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {item.icon && <span className="w-4 h-4 shrink-0 text-foreground-muted">{item.icon}</span>}
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.shortcut && (
                      <kbd className="text-[10px] font-mono text-foreground-muted px-1.5 py-0.5 rounded bg-surface-secondary border border-border">
                        {item.shortcut}
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
