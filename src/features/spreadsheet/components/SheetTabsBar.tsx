import React from 'react';
import { Plus } from 'lucide-react';
import { Sheet } from '@/types/sheet';
import { cn } from '@/utils/cn';

interface SheetTabsBarProps {
  sheets: Sheet[];
  activeSheetId: string | null;
  onSelectSheet: (sheetId: string) => void;
  onAddSheet: () => void;
}

export const SheetTabsBar: React.FC<SheetTabsBarProps> = ({
  sheets,
  activeSheetId,
  onSelectSheet,
  onAddSheet
}) => {
  return (
    <div className="h-9 border-t border-border bg-surface-secondary px-3 flex items-center justify-between text-xs shrink-0 select-none">
      {/* Left: Sheets Tabs List & Add Button */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
        {sheets.map((sheet) => {
          const isActive = sheet.id === activeSheetId;
          return (
            <button
              key={sheet.id}
              type="button"
              onClick={() => onSelectSheet(sheet.id)}
              className={cn(
                'px-3.5 py-1 text-xs font-semibold rounded-t-md transition-all flex items-center gap-1.5 cursor-pointer',
                isActive
                  ? 'bg-background text-foreground border-t-2 border-accent shadow-xs'
                  : 'text-foreground-muted hover:text-foreground hover:bg-surface'
              )}
              title={`Sheet: ${sheet.name}`}
              role="tab"
              aria-selected={isActive}
            >
              <span className="truncate max-w-[120px]">{sheet.name}</span>
            </button>
          );
        })}

        {/* Add Sheet (+) Button */}
        <button
          type="button"
          onClick={onAddSheet}
          className="p-1 rounded hover:bg-surface text-foreground-muted hover:text-foreground transition-colors ml-1 cursor-pointer"
          title="Add New Sheet"
          aria-label="Add Sheet"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Right: Sheet Count & Status */}
      <div className="flex items-center gap-3 text-foreground-muted text-[11px] shrink-0">
        <span className="hidden sm:inline">
          {sheets.length} {sheets.length === 1 ? 'sheet' : 'sheets'}
        </span>
        <span className="hidden md:inline border-l border-border pl-3">Ready</span>
      </div>
    </div>
  );
};
