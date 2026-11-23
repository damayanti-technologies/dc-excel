import React, { useRef, useEffect } from 'react';
import { CellCoordinates, Cell } from '@/types/cell';
import { coordToA1 } from '@/utils/coordinates';

interface FormulaBarProps {
  activeCell: CellCoordinates | null;
  cell: Cell | undefined;
  isEditing: boolean;
  editingValue: string;
  onStartEditing: (initialValue?: string) => void;
  onEditingChange: (value: string) => void;
  onCommitEditing: (moveTo?: 'down' | 'up' | 'right' | 'left' | 'none') => void;
  onCancelEditing: () => void;
}

export const FormulaBar: React.FC<FormulaBarProps> = ({
  activeCell,
  cell,
  isEditing,
  editingValue,
  onStartEditing,
  onEditingChange,
  onCommitEditing,
  onCancelEditing
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const addressText = activeCell ? coordToA1(activeCell) : 'A1';

  // Determine uncommitted raw content from current cell
  const rawCellText = cell
    ? cell.formula ?? (cell.value !== null && cell.value !== undefined ? String(cell.value) : '')
    : '';

  const displayValue = isEditing ? editingValue : rawCellText;

  // Handle focus from user clicking directly into formula bar
  const handleFocus = () => {
    if (!isEditing) {
      onStartEditing(rawCellText);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onEditingChange(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onCommitEditing(e.shiftKey ? 'up' : 'down');
      inputRef.current?.blur();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      onCommitEditing(e.shiftKey ? 'left' : 'right');
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancelEditing();
      inputRef.current?.blur();
    }
  };

  // If editing begins elsewhere (e.g. F2 or typing in grid), ensure value is reflected
  useEffect(() => {
    // Value is controlled via displayValue
  }, [displayValue]);

  return (
    <div className="h-8 bg-surface border-b border-border px-3 flex items-center gap-2 text-xs shrink-0 select-none">
      {/* 1. Name / Address Box */}
      <div
        className="w-16 h-6 px-2 bg-surface-secondary border border-border rounded flex items-center justify-center font-mono font-medium text-foreground text-[11px] shrink-0 shadow-xs"
        title="Active cell reference"
      >
        {addressText}
      </div>

      {/* 2. fx Formula Indicator Icon */}
      <div
        className="px-1 text-foreground-muted font-serif italic text-xs font-bold shrink-0 select-none cursor-default"
        title="Formula Bar"
      >
        fx
      </div>

      {/* 3. Interactive Formula / Cell Content Input */}
      <input
        ref={inputRef}
        type="text"
        value={displayValue}
        onFocus={handleFocus}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Enter text, number, or formula starting with ="
        aria-label="Formula Bar"
        className="flex-1 h-6 px-2 text-xs bg-surface-secondary border border-border rounded text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-accent focus:bg-background select-text transition-colors"
      />
    </div>
  );
};
