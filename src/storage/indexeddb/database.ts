import { openDB, IDBPDatabase } from 'idb';
import { DatabaseMigrationManager } from '../migrations/migration-manager';
import { StorageError, QuotaExceededError } from '@/utils/errors';
import { StorageQuotaInfo } from '@/types/storage';
import { Logger } from '@/utils/logger';

export const DB_NAME = 'omnisheet_db';
export const DB_VERSION = 1;

let dbInstance: IDBPDatabase<unknown> | null = null;
const migrationManager = new DatabaseMigrationManager();

/**
 * Connects to IndexedDB, applying migrations as necessary.
 */
export async function getDatabase(): Promise<IDBPDatabase<unknown>> {
  if (dbInstance) {
    return dbInstance;
  }

  try {
    dbInstance = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion) {
        migrationManager.executeMigrations(db, oldVersion, newVersion ?? DB_VERSION);
      },
      blocked() {
        Logger.warn('Storage', 'Database upgrade was blocked by another open tab/connection.');
      },
      blocking() {
        Logger.warn('Storage', 'Database connection blocking another tab from upgrading.');
        if (dbInstance) {
          dbInstance.close();
          dbInstance = null;
        }
      },
      terminated() {
        Logger.error('Storage', 'Database connection abnormally terminated by the browser.');
        dbInstance = null;
      }
    });

    Logger.info('Storage', `IndexedDB "${DB_NAME}" initialized at version ${DB_VERSION}`);
    return dbInstance;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    Logger.error('Storage', `Failed to open IndexedDB "${DB_NAME}": ${errorMsg}`, err);
    throw new StorageError(`Failed to initialize storage database: ${errorMsg}`, err);
  }
}

/**
 * Closes the active database connection. Useful for cleanup and tests.
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    Logger.info('Storage', 'Database connection closed.');
  }
}

/**
 * Checks storage quota and returns usage metrics.
 */
export async function getStorageQuota(): Promise<StorageQuotaInfo> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage ?? 0;
      const quota = estimate.quota ?? 0;
      const percentage = quota > 0 ? (usage / quota) * 100 : 0;
      return {
        usageBytes: usage,
        quotaBytes: quota,
        percentageUsed: Math.min(100, Math.round(percentage * 100) / 100)
      };
    } catch (err) {
      Logger.warn('Storage', 'Could not query storage quota estimate', err);
    }
  }

  return {
    usageBytes: 0,
    quotaBytes: 0,
    percentageUsed: 0
  };
}

/**
 * Wraps storage write calls to catch browser quota exceptions and translate them to QuotaExceededError.
 */
export async function handleStorageOperation<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      (err.name === 'QuotaExceededError' ||
        err.message.toLowerCase().includes('quota') ||
        err.message.toLowerCase().includes('storage full'))
    ) {
      Logger.error('Storage', 'Storage quota exceeded while performing operation', err);
      throw new QuotaExceededError('Browser storage quota exceeded. Please free up space.', err);
    }
    throw err;
  }
}
