import React, { useState } from 'react';
import {
  X,
  Sigma,
  AlertCircle,
} from 'lucide-react';
import { SubtotalConfig } from '@/types/analysis';
import { Cell, CellRange } from '@/types/cell';
import { formatRangeReference, parseRangeReference } from '@/engine/analysis/named-ranges';
import { colIndexToName, coordToKey } from '@/utils/coordinates';

interface SubtotalsDialogProps {
  isOpen: boolean;
  cells: Record<string, Cell>;
  currentSelection?: CellRange;
  hasExistingSubtotals: boolean;
  onApplySubtotals: (config: SubtotalConfig) => void;
  onRemoveSubtotals: () => void;
  onClose: () => void;
}

export const SubtotalsDialog: React.FC<SubtotalsDialogProps> = ({
  isOpen,
  cells,
  currentSelection,
  hasExistingSubtotals,
  onApplySubtotals,
  onRemoveSubtotals,
  onClose,
}) => {
  const initialRange: CellRange = currentSelection || {
    startRow: 0,
    startCol: 0,
    endRow: 10,
    endCol: 2,
  };

  const [rangeStr, setRangeStr] = useState(formatRangeReference(initialRange));
  const [groupByCol, setGroupByCol] = useState<number>(initialRange.startCol);
  const [agg, setAgg] = useState<'sum' | 'count' | 'average' | 'min' | 'max'>('sum');
  const [targetCols, setTargetCols] = useState<number[]>([
    initialRange.endCol > initialRange.startCol ? initialRange.endCol : initialRange.startCol,
  ]);
  const [addGrandTotal, setAddGrandTotal] = useState(true);
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const parsedRange = parseRangeReference(rangeStr);

  // Extract detected columns from range
  const availableCols: { index: number; name: string }[] = [];
  if (parsedRange) {
    for (let c = parsedRange.startCol; c <= parsedRange.endCol; c++) {
      let name = `Column ${colIndexToName(c)}`;
      const headerCell = cells[coordToKey(parsedRange.startRow, c)];
      if (headerCell?.value !== null && headerCell?.value !== undefined && headerCell.value !== '') {
        name = String(headerCell.value);
      }
      availableCols.push({ index: c, name });
    }
  }

  const handleToggleTargetCol = (colIndex: number) => {
    if (targetCols.includes(colIndex)) {
      if (targetCols.length > 1) {
        setTargetCols(targetCols.filter((c) => c !== colIndex));
      }
    } else {
      setTargetCols([...targetCols, colIndex]);
    }
  };

  const handleApply = () => {
    if (!parsedRange) {
      setErrorMsg('Invalid range format (e.g. A1:C20).');
      return;
    }

    if (targetCols.length === 0) {
      setErrorMsg('Please select at least one numeric column to calculate subtotals on.');
      return;
    }

    const config: SubtotalConfig = {
      range: parsedRange,
      groupByCol,
      agg,
      targetCols,
      addGrandTotal,
      replaceExisting,
    };

    onApplySubtotals(config);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-surface rounded-xl border border-border shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-secondary/40">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Sigma className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Subtotal</h2>
              <p className="text-xs text-foreground-muted">
                Calculate automatic subtotals and outline groups on column transitions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Data Range
            </label>
            <input
              type="text"
              value={rangeStr}
              onChange={(e) => {
                setRangeStr(e.target.value);
                setErrorMsg(null);
              }}
              placeholder="e.g. A1:D20"
              className="w-full px-3 py-2 text-xs font-mono bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              At each change in:
            </label>
            <select
              value={groupByCol}
              onChange={(e) => setGroupByCol(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 text-xs bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {availableCols.map((col) => (
                <option key={col.index} value={col.index}>
                  {col.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Use function:
            </label>
            <select
              value={agg}
              onChange={(e) => setAgg(e.target.value as typeof agg)}
              className="w-full px-3 py-2 text-xs bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="sum">Sum</option>
              <option value="count">Count</option>
              <option value="average">Average</option>
              <option value="max">Max</option>
              <option value="min">Min</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Add subtotal to:
            </label>
            <div className="max-h-36 overflow-y-auto border border-border rounded-lg p-2 bg-surface-secondary/20 space-y-1">
              {availableCols.map((col) => {
                const isChecked = targetCols.includes(col.index);
                return (
                  <label
                    key={col.index}
                    className="flex items-center gap-2 p-1.5 rounded hover:bg-surface-secondary cursor-pointer text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleTargetCol(col.index)}
                      className="rounded text-accent focus:ring-accent"
                    />
                    <span className="truncate">{col.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-border">
            <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={replaceExisting}
                onChange={(e) => setReplaceExisting(e.target.checked)}
                className="rounded text-accent focus:ring-accent"
              />
              <span>Replace current subtotals</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={addGrandTotal}
                onChange={(e) => setAddGrandTotal(e.target.checked)}
                className="rounded text-accent focus:ring-accent"
              />
              <span>Summary below data (Grand Total)</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-surface-secondary/40">
          <div>
            {hasExistingSubtotals && (
              <button
                type="button"
                onClick={() => {
                  onRemoveSubtotals();
                  onClose();
                }}
                className="px-3 py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 border border-rose-500/30 rounded-lg transition-colors"
              >
                Remove All
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-foreground hover:bg-surface-secondary border border-border rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-1.5 text-xs font-semibold bg-accent text-accent-foreground hover:bg-accent/90 rounded-lg shadow-xs transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
