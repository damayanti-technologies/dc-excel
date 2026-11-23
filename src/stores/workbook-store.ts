import { create } from 'zustand';
import { Workbook } from '@/types/workbook';
import { SheetSummary } from '@/types/sheet';
import { PersistenceStatus } from '@/types/storage';

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
