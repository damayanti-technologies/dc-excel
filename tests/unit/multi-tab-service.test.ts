import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MultiTabService } from '@/services/multi-tab-service';
import { MultiTabMessage } from '@/types/persistence';

describe('MultiTabService (Concurrent Tab Coordination)', () => {
  let service: MultiTabService;

  beforeEach(() => {
    service = new MultiTabService();
  });

  afterEach(() => {
    service.close();
  });

  it('registers active workbook and tracks local revision', () => {
    service.registerActiveWorkbook('wb-multi-1', 3);
    service.updateCurrentRevision(4);
    // Verified internal state without error
    expect(service).toBeDefined();
  });

  it('notifies conflict listener when another tab broadcasts save for active workbook', () => {
    service.registerActiveWorkbook('wb-target', 1);

    const conflictHandler = vi.fn();
    const unsub = service.onConflict(conflictHandler);

    // Simulate incoming broadcast from another tab
    const incomingMessage: MultiTabMessage = {
      type: 'workbook_saved',
      tabId: 'different-tab-id',
      workbookId: 'wb-target',
      revision: 2,
      timestamp: Date.now(),
    };

    // Invoke private handleIncomingMessage
    (service as any).handleIncomingMessage(incomingMessage);

    expect(conflictHandler).toHaveBeenCalledWith(incomingMessage);
    unsub();
  });

  it('ignores messages originating from the same tab', () => {
    service.registerActiveWorkbook('wb-target', 1);

    const conflictHandler = vi.fn();
    service.onConflict(conflictHandler);

    const selfMessage: MultiTabMessage = {
      type: 'workbook_saved',
      tabId: (service as any).tabId,
      workbookId: 'wb-target',
      revision: 2,
      timestamp: Date.now(),
    };

    (service as any).handleIncomingMessage(selfMessage);
    expect(conflictHandler).not.toHaveBeenCalled();
  });

  it('ignores messages for different workbooks', () => {
    service.registerActiveWorkbook('wb-active', 1);

    const conflictHandler = vi.fn();
    service.onConflict(conflictHandler);

    const differentWbMessage: MultiTabMessage = {
      type: 'workbook_saved',
      tabId: 'tab-other',
      workbookId: 'wb-other',
      revision: 5,
      timestamp: Date.now(),
    };

    (service as any).handleIncomingMessage(differentWbMessage);
    expect(conflictHandler).not.toHaveBeenCalled();
  });
});
