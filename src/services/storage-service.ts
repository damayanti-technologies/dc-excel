import { getDatabase, getStorageQuota, handleStorageOperation } from '@/storage/indexeddb/database';
import { StorageBreakdown, DataIntegrityReport } from '@/types/persistence';
import { Workbook } from '@/types/workbook';
import { Sheet } from '@/types/sheet';
import { WorkbookVersion, CrashRecoveryRecord } from '@/types/persistence';
import { Logger } from '@/utils/logger';

export class StorageService {
  /**
   * Retrieves a comprehensive storage breakdown across IndexedDB stores.
   */
  public async getStorageBreakdown(): Promise<StorageBreakdown> {
    const quotaInfo = await getStorageQuota();

    try {
      const db = await getDatabase();

      const workbooks = (await db.getAll('workbooks')) as Workbook[];
      const sheets = (await db.getAll('sheets')) as Sheet[];
      const versions = db.objectStoreNames.contains('versions')
        ? ((await db.getAll('versions')) as WorkbookVersion[])
        : [];
      const recovery = db.objectStoreNames.contains('recovery')
        ? ((await db.getAll('recovery')) as CrashRecoveryRecord[])
        : [];
      const backups = db.objectStoreNames.contains('backups')
        ? await db.getAll('backups')
        : [];

      let versionSizeBytes = 0;
      for (const v of versions) {
        versionSizeBytes += v.sizeBytes || 0;
      }

      return {
        usageBytes: quotaInfo.usageBytes,
        quotaBytes: quotaInfo.quotaBytes,
        percentageUsed: quotaInfo.percentageUsed,
        workbookCount: workbooks.length,
        sheetCount: sheets.length,
        versionCount: versions.length,
        versionSizeBytes,
        recoveryCount: recovery.length,
        backupCount: backups.length,
      };
    } catch (err) {
      Logger.error('StorageService', 'Failed to calculate storage breakdown', err);
      return {
        usageBytes: quotaInfo.usageBytes,
        quotaBytes: quotaInfo.quotaBytes,
        percentageUsed: quotaInfo.percentageUsed,
        workbookCount: 0,
        sheetCount: 0,
        versionCount: 0,
        versionSizeBytes: 0,
        recoveryCount: 0,
        backupCount: 0,
      };
    }
  }

  /**
   * Cleans all temporary crash recovery checkpoints.
   */
  public async cleanupRecoveryCheckpoints(): Promise<number> {
    return handleStorageOperation(async () => {
      const db = await getDatabase();
      if (!db.objectStoreNames.contains('recovery')) return 0;

      const tx = db.transaction('recovery', 'readwrite');
      const count = await tx.store.count();
      await tx.store.clear();
      await tx.done;
      Logger.info('StorageService', `Cleaned ${count} crash recovery checkpoints`);
      return count;
    });
  }

  /**
   * Cleans automatic version checkpoints older than specified days.
   */
  public async cleanupOldVersions(daysOld = 7): Promise<number> {
    return handleStorageOperation(async () => {
      const db = await getDatabase();
      if (!db.objectStoreNames.contains('versions')) return 0;

      const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;
      const tx = db.transaction('versions', 'readwrite');
      let cursor = await tx.store.openCursor();
      let deletedCount = 0;

      while (cursor) {
        const version = cursor.value as WorkbookVersion;
        // Keep manual checkpoints, only clean auto checkpoints older than cutoff
        if (!version.isManual && version.createdAt < cutoffTime) {
          await cursor.delete();
          deletedCount++;
        }
        cursor = await cursor.continue();
      }

      await tx.done;
      Logger.info('StorageService', `Cleaned ${deletedCount} versions older than ${daysOld} days`);
      return deletedCount;
    });
  }

  /**
   * Clears all historical version checkpoints across all workbooks.
   */
  public async cleanupAllVersions(): Promise<number> {
    return handleStorageOperation(async () => {
      const db = await getDatabase();
      if (!db.objectStoreNames.contains('versions')) return 0;

      const tx = db.transaction('versions', 'readwrite');
      const count = await tx.store.count();
      await tx.store.clear();
      await tx.done;
      Logger.info('StorageService', `Cleared all ${count} version checkpoints`);
      return count;
    });
  }

  /**
   * Cleans up orphaned sheets whose workbook no longer exists in IndexedDB.
   */
  public async cleanupOrphanedSheets(): Promise<number> {
    return handleStorageOperation(async () => {
      const db = await getDatabase();
      const workbooks = (await db.getAll('workbooks')) as Workbook[];
      const sheets = (await db.getAll('sheets')) as Sheet[];

      const wbIdSet = new Set(workbooks.map((w) => w.id));
      const orphans = sheets.filter((s) => !wbIdSet.has(s.workbookId));

      if (orphans.length === 0) return 0;

      const tx = db.transaction('sheets', 'readwrite');
      for (const orphan of orphans) {
        await tx.store.delete(orphan.id);
      }
      await tx.done;

      Logger.info('StorageService', `Cleaned ${orphans.length} orphaned sheets`);
      return orphans.length;
    });
  }

  /**
   * Performs an integrity check on stored workbooks and sheets.
   */
  public async checkDataIntegrity(): Promise<DataIntegrityReport> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const orphanedSheets: string[] = [];
    const missingSheets: string[] = [];
    const invalidCoordinates: string[] = [];

    try {
      const db = await getDatabase();
      const workbooks = (await db.getAll('workbooks')) as Workbook[];
      const sheets = (await db.getAll('sheets')) as Sheet[];

      const wbIdSet = new Set(workbooks.map((w) => w.id));
      const sheetIdSet = new Set(sheets.map((s) => s.id));

      // 1. Check for orphaned sheets (sheets whose workbook does not exist)
      for (const s of sheets) {
        if (!wbIdSet.has(s.workbookId)) {
          orphanedSheets.push(s.id);
          errors.push(`Sheet "${s.name}" (${s.id}) references non-existent workbook ${s.workbookId}.`);
        }

        // Validate cell coordinate keys
        for (const key of Object.keys(s.cells || {})) {
          if (!/^\d+:\d+$/.test(key)) {
            invalidCoordinates.push(`${s.name}:${key}`);
            warnings.push(`Sheet "${s.name}" has invalid cell coordinate key "${key}".`);
          }
        }
      }

      // 2. Check for missing sheet references in workbooks
      for (const wb of workbooks) {
        for (const sId of wb.sheetIds) {
          if (!sheetIdSet.has(sId)) {
            missingSheets.push(sId);
            errors.push(`Workbook "${wb.name}" references non-existent sheet ID ${sId}.`);
          }
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        orphanedSheets,
        missingSheets,
        invalidCoordinates,
      };
    } catch (err: any) {
      Logger.error('StorageService', 'Integrity check failed', err);
      return {
        isValid: false,
        errors: [err?.message || 'Failed to inspect database integrity.'],
        warnings: [],
        orphanedSheets: [],
        missingSheets: [],
        invalidCoordinates: [],
      };
    }
  }
}

export const storageService = new StorageService();
