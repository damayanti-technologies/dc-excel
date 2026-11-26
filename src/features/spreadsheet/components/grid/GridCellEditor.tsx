import React from 'react';
import { CellCoordinates, CellRange, CellStyle } from '@/types/cell';
import { GridVirtualizer } from '@/engine/grid/virtualizer';
import { getMergedRangeForCell, isMergeAnchor } from '@/engine/formatting/merge-cells';
import { FormulaAutocomplete } from '../FormulaAutocomplete';
import { FormulaArgumentHelp } from '../FormulaArgumentHelp';
import { FunctionDefinition } from '@/engine/calculation/types';
import { ArgumentHelpContext } from '@/engine/calculation/formula-assist';

export interface GridCellEditorProps {
  editingCell: CellCoordinates;
  editingValue: string;
  zoom: number;
  cellStyle?: CellStyle;
  mergedRanges?: CellRange[];
  virtualizer: GridVirtualizer;
  cellInputRef: React.RefObject<HTMLInputElement>;
  onEditingChange: (val: string) => void;
  updateCursorPosition: (e: React.SyntheticEvent<HTMLInputElement>) => void;
  handleCellInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleCellInputBlur: (e: React.FocusEvent) => void;
  suggestions: FunctionDefinition[];
  selectedIndex: number;
  acceptSuggestion: (suggestion: FunctionDefinition) => void;
  argumentHelpContext: ArgumentHelpContext | null;
}

export const GridCellEditor: React.FC<GridCellEditorProps> = ({
  editingCell,
  editingValue,
  zoom,
  cellStyle,
  mergedRanges,
  virtualizer,
  cellInputRef,
  onEditingChange,
  updateCursorPosition,
  handleCellInputKeyDown,
  handleCellInputBlur,
  suggestions,
  selectedIndex,
  acceptSuggestion,
  argumentHelpContext,
}) => {
  const merged = getMergedRangeForCell(mergedRanges, editingCell.row, editingCell.col);
  const isAnchor = merged ? isMergeAnchor(merged, editingCell.row, editingCell.col) : false;

  let width = virtualizer.getColWidth(editingCell.col, zoom);
  if (merged && isAnchor) {
    let mw = 0;
    for (let c = merged.startCol; c <= merged.endCol; c++) {
      mw += virtualizer.getColWidth(c, zoom);
    }
    width = mw;
  }
  width = Math.max(width, 140);

  let height = virtualizer.getRowHeight(editingCell.row, zoom);
  if (merged && isAnchor) {
    let mh = 0;
    for (let r = merged.startRow; r <= merged.endRow; r++) {
      mh += virtualizer.getRowHeight(r, zoom);
    }
    height = mh;
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: virtualizer.getColOffset(editingCell.col, zoom),
        top: virtualizer.getRowOffset(editingCell.row, zoom),
        zIndex: 35,
      }}
      className="relative"
    >
      <input
        ref={cellInputRef}
        type="text"
        value={editingValue}
        onChange={(e) => onEditingChange(e.target.value)}
        onClick={updateCursorPosition}
        onKeyUp={updateCursorPosition}
        onKeyDown={handleCellInputKeyDown}
        onBlur={handleCellInputBlur}
        style={{
          width,
          height,
          fontSize: `${Math.round((cellStyle?.fontSize || 12) * zoom)}px`,
          fontFamily: cellStyle?.fontFamily || cellStyle?.font || undefined,
          fontWeight: cellStyle?.bold ? 'bold' : 'normal',
          fontStyle: cellStyle?.italic ? 'italic' : 'normal',
          color: cellStyle?.textColor || undefined,
        }}
        className="px-2 font-mono bg-background text-foreground border-2 border-accent ring-1 ring-accent outline-none shadow-md"
        aria-label="Direct Cell Editor"
      />

      {/* In-Cell Floating Autocomplete Suggestions */}
      {suggestions.length > 0 && (
        <div className="absolute top-full left-0 mt-1 z-50">
          <FormulaAutocomplete
            suggestions={suggestions}
            selectedIndex={selectedIndex}
            onSelect={acceptSuggestion}
          />
        </div>
      )}

      {/* In-Cell Floating Argument Helper Tooltip */}
      {argumentHelpContext && (
        <div className="absolute top-full left-0 mt-1 z-50">
          <FormulaArgumentHelp context={argumentHelpContext} />
        </div>
      )}
    </div>
  );
};
