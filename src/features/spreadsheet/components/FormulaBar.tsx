import React from 'react';
import { CellCoordinates, Cell } from '@/types/cell';
import { coordToA1 } from '@/utils/coordinates';

interface FormulaBarProps {
  activeCell: CellCoordinates | null;
  cell: Cell | undefined;
}

export const FormulaBar: React.FC<FormulaBarProps> = ({ activeCell, cell }) => {
  const addressText = activeCell ? coordToA1(activeCell) : 'A1';

  let displayValue = '';
  if (cell) {
    if (cell.formula) {
      displayValue = cell.formula;
    } else if (cell.value !== null && cell.value !== undefined) {
      displayValue = String(cell.value);
    }
  }

  return (
    <div className="h-8 bg-surface border-b border-border px-3 flex items-center gap-2 text-xs shrink-0 select-none">
      {/* Name / Address Box */}
      <div
        className="w-16 h-6 px-2 bg-surface-secondary border border-border rounded flex items-center justify-center font-mono font-medium text-foreground text-[11px] shrink-0"
        title="Active cell reference"
      >
        {addressText}
      </div>

      {/* fx formula indicator icon */}
      <div
        className="px-1 text-foreground-muted font-serif italic text-xs font-bold shrink-0 select-none"
        title="Formula Bar"
      >
        fx
      </div>

      {/* Formula / Cell Content Display (Structural display component in Stage 4) */}
      <input
        type="text"
        readOnly
        value={displayValue}
        placeholder="Cell content..."
        aria-label="Formula Bar"
        className="flex-1 h-6 px-2 text-xs bg-surface-secondary border border-border rounded text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-accent select-text cursor-default"
      />
    </div>
  );
};
