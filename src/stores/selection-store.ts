import { create } from 'zustand';
import { CellCoordinates, CellRange } from '@/types/cell';

interface SelectionState {
  activeCell: CellCoordinates | null;
  selectedRange: CellRange | null;
  isSelecting: boolean;
  editingCell: CellCoordinates | null;

  setActiveCell: (coord: CellCoordinates | null) => void;
  setSelectedRange: (range: CellRange | null) => void;
  setIsSelecting: (isSelecting: boolean) => void;
  setEditingCell: (coord: CellCoordinates | null) => void;
  clearSelection: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  activeCell: { row: 0, col: 0 },
  selectedRange: { startRow: 0, startCol: 0, endRow: 0, endCol: 0 },
  isSelecting: false,
  editingCell: null,

  setActiveCell: (activeCell) =>
    set({
      activeCell,
      selectedRange: activeCell
        ? {
            startRow: activeCell.row,
            startCol: activeCell.col,
            endRow: activeCell.row,
            endCol: activeCell.col
          }
        : null
    }),

  setSelectedRange: (selectedRange) => set({ selectedRange }),
  setIsSelecting: (isSelecting) => set({ isSelecting }),
  setEditingCell: (editingCell) => set({ editingCell }),
  clearSelection: () =>
    set({
      activeCell: null,
      selectedRange: null,
      isSelecting: false,
      editingCell: null
    })
}));
