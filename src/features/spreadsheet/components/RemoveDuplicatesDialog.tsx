import React, { useState, useMemo } from 'react';
import { CopySlash, X, AlertCircle } from 'lucide-react';
import { Sheet, CellRange } from '@/types/sheet';
import { RemoveDuplicatesConfig } from '@/types/data-tools';
import { previewRemoveDuplicates, executeRemoveDuplicates } from '@/engine/data-tools/remove-duplicates';
import { colIndexToName, coordToKey } from '@/utils/coordinates';
import { formatRangeLabel } from '@/engine/grid/selection';

interface RemoveDuplicatesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sheet: Sheet;
  range: CellRange;
  onApplyRemoveDuplicates: (updatedCells: Sheet['cells'], removedCount: number, remainingCount: number) => void;
}

export const RemoveDuplicatesDialog: React.FC<RemoveDuplicatesDialogProps> = ({
  isOpen,
  onClose,
  sheet,
  range,
  onApplyRemoveDuplicates
}) => {
  const [hasHeaders, setHasHeaders] = useState(true);

  const startCol = Math.min(range.startCol, range.endCol);
  const endCol = Math.max(range.startCol, range.endCol);
  const startRow = Math.min(range.startRow, range.endRow);

  // Available columns
  const availableCols = useMemo(() => {
    const cols: { col: number; label: string }[] = [];
    for (let c = startCol; c <= endCol; c++) {
      let label = `Column ${colIndexToName(c)}`;
      if (hasHeaders) {
        const headerCell = sheet.cells[coordToKey(startRow, c)];
        if (headerCell?.value != null && String(headerCell.value).trim() !== '') {
          label = `${String(headerCell.value)} (${colIndexToName(c)})`;
        }
      }
      cols.push({ col: c, label });
    }
    return cols;
  }, [sheet.cells, startCol, endCol, startRow, hasHeaders]);

  // Selected columns for comparison (default: all)
  const [selectedCols, setSelectedCols] = useState<number[]>(() =>
    availableCols.map((c) => c.col)
  );

  // Live preview
  const preview = useMemo(() => {
    if (selectedCols.length === 0) {
      return { duplicateRowCount: 0, uniqueRowCount: 0, totalRows: 0, duplicateRowIndices: [] };
    }
    const config: RemoveDuplicatesConfig = {
      range,
      compareCols: selectedCols,
      hasHeaders
    };
    return previewRemoveDuplicates(sheet.cells, config);
  }, [sheet.cells, range, selectedCols, hasHeaders]);

  if (!isOpen) return null;

  const handleToggleCol = (col: number) => {
    if (selectedCols.includes(col)) {
      setSelectedCols(selectedCols.filter((c) => c !== col));
    } else {
      setSelectedCols([...selectedCols, col]);
    }
  };

  const handleSelectAll = () => {
    setSelectedCols(availableCols.map((c) => c.col));
  };

  const handleUnselectAll = () => {
    setSelectedCols([]);
  };

  const handleExecute = () => {
    if (selectedCols.length === 0) return;
    const config: RemoveDuplicatesConfig = {
      range,
      compareCols: selectedCols,
      hasHeaders
    };

    const result = executeRemoveDuplicates(sheet.cells, config);
    onApplyRemoveDuplicates(result.updatedCells, result.removedCount, preview.uniqueRowCount);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-surface border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden text-xs text-foreground"
        role="dialog"
        aria-modal="true"
        aria-labelledby="remove-dups-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-surface-secondary/40">
          <div className="flex items-center gap-2">
            <CopySlash className="w-4 h-4 text-primary" />
            <h2 id="remove-dups-title" className="text-sm font-semibold text-foreground">
              Remove Duplicates
            </h2>
            <span className="text-xs text-muted-foreground ml-1">
              ({formatRangeLabel(range)})
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4">
          <p className="text-xs text-muted-foreground">
            To delete duplicate values, select one or more columns that contain duplicates.
          </p>

          {/* Header Checkbox */}
          <label className="flex items-center gap-2.5 text-xs font-medium text-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hasHeaders}
              onChange={(e) => setHasHeaders(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary w-4 h-4"
            />
            <span>My data has headers</span>
          </label>

          {/* Column Checklist Controls */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Columns to Compare
            </span>
            <div className="flex items-center gap-2 text-[11px] text-primary">
              <button
                type="button"
                onClick={handleSelectAll}
                className="hover:underline font-medium"
              >
                Select All
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={handleUnselectAll}
                className="hover:underline font-medium"
              >
                Unselect All
              </button>
            </div>
          </div>

          {/* Column Checkboxes List */}
          <div className="max-h-48 overflow-y-auto border border-border rounded-lg p-2 space-y-1 bg-background">
            {availableCols.map((c) => {
              const isChecked = selectedCols.includes(c.col);
              return (
                <label
                  key={c.col}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-surface-secondary cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleCol(c.col)}
                    className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
                  />
                  <span className="text-xs text-foreground font-medium truncate">
                    {c.label}
                  </span>
                </label>
              );
            })}
          </div>

          {/* Duplicate Preview Alert Box */}
          <div className="p-3 rounded-lg bg-surface-secondary border border-border flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-semibold text-foreground">
                {preview.duplicateRowCount}{' '}
                {preview.duplicateRowCount === 1 ? 'duplicate row' : 'duplicate rows'} found.
              </span>
              <p className="text-muted-foreground mt-0.5">
                {preview.duplicateRowCount > 0
                  ? `${preview.duplicateRowCount} duplicate rows will be removed, leaving ${preview.uniqueRowCount} unique rows.`
                  : 'No duplicate rows found based on selected columns.'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border bg-surface-secondary/30 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-border bg-surface text-xs font-medium text-foreground hover:bg-surface-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={selectedCols.length === 0}
            onClick={handleExecute}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-40 disabled:pointer-events-none transition-colors shadow-xs"
          >
            Remove Duplicates
          </button>
        </div>
      </div>
    </div>
  );
};
