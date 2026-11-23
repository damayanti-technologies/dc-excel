import { IDBPDatabase, IDBPTransaction } from 'idb';
import { Logger } from '@/utils/logger';

export type MigrationStep = (
  db: IDBPDatabase<unknown>,
  oldVersion: number,
  newVersion: number,
  transaction?: IDBPTransaction<unknown, string[], 'versionchange'>
) => void;

export class DatabaseMigrationManager {
  private migrations: Map<number, MigrationStep> = new Map();

  constructor() {
    this.registerV1Migration();
    this.registerV2Migration();
  }

  /**
   * Version 1: Initial database schema creation.
   */
  private registerV1Migration(): void {
    this.migrations.set(1, (db) => {
      Logger.info('Storage', 'Executing database migration to Version 1 (Initial schema)');

      // Workbooks Object Store
      if (!db.objectStoreNames.contains('workbooks')) {
        const workbookStore = db.createObjectStore('workbooks', { keyPath: 'id' });
        workbookStore.createIndex('folderId', 'folderId', { unique: false });
        workbookStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        workbookStore.createIndex('name', 'name', { unique: false });
        workbookStore.createIndex('lastOpenedAt', 'lastOpenedAt', { unique: false });
        workbookStore.createIndex('isStarred', 'isStarred', { unique: false });
      }

      // Sheets Object Store
      if (!db.objectStoreNames.contains('sheets')) {
        const sheetStore = db.createObjectStore('sheets', { keyPath: 'id' });
        sheetStore.createIndex('workbookId', 'workbookId', { unique: false });
        sheetStore.createIndex('index', ['workbookId', 'index'], { unique: false });
      }

      // Folders Object Store
      if (!db.objectStoreNames.contains('folders')) {
        const folderStore = db.createObjectStore('folders', { keyPath: 'id' });
        folderStore.createIndex('parentFolderId', 'parentFolderId', { unique: false });
        folderStore.createIndex('name', 'name', { unique: false });
      }

      // User Preferences Object Store
      if (!db.objectStoreNames.contains('preferences')) {
        db.createObjectStore('preferences', { keyPath: 'id' });
      }

      // Backups & Snapshots Object Store
      if (!db.objectStoreNames.contains('backups')) {
        const backupStore = db.createObjectStore('backups', { keyPath: 'id' });
        backupStore.createIndex('workbookId', 'workbookId', { unique: false });
        backupStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    });
  }

  /**
   * Version 2: Stage 3 Workbook indices (lastOpenedAt and isStarred).
   */
  private registerV2Migration(): void {
    this.migrations.set(2, (db, _oldV, _newV, transaction) => {
      Logger.info('Storage', 'Executing database migration to Version 2 (Indices for Stage 3)');

      if (db.objectStoreNames.contains('workbooks') && transaction) {
        const workbookStore = transaction.objectStore('workbooks');
        if (!workbookStore.indexNames.contains('lastOpenedAt')) {
          workbookStore.createIndex('lastOpenedAt', 'lastOpenedAt', { unique: false });
        }
        if (!workbookStore.indexNames.contains('isStarred')) {
          workbookStore.createIndex('isStarred', 'isStarred', { unique: false });
        }
      }
    });
  }

  /**
   * Execute necessary migrations between oldVersion and newVersion.
   */
  public executeMigrations(
    db: IDBPDatabase<unknown>,
    oldVersion: number,
    newVersion: number,
    transaction?: IDBPTransaction<unknown, string[], 'versionchange'>
  ): void {
    Logger.info('Storage', `Checking schema upgrade: v${oldVersion} -> v${newVersion}`);

    for (let v = oldVersion + 1; v <= newVersion; v++) {
      const migration = this.migrations.get(v);
      if (migration) {
        Logger.info('Storage', `Applying migration v${v}`);
        migration(db, oldVersion, newVersion, transaction);
      }
    }
  }
}
