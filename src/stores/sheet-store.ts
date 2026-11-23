import { create } from 'zustand';
import { Sheet } from '@/types/sheet';
import { Cell, CellCoordinates } from '@/types/cell';
import { coordToKey } from '@/utils/coordinates';

interface SheetState {
  activeSheet: Sheet | null;
  isLoading: boolean;

  setActiveSheet: (sheet: Sheet | null) => void;
  setLoading: (isLoading: boolean) => void;
  updateCell: (coord: CellCoordinates, cell: Cell) => void;
  setBatchCells: (cells: Record<string, Cell>) => void;
  setRowHeight: (row: number, height: number) => void;
  setColumnWidth: (col: number, width: number) => void;
  clearSheet: () => void;
}

export const useSheetStore = create<SheetState>((set) => ({
  activeSheet: null,
  isLoading: false,

  setActiveSheet: (activeSheet) => set({ activeSheet, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),

  updateCell: (coord, cell) =>
    set((state) => {
      if (!state.activeSheet) return state;
      const key = coordToKey(coord.row, coord.col);
      return {
        activeSheet: {
          ...state.activeSheet,
          cells: {
            ...state.activeSheet.cells,
            [key]: cell
          }
        }
      };
    }),

  setBatchCells: (cells) =>
    set((state) => {
      if (!state.activeSheet) return state;
      return {
        activeSheet: {
          ...state.activeSheet,
          cells: {
            ...state.activeSheet.cells,
            ...cells
          }
        }
      };
    }),

  setRowHeight: (row, height) =>
    set((state) => {
      if (!state.activeSheet) return state;
      return {
        activeSheet: {
          ...state.activeSheet,
          rowHeights: {
            ...(state.activeSheet.rowHeights || {}),
            [row]: height
          }
        }
      };
    }),

  setColumnWidth: (col, width) =>
    set((state) => {
      if (!state.activeSheet) return state;
      return {
        activeSheet: {
          ...state.activeSheet,
          columnWidths: {
            ...(state.activeSheet.columnWidths || {}),
            [col]: width
          }
        }
      };
    }),

  clearSheet: () => set({ activeSheet: null, isLoading: false })
}));
