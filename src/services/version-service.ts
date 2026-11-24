import { getDatabase, handleStorageOperation } from '@/storage/indexeddb/database';
import { Workbook } from '@/types/workbook';
import { Sheet } from '@/types/sheet';
import { WorkbookVersion } from '@/types/persistence';
import { workbookRepository } from '@/storage/repositories/workbook-repository';
import { sheetRepository } from '@/storage/repositories/sheet-repository';
import { generateId } from '@/utils/id';
import { Logger } from '@/utils/logger';

export class VersionService {
  private readonly storeName = 'versions';

  /**
   * Creates a snapshot checkpoint of a workbook and its sheets.
   */
  public async createVersion(
    workbook: Workbook,
    sheets: Sheet[],
    label: string,
    description?: string,
    isManual = false
  ): Promise<WorkbookVersion> {
    return handleStorageOperation(async () => {
      const db = await getDatabase();
      const versionId = generateId('ver');

      // Deep clone snapshot to prevent mutations
      const wbSnapshot = JSON.parse(JSON.stringify(workbook)) as Workbook;
      const sheetsSnapshot = JSON.parse(JSON.stringify(sheets)) as Sheet[];

      const jsonStr = JSON.stringify({ wbSnapshot, sheetsSnapshot });
      const sizeBytes = new Blob([jsonStr]).size;

      const version: WorkbookVersion = {
        id: versionId,
        workbookId: workbook.id,
        revision: workbook.revision || 1,
        label: label.trim() || 'Checkpoint',
        description: description?.trim(),
        createdAt: Date.now(),
        sizeBytes,
        isManual,
        workbookSnapshot: wbSnapshot,
        sheetsSnapshot: sheetsSnapshot,
      };

      const tx = db.transaction(this.storeName, 'readwrite');
      await tx.store.put(version);
      await tx.done;

      Logger.info('VersionService', `Created ${isManual ? 'manual' : 'auto'} version checkpoint "${version.label}" (${version.id}) for workbook ${workbook.id}`);
      return version;
    });
  }

  /**
   * Retrieves all historical versions of a workbook, sorted newest first.
   */
  public async getVersions(workbookId: string): Promise<WorkbookVersion[]> {
    try {
      const db = await getDatabase();
      const index = db.transaction(this.storeName).store.index('workbookId');
      const versions = (await index.getAll(workbookId)) as WorkbookVersion[];
      versions.sort((a, b) => b.createdAt - a.createdAt);
      return versions;
    } catch (err) {
      Logger.error('VersionService', `Failed to load versions for workbook ${workbookId}`, err);
      return [];
    }
  }

  /**
   * Retrieves a specific version checkpoint by ID.
   */
  public async getVersionById(versionId: string): Promise<WorkbookVersion | null> {
    try {
      const db = await getDatabase();
      const version = (await db.get(this.storeName, versionId)) as WorkbookVersion | undefined;
      return version ?? null;
    } catch (err) {
      Logger.error('VersionService', `Failed to load version ${versionId}`, err);
      return null;
    }
  }

  /**
   * Restores an earlier version snapshot.
   * Creates a safety auto-checkpoint before replacing current state.
   */
  public async restoreVersion(
    versionId: string,
    currentWorkbook: Workbook,
    currentSheets: Sheet[]
  ): Promise<{ workbook: Workbook; sheets: Sheet[] }> {
    const targetVersion = await this.getVersionById(versionId);
    if (!targetVersion) {
      throw new Error(`Version checkpoint ${versionId} was not found.`);
    }

    // 1. Safety auto-checkpoint of the current state before restoring
    await this.createVersion(
      currentWorkbook,
      currentSheets,
      `Pre-restore safety backup (before restoring "${targetVersion.label}")`,
      `Created automatically prior to restoring version ${versionId}`,
      false
    );

    // 2. Prepare restored entities with updated timestamp and incremented revision
    const newRevision = (currentWorkbook.revision || 1) + 1;
    const restoredWorkbook: Workbook = {
      ...targetVersion.workbookSnapshot,
      updatedAt: Date.now(),
      lastOpenedAt: Date.now(),
      revision: newRevision,
    };

    const restoredSheets: Sheet[] = targetVersion.sheetsSnapshot.map((s) => ({
      ...s,
      workbookId: currentWorkbook.id,
    }));

    // 3. Persist restored state in IndexedDB
    await workbookRepository.save(restoredWorkbook);
    await sheetRepository.saveMany(restoredSheets);

    Logger.info('VersionService', `Restored version "${targetVersion.label}" (${versionId}) to workbook ${currentWorkbook.id}`);

    return {
      workbook: restoredWorkbook,
      sheets: restoredSheets,
    };
  }

  /**
   * Deletes a specific version checkpoint.
   */
  public async deleteVersion(versionId: string): Promise<void> {
    await handleStorageOperation(async () => {
      const db = await getDatabase();
      await db.delete(this.storeName, versionId);
      Logger.info('VersionService', `Deleted version checkpoint ${versionId}`);
    });
  }

  /**
   * Deletes all historical version checkpoints for a workbook.
   */
  public async deleteAllVersions(workbookId: string): Promise<void> {
    await handleStorageOperation(async () => {
      const db = await getDatabase();
      const tx = db.transaction(this.storeName, 'readwrite');
      const index = tx.store.index('workbookId');
      let cursor = await index.openCursor(workbookId);
      while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
      }
      await tx.done;
      Logger.info('VersionService', `Deleted all version checkpoints for workbook ${workbookId}`);
    });
  }

  /**
   * Prunes old automatic checkpoints exceeding retention limit, keeping manual checkpoints.
   */
  public async pruneOldVersions(workbookId: string, maxAutoKeep = 25): Promise<number> {
    const versions = await this.getVersions(workbookId);
    const autoVersions = versions.filter((v) => !v.isManual);

    if (autoVersions.length <= maxAutoKeep) return 0;

    const toDelete = autoVersions.slice(maxAutoKeep);
    for (const v of toDelete) {
      await this.deleteVersion(v.id);
    }
    return toDelete.length;
  }
}

export const versionService = new VersionService();
