import { ISheetRepository } from '@/types/storage';
import { Sheet, SheetSummary } from '@/types/sheet';
import { getDatabase, handleStorageOperation } from '../indexeddb/database';
import { StorageError } from '@/utils/errors';
import { Logger } from '@/utils/logger';

export class SheetRepository implements ISheetRepository {
  private readonly storeName = 'sheets';

  public async getByWorkbookId(workbookId: string): Promise<Sheet[]> {
    try {
      const db = await getDatabase();
      const index = db.transaction(this.storeName).store.index('workbookId');
      const sheets = (await index.getAll(workbookId)) as Sheet[];
      sheets.sort((a, b) => a.index - b.index);
      return sheets;
    } catch (err) {
      Logger.error('SheetRepository', `Failed to load sheets for workbook ${workbookId}`, err);
      throw new StorageError(`Unable to load sheets for workbook ${workbookId}`, err);
    }
  }

  public async getSummariesByWorkbookId(workbookId: string): Promise<SheetSummary[]> {
    const sheets = await this.getByWorkbookId(workbookId);
    return sheets.map(s => ({
      id: s.id,
      workbookId: s.workbookId,
      name: s.name,
      index: s.index,
      rowCount: s.rowCount,
      columnCount: s.columnCount,
      cellCount: Object.keys(s.cells || {}).length,
      metadata: s.metadata
    }));
  }

  public async getById(id: string): Promise<Sheet | null> {
    try {
      const db = await getDatabase();
      const sheet = (await db.get(this.storeName, id)) as Sheet | undefined;
      return sheet ?? null;
    } catch (err) {
      Logger.error('SheetRepository', `Failed to get sheet ${id}`, err);
      throw new StorageError(`Unable to get sheet ${id}`, err);
    }
  }

  public async save(sheet: Sheet): Promise<void> {
    await handleStorageOperation(async () => {
      const db = await getDatabase();
      const tx = db.transaction(this.storeName, 'readwrite');
      await tx.store.put(sheet);
      await tx.done;
      Logger.debug('SheetRepository', `Saved sheet "${sheet.name}" (${sheet.id})`);
    });
  }

  public async saveMany(sheets: Sheet[]): Promise<void> {
    if (sheets.length === 0) return;
    await handleStorageOperation(async () => {
      const db = await getDatabase();
      const tx = db.transaction(this.storeName, 'readwrite');
      for (const sheet of sheets) {
        await tx.store.put(sheet);
      }
      await tx.done;
      Logger.debug('SheetRepository', `Saved batch of ${sheets.length} sheets`);
    });
  }

  public async delete(id: string): Promise<void> {
    try {
      const db = await getDatabase();
      await db.delete(this.storeName, id);
      Logger.debug('SheetRepository', `Deleted sheet ${id}`);
    } catch (err) {
      Logger.error('SheetRepository', `Failed to delete sheet ${id}`, err);
      throw new StorageError(`Unable to delete sheet ${id}`, err);
    }
  }

  public async deleteByWorkbookId(workbookId: string): Promise<void> {
    try {
      const db = await getDatabase();
      const tx = db.transaction(this.storeName, 'readwrite');
      const index = tx.store.index('workbookId');
      let cursor = await index.openCursor(workbookId);
      while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
      }
      await tx.done;
      Logger.debug('SheetRepository', `Deleted all sheets for workbook ${workbookId}`);
    } catch (err) {
      Logger.error('SheetRepository', `Failed to delete sheets for workbook ${workbookId}`, err);
      throw new StorageError(`Unable to delete sheets for workbook ${workbookId}`, err);
    }
  }
}

export const sheetRepository = new SheetRepository();
