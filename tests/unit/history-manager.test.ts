import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HistoryManager } from '@/engine/history/history-manager';

describe('HistoryManager (Undo & Redo)', () => {
  let history: HistoryManager;

  beforeEach(() => {
    history = new HistoryManager(10);
  });

  it('starts with empty undo and redo stacks', () => {
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
    expect(history.undoDescription).toBeNull();
    expect(history.redoDescription).toBeNull();
  });

  it('records actions and allows undoing and redoing', async () => {
    let value = 'initial';

    history.pushAction({
      type: 'edit',
      description: 'Change value to updated',
      undo: () => {
        value = 'initial';
      },
      redo: () => {
        value = 'updated';
      },
    });

    expect(history.canUndo).toBe(true);
    expect(history.canRedo).toBe(false);
    expect(history.undoDescription).toBe('Change value to updated');

    // Perform undo
    const undone = await history.undo();
    expect(undone).toBe(true);
    expect(value).toBe('initial');
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(true);
    expect(history.redoDescription).toBe('Change value to updated');

    // Perform redo
    const redone = await history.redo();
    expect(redone).toBe(true);
    expect(value).toBe('updated');
    expect(history.canUndo).toBe(true);
    expect(history.canRedo).toBe(false);
  });

  it('invalidates redo stack when a new action is recorded', async () => {
    history.pushAction({
      type: 'edit1',
      description: 'First action',
      undo: () => {},
      redo: () => {},
    });

    await history.undo();
    expect(history.canRedo).toBe(true);

    history.pushAction({
      type: 'edit2',
      description: 'Second action',
      undo: () => {},
      redo: () => {},
    });

    expect(history.canRedo).toBe(false);
    expect(history.undoDescription).toBe('Second action');
  });

  it('respects maximum stack depth', () => {
    const limitedHistory = new HistoryManager(3);

    for (let i = 1; i <= 5; i++) {
      limitedHistory.pushAction({
        type: 'edit',
        description: `Action ${i}`,
        undo: () => {},
        redo: () => {},
      });
    }

    expect(limitedHistory.canUndo).toBe(true);
    // Should retain only last 3
    expect(limitedHistory.undoDescription).toBe('Action 5');
  });

  it('notifies subscribers on state changes', async () => {
    const listener = vi.fn();
    const unsub = history.subscribe(listener);

    history.pushAction({
      type: 'edit',
      description: 'Test action',
      undo: () => {},
      redo: () => {},
    });

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        canUndo: true,
        canRedo: false,
        undoDescription: 'Test action',
      })
    );

    await history.undo();
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        canUndo: false,
        canRedo: true,
        redoDescription: 'Test action',
      })
    );

    unsub();
  });

  it('clears both undo and redo stacks', async () => {
    history.pushAction({
      type: 'edit',
      description: 'Action',
      undo: () => {},
      redo: () => {},
    });

    expect(history.canUndo).toBe(true);
    history.clear();
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
    expect(history.undoDescription).toBeNull();
  });
});
