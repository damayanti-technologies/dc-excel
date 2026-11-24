import React, { useMemo } from 'react';
import { Minus, Plus, Grid, Eye, EyeOff } from 'lucide-react';
import { CellRange, CellCoordinates, SparseCellMap } from '@/types/cell';
import { calculateSelectionStatistics } from '@/engine/grid/selection-stats';
import { cn } from '@/utils/cn';

interface SpreadsheetStatusBarProps {
  isEditing: boolean;
  activeCell: CellCoordinates | null;
  selectedRange: CellRange | null;
  cells: SparseCellMap;
  zoom: number;
  onZoomChange: (newZoom: number) => void;
  showGridlines: boolean;
  onToggleGridlines: () => void;
  showFormulaBar: boolean;
  onToggleFormulaBar: () => void;
}

export const SpreadsheetStatusBar: React.FC<SpreadsheetStatusBarProps> = ({
  isEditing,
  activeCell,
  selectedRange,
  cells,
  zoom,
  onZoomChange,
  showGridlines,
  onToggleGridlines,
  showFormulaBar,
  onToggleFormulaBar
}) => {
  const stats = useMemo(() => {
    return calculateSelectionStatistics(selectedRange, activeCell, cells);
  }, [selectedRange, activeCell, cells]);

  const handleZoomIn = () => {
    onZoomChange(Math.min(200, Math.round((zoom + 10) / 10) * 10));
  };

  const handleZoomOut = () => {
    onZoomChange(Math.max(50, Math.round((zoom - 10) / 10) * 10));
  };

  const formatStatValue = (val: number): string => {
    if (Number.isInteger(val)) {
      return val.toLocaleString('en-US');
    }
    return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <footer
      role="status"
      aria-label="Spreadsheet status bar"
      className="h-7 bg-surface-secondary border-t border-border px-3 flex items-center justify-between text-[11px] text-foreground-muted select-none shrink-0"
    >
      {/* Left: Mode Badge & Live Selection Statistics */}
      <div className="flex items-center gap-3 overflow-hidden">
        {/* Mode Indicator */}
        <div
          className={cn(
            'px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase transition-colors',
            isEditing
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
          )}
        >
          {isEditing ? 'EDIT' : 'READY'}
        </div>

        {/* Live Selection Statistics */}
        {(stats.cellCount > 1 || stats.hasNumbers) && (
          <div className="flex items-center gap-2.5 truncate font-mono text-[11px] text-foreground">
            {stats.cellCount > 1 && (
              <span className="flex items-center gap-1" title="Selected cell count">
                <span className="text-foreground-muted">Count:</span>
                <span className="font-semibold">{stats.cellCount.toLocaleString()}</span>
              </span>
            )}

            {stats.hasNumbers && (
              <>
                <span className="text-border">|</span>
                <span className="flex items-center gap-1" title="Numeric count in selection">
                  <span className="text-foreground-muted">Nums:</span>
                  <span className="font-semibold">{stats.numericCount}</span>
                </span>
                <span className="text-border">|</span>
                <span className="flex items-center gap-1" title="Sum of numeric values">
                  <span className="text-foreground-muted">Sum:</span>
                  <span className="font-semibold">{formatStatValue(stats.sum)}</span>
                </span>
                <span className="text-border">|</span>
                <span className="flex items-center gap-1" title="Average of numeric values">
                  <span className="text-foreground-muted">Avg:</span>
                  <span className="font-semibold">{formatStatValue(stats.average)}</span>
                </span>
                <span className="text-border">|</span>
                <span className="flex items-center gap-1" title="Minimum value">
                  <span className="text-foreground-muted">Min:</span>
                  <span className="font-semibold">{formatStatValue(stats.min)}</span>
                </span>
                <span className="text-border">|</span>
                <span className="flex items-center gap-1" title="Maximum value">
                  <span className="text-foreground-muted">Max:</span>
                  <span className="font-semibold">{formatStatValue(stats.max)}</span>
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Right: Quick View Toggles & Zoom Slider */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Toggle Formula Bar */}
        <button
          type="button"
          onClick={onToggleFormulaBar}
          title={showFormulaBar ? 'Hide Formula Bar' : 'Show Formula Bar'}
          aria-label={showFormulaBar ? 'Hide Formula Bar' : 'Show Formula Bar'}
          className={cn(
            'p-1 rounded hover:bg-surface transition-colors cursor-pointer',
            showFormulaBar ? 'text-accent font-medium' : 'text-foreground-muted opacity-70'
          )}
        >
          {showFormulaBar ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        </button>

        {/* Toggle Gridlines */}
        <button
          type="button"
          onClick={onToggleGridlines}
          title={showGridlines ? 'Hide Gridlines' : 'Show Gridlines'}
          aria-label={showGridlines ? 'Hide Gridlines' : 'Show Gridlines'}
          className={cn(
            'p-1 rounded hover:bg-surface transition-colors cursor-pointer',
            showGridlines ? 'text-accent font-medium' : 'text-foreground-muted opacity-70'
          )}
        >
          <Grid className="w-3.5 h-3.5" />
        </button>

        <div className="h-3 w-px bg-border mx-1" />

        {/* Zoom Out Button */}
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={zoom <= 50}
          title="Zoom out (Ctrl + -)"
          aria-label="Zoom out"
          className="p-1 rounded hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <Minus className="w-3 h-3" />
        </button>

        {/* Zoom Slider */}
        <input
          type="range"
          min="50"
          max="200"
          step="5"
          value={zoom}
          onChange={(e) => onZoomChange(Number(e.target.value))}
          title={`Zoom: ${zoom}%`}
          aria-label="Zoom percentage"
          className="w-16 h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-accent"
        />

        {/* Zoom In Button */}
        <button
          type="button"
          onClick={handleZoomIn}
          disabled={zoom >= 200}
          title="Zoom in (Ctrl + +)"
          aria-label="Zoom in"
          className="p-1 rounded hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <Plus className="w-3 h-3" />
        </button>

        {/* Zoom Reset Button */}
        <button
          type="button"
          onClick={() => onZoomChange(100)}
          title="Reset zoom to 100%"
          aria-label="Reset zoom"
          className="px-1.5 py-0.5 rounded hover:bg-surface font-mono font-medium text-foreground transition-colors cursor-pointer"
        >
          {zoom}%
        </button>
      </div>
    </footer>
  );
};
