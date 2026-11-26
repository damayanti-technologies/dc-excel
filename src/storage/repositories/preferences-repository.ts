import { IPreferencesRepository } from '@/types/storage';
import { UserPreferences, DEFAULT_USER_PREFERENCES } from '@/types/preferences';
import { getDatabase, handleStorageOperation } from '../indexeddb/database';
import { Logger } from '@/utils/logger';

const PREFERENCES_ID = 'current_user_preferences';
const LOCAL_STORAGE_FALLBACK_KEY = 'omnisheet_preferences_fallback';

function normalizePreferences(prefs?: Partial<UserPreferences> | null): UserPreferences {
  if (!prefs) return DEFAULT_USER_PREFERENCES;
  const def = DEFAULT_USER_PREFERENCES;
  const defWb = def.defaultWorkbookSettings;
  const loadedWb: Partial<typeof defWb> = prefs.defaultWorkbookSettings || {};
  return {
    ...def,
    ...prefs,
    defaultWorkbookSettings: {
      ...defWb,
      ...loadedWb,
      defaultRowCount: Math.max(loadedWb.defaultRowCount || defWb.defaultRowCount, defWb.defaultRowCount),
      defaultColumnCount: Math.max(loadedWb.defaultColumnCount || defWb.defaultColumnCount, defWb.defaultColumnCount)
    },
    applicationPreferences: {
      ...def.applicationPreferences,
      ...(prefs.applicationPreferences || {})
    }
  };
}

export class PreferencesRepository implements IPreferencesRepository {
  private readonly storeName = 'preferences';

  public async get(): Promise<UserPreferences> {
    try {
      const db = await getDatabase();
      const prefs = (await db.get(this.storeName, PREFERENCES_ID)) as UserPreferences | undefined;
      if (prefs) {
        return normalizePreferences(prefs);
      }
    } catch (err) {
      Logger.warn('PreferencesRepository', 'Could not read from IndexedDB, checking localStorage fallback', err);
    }

    // Fallback to localStorage
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(LOCAL_STORAGE_FALLBACK_KEY);
        if (stored) {
          return normalizePreferences(JSON.parse(stored));
        }
      }
    } catch (err) {
      Logger.warn('PreferencesRepository', 'Failed to read from localStorage fallback', err);
    }

    return DEFAULT_USER_PREFERENCES;
  }

  public async save(preferences: UserPreferences): Promise<void> {
    const payload: UserPreferences = {
      ...preferences,
      id: PREFERENCES_ID
    };

    // Save to IndexedDB
    try {
      await handleStorageOperation(async () => {
        const db = await getDatabase();
        await db.put(this.storeName, payload);
      });
      Logger.debug('PreferencesRepository', 'Saved preferences to IndexedDB');
    } catch (err) {
      Logger.error('PreferencesRepository', 'Failed to save preferences to IndexedDB', err);
    }

    // Always mirror to localStorage as lightweight fallback
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_FALLBACK_KEY, JSON.stringify(payload));
      }
    } catch (err) {
      Logger.warn('PreferencesRepository', 'Failed to mirror preferences to localStorage', err);
    }
  }
}

export const preferencesRepository = new PreferencesRepository();
