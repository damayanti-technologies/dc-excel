import React, { useRef } from 'react';
import { CellCoordinates, Cell } from '@/types/cell';
import { coordToA1 } from '@/utils/coordinates';
import { useFormulaInputAssist } from '../hooks/useFormulaInputAssist';
import { FormulaAutocomplete } from './FormulaAutocomplete';
import { FormulaArgumentHelp } from './FormulaArgumentHelp';
import { BookOpen } from 'lucide-react';

interface FormulaBarProps {
  activeCell: CellCoordinates | null;
  cell: Cell | undefined;
  isEditing: boolean;
  editingValue: string;
  onStartEditing: (initialValue?: string) => void;
  onEditingChange: (value: string) => void;
  onCommitEditing: (moveTo?: 'down' | 'up' | 'right' | 'left' | 'none') => void;
  onCancelEditing: () => void;
  onOpenReference?: () => void;
}

export const FormulaBar: React.FC<FormulaBarProps> = ({
  activeCell,
  cell,
  isEditing,
  editingValue,
  onStartEditing,
  onEditingChange,
  onCommitEditing,
  onCancelEditing,
  onOpenReference
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const addressText = activeCell ? coordToA1(activeCell) : 'A1';

  // Determine uncommitted raw content from current cell
  const rawCellText = cell
    ? cell.formula ?? (cell.value !== null && cell.value !== undefined ? String(cell.value) : '')
    : '';

  const displayValue = isEditing ? editingValue : rawCellText;

  const {
    suggestions,
    selectedIndex,
    argumentHelpContext,
    acceptSuggestion,
    handleAssistKeyDown,
    updateCursorPosition
  } = useFormulaInputAssist({
    value: displayValue,
    onChange: (val) => {
      if (!isEditing) onStartEditing(val);
      else onEditingChange(val);
    },
    inputRef
  });

  const handleFocus = () => {
    if (!isEditing) {
      onStartEditing(rawCellText);
    }
    updateCursorPosition();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isEditing) onStartEditing(e.target.value);
    else onEditingChange(e.target.value);
    updateCursorPosition();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 1. Give priority to autocomplete navigation
    if (handleAssistKeyDown(e)) {
      return;
    }

    // 2. Standard editing commit/cancel
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

  return (
    <div
      ref={containerRef}
      className="relative h-8 bg-surface border-b border-border px-3 flex items-center gap-2 text-xs shrink-0 select-none"
    >
      {/* 1. Name / Address Box */}
      <div
        className="w-16 h-6 px-2 bg-surface-secondary border border-border rounded flex items-center justify-center font-mono font-medium text-foreground text-[11px] shrink-0 shadow-xs"
        title="Active cell reference"
      >
        {addressText}
      </div>

      {/* 2. fx Formula Indicator & Reference Button */}
      <button
        type="button"
        onClick={onOpenReference}
        className="px-1.5 py-0.5 rounded text-foreground-muted hover:text-accent hover:bg-surface-secondary font-serif italic text-xs font-bold shrink-0 transition-colors flex items-center gap-1 cursor-pointer"
        title="Insert Function or Browse Documentation"
      >
        <span>fx</span>
        <BookOpen className="w-3 h-3 not-italic text-foreground-muted" />
      </button>

      {/* 3. Interactive Formula / Cell Content Input */}
      <div className="relative flex-1">
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onFocus={handleFocus}
          onClick={updateCursorPosition}
          onKeyUp={updateCursorPosition}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Enter text, number, or formula starting with ="
          aria-label="Formula Bar"
          className="w-full h-6 px-2 text-xs bg-surface-secondary border border-border rounded text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-accent focus:bg-background select-text transition-colors"
        />

        {/* Floating Autocomplete Suggestions */}
        {isEditing && suggestions.length > 0 && (
          <div className="absolute top-8 left-0 z-50">
            <FormulaAutocomplete
              suggestions={suggestions}
              selectedIndex={selectedIndex}
              onSelect={acceptSuggestion}
            />
          </div>
        )}

        {/* Floating Argument Helper Tooltip */}
        {isEditing && argumentHelpContext && (
          <div className="absolute top-8 left-0 z-50">
            <FormulaArgumentHelp context={argumentHelpContext} />
          </div>
        )}
      </div>
    </div>
  );
};
