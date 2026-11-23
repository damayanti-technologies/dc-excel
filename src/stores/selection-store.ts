import { create } from 'zustand';
import { CellCoordinates, CellRange } from '@/types/cell';
import { createRange, normalizeRange } from '@/engine/grid/selection';

interface SelectionState {
  activeCell: CellCoordinates | null;
  anchorCell: CellCoordinates | null;
  selectedRange: CellRange | null;
  isSelecting: boolean;
  editingCell: CellCoordinates | null;

  setActiveCell: (coord: CellCoordinates | null) => void;
  setAnchorCell: (coord: CellCoordinates | null) => void;
  setSelectedRange: (range: CellRange | null) => void;
  selectRangeFromAnchor: (current: CellCoordinates) => void;
  selectEntireRow: (row: number, colCount: number) => void;
  selectEntireColumn: (col: number, rowCount: number) => void;
  selectAll: (rowCount: number, colCount: number) => void;
  setIsSelecting: (isSelecting: boolean) => void;
  setEditingCell: (coord: CellCoordinates | null) => void;
  clearSelection: () => void;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  activeCell: { row: 0, col: 0 },
  anchorCell: { row: 0, col: 0 },
  selectedRange: { startRow: 0, startCol: 0, endRow: 0, endCol: 0 },
  isSelecting: false,
  editingCell: null,

  setActiveCell: (activeCell) =>
    set({
      activeCell,
      anchorCell: activeCell,
      selectedRange: activeCell
        ? {
            startRow: activeCell.row,
            startCol: activeCell.col,
            endRow: activeCell.row,
            endCol: activeCell.col
          }
        : null
    }),

  setAnchorCell: (anchorCell) => set({ anchorCell }),

  setSelectedRange: (selectedRange) =>
    set({
      selectedRange: selectedRange ? normalizeRange(selectedRange) : null
    }),

  selectRangeFromAnchor: (current) => {
    const anchor = get().anchorCell || get().activeCell || { row: 0, col: 0 };
    set({
      activeCell: current,
      selectedRange: createRange(anchor, current)
    });
  },

  selectEntireRow: (row, colCount) => {
    const range: CellRange = {
      startRow: row,
      startCol: 0,
      endRow: row,
      endCol: Math.max(0, colCount - 1)
    };
    set({
      activeCell: { row, col: 0 },
      anchorCell: { row, col: 0 },
      selectedRange: range
    });
  },

  selectEntireColumn: (col, rowCount) => {
    const range: CellRange = {
      startRow: 0,
      startCol: col,
      endRow: Math.max(0, rowCount - 1),
      endCol: col
    };
    set({
      activeCell: { row: 0, col },
      anchorCell: { row: 0, col },
      selectedRange: range
    });
  },

  selectAll: (rowCount, colCount) => {
    const range: CellRange = {
      startRow: 0,
      startCol: 0,
      endRow: Math.max(0, rowCount - 1),
      endCol: Math.max(0, colCount - 1)
    };
    set({
      activeCell: { row: 0, col: 0 },
      anchorCell: { row: 0, col: 0 },
      selectedRange: range
    });
  },

  setIsSelecting: (isSelecting) => set({ isSelecting }),
  setEditingCell: (editingCell) => set({ editingCell }),
  clearSelection: () =>
    set({
      activeCell: null,
      anchorCell: null,
      selectedRange: null,
      isSelecting: false,
      editingCell: null
    })
}));
