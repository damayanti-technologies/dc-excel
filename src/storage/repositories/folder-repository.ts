import { IFolderRepository } from '@/types/storage';
import { Folder } from '@/types/folder';
import { getDatabase, handleStorageOperation } from '../indexeddb/database';
import { StorageError } from '@/utils/errors';
import { Logger } from '@/utils/logger';

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
}

export const folderRepository = new FolderRepository();
