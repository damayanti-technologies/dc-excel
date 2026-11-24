import { create } from 'zustand';
import { historyManager } from '@/engine/history/history-manager';

interface HistoryState {
  canUndo: boolean;
  canRedo: boolean;
  undoDescription: string | null;
  redoDescription: string | null;

  undo: () => Promise<boolean>;
  redo: () => Promise<boolean>;
  clear: () => void;
  recordAction: (action: {
    type: string;
    description: string;
    undo: () => Promise<void> | void;
    redo: () => Promise<void> | void;
  }) => void;
}

export const useHistoryStore = create<HistoryState>((set) => {
  // Subscribe to HistoryManager events to keep Zustand store in sync
  historyManager.subscribe((state) => {
    set({
      canUndo: state.canUndo,
      canRedo: state.canRedo,
      undoDescription: state.undoDescription,
      redoDescription: state.redoDescription,
    });
  });

  return {
    canUndo: historyManager.canUndo,
    canRedo: historyManager.canRedo,
    undoDescription: historyManager.undoDescription,
    redoDescription: historyManager.redoDescription,

    undo: async () => {
      return historyManager.undo();
    },

    redo: async () => {
      return historyManager.redo();
    },

    clear: () => {
      historyManager.clear();
      set({
        canUndo: false,
        canRedo: false,
        undoDescription: null,
        redoDescription: null,
      });
    },

    recordAction: (action) => {
      historyManager.pushAction(action);
    },
  };
});
