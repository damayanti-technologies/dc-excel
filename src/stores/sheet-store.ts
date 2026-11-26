import { create } from 'zustand';
import { Sheet } from '@/types/sheet';
import { Cell, CellCoordinates } from '@/types/cell';
import { coordToKey } from '@/utils/coordinates';
import {
  ConditionalFormatRule,
  RowGroup,
  SubtotalConfig,
  PivotTableConfig,
} from '@/types/analysis';
import { ChartConfig } from '@/types/chart';
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
  setGridDimensions: (rowCount: number, columnCount: number) => void;
  setRowHeight: (row: number, height: number) => void;
  setColumnWidth: (col: number, width: number) => void;
  insertRow: (atRow: number, position?: 'above' | 'below') => void;
  deleteRow: (atRow: number) => void;
  insertColumn: (atCol: number, position?: 'before' | 'after') => void;
  deleteColumn: (atCol: number) => void;
  updateMetadata: (metadata: Partial<import('@/types/sheet').SheetMetadata>) => void;
  setAllCells: (cells: import('@/types/cell').SparseCellMap) => void;

  // Analysis state actions
  addConditionalFormat: (rule: ConditionalFormatRule) => void;
  updateConditionalFormat: (rule: ConditionalFormatRule) => void;
  deleteConditionalFormat: (ruleId: string) => void;
  reorderConditionalFormats: (rules: ConditionalFormatRule[]) => void;
  setRowGroups: (groups: RowGroup[]) => void;
  toggleRowGroupCollapse: (groupIndex: number) => void;
  setSubtotals: (subtotals: SubtotalConfig | undefined) => void;
  addPivotTable: (pivot: PivotTableConfig) => void;
  updatePivotTable: (pivot: PivotTableConfig) => void;
  deletePivotTable: (id: string) => void;

  // Chart actions (Stage 11)
  addChart: (chart: ChartConfig) => void;
  updateChart: (chartId: string, updates: Partial<ChartConfig>) => void;
  deleteChart: (chartId: string) => void;
  duplicateChart: (chartId: string) => void;
  bringChartForward: (chartId: string) => void;
  sendChartBackward: (chartId: string) => void;

  clearSheet: () => void;
}

export const useSheetStore = create<SheetState>((set) => ({
  activeSheet: null,
  isLoading: false,
  zoom: 1.0,

  setActiveSheet: (activeSheet) => {
    if (!activeSheet) {
      set({ activeSheet: null, isLoading: false, zoom: 1.0 });
      return;
    }
    const rowCount = Math.max(activeSheet.rowCount || 50000, 50000);
    const columnCount = Math.max(activeSheet.columnCount || 100, 100);
    set({
      activeSheet: {
        ...activeSheet,
        rowCount,
        columnCount
      },
      isLoading: false,
      zoom: activeSheet?.metadata?.zoom || 1.0
    });
  },

  setLoading: (isLoading) => set({ isLoading }),

  setZoom: (zoom) =>
    set((state) => {
      // Normalize: if passed as percentage > 10 (e.g. 75, 100, 150), convert to scale (0.75, 1.0, 1.5)
      const normalized = zoom > 10 ? zoom / 100 : zoom;
      const clamped = Math.max(0.25, Math.min(3.0, Math.round(normalized * 100) / 100));
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

  setGridDimensions: (rowCount, columnCount) =>
    set((state) => {
      if (!state.activeSheet) return state;
      const nextRows = Math.max(state.activeSheet.rowCount, rowCount);
      const nextCols = Math.max(state.activeSheet.columnCount, columnCount);
      if (nextRows === state.activeSheet.rowCount && nextCols === state.activeSheet.columnCount) {
        return state;
      }
      return {
        activeSheet: {
          ...state.activeSheet,
          rowCount: nextRows,
          columnCount: nextCols
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

  addConditionalFormat: (rule) =>
    set((state) => {
      if (!state.activeSheet) return state;
      const currentRules = state.activeSheet.metadata?.conditionalFormats || [];
      return {
        activeSheet: {
          ...state.activeSheet,
          metadata: {
            ...(state.activeSheet.metadata || {}),
            conditionalFormats: [...currentRules, rule],
          },
        },
      };
    }),

  updateConditionalFormat: (rule) =>
    set((state) => {
      if (!state.activeSheet) return state;
      const currentRules = state.activeSheet.metadata?.conditionalFormats || [];
      return {
        activeSheet: {
          ...state.activeSheet,
          metadata: {
            ...(state.activeSheet.metadata || {}),
            conditionalFormats: currentRules.map((r) => (r.id === rule.id ? rule : r)),
          },
        },
      };
    }),

  deleteConditionalFormat: (ruleId) =>
    set((state) => {
      if (!state.activeSheet) return state;
      const currentRules = state.activeSheet.metadata?.conditionalFormats || [];
      return {
        activeSheet: {
          ...state.activeSheet,
          metadata: {
            ...(state.activeSheet.metadata || {}),
            conditionalFormats: currentRules.filter((r) => r.id !== ruleId),
          },
        },
      };
    }),

  reorderConditionalFormats: (rules) =>
    set((state) => {
      if (!state.activeSheet) return state;
      return {
        activeSheet: {
          ...state.activeSheet,
          metadata: {
            ...(state.activeSheet.metadata || {}),
            conditionalFormats: rules,
          },
        },
      };
    }),

  setRowGroups: (groups) =>
    set((state) => {
      if (!state.activeSheet) return state;
      return {
        activeSheet: {
          ...state.activeSheet,
          metadata: {
            ...(state.activeSheet.metadata || {}),
            rowGroups: groups,
          },
        },
      };
    }),

  toggleRowGroupCollapse: (groupIndex) =>
    set((state) => {
      if (!state.activeSheet) return state;
      const currentGroups = state.activeSheet.metadata?.rowGroups || [];
      const updatedGroups = currentGroups.map((g, idx) =>
        idx === groupIndex ? { ...g, isCollapsed: !g.isCollapsed } : g
      );
      return {
        activeSheet: {
          ...state.activeSheet,
          metadata: {
            ...(state.activeSheet.metadata || {}),
            rowGroups: updatedGroups,
          },
        },
      };
    }),

  setSubtotals: (subtotals) =>
    set((state) => {
      if (!state.activeSheet) return state;
      return {
        activeSheet: {
          ...state.activeSheet,
          metadata: {
            ...(state.activeSheet.metadata || {}),
            subtotals,
          },
        },
      };
    }),

  addPivotTable: (pivot) =>
    set((state) => {
      if (!state.activeSheet) return state;
      const currentPivots = state.activeSheet.metadata?.pivotTables || [];
      return {
        activeSheet: {
          ...state.activeSheet,
          metadata: {
            ...(state.activeSheet.metadata || {}),
            pivotTables: [...currentPivots, pivot],
          },
        },
      };
    }),

  updatePivotTable: (pivot) =>
    set((state) => {
      if (!state.activeSheet) return state;
      const currentPivots = state.activeSheet.metadata?.pivotTables || [];
      return {
        activeSheet: {
          ...state.activeSheet,
          metadata: {
            ...(state.activeSheet.metadata || {}),
            pivotTables: currentPivots.map((p) => (p.id === pivot.id ? pivot : p)),
          },
        },
      };
    }),

  deletePivotTable: (id) =>
    set((state) => {
      if (!state.activeSheet) return state;
      const currentPivots = state.activeSheet.metadata?.pivotTables || [];
      return {
        activeSheet: {
          ...state.activeSheet,
          metadata: {
            ...(state.activeSheet.metadata || {}),
            pivotTables: currentPivots.filter((p) => p.id !== id),
          },
        },
      };
    }),

  // Chart Actions (Stage 11)
  addChart: (chart) =>
    set((state) => {
      if (!state.activeSheet) return state;
      const currentCharts = state.activeSheet.metadata?.charts || [];
      return {
        activeSheet: {
          ...state.activeSheet,
          metadata: {
            ...(state.activeSheet.metadata || {}),
            charts: [...currentCharts, chart],
          },
        },
      };
    }),

  updateChart: (chartId, updates) =>
    set((state) => {
      if (!state.activeSheet) return state;
      const currentCharts = state.activeSheet.metadata?.charts || [];
      return {
        activeSheet: {
          ...state.activeSheet,
          metadata: {
            ...(state.activeSheet.metadata || {}),
            charts: currentCharts.map((c) =>
              c.id === chartId ? { ...c, ...updates, updatedAt: Date.now() } : c
            ),
          },
        },
      };
    }),

  deleteChart: (chartId) =>
    set((state) => {
      if (!state.activeSheet) return state;
      const currentCharts = state.activeSheet.metadata?.charts || [];
      return {
        activeSheet: {
          ...state.activeSheet,
          metadata: {
            ...(state.activeSheet.metadata || {}),
            charts: currentCharts.filter((c) => c.id !== chartId),
          },
        },
      };
    }),

  duplicateChart: (chartId) =>
    set((state) => {
      if (!state.activeSheet) return state;
      const currentCharts = state.activeSheet.metadata?.charts || [];
      const target = currentCharts.find((c) => c.id === chartId);
      if (!target) return state;

      const maxZ = currentCharts.reduce((max, c) => Math.max(max, c.position.zIndex || 10), 10);
      const duplicate: ChartConfig = {
        ...target,
        id: `chart_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`,
        title: {
          ...target.title,
          text: `${target.title.text || 'Chart'} (Copy)`,
        },
        position: {
          ...target.position,
          offsetX: target.position.offsetX + 24,
          offsetY: target.position.offsetY + 24,
          zIndex: maxZ + 1,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      return {
        activeSheet: {
          ...state.activeSheet,
          metadata: {
            ...(state.activeSheet.metadata || {}),
            charts: [...currentCharts, duplicate],
          },
        },
      };
    }),

  bringChartForward: (chartId) =>
    set((state) => {
      if (!state.activeSheet) return state;
      const currentCharts = state.activeSheet.metadata?.charts || [];
      const maxZ = currentCharts.reduce((max, c) => Math.max(max, c.position.zIndex || 10), 10);
      return {
        activeSheet: {
          ...state.activeSheet,
          metadata: {
            ...(state.activeSheet.metadata || {}),
            charts: currentCharts.map((c) =>
              c.id === chartId
                ? {
                    ...c,
                    position: { ...c.position, zIndex: maxZ + 1 },
                    updatedAt: Date.now(),
                  }
                : c
            ),
          },
        },
      };
    }),

  sendChartBackward: (chartId) =>
    set((state) => {
      if (!state.activeSheet) return state;
      const currentCharts = state.activeSheet.metadata?.charts || [];
      const minZ = currentCharts.reduce((min, c) => Math.min(min, c.position.zIndex || 10), 10);
      return {
        activeSheet: {
          ...state.activeSheet,
          metadata: {
            ...(state.activeSheet.metadata || {}),
            charts: currentCharts.map((c) =>
              c.id === chartId
                ? {
                    ...c,
                    position: { ...c.position, zIndex: Math.max(1, minZ - 1) },
                    updatedAt: Date.now(),
                  }
                : c
            ),
          },
        },
      };
    }),

  clearSheet: () => set({ activeSheet: null, isLoading: false, zoom: 1.0 })
}));
