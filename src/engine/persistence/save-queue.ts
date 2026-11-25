import { Workbook } from '@/types/workbook';
import { Sheet } from '@/types/sheet';
import { SaveStatus } from '@/types/persistence';
import { workbookRepository } from '@/storage/repositories/workbook-repository';
import { sheetRepository } from '@/storage/repositories/sheet-repository';
import { recoveryService } from '@/services/recovery-service';
import { Logger } from '@/utils/logger';

export type SaveStatusListener = (state: {
  status: SaveStatus;
  lastSavedAt: number | null;
  errorMessage: string | null;
  revision: number;
}) => void;

export interface SaveQueueOptions {
  debounceMs?: number;
  onCrashRecoverySave?: (workbook: Workbook, sheets: Sheet[]) => Promise<void>;
  onSaveSuccess?: (workbook: Workbook, revision: number) => void;
}

export class SaveQueue {
  private status: SaveStatus = 'idle';
  private lastSavedAt: number | null = null;
  private errorMessage: string | null = null;
  private currentRevision = 1;

  private pendingWorkbook: Workbook | null = null;
  private pendingSheets: Sheet[] = [];
  private enqueuedGeneration = 0;
  private isPaused = false;
  private debounceTimer: any = null;
  private debounceMs = 600;
  private isProcessing = false;
  private onCrashRecoverySave?: (workbook: Workbook, sheets: Sheet[]) => Promise<void>;
  private onSaveSuccess?: (workbook: Workbook, revision: number) => void;

  private listeners: Set<SaveStatusListener> = new Set();

  constructor(options: SaveQueueOptions = {}) {
    this.debounceMs = options.debounceMs ?? 600;
    this.onCrashRecoverySave = options.onCrashRecoverySave;
    this.onSaveSuccess = options.onSaveSuccess;
  }

  public setOnSaveSuccess(cb: (workbook: Workbook, revision: number) => void): void {
    this.onSaveSuccess = cb;
  }

  /**
   * Pauses the save queue (e.g. during a multi-tab conflict).
   */
  public pause(): void {
    this.isPaused = true;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * Resumes the save queue.
   */
  public resume(): void {
    this.isPaused = false;
    if (this.pendingWorkbook || this.pendingSheets.length > 0) {
      void this.flush();
    }
  }

  public get isSavePaused(): boolean {
    return this.isPaused;
  }

  /**
   * Enqueues workbook and sheet updates for persistent IndexedDB storage.
   */
  public enqueue(
    workbook: Workbook,
    sheets: Sheet[],
    immediate = false
  ): void {
    this.enqueuedGeneration++;
    this.pendingWorkbook = {
      ...workbook,
      revision: (workbook.revision || this.currentRevision) + 1,
      updatedAt: Date.now(),
    };
    this.pendingSheets = [...sheets];

    this.status = 'dirty';
    this.errorMessage = null;
    this.notify();

    // Trigger background recovery checkpoint
    void recoveryService.saveCheckpoint(this.pendingWorkbook, this.pendingSheets);

    if (this.onCrashRecoverySave) {
      void this.onCrashRecoverySave(this.pendingWorkbook, this.pendingSheets);
    }

    if (this.isPaused) {
      return;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (immediate) {
      void this.flush();
    } else {
      this.debounceTimer = setTimeout(() => {
        void this.flush();
      }, this.debounceMs);
    }
  }

  /**
   * Immediately processes and flushes pending writes to IndexedDB.
   */
  public async flush(): Promise<boolean> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.isPaused) {
      return false;
    }

    if (!this.pendingWorkbook && this.pendingSheets.length === 0) {
      return true;
    }

    if (this.isProcessing) {
      // Re-schedule flush shortly if already in-flight
      return new Promise((resolve) => {
        setTimeout(async () => {
          resolve(await this.flush());
        }, 100);
      });
    }

    const currentGeneration = this.enqueuedGeneration;
    const wbToSave = this.pendingWorkbook;
    const sheetsToSave = [...this.pendingSheets];

    this.isProcessing = true;
    this.status = 'saving';
    this.notify();

    try {
      if (wbToSave) {
        await workbookRepository.save(wbToSave);
        this.currentRevision = wbToSave.revision || this.currentRevision + 1;
      }

      if (sheetsToSave.length > 0) {
        await sheetRepository.saveMany(sheetsToSave);
      }

      // If no new pending edits arrived while saving, mark clean
      if (this.enqueuedGeneration === currentGeneration) {
        this.pendingWorkbook = null;
        this.pendingSheets = [];
        this.status = 'saved';
        this.lastSavedAt = Date.now();
        this.errorMessage = null;
      } else {
        // Newer edits were enqueued during save! Keep dirty and schedule next flush
        this.status = 'dirty';
        if (!this.isPaused) {
          setTimeout(() => void this.flush(), 50);
        }
      }

      // Clean recovery record on successful persistence
      if (wbToSave) {
        void recoveryService.discardRecovery(wbToSave.id);
      }

      // Broadcast save success (for multi-tab synchronization)
      if (this.onSaveSuccess && wbToSave) {
        try {
          this.onSaveSuccess(wbToSave, this.currentRevision);
        } catch (err) {
          Logger.warn('SaveQueue', 'onSaveSuccess broadcast callback error', err);
        }
      }

      this.notify();

      Logger.info('SaveQueue', `Workbook "${wbToSave?.name || 'active'}" persisted at revision ${this.currentRevision}`);
      return true;
    } catch (err: any) {
      this.status = 'error';
      this.errorMessage = err?.message || 'Failed to persist workbook to local IndexedDB.';
      this.notify();
      Logger.error('SaveQueue', 'Persistence failed', err);
      return false;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Manually retries the last failed save.
   */
  public async retry(): Promise<boolean> {
    if (this.status === 'error') {
      return this.flush();
    }
    return true;
  }

  public get currentStatus(): SaveStatus {
    return this.status;
  }

  public get isDirty(): boolean {
    return this.status === 'dirty' || Boolean(this.pendingWorkbook) || this.pendingSheets.length > 0;
  }

  public get currentRevisionNumber(): number {
    return this.currentRevision;
  }

  public get lastSaveTime(): number | null {
    return this.lastSavedAt;
  }

  public get lastErrorMessage(): string | null {
    return this.errorMessage;
  }

  public setRevision(revision: number): void {
    this.currentRevision = revision;
    this.notify();
  }

  public reset(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.pendingWorkbook = null;
    this.pendingSheets = [];
    this.status = 'idle';
    this.lastSavedAt = null;
    this.errorMessage = null;
    this.isProcessing = false;
    this.notify();
  }

  public subscribe(listener: SaveStatusListener): () => void {
    this.listeners.add(listener);
    listener({
      status: this.status,
      lastSavedAt: this.lastSavedAt,
      errorMessage: this.errorMessage,
      revision: this.currentRevision,
    });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const state = {
      status: this.status,
      lastSavedAt: this.lastSavedAt,
      errorMessage: this.errorMessage,
      revision: this.currentRevision,
    };
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch {
        // Ignore subscriber errors
      }
    }
  }
}

export const saveQueue = new SaveQueue();
