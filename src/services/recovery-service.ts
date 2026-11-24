import { getDatabase, handleStorageOperation } from '@/storage/indexeddb/database';
import { Workbook } from '@/types/workbook';
import { Sheet } from '@/types/sheet';
import { CrashRecoveryRecord } from '@/types/persistence';
import { workbookRepository } from '@/storage/repositories/workbook-repository';
import { sheetRepository } from '@/storage/repositories/sheet-repository';
import { Logger } from '@/utils/logger';

export class RecoveryService {
  private readonly storeName = 'recovery';

  /**
   * Saves or updates a crash recovery checkpoint for an uncommitted workbook state.
   */
  public async saveCheckpoint(
    workbook: Workbook,
    sheets: Sheet[],
    pendingChangeCount = 1
  ): Promise<void> {
    await handleStorageOperation(async () => {
      const db = await getDatabase();
      const record: CrashRecoveryRecord = {
        workbookId: workbook.id,
        workbookName: workbook.name,
        revision: workbook.revision || 1,
        timestamp: Date.now(),
        pendingChangeCount,
        workbookSnapshot: JSON.parse(JSON.stringify(workbook)),
        sheetsSnapshot: JSON.parse(JSON.stringify(sheets)),
        isDirty: true,
      };

      const tx = db.transaction(this.storeName, 'readwrite');
      await tx.store.put(record);
      await tx.done;

      Logger.debug('RecoveryService', `Updated recovery checkpoint for "${workbook.name}" (${workbook.id})`);
    });
  }

  /**
   * Checks if an uncommitted crash recovery checkpoint exists for a workbook.
   */
  public async checkRecovery(workbookId: string): Promise<CrashRecoveryRecord | null> {
    try {
      const db = await getDatabase();
      const record = (await db.get(this.storeName, workbookId)) as CrashRecoveryRecord | undefined;
      if (record && record.isDirty) {
        return record;
      }
      return null;
    } catch (err) {
      Logger.error('RecoveryService', `Failed to check recovery for ${workbookId}`, err);
      return null;
    }
  }

  /**
   * Checks for any uncommitted recovery checkpoints across all workbooks.
   */
  public async getAllPendingRecoveries(): Promise<CrashRecoveryRecord[]> {
    try {
      const db = await getDatabase();
      const all = (await db.getAll(this.storeName)) as CrashRecoveryRecord[];
      return all.filter((r) => r.isDirty);
    } catch (err) {
      Logger.error('RecoveryService', 'Failed to retrieve all recovery records', err);
      return [];
    }
  }

  /**
   * Restores the recovered workbook and sheets into IndexedDB.
   */
  public async restoreRecovery(
    workbookId: string
  ): Promise<{ workbook: Workbook; sheets: Sheet[] } | null> {
    const recovery = await this.checkRecovery(workbookId);
    if (!recovery) return null;

    const restoredWb: Workbook = {
      ...recovery.workbookSnapshot,
      updatedAt: Date.now(),
      lastOpenedAt: Date.now(),
      revision: (recovery.revision || 1) + 1,
    };

    const restoredSheets: Sheet[] = recovery.sheetsSnapshot.map((s) => ({
      ...s,
      workbookId,
    }));

    // Persist to main stores
    await workbookRepository.save(restoredWb);
    await sheetRepository.saveMany(restoredSheets);

    // Clear the recovery record
    await this.discardRecovery(workbookId);

    Logger.info('RecoveryService', `Restored crash recovery state for workbook "${restoredWb.name}" (${workbookId})`);

    return {
      workbook: restoredWb,
      sheets: restoredSheets,
    };
  }

  /**
   * Discards the crash recovery checkpoint.
   */
  public async discardRecovery(workbookId: string): Promise<void> {
    await handleStorageOperation(async () => {
      const db = await getDatabase();
      await db.delete(this.storeName, workbookId);
      Logger.info('RecoveryService', `Discarded recovery checkpoint for workbook ${workbookId}`);
    });
  }

  /**
   * Clears all recovery checkpoints.
   */
  public async clearAll(): Promise<void> {
    await handleStorageOperation(async () => {
      const db = await getDatabase();
      const tx = db.transaction(this.storeName, 'readwrite');
      await tx.store.clear();
      await tx.done;
      Logger.info('RecoveryService', 'All recovery checkpoints cleared');
    });
  }
}

export const recoveryService = new RecoveryService();
