import { generateId } from '@/utils/id';
import { Logger } from '@/utils/logger';

export interface HistoryAction {
  id: string;
  type: string;
  description: string;
  timestamp: number;
  undo: () => Promise<void> | void;
  redo: () => Promise<void> | void;
}

export type HistoryListener = (state: {
  canUndo: boolean;
  canRedo: boolean;
  undoDescription: string | null;
  redoDescription: string | null;
}) => void;

export class HistoryManager {
  private undoStack: HistoryAction[] = [];
  private redoStack: HistoryAction[] = [];
  private isExecuting = false;
  private maxDepth = 80;
  private listeners: Set<HistoryListener> = new Set();

  constructor(maxDepth = 80) {
    this.maxDepth = maxDepth;
  }

  /**
   * Pushes a reversible action onto the undo stack.
   * Clears the redo stack.
   */
  public pushAction(action: {
    type: string;
    description: string;
    undo: () => Promise<void> | void;
    redo: () => Promise<void> | void;
  }): void {
    if (this.isExecuting) return;

    const fullAction: HistoryAction = {
      id: generateId('hist'),
      type: action.type,
      description: action.description,
      timestamp: Date.now(),
      undo: action.undo,
      redo: action.redo,
    };

    this.undoStack.push(fullAction);
    if (this.undoStack.length > this.maxDepth) {
      this.undoStack.shift();
    }

    // A new edit invalidates previously undone actions
    this.redoStack = [];
    this.notify();
    Logger.debug('HistoryManager', `Action recorded: "${action.description}" (${this.undoStack.length} in stack)`);
  }

  /**
   * Executes the most recent action's undo callback.
   */
  public async undo(): Promise<boolean> {
    if (this.isExecuting || this.undoStack.length === 0) return false;

    const action = this.undoStack.pop()!;
    this.isExecuting = true;

    try {
      Logger.info('HistoryManager', `Undoing: "${action.description}"`);
      await action.undo();
      this.redoStack.push(action);
      return true;
    } catch (err) {
      Logger.error('HistoryManager', `Failed to undo action "${action.description}"`, err);
      // Put back on undo stack on failure
      this.undoStack.push(action);
      throw err;
    } finally {
      this.isExecuting = false;
      this.notify();
    }
  }

  /**
   * Re-executes the most recently undone action.
   */
  public async redo(): Promise<boolean> {
    if (this.isExecuting || this.redoStack.length === 0) return false;

    const action = this.redoStack.pop()!;
    this.isExecuting = true;

    try {
      Logger.info('HistoryManager', `Redoing: "${action.description}"`);
      await action.redo();
      this.undoStack.push(action);
      return true;
    } catch (err) {
      Logger.error('HistoryManager', `Failed to redo action "${action.description}"`, err);
      this.redoStack.push(action);
      throw err;
    } finally {
      this.isExecuting = false;
      this.notify();
    }
  }

  public get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public get undoDescription(): string | null {
    if (this.undoStack.length === 0) return null;
    return this.undoStack[this.undoStack.length - 1]?.description ?? null;
  }

  public get redoDescription(): string | null {
    if (this.redoStack.length === 0) return null;
    return this.redoStack[this.redoStack.length - 1]?.description ?? null;
  }

  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.isExecuting = false;
    this.notify();
    Logger.debug('HistoryManager', 'History cleared');
  }

  public subscribe(listener: HistoryListener): () => void {
    this.listeners.add(listener);
    listener({
      canUndo: this.canUndo,
      canRedo: this.canRedo,
      undoDescription: this.undoDescription,
      redoDescription: this.redoDescription,
    });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const state = {
      canUndo: this.canUndo,
      canRedo: this.canRedo,
      undoDescription: this.undoDescription,
      redoDescription: this.redoDescription,
    };
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch {
        // Ignore subscriber error
      }
    }
  }
}

export const historyManager = new HistoryManager();
