import { IFolderRepository } from '@/types/storage';
import { Folder, FolderSummary } from '@/types/folder';
import { Workbook } from '@/types/workbook';
import { getDatabase, handleStorageOperation } from '../indexeddb/database';
import { StorageError } from '@/utils/errors';
import { Logger } from '@/utils/logger';
import { workbookRepository } from './workbook-repository';

export class FolderRepository implements IFolderRepository {
  private readonly storeName = 'folders';

  public async getAll(): Promise<Folder[]> {
    try {
      const db = await getDatabase();
      const folders = (await db.getAll(this.storeName)) as Folder[];
      folders.sort((a, b) => a.name.localeCompare(b.name));
      return folders;
    } catch (err) {
      Logger.error('FolderRepository', 'Failed to retrieve folders', err);
      throw new StorageError('Unable to load folders', err);
    }
  }

  public async getAllWithCounts(): Promise<FolderSummary[]> {
    try {
      const db = await getDatabase();
      const [folders, workbooks] = await Promise.all([
        db.getAll(this.storeName) as Promise<Folder[]>,
        db.getAll('workbooks') as Promise<Workbook[]>
      ]);

      const countMap = new Map<string, number>();
      for (const wb of workbooks) {
        if (wb.folderId) {
          countMap.set(wb.folderId, (countMap.get(wb.folderId) || 0) + 1);
        }
      }

      folders.sort((a, b) => a.name.localeCompare(b.name));

      return folders.map((folder) => ({
        ...folder,
        workbookCount: countMap.get(folder.id) || 0
      }));
    } catch (err) {
      Logger.error('FolderRepository', 'Failed to load folders with counts', err);
      throw new StorageError('Unable to load folders with counts', err);
    }
  }

  public async getById(id: string): Promise<Folder | null> {
    try {
      const db = await getDatabase();
      const folder = (await db.get(this.storeName, id)) as Folder | undefined;
      return folder ?? null;
    } catch (err) {
      Logger.error('FolderRepository', `Failed to retrieve folder ${id}`, err);
      throw new StorageError(`Unable to load folder ${id}`, err);
    }
  }

  public async save(folder: Folder): Promise<void> {
    await handleStorageOperation(async () => {
      const db = await getDatabase();
      await db.put(this.storeName, folder);
      Logger.debug('FolderRepository', `Saved folder "${folder.name}" (${folder.id})`);
    });
  }

  public async rename(id: string, newName: string): Promise<void> {
    const trimmed = newName.trim();
    if (!trimmed) {
      throw new StorageError('Folder name cannot be empty');
    }

    const folder = await this.getById(id);
    if (!folder) {
      throw new StorageError(`Folder ${id} not found to rename`);
    }

    const updated: Folder = {
      ...folder,
      name: trimmed,
      updatedAt: Date.now()
    };

    await this.save(updated);
  }

  public async delete(id: string): Promise<void> {
    try {
      const db = await getDatabase();
      await db.delete(this.storeName, id);
      Logger.debug('FolderRepository', `Deleted folder ${id}`);
    } catch (err) {
      Logger.error('FolderRepository', `Failed to delete folder ${id}`, err);
      throw new StorageError(`Unable to delete folder ${id}`, err);
    }
  }

  public async deletePreservingWorkbooks(id: string): Promise<void> {
    try {
      const db = await getDatabase();
      const tx = db.transaction([this.storeName, 'workbooks'], 'readwrite');
      const workbookIndex = tx.objectStore('workbooks').index('folderId');

      let cursor = await workbookIndex.openCursor(id);
      while (cursor) {
        const wb = cursor.value as Workbook;
        await cursor.update({ ...wb, folderId: null, updatedAt: Date.now() });
        cursor = await cursor.continue();
      }

      await tx.objectStore(this.storeName).delete(id);
      await tx.done;
      Logger.info('FolderRepository', `Deleted folder ${id} while preserving workbooks to root`);
    } catch (err) {
      Logger.error('FolderRepository', `Failed to delete folder ${id} preserving workbooks`, err);
      throw new StorageError(`Unable to delete folder ${id}`, err);
    }
  }

  public async deleteWithWorkbooks(id: string): Promise<void> {
    try {
      const db = await getDatabase();
      const workbooks = (await db.getAll('workbooks')) as Workbook[];
      const toDelete = workbooks.filter((wb) => wb.folderId === id);

      // Delete each workbook and its sheets
      for (const wb of toDelete) {
        await workbookRepository.delete(wb.id);
      }

      // Delete the folder itself
      await this.delete(id);
      Logger.info('FolderRepository', `Deleted folder ${id} and ${toDelete.length} child workbooks`);
    } catch (err) {
      Logger.error('FolderRepository', `Failed to cascade delete folder ${id}`, err);
      throw new StorageError(`Unable to delete folder and workbooks ${id}`, err);
    }
  }
}

export const folderRepository = new FolderRepository();
