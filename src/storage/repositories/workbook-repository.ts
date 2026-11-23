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
      
      // Sort by updatedAt descending
      allWorkbooks.sort((a, b) => b.updatedAt - a.updatedAt);

      return allWorkbooks.map(wb => this.toSummary(wb));
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

      // Also clean up sheets belonging to this workbook
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
      const filtered = all.filter(wb => (wb.folderId ?? null) === folderId);
      filtered.sort((a, b) => b.updatedAt - a.updatedAt);
      return filtered.map(wb => this.toSummary(wb));
    } catch (err) {
      Logger.error('WorkbookRepository', `Failed to retrieve workbooks for folder ${folderId}`, err);
      throw new StorageError('Unable to retrieve workbooks by folder', err);
    }
  }

  private toSummary(workbook: Workbook): WorkbookSummary {
    return {
      id: workbook.id,
      name: workbook.name,
      createdAt: workbook.createdAt,
      updatedAt: workbook.updatedAt,
      sheetCount: workbook.sheetIds.length,
      activeSheetId: workbook.activeSheetId,
      folderId: workbook.folderId ?? null,
      metadata: workbook.metadata
    };
  }
}

export const workbookRepository = new WorkbookRepository();
