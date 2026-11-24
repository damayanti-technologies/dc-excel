/* global BroadcastChannel, MessageEvent */
import { MultiTabMessage } from '@/types/persistence';
import { generateId } from '@/utils/id';
import { Logger } from '@/utils/logger';

export type ConflictListener = (message: MultiTabMessage) => void;

export class MultiTabService {
  private channel: BroadcastChannel | null = null;
  private tabId: string;
  private currentWorkbookId: string | null = null;
  private currentRevision = 1;
  private listeners: Set<ConflictListener> = new Set();

  constructor() {
    this.tabId = generateId('tab');

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('omnisheet_multi_tab');
        this.channel.onmessage = (event: MessageEvent<MultiTabMessage>) => {
          this.handleIncomingMessage(event.data);
        };
      } catch (err) {
        Logger.warn('MultiTabService', 'BroadcastChannel not available', err);
      }
    }
  }

  public registerActiveWorkbook(workbookId: string, revision = 1): void {
    this.currentWorkbookId = workbookId;
    this.currentRevision = revision;

    this.postMessage({
      type: 'tab_opened',
      tabId: this.tabId,
      workbookId,
      revision,
      timestamp: Date.now(),
    });
  }

  public notifyWorkbookSaved(workbookId: string, revision: number): void {
    this.currentRevision = revision;
    this.postMessage({
      type: 'workbook_saved',
      tabId: this.tabId,
      workbookId,
      revision,
      timestamp: Date.now(),
    });
  }

  public updateCurrentRevision(revision: number): void {
    this.currentRevision = revision;
  }

  public onConflict(listener: ConflictListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private postMessage(msg: MultiTabMessage): void {
    if (this.channel) {
      try {
        this.channel.postMessage(msg);
      } catch {
        // Ignore broadcast errors
      }
    }
  }

  private handleIncomingMessage(msg: MultiTabMessage): void {
    if (!msg || msg.tabId === this.tabId) return;

    // Check if the message is for the workbook open in this tab
    if (
      this.currentWorkbookId &&
      msg.workbookId === this.currentWorkbookId &&
      msg.type === 'workbook_saved'
    ) {
      Logger.warn(
        'MultiTabService',
        `External tab saved workbook ${msg.workbookId} at revision ${msg.revision} (local revision: ${this.currentRevision})`
      );

      for (const listener of this.listeners) {
        try {
          listener(msg);
        } catch {
          // Ignore listener error
        }
      }
    }
  }

  public close(): void {
    if (this.channel) {
      if (this.currentWorkbookId) {
        this.postMessage({
          type: 'tab_closed',
          tabId: this.tabId,
          workbookId: this.currentWorkbookId,
          revision: this.currentRevision,
          timestamp: Date.now(),
        });
      }
      this.channel.close();
      this.channel = null;
    }
    this.listeners.clear();
  }
}

export const multiTabService = new MultiTabService();
