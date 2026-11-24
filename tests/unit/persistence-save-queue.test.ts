import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SaveQueue } from '@/engine/persistence/save-queue';
import { workbookRepository } from '@/storage/repositories/workbook-repository';
import { sheetRepository } from '@/storage/repositories/sheet-repository';
import { Workbook } from '@/types/workbook';
import { Sheet } from '@/types/sheet';

describe('SaveQueue (Persistence Serialization & Reliability)', () => {
  let queue: SaveQueue;

  const mockWorkbook: Workbook = {
    id: 'wb-test-queue',
    name: 'Queue Test',
    sheetIds: ['sheet-1'],
    activeSheetId: 'sheet-1',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    revision: 1,
  };

  const mockSheet: Sheet = {
    id: 'sheet-1',
    workbookId: 'wb-test-queue',
    name: 'Sheet1',
    index: 0,
    rowCount: 10,
    columnCount: 10,
    cells: {},
  };

  beforeEach(() => {
    vi.useFakeTimers();
    queue = new SaveQueue({ debounceMs: 200 });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('initializes in idle state at revision 1', () => {
    expect(queue.currentStatus).toBe('idle');
    expect(queue.currentRevisionNumber).toBe(1);
    expect(queue.lastSaveTime).toBeNull();
  });

  it('marks state dirty on enqueue and triggers debounced flush', async () => {
    const saveWbSpy = vi.spyOn(workbookRepository, 'save').mockResolvedValue();
    const saveSheetsSpy = vi.spyOn(sheetRepository, 'saveMany').mockResolvedValue();

    queue.enqueue(mockWorkbook, [mockSheet], false);

    expect(queue.currentStatus).toBe('dirty');
    expect(saveWbSpy).not.toHaveBeenCalled();

    // Fast-forward past debounce timer
    vi.advanceTimersByTime(250);
    await vi.runAllTimersAsync();

    expect(saveWbSpy).toHaveBeenCalled();
    expect(saveSheetsSpy).toHaveBeenCalled();
    expect(queue.currentStatus).toBe('saved');
    expect(queue.lastSaveTime).not.toBeNull();
  });

  it('performs immediate flush when immediate flag is true', async () => {
    const saveWbSpy = vi.spyOn(workbookRepository, 'save').mockResolvedValue();
    const saveSheetsSpy = vi.spyOn(sheetRepository, 'saveMany').mockResolvedValue();

    queue.enqueue(mockWorkbook, [mockSheet], true);

    await vi.runAllTimersAsync();

    expect(saveWbSpy).toHaveBeenCalled();
    expect(saveSheetsSpy).toHaveBeenCalled();
    expect(queue.currentStatus).toBe('saved');
  });

  it('increments revision numbers on each write cycle', async () => {
    vi.spyOn(workbookRepository, 'save').mockResolvedValue();
    vi.spyOn(sheetRepository, 'saveMany').mockResolvedValue();

    expect(queue.currentRevisionNumber).toBe(1);

    queue.enqueue(mockWorkbook, [mockSheet], true);
    await vi.runAllTimersAsync();

    expect(queue.currentRevisionNumber).toBe(2);

    queue.enqueue({ ...mockWorkbook, revision: 2 }, [mockSheet], true);
    await vi.runAllTimersAsync();

    expect(queue.currentRevisionNumber).toBe(3);
  });

  it('handles write failures and sets error status', async () => {
    vi.spyOn(workbookRepository, 'save').mockRejectedValue(new Error('IndexedDB QuotaExceeded'));

    queue.enqueue(mockWorkbook, [mockSheet], true);
    await vi.runAllTimersAsync();

    expect(queue.currentStatus).toBe('error');
    expect(queue.lastErrorMessage).toContain('QuotaExceeded');
  });

  it('retries successfully when retry is called after failure', async () => {
    let shouldFail = true;
    vi.spyOn(workbookRepository, 'save').mockImplementation(async () => {
      if (shouldFail) throw new Error('Temporary Lock Failure');
    });
    vi.spyOn(sheetRepository, 'saveMany').mockResolvedValue();

    queue.enqueue(mockWorkbook, [mockSheet], true);
    await vi.runAllTimersAsync();

    expect(queue.currentStatus).toBe('error');

    // Resolve condition and retry
    shouldFail = false;
    const retryResult = await queue.retry();
    await vi.runAllTimersAsync();

    expect(retryResult).toBe(true);
    expect(queue.currentStatus).toBe('saved');
  });
});
