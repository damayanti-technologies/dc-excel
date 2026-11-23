import React, { useState, useEffect, useRef, ReactNode, MouseEvent } from 'react';
import { cn } from '@/utils/cn';
import { DropdownItem } from './Dropdown';

export interface ContextMenuProps {
  children: ReactNode;
  items: (DropdownItem | 'divider')[];
  disabled?: boolean;
  className?: string;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  children,
  items,
  disabled = false,
  className
}) => {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = (e: MouseEvent) => {
    if (disabled) return;
    e.preventDefault();

    // Clamp coordinates so menu does not overflow viewport
    const menuWidth = 190;
    const menuHeight = items.length * 36;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 10);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 10);

    setPosition({ x, y });
  };

  useEffect(() => {
    const handleClose = () => setPosition(null);
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setPosition(null);
    };

    if (position) {
      window.addEventListener('click', handleClose);
      window.addEventListener('scroll', handleClose, true);
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('click', handleClose);
      window.removeEventListener('scroll', handleClose, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [position]);

  return (
    <div onContextMenu={handleContextMenu} className={cn('inline-block w-full', className)}>
      {children}

      {position && (
        <div
          ref={menuRef}
          role="menu"
          style={{ top: `${position.y}px`, left: `${position.x}px` }}
          className={cn(
            'fixed z-50 min-w-[190px] py-1 bg-surface-elevated border border-border rounded-xl shadow-xl',
            'animate-in fade-in zoom-in-95 duration-100 select-none'
          )}
        >
          {items.map((item, idx) => {
            if (item === 'divider') {
              return <div key={`div-${idx}`} className="h-px bg-border my-1" />;
            }

            return (
              <button
                key={item.id}
                role="menuitem"
                disabled={item.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!item.disabled) {
                    item.onClick();
                    setPosition(null);
                  }
                }}
                className={cn(
                  'w-full px-3 py-1.5 text-xs text-left flex items-center justify-between gap-2.5 transition-colors',
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
      )}
    </div>
  );
};
