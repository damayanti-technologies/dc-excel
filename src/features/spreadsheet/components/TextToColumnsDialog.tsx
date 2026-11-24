import React, { useState, useMemo } from 'react';
import { Columns3, X, AlertTriangle } from 'lucide-react';
import { Sheet, CellRange } from '@/types/sheet';
import { TextToColumnsOptions, TextDelimiters } from '@/types/data-tools';
import { previewTextToColumns, executeTextToColumns } from '@/engine/data-tools/text-to-columns';
import { colIndexToName } from '@/utils/coordinates';
import { formatRangeLabel } from '@/engine/grid/selection';

interface TextToColumnsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sheet: Sheet;
  range: CellRange;
  onApplyTextToColumns: (updatedCells: Sheet['cells']) => void;
}

export const TextToColumnsDialog: React.FC<TextToColumnsDialogProps> = ({
  isOpen,
  onClose,
  sheet,
  range,
  onApplyTextToColumns
}) => {
  const sourceCol = Math.min(range.startCol, range.endCol);

  const [mode, setMode] = useState<'delimited' | 'fixed_width'>('delimited');
  const [delimiters, setDelimiters] = useState<TextDelimiters>({
    comma: true,
    semicolon: false,
    tab: false,
    space: false,
    custom: '',
    treatConsecutiveAsOne: false
  });
  const [fixedWidthText, setFixedWidthText] = useState('10, 20');
  const [destinationStartCol, setDestinationStartCol] = useState(sourceCol);

  const fixedWidths = useMemo(() => {
    return fixedWidthText
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => !isNaN(n) && n > 0);
  }, [fixedWidthText]);

  const options: TextToColumnsOptions = useMemo(
    () => ({
      range,
      mode,
      delimiters: mode === 'delimited' ? delimiters : undefined,
      fixedWidths: mode === 'fixed_width' ? fixedWidths : undefined,
      destinationStartCol
    }),
    [range, mode, delimiters, fixedWidths, destinationStartCol]
  );

  // Live preview
  const preview = useMemo(() => {
    return previewTextToColumns(sheet.cells, options);
  }, [sheet.cells, options]);

  if (!isOpen) return null;

  const handleExecute = () => {
    const result = executeTextToColumns(sheet.cells, options);
    onApplyTextToColumns(result.updatedCells);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-surface border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden text-xs text-foreground"
        role="dialog"
        aria-modal="true"
        aria-labelledby="text-to-cols-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-surface-secondary/40">
          <div className="flex items-center gap-2">
            <Columns3 className="w-4 h-4 text-primary" />
            <h2 id="text-to-cols-title" className="text-sm font-semibold text-foreground">
              Convert Text to Columns
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
          {/* Mode Selector */}
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
              Original Data Type
            </span>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`p-3 rounded-lg border cursor-pointer select-none transition-colors ${
                  mode === 'delimited'
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border bg-surface hover:bg-surface-secondary text-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-xs mb-1">
                  <input
                    type="radio"
                    name="mode"
                    checked={mode === 'delimited'}
                    onChange={() => setMode('delimited')}
                    className="text-primary focus:ring-primary"
                  />
                  <span>Delimited</span>
                </div>
                <p className="text-[11px] text-muted-foreground ml-5">
                  Characters such as commas or tabs separate each field.
                </p>
              </label>

              <label
                className={`p-3 rounded-lg border cursor-pointer select-none transition-colors ${
                  mode === 'fixed_width'
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border bg-surface hover:bg-surface-secondary text-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-xs mb-1">
                  <input
                    type="radio"
                    name="mode"
                    checked={mode === 'fixed_width'}
                    onChange={() => setMode('fixed_width')}
                    className="text-primary focus:ring-primary"
                  />
                  <span>Fixed Width</span>
                </div>
                <p className="text-[11px] text-muted-foreground ml-5">
                  Fields are aligned in columns with spaces between each field.
                </p>
              </label>
            </div>
          </div>

          {/* Delimiters Configuration */}
          {mode === 'delimited' ? (
            <div className="p-3 bg-surface-secondary/40 border border-border rounded-lg flex flex-col gap-2.5">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Delimiters
              </span>
              <div className="grid grid-cols-3 gap-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={delimiters.comma}
                    onChange={(e) =>
                      setDelimiters({ ...delimiters, comma: e.target.checked })
                    }
                    className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
                  />
                  <span>Comma (,)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={delimiters.semicolon}
                    onChange={(e) =>
                      setDelimiters({ ...delimiters, semicolon: e.target.checked })
                    }
                    className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
                  />
                  <span>Semicolon (;)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={delimiters.tab}
                    onChange={(e) =>
                      setDelimiters({ ...delimiters, tab: e.target.checked })
                    }
                    className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
                  />
                  <span>Tab</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={delimiters.space}
                    onChange={(e) =>
                      setDelimiters({ ...delimiters, space: e.target.checked })
                    }
                    className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
                  />
                  <span>Space</span>
                </label>
                <div className="flex items-center gap-1.5 col-span-2">
                  <span className="text-muted-foreground">Custom:</span>
                  <input
                    type="text"
                    maxLength={5}
                    value={delimiters.custom || ''}
                    onChange={(e) =>
                      setDelimiters({ ...delimiters, custom: e.target.value })
                    }
                    placeholder="e.g. |"
                    className="w-16 h-6 px-1.5 rounded border border-border bg-surface text-foreground text-xs focus:ring-1 focus:ring-primary outline-hidden"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none pt-1 border-t border-border/50">
                <input
                  type="checkbox"
                  checked={delimiters.treatConsecutiveAsOne}
                  onChange={(e) =>
                    setDelimiters({
                      ...delimiters,
                      treatConsecutiveAsOne: e.target.checked
                    })
                  }
                  className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
                />
                <span>Treat consecutive delimiters as one</span>
              </label>
            </div>
          ) : (
            <div className="p-3 bg-surface-secondary/40 border border-border rounded-lg flex flex-col gap-2">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Fixed Width Column Break Offsets
              </span>
              <input
                type="text"
                value={fixedWidthText}
                onChange={(e) => setFixedWidthText(e.target.value)}
                placeholder="Comma-separated offsets, e.g. 5, 12, 20"
                className="w-full h-8 px-2.5 rounded-md border border-border bg-surface text-foreground text-xs focus:ring-1 focus:ring-primary outline-hidden"
              />
              <span className="text-[10px] text-muted-foreground">
                Specifies character indexes where each new column begins.
              </span>
            </div>
          )}

          {/* Destination Column */}
          <div className="flex items-center gap-3">
            <label className="text-[11px] font-semibold text-muted-foreground">
              Destination Start Column:
            </label>
            <select
              value={destinationStartCol}
              onChange={(e) => setDestinationStartCol(Number(e.target.value))}
              className="h-8 px-2.5 rounded-md border border-border bg-surface text-foreground text-xs focus:ring-1 focus:ring-primary outline-hidden"
            >
              {Array.from({ length: 26 }, (_, i) => (
                <option key={i} value={i}>
                  Column {colIndexToName(i)}
                </option>
              ))}
            </select>
          </div>

          {/* Overwrite Warning */}
          {preview.hasOverwriteRisk && (
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center gap-2 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                Warning: Destination columns already contain populated cells ({preview.overwrittenCellKeys.length}).
                Existing data will be overwritten.
              </span>
            </div>
          )}

          {/* Data Preview Table */}
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Data Preview ({preview.maxCols} column{preview.maxCols === 1 ? '' : 's'})
            </span>
            <div className="max-h-40 overflow-auto border border-border rounded-lg bg-background">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-surface-secondary text-muted-foreground text-[10px] border-b border-border">
                    {Array.from({ length: Math.max(1, preview.maxCols) }, (_, i) => (
                      <th
                        key={i}
                        className="px-2 py-1 text-left font-semibold border-r border-border"
                      >
                        {colIndexToName(destinationStartCol + i)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-mono text-[11px]">
                  {preview.rows.slice(0, 8).map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-surface-secondary/30">
                      {Array.from({ length: Math.max(1, preview.maxCols) }, (_, cIdx) => (
                        <td
                          key={cIdx}
                          className="px-2 py-1 border-r border-border/60 truncate max-w-[120px]"
                        >
                          {row[cIdx] || ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
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
            onClick={handleExecute}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-xs"
          >
            Convert
          </button>
        </div>
      </div>
    </div>
  );
};
