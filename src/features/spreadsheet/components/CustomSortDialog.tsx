import React, { useState } from 'react';
import { Plus, Trash2, ArrowUpDown, X } from 'lucide-react';
import { CellRange, Sheet } from '@/types/sheet';
import { SortConfig, SortLevel } from '@/types/data-tools';
import { colIndexToName, coordToKey } from '@/utils/coordinates';
import { formatRangeLabel } from '@/engine/grid/selection';

interface CustomSortDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSort: (config: SortConfig) => void;
  sheet: Sheet;
  range: CellRange;
}

export const CustomSortDialog: React.FC<CustomSortDialogProps> = ({
  isOpen,
  onClose,
  onSort,
  sheet,
  range
}) => {
  const [hasHeaders, setHasHeaders] = useState(true);
  const [levels, setLevels] = useState<SortLevel[]>([
    {
      col: Math.min(range.startCol, range.endCol),
      direction: 'asc'
    }
  ]);

  if (!isOpen) return null;

  const startCol = Math.min(range.startCol, range.endCol);
  const endCol = Math.max(range.startCol, range.endCol);
  const startRow = Math.min(range.startRow, range.endRow);

  // Available columns in the range
  const availableCols: { col: number; label: string }[] = [];
  for (let c = startCol; c <= endCol; c++) {
    let label = `Column ${colIndexToName(c)}`;
    if (hasHeaders) {
      const headerCell = sheet.cells[coordToKey(startRow, c)];
      if (headerCell?.value != null && String(headerCell.value).trim() !== '') {
        label = `${String(headerCell.value)} (${colIndexToName(c)})`;
      }
    }
    availableCols.push({ col: c, label });
  }

  const handleAddLevel = () => {
    // Pick first column not already in levels, or fallback to startCol
    const usedCols = new Set(levels.map((l) => l.col));
    const nextCol = availableCols.find((c) => !usedCols.has(c.col))?.col ?? startCol;
    setLevels([...levels, { col: nextCol, direction: 'asc' }]);
  };

  const handleRemoveLevel = (index: number) => {
    if (levels.length <= 1) return;
    setLevels(levels.filter((_, i) => i !== index));
  };

  const handleUpdateLevel = (index: number, updates: Partial<SortLevel>) => {
    setLevels(
      levels.map((l, i) => (i === index ? { ...l, ...updates } : l))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSort({
      range,
      levels,
      hasHeaders
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-surface border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sort-dialog-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-surface-secondary/40">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-primary" />
            <h2 id="sort-dialog-title" className="text-sm font-semibold text-foreground">
              Custom Sort
            </h2>
            <span className="text-xs text-muted-foreground ml-1">
              ({formatRangeLabel(range)})
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-secondary transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {/* Header Checkbox */}
          <label className="flex items-center gap-2.5 text-xs font-medium text-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hasHeaders}
              onChange={(e) => setHasHeaders(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary w-4 h-4"
            />
            <span>My data has headers (use first row as column names)</span>
          </label>

          {/* Sort Levels Table */}
          <div className="border border-border rounded-lg overflow-hidden bg-background">
            <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-surface-secondary text-[11px] font-semibold text-muted-foreground border-b border-border">
              <div className="col-span-3">Level</div>
              <div className="col-span-4">Column</div>
              <div className="col-span-4">Order</div>
              <div className="col-span-1 text-center">Action</div>
            </div>

            <div className="max-h-56 overflow-y-auto divide-y divide-border/60">
              {levels.map((level, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 px-3 py-2.5 items-center text-xs">
                  <div className="col-span-3 font-medium text-foreground">
                    {idx === 0 ? 'Sort by' : 'Then by'}
                  </div>

                  {/* Column Picker */}
                  <div className="col-span-4">
                    <select
                      value={level.col}
                      onChange={(e) =>
                        handleUpdateLevel(idx, { col: Number(e.target.value) })
                      }
                      className="w-full h-8 px-2 rounded-md border border-border bg-surface text-foreground text-xs focus:ring-1 focus:ring-primary outline-hidden"
                    >
                      {availableCols.map((c) => (
                        <option key={c.col} value={c.col}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Direction Picker */}
                  <div className="col-span-4">
                    <select
                      value={level.direction}
                      onChange={(e) =>
                        handleUpdateLevel(idx, {
                          direction: e.target.value as 'asc' | 'desc'
                        })
                      }
                      className="w-full h-8 px-2 rounded-md border border-border bg-surface text-foreground text-xs focus:ring-1 focus:ring-primary outline-hidden"
                    >
                      <option value="asc">A to Z / Smallest to Largest</option>
                      <option value="desc">Z to A / Largest to Smallest</option>
                    </select>
                  </div>

                  {/* Delete Level */}
                  <div className="col-span-1 flex justify-center">
                    <button
                      type="button"
                      disabled={levels.length <= 1}
                      onClick={() => handleRemoveLevel(idx)}
                      className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      title="Delete level"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add Level Button */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleAddLevel}
              disabled={levels.length >= availableCols.length}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-surface text-xs font-medium text-foreground hover:bg-surface-secondary disabled:opacity-40 disabled:pointer-events-none transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 text-primary" />
              <span>Add Level</span>
            </button>

            <span className="text-[11px] text-muted-foreground">
              Blanks are always sorted to the bottom
            </span>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border mt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-border bg-surface text-xs font-medium text-foreground hover:bg-surface-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-xs"
            >
              Sort
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
