import { create } from 'zustand';
import { Sheet } from '@/types/sheet';
import { Cell, CellCoordinates } from '@/types/cell';
import { coordToKey } from '@/utils/coordinates';
import {
  insertRow as insertRowOp,
  deleteRow as deleteRowOp,
  insertColumn as insertColumnOp,
  deleteColumn as deleteColumnOp,
  resizeRowHeight as resizeRowOp,
  resizeColumnWidth as resizeColOp
} from '@/engine/grid/operations';

interface SheetState {
  activeSheet: Sheet | null;
  isLoading: boolean;
  zoom: number;

  setActiveSheet: (sheet: Sheet | null) => void;
  setLoading: (isLoading: boolean) => void;
  setZoom: (zoom: number) => void;
  updateCell: (coord: CellCoordinates, cell: Cell) => void;
  setBatchCells: (cells: Record<string, Cell>, newRowCount?: number, newColCount?: number) => void;
  setRowHeight: (row: number, height: number) => void;
  setColumnWidth: (col: number, width: number) => void;
  insertRow: (atRow: number, position?: 'above' | 'below') => void;
  deleteRow: (atRow: number) => void;
  insertColumn: (atCol: number, position?: 'before' | 'after') => void;
  deleteColumn: (atCol: number) => void;
  updateMetadata: (metadata: Partial<import('@/types/sheet').SheetMetadata>) => void;
  setAllCells: (cells: import('@/types/cell').SparseCellMap) => void;
  clearSheet: () => void;
}

export const useSheetStore = create<SheetState>((set) => ({
  activeSheet: null,
  isLoading: false,
  zoom: 1.0,

  setActiveSheet: (activeSheet) =>
    set({
      activeSheet,
      isLoading: false,
      zoom: activeSheet?.metadata?.zoom || 1.0
    }),

  setLoading: (isLoading) => set({ isLoading }),

  setZoom: (zoom) =>
    set((state) => {
      const clamped = Math.max(0.5, Math.min(2.0, zoom));
      if (!state.activeSheet) return { zoom: clamped };
      return {
        zoom: clamped,
        activeSheet: {
          ...state.activeSheet,
          metadata: {
            ...(state.activeSheet.metadata || {}),
            zoom: clamped
          }
        }
      };
    }),

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

  setBatchCells: (cells, newRowCount, newColCount) =>
    set((state) => {
      if (!state.activeSheet) return state;
      return {
        activeSheet: {
          ...state.activeSheet,
          rowCount: newRowCount ? Math.max(state.activeSheet.rowCount, newRowCount) : state.activeSheet.rowCount,
          columnCount: newColCount ? Math.max(state.activeSheet.columnCount, newColCount) : state.activeSheet.columnCount,
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
        activeSheet: resizeRowOp(state.activeSheet, row, height)
      };
    }),

  setColumnWidth: (col, width) =>
    set((state) => {
      if (!state.activeSheet) return state;
      return {
        activeSheet: resizeColOp(state.activeSheet, col, width)
      };
    }),

  insertRow: (atRow, position = 'above') =>
    set((state) => {
      if (!state.activeSheet) return state;
      return {
        activeSheet: insertRowOp(state.activeSheet, atRow, position)
      };
    }),

  deleteRow: (atRow) =>
    set((state) => {
      if (!state.activeSheet) return state;
      return {
        activeSheet: deleteRowOp(state.activeSheet, atRow)
      };
    }),

  insertColumn: (atCol, position = 'before') =>
    set((state) => {
      if (!state.activeSheet) return state;
      return {
        activeSheet: insertColumnOp(state.activeSheet, atCol, position)
      };
    }),

  deleteColumn: (atCol) =>
    set((state) => {
      if (!state.activeSheet) return state;
      return {
        activeSheet: deleteColumnOp(state.activeSheet, atCol)
      };
    }),

  updateMetadata: (metadata) =>
    set((state) => {
      if (!state.activeSheet) return state;
      return {
        activeSheet: {
          ...state.activeSheet,
          metadata: {
            ...(state.activeSheet.metadata || {}),
            ...metadata
          }
        }
      };
    }),

  setAllCells: (cells) =>
    set((state) => {
      if (!state.activeSheet) return state;
      return {
        activeSheet: {
          ...state.activeSheet,
          cells
        }
      };
    }),

  clearSheet: () => set({ activeSheet: null, isLoading: false, zoom: 1.0 })
}));
