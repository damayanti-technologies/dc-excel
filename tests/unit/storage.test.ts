import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDatabase, closeDatabase } from '@/storage/indexeddb/database';
import { workbookRepository } from '@/storage/repositories/workbook-repository';
import { sheetRepository } from '@/storage/repositories/sheet-repository';
import { preferencesRepository } from '@/storage/repositories/preferences-repository';
import { Workbook } from '@/types/workbook';
import { Sheet } from '@/types/sheet';
import { DEFAULT_USER_PREFERENCES } from '@/types/preferences';

describe('Storage & IndexedDB Repositories', () => {
  beforeEach(async () => {
    await getDatabase();
  });

  afterEach(() => {
    closeDatabase();
  });

  it('initializes IndexedDB database with expected object stores', async () => {
    const db = await getDatabase();
    expect(db.name).toBe('omnisheet_db');
    expect(db.objectStoreNames.contains('workbooks')).toBe(true);
    expect(db.objectStoreNames.contains('sheets')).toBe(true);
    expect(db.objectStoreNames.contains('folders')).toBe(true);
    expect(db.objectStoreNames.contains('preferences')).toBe(true);
    expect(db.objectStoreNames.contains('backups')).toBe(true);
  });

  it('saves, retrieves, lists, and deletes workbooks', async () => {
    const wbId = 'test-wb-1';
    const workbook: Workbook = {
      id: wbId,
      name: 'Financial Projections 2026',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sheetIds: ['sheet-1'],
      activeSheetId: 'sheet-1',
      folderId: null
    };

    // Save
    await workbookRepository.save(workbook);

    // Retrieve by ID
    const retrieved = await workbookRepository.getById(wbId);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(wbId);
    expect(retrieved?.name).toBe('Financial Projections 2026');

    // List all
    const all = await workbookRepository.getAll();
    expect(all.length).toBeGreaterThan(0);
    expect(all.some(item => item.id === wbId)).toBe(true);

    // Delete
    await workbookRepository.delete(wbId);
    const afterDelete = await workbookRepository.getById(wbId);
    expect(afterDelete).toBeNull();
  });

  it('saves and queries sheets with sparse cells', async () => {
    const wbId = 'test-wb-sheets';
    const sheetId = 'test-sheet-1';

    const sheet: Sheet = {
      id: sheetId,
      workbookId: wbId,
      name: 'Summary',
      index: 0,
      rowCount: 1000,
      columnCount: 26,
      cells: {
        '0:0': { value: 'Revenue', dataType: 'string' },
        '0:1': { value: 150000, dataType: 'number' }
      }
    };

    await sheetRepository.save(sheet);

    const retrieved = await sheetRepository.getById(sheetId);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.name).toBe('Summary');
    expect(retrieved?.cells['0:0']?.value).toBe('Revenue');
    expect(retrieved?.cells['0:1']?.value).toBe(150000);

    const summaries = await sheetRepository.getSummariesByWorkbookId(wbId);
    expect(summaries.length).toBe(1);
    expect(summaries[0]?.cellCount).toBe(2);

    await sheetRepository.deleteByWorkbookId(wbId);
    const afterDelete = await sheetRepository.getByWorkbookId(wbId);
    expect(afterDelete.length).toBe(0);
  });

  it('reads and saves user preferences with fallback values', async () => {
    const defaultPrefs = await preferencesRepository.get();
    expect(defaultPrefs.theme).toBeDefined();

    const updated = {
      ...DEFAULT_USER_PREFERENCES,
      theme: 'dark' as const,
      applicationPreferences: {
        ...DEFAULT_USER_PREFERENCES.applicationPreferences,
        autoSaveIntervalMs: 5000
      }
    };

    await preferencesRepository.save(updated);

    const saved = await preferencesRepository.get();
    expect(saved.theme).toBe('dark');
    expect(saved.applicationPreferences.autoSaveIntervalMs).toBe(5000);
  });
});
