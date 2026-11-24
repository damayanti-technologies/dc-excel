import { create } from 'zustand';
import { Workbook } from '@/types/workbook';
import { SheetSummary } from '@/types/sheet';
import { PersistenceStatus } from '@/types/storage';
import { NamedRange, Scenario } from '@/types/analysis';

interface WorkbookState {
  currentWorkbook: Workbook | null;
  sheets: SheetSummary[];
  activeSheetId: string | null;
  saveStatus: PersistenceStatus;
  lastSavedAt: number | null;
  canUndo: boolean;
  canRedo: boolean;

  setCurrentWorkbook: (workbook: Workbook | null) => void;
  setSheets: (sheets: SheetSummary[]) => void;
  setActiveSheetId: (sheetId: string) => void;
  setSaveStatus: (saveStatus: PersistenceStatus) => void;
  setLastSavedAt: (timestamp: number) => void;
  setUndoRedoState: (canUndo: boolean, canRedo: boolean) => void;
  
  // Named Ranges
  addNamedRange: (namedRange: NamedRange) => void;
  updateNamedRange: (namedRange: NamedRange) => void;
  deleteNamedRange: (id: string) => void;

  // Scenarios
  addScenario: (scenario: Scenario) => void;
  updateScenario: (scenario: Scenario) => void;
  deleteScenario: (id: string) => void;

  reset: () => void;
}

export const useWorkbookStore = create<WorkbookState>((set) => ({
  currentWorkbook: null,
  sheets: [],
  activeSheetId: null,
  saveStatus: 'idle',
  lastSavedAt: null,
  canUndo: false,
  canRedo: false,

  setCurrentWorkbook: (currentWorkbook) =>
    set({
      currentWorkbook,
      activeSheetId: currentWorkbook?.activeSheetId ?? null,
      saveStatus: 'idle'
    }),
  setSheets: (sheets) => set({ sheets }),
  setActiveSheetId: (activeSheetId) => set({ activeSheetId }),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setLastSavedAt: (lastSavedAt) => set({ lastSavedAt }),
  setUndoRedoState: (canUndo, canRedo) => set({ canUndo, canRedo }),

  addNamedRange: (namedRange) =>
    set((state) => {
      if (!state.currentWorkbook) return state;
      const currentRanges = state.currentWorkbook.metadata?.namedRanges || [];
      return {
        currentWorkbook: {
          ...state.currentWorkbook,
          metadata: {
            ...(state.currentWorkbook.metadata || {}),
            namedRanges: [...currentRanges, namedRange],
          },
        },
      };
    }),

  updateNamedRange: (namedRange) =>
    set((state) => {
      if (!state.currentWorkbook) return state;
      const currentRanges = state.currentWorkbook.metadata?.namedRanges || [];
      return {
        currentWorkbook: {
          ...state.currentWorkbook,
          metadata: {
            ...(state.currentWorkbook.metadata || {}),
            namedRanges: currentRanges.map((nr) =>
              nr.id === namedRange.id ? namedRange : nr
            ),
          },
        },
      };
    }),

  deleteNamedRange: (id) =>
    set((state) => {
      if (!state.currentWorkbook) return state;
      const currentRanges = state.currentWorkbook.metadata?.namedRanges || [];
      return {
        currentWorkbook: {
          ...state.currentWorkbook,
          metadata: {
            ...(state.currentWorkbook.metadata || {}),
            namedRanges: currentRanges.filter((nr) => nr.id !== id),
          },
        },
      };
    }),

  addScenario: (scenario) =>
    set((state) => {
      if (!state.currentWorkbook) return state;
      const currentScenarios = state.currentWorkbook.metadata?.scenarios || [];
      return {
        currentWorkbook: {
          ...state.currentWorkbook,
          metadata: {
            ...(state.currentWorkbook.metadata || {}),
            scenarios: [...currentScenarios, scenario],
          },
        },
      };
    }),

  updateScenario: (scenario) =>
    set((state) => {
      if (!state.currentWorkbook) return state;
      const currentScenarios = state.currentWorkbook.metadata?.scenarios || [];
      return {
        currentWorkbook: {
          ...state.currentWorkbook,
          metadata: {
            ...(state.currentWorkbook.metadata || {}),
            scenarios: currentScenarios.map((sc) =>
              sc.id === scenario.id ? scenario : sc
            ),
          },
        },
      };
    }),

  deleteScenario: (id) =>
    set((state) => {
      if (!state.currentWorkbook) return state;
      const currentScenarios = state.currentWorkbook.metadata?.scenarios || [];
      return {
        currentWorkbook: {
          ...state.currentWorkbook,
          metadata: {
            ...(state.currentWorkbook.metadata || {}),
            scenarios: currentScenarios.filter((sc) => sc.id !== id),
          },
        },
      };
    }),

  reset: () =>
    set({
      currentWorkbook: null,
      sheets: [],
      activeSheetId: null,
      saveStatus: 'idle',
      lastSavedAt: null,
      canUndo: false,
      canRedo: false
    })
}));
