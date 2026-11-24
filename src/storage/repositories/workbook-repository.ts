import { IWorkbookRepository } from '@/types/storage';
import { Workbook, WorkbookSummary } from '@/types/workbook';
import { getDatabase, handleStorageOperation } from '../indexeddb/database';
import { StorageError } from '@/utils/errors';
import { Logger } from '@/utils/logger';

export class WorkbookRepository implements IWorkbookRepository {
  private readonly storeName = 'workbooks';

  public async getAll(): Promise<WorkbookSummary[]> {
    try {
      const db = await getDatabase();
      const allWorkbooks = (await db.getAll(this.storeName)) as Workbook[];
      allWorkbooks.sort((a, b) => b.updatedAt - a.updatedAt);
      return allWorkbooks.map((wb) => this.toSummary(wb));
    } catch (err) {
      Logger.error('WorkbookRepository', 'Failed to retrieve all workbooks', err);
      throw new StorageError('Unable to load workbooks from storage', err);
    }
  }

  public async getById(id: string): Promise<Workbook | null> {
    try {
      const db = await getDatabase();
      const wb = (await db.get(this.storeName, id)) as Workbook | undefined;
      return wb ?? null;
    } catch (err) {
      Logger.error('WorkbookRepository', `Failed to load workbook with id ${id}`, err);
      throw new StorageError(`Unable to load workbook ${id}`, err);
    }
  }

  public async save(workbook: Workbook): Promise<void> {
    await handleStorageOperation(async () => {
      const db = await getDatabase();
      const tx = db.transaction(this.storeName, 'readwrite');
      await tx.store.put(workbook);
      await tx.done;
      Logger.debug('WorkbookRepository', `Saved workbook "${workbook.name}" (${workbook.id})`);
    });
  }

  public async delete(id: string): Promise<void> {
    try {
      const db = await getDatabase();
      const tx = db.transaction([this.storeName, 'sheets'], 'readwrite');

      // Delete the workbook
      await tx.objectStore(this.storeName).delete(id);

      // Clean up child sheets belonging to this workbook
      const sheetIndex = tx.objectStore('sheets').index('workbookId');
      let cursor = await sheetIndex.openCursor(id);
      while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
      }

      await tx.done;
      Logger.info('WorkbookRepository', `Deleted workbook and cascaded sheets for id: ${id}`);
    } catch (err) {
      Logger.error('WorkbookRepository', `Failed to delete workbook ${id}`, err);
      throw new StorageError(`Unable to delete workbook ${id}`, err);
    }
  }

  public async getByFolder(folderId: string | null): Promise<WorkbookSummary[]> {
    try {
      const db = await getDatabase();
      const all = (await db.getAll(this.storeName)) as Workbook[];
      const filtered = all.filter((wb) => (wb.folderId ?? null) === folderId);
      filtered.sort((a, b) => b.updatedAt - a.updatedAt);
      return filtered.map((wb) => this.toSummary(wb));
    } catch (err) {
      Logger.error('WorkbookRepository', `Failed to retrieve workbooks for folder ${folderId}`, err);
      throw new StorageError('Unable to retrieve workbooks by folder', err);
    }
  }

  public async toggleStar(id: string): Promise<boolean> {
    const wb = await this.getById(id);
    if (!wb) {
      throw new StorageError(`Workbook ${id} not found to toggle star`);
    }

    const nextStarred = !(wb.isStarred ?? wb.metadata?.isFavorite);
    const updated: Workbook = {
      ...wb,
      isStarred: nextStarred,
      metadata: {
        ...(wb.metadata || {}),
        isFavorite: nextStarred
      },
      updatedAt: Date.now()
    };

    await this.save(updated);
    return nextStarred;
  }

  public async rename(id: string, newName: string): Promise<void> {
    const trimmed = newName.trim();
    if (!trimmed) {
      throw new StorageError('Workbook name cannot be empty');
    }

    const wb = await this.getById(id);
    if (!wb) {
      throw new StorageError(`Workbook ${id} not found to rename`);
    }

    const updated: Workbook = {
      ...wb,
      name: trimmed,
      updatedAt: Date.now()
    };

    await this.save(updated);
  }

  public async moveToFolder(id: string, folderId: string | null): Promise<void> {
    const wb = await this.getById(id);
    if (!wb) {
      throw new StorageError(`Workbook ${id} not found to move`);
    }

    const updated: Workbook = {
      ...wb,
      folderId: folderId ?? null,
      updatedAt: Date.now()
    };

    await this.save(updated);
  }

  public async updateLastOpened(id: string): Promise<void> {
    const wb = await this.getById(id);
    if (!wb) return;

    const updated: Workbook = {
      ...wb,
      lastOpenedAt: Date.now()
    };

    await this.save(updated);
  }

  public async getStarred(): Promise<WorkbookSummary[]> {
    try {
      const all = await this.getAll();
      return all.filter((wb) => Boolean(wb.isStarred || wb.metadata?.isFavorite));
    } catch (err) {
      Logger.error('WorkbookRepository', 'Failed to retrieve starred workbooks', err);
      throw new StorageError('Unable to load starred workbooks', err);
    }
  }

  public async getRecent(limit = 20): Promise<WorkbookSummary[]> {
    try {
      const all = await this.getAll();
      // Sort by lastOpenedAt if present, otherwise by updatedAt
      all.sort((a, b) => {
        const timeA = a.lastOpenedAt || a.updatedAt;
        const timeB = b.lastOpenedAt || b.updatedAt;
        return timeB - timeA;
      });
      return all.slice(0, limit);
    } catch (err) {
      Logger.error('WorkbookRepository', 'Failed to retrieve recent workbooks', err);
      throw new StorageError('Unable to load recent workbooks', err);
    }
  }

  private toSummary(workbook: Workbook): WorkbookSummary {
    const isStarred = Boolean(workbook.isStarred ?? workbook.metadata?.isFavorite);
    return {
      id: workbook.id,
      name: workbook.name,
      createdAt: workbook.createdAt,
      updatedAt: workbook.updatedAt,
      lastOpenedAt: workbook.lastOpenedAt,
      isStarred,
      sheetCount: workbook.sheetIds.length,
      activeSheetId: workbook.activeSheetId,
      folderId: workbook.folderId ?? null,
      revision: workbook.revision,
      metadata: {
        ...(workbook.metadata || {}),
        isFavorite: isStarred
      }
    };
  }
}

export const workbookRepository = new WorkbookRepository();
