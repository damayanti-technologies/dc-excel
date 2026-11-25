import React, { useState } from 'react';
import { Sheet } from '@/types/sheet';
import { CellRange } from '@/types/cell';
import { ChartConfig } from '@/types/chart';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Printer, Layout } from 'lucide-react';
import { colIndexToName, coordToKey } from '@/utils/coordinates';
import { cn } from '@/utils/cn';

export type PrintScope = 'active_sheet' | 'selected_range' | 'entire_workbook';
export type PageOrientation = 'portrait' | 'landscape';
export type PaperSize = 'a4' | 'letter' | 'legal';
export type MarginOption = 'normal' | 'narrow' | 'wide';

interface PrintDialogProps {
  isOpen: boolean;
  onClose: () => void;
  workbookName: string;
  activeSheet: Sheet;
  sheets: Sheet[];
  selectedRange: CellRange | null;
  charts?: ChartConfig[];
}

export const PrintDialog: React.FC<PrintDialogProps> = ({
  isOpen,
  onClose,
  workbookName,
  activeSheet,
  sheets,
  selectedRange,
  charts: _charts = []
}) => {
  const [scope, setScope] = useState<PrintScope>('active_sheet');
  const [orientation, setOrientation] = useState<PageOrientation>('portrait');
  const [paperSize, setPaperSize] = useState<PaperSize>('a4');
  const [margin, setMargin] = useState<MarginOption>('normal');
  const [showGridlines, setShowGridlines] = useState(true);
  const [showHeadings, setShowHeadings] = useState(true);
  const [fitToWidth, setFitToWidth] = useState(true);

  // Compute print range bounds
  const getPrintBounds = () => {
    if (scope === 'selected_range' && selectedRange) {
      return {
        startRow: Math.min(selectedRange.startRow, selectedRange.endRow),
        endRow: Math.max(selectedRange.startRow, selectedRange.endRow),
        startCol: Math.min(selectedRange.startCol, selectedRange.endCol),
        endCol: Math.max(selectedRange.startCol, selectedRange.endCol)
      };
    }
    // For active sheet: find populated bounds or clamp to reasonable page size
    const keys = Object.keys(activeSheet.cells);
    let maxR = 20;
    let maxC = 10;
    for (const key of keys) {
      const parts = key.split(':');
      const r = Number(parts[0]);
      const c = Number(parts[1]);
      if (r > maxR) maxR = r;
      if (c > maxC) maxC = c;
    }
    return {
      startRow: 0,
      endRow: Math.min(activeSheet.rowCount - 1, maxR + 2),
      startCol: 0,
      endCol: Math.min(activeSheet.columnCount - 1, maxC + 1)
    };
  };

  const bounds = getPrintBounds();
  const rowCount = bounds.endRow - bounds.startRow + 1;
  const colCount = bounds.endCol - bounds.startCol + 1;

  const handlePrint = () => {
    // Add temporary print styling parameters to body
    document.body.dataset.printOrientation = orientation;
    document.body.dataset.printGridlines = showGridlines ? 'true' : 'false';
    document.body.dataset.printHeadings = showHeadings ? 'true' : 'false';

    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Print & PDF Export Setup"
      className="max-w-3xl"
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Left: Configuration Controls */}
          <div className="space-y-4 text-xs">
            {/* 1. Print Scope */}
            <div>
              <label className="block font-semibold text-foreground mb-1.5">Print Scope</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setScope('active_sheet')}
                  className={cn(
                    'px-2.5 py-1.5 border rounded-lg text-left transition-colors cursor-pointer',
                    scope === 'active_sheet'
                      ? 'border-accent bg-accent/10 text-accent font-semibold'
                      : 'border-border bg-surface-secondary text-foreground-muted hover:text-foreground'
                  )}
                >
                  <span className="block font-medium truncate">Active Sheet</span>
                  <span className="text-[10px] opacity-75">{activeSheet.name}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setScope('selected_range')}
                  disabled={!selectedRange}
                  className={cn(
                    'px-2.5 py-1.5 border rounded-lg text-left transition-colors cursor-pointer',
                    scope === 'selected_range'
                      ? 'border-accent bg-accent/10 text-accent font-semibold'
                      : 'border-border bg-surface-secondary text-foreground-muted hover:text-foreground',
                    !selectedRange && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  <span className="block font-medium truncate">Selection</span>
                  <span className="text-[10px] opacity-75">
                    {selectedRange ? 'Current range' : 'None'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setScope('entire_workbook')}
                  className={cn(
                    'px-2.5 py-1.5 border rounded-lg text-left transition-colors cursor-pointer',
                    scope === 'entire_workbook'
                      ? 'border-accent bg-accent/10 text-accent font-semibold'
                      : 'border-border bg-surface-secondary text-foreground-muted hover:text-foreground'
                  )}
                >
                  <span className="block font-medium truncate">Entire Book</span>
                  <span className="text-[10px] opacity-75">{sheets.length} {sheets.length === 1 ? 'sheet' : 'sheets'}</span>
                </button>
              </div>
            </div>

            {/* 2. Page Orientation & Paper Size */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-foreground mb-1">Orientation</label>
                <div className="flex rounded-lg border border-border p-0.5 bg-surface-secondary">
                  <button
                    type="button"
                    onClick={() => setOrientation('portrait')}
                    className={cn(
                      'flex-1 py-1 text-center rounded-md transition-colors cursor-pointer',
                      orientation === 'portrait' ? 'bg-background shadow-xs font-semibold text-foreground' : 'text-foreground-muted'
                    )}
                  >
                    Portrait
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrientation('landscape')}
                    className={cn(
                      'flex-1 py-1 text-center rounded-md transition-colors cursor-pointer',
                      orientation === 'landscape' ? 'bg-background shadow-xs font-semibold text-foreground' : 'text-foreground-muted'
                    )}
                  >
                    Landscape
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Paper Size</label>
                <select
                  value={paperSize}
                  onChange={(e) => setPaperSize(e.target.value as PaperSize)}
                  className="w-full px-2.5 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="a4">A4 (210 × 297 mm)</option>
                  <option value="letter">Letter (8.5 × 11 in)</option>
                  <option value="legal">Legal (8.5 × 14 in)</option>
                </select>
              </div>
            </div>

            {/* 3. Margins */}
            <div>
              <label className="block font-semibold text-foreground mb-1">Margins</label>
              <div className="grid grid-cols-3 gap-2">
                {(['normal', 'narrow', 'wide'] as MarginOption[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMargin(m)}
                    className={cn(
                      'py-1 text-center border rounded-lg capitalize transition-colors cursor-pointer',
                      margin === m
                        ? 'border-accent bg-accent/10 text-accent font-semibold'
                        : 'border-border bg-surface-secondary text-foreground-muted hover:text-foreground'
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Display Toggles */}
            <div className="space-y-2 pt-1 border-t border-border">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showGridlines}
                  onChange={(e) => setShowGridlines(e.target.checked)}
                  className="rounded border-border text-accent focus:ring-accent"
                />
                <span className="text-foreground">Print cell gridlines</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showHeadings}
                  onChange={(e) => setShowHeadings(e.target.checked)}
                  className="rounded border-border text-accent focus:ring-accent"
                />
                <span className="text-foreground">Print row & column headings (A, B, C / 1, 2, 3)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fitToWidth}
                  onChange={(e) => setFitToWidth(e.target.checked)}
                  className="rounded border-border text-accent focus:ring-accent"
                />
                <span className="text-foreground">Fit all columns to 1 page width</span>
              </label>
            </div>
          </div>

          {/* Right: Realistic Print Page Preview */}
          <div className="flex flex-col items-center justify-center p-4 bg-surface-secondary/60 border border-border rounded-xl">
            <div className="text-[11px] font-semibold text-foreground-muted mb-2 flex items-center gap-1.5">
              <Layout className="w-3.5 h-3.5 text-accent" />
              <span>Realistic Print Preview ({rowCount} rows × {colCount} cols)</span>
            </div>

            {/* Paper Sheet Representation */}
            <div
              className={cn(
                'bg-white text-zinc-900 border border-zinc-300 rounded shadow-md overflow-hidden flex flex-col p-3 transition-all duration-200 select-none text-[8px]',
                orientation === 'portrait' ? 'w-56 h-72' : 'w-72 h-56'
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-1 mb-1 border-b border-zinc-200 text-zinc-500 font-sans">
                <span className="font-semibold truncate max-w-[120px]">{workbookName}</span>
                <span className="truncate">{activeSheet.name}</span>
              </div>

              {/* Sample Table Preview */}
              <div className="flex-1 overflow-hidden border border-zinc-200 bg-white">
                <table className="w-full border-collapse font-sans">
                  {showHeadings && (
                    <thead>
                      <tr className="bg-zinc-100 border-b border-zinc-200">
                        <th className="w-4 border-r border-zinc-200 p-0.5 text-zinc-400">#</th>
                        {Array.from({ length: Math.min(5, colCount) }).map((_, i) => (
                          <th key={i} className="border-r border-zinc-200 p-0.5 font-normal text-zinc-600">
                            {colIndexToName(bounds.startCol + i)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    {Array.from({ length: Math.min(8, rowCount) }).map((_, rIdx) => {
                      const actualRow = bounds.startRow + rIdx;
                      return (
                        <tr
                          key={rIdx}
                          className={cn(showGridlines ? 'border-b border-zinc-200' : '')}
                        >
                          {showHeadings && (
                            <td className="w-4 border-r border-zinc-200 bg-zinc-50 p-0.5 text-center text-zinc-400 font-mono">
                              {actualRow + 1}
                            </td>
                          )}
                          {Array.from({ length: Math.min(5, colCount) }).map((_, cIdx) => {
                            const actualCol = bounds.startCol + cIdx;
                            const cell = activeSheet.cells[coordToKey(actualRow, actualCol)];
                            const val = cell?.value != null ? String(cell.value) : '';
                            return (
                              <td
                                key={cIdx}
                                className={cn(
                                  'p-0.5 truncate max-w-[40px]',
                                  showGridlines && 'border-r border-zinc-200'
                                )}
                              >
                                {val}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-1 mt-1 border-t border-zinc-200 text-zinc-400 font-sans">
                <span>DC Excel</span>
                <span>Page 1 of 1</span>
              </div>
            </div>

            <p className="mt-2 text-[10px] text-foreground-muted text-center">
              Selecting "Save as PDF" in the browser print dialog exports a clean PDF document.
            </p>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handlePrint}
            leftIcon={<Printer className="w-4 h-4 shrink-0" />}
          >
            Print / Save as PDF
          </Button>
        </div>
      </div>
    </Modal>
  );
};
