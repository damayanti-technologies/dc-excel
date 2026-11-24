import React, { useState, useRef, useEffect } from 'react';
import { Menu, Check, EyeOff, Eye } from 'lucide-react';
import { Sheet } from '@/types/sheet';
import { cn } from '@/utils/cn';

interface AllSheetsMenuProps {
  sheets: Sheet[];
  activeSheetId: string | null;
  onSelectSheet: (sheetId: string) => void;
  onOpenUnhideDialog: () => void;
}

export const AllSheetsMenu: React.FC<AllSheetsMenuProps> = ({
  sheets,
  activeSheetId,
  onSelectSheet,
  onOpenUnhideDialog
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const hiddenCount = sheets.filter((s) => s.metadata?.isHidden).length;

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'p-1.5 rounded hover:bg-surface text-foreground-muted hover:text-foreground transition-colors cursor-pointer',
          isOpen ? 'bg-surface text-foreground' : ''
        )}
        title="All Worksheets (Quick Jump)"
        aria-label="All Worksheets"
      >
        <Menu className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <div
          role="menu"
          className={cn(
            'absolute bottom-full left-0 mb-1 z-50 w-56 py-1 bg-surface-elevated border border-border rounded-xl shadow-xl',
            'animate-in fade-in zoom-in-95 duration-100 select-none'
          )}
        >
          <div className="px-3 py-1.5 border-b border-border flex items-center justify-between text-[11px] font-semibold text-foreground-muted">
            <span>Worksheets ({sheets.length})</span>
            {hiddenCount > 0 && (
              <span className="text-amber-600 dark:text-amber-400 font-normal">
                {hiddenCount} hidden
              </span>
            )}
          </div>

          <div className="max-h-56 overflow-y-auto py-0.5">
            {sheets.map((sheet) => {
              const isActive = sheet.id === activeSheetId;
              const isHidden = Boolean(sheet.metadata?.isHidden);

              return (
                <button
                  key={sheet.id}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    if (isHidden) {
                      onOpenUnhideDialog();
                    } else {
                      onSelectSheet(sheet.id);
                    }
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full px-3 py-1.5 text-xs text-left flex items-center justify-between gap-2 transition-colors cursor-pointer',
                    isActive
                      ? 'bg-accent/15 text-accent font-semibold'
                      : 'text-foreground hover:bg-surface-secondary',
                    isHidden ? 'opacity-60 italic' : ''
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    {sheet.metadata?.tabColor ? (
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: sheet.metadata.tabColor }}
                      />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full border border-border shrink-0 bg-transparent" />
                    )}
                    <span className="truncate">{sheet.name}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {isHidden && (
                      <span className="text-[10px] bg-surface text-foreground-muted px-1 rounded flex items-center gap-0.5">
                        <EyeOff className="w-2.5 h-2.5" />
                        Hidden
                      </span>
                    )}
                    {isActive && <Check className="w-3.5 h-3.5 text-accent" />}
                  </div>
                </button>
              );
            })}
          </div>

          {hiddenCount > 0 && (
            <div className="pt-1 mt-1 border-t border-border px-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenUnhideDialog();
                }}
                className="w-full px-2 py-1 text-xs text-accent hover:bg-surface-secondary rounded flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                Unhide Worksheets...
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
