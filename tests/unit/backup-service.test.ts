import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { backupService } from '@/services/backup-service';
import { clearAllStores, closeDatabase } from '@/storage/indexeddb/database';
import { workbookRepository } from '@/storage/repositories/workbook-repository';
import { sheetRepository } from '@/storage/repositories/sheet-repository';
import { Workbook } from '@/types/workbook';
import { Sheet } from '@/types/sheet';

describe('BackupService (.omni Zip Archives & Migration)', () => {
  const mockWb: Workbook = {
    id: 'wb-backup-test',
    name: 'Corporate Budget',
    sheetIds: ['sheet-b1'],
    activeSheetId: 'sheet-b1',
    createdAt: 1000,
    updatedAt: 1000,
    revision: 1,
  };

  const mockSheet: Sheet = {
    id: 'sheet-b1',
    workbookId: 'wb-backup-test',
    name: 'Operating Expenses',
    index: 0,
    rowCount: 20,
    columnCount: 10,
    cells: {
      '0:0': { value: 'Marketing', dataType: 'string' },
      '0:1': { value: 75000, dataType: 'number' },
    },
  };

  beforeEach(async () => {
    await clearAllStores();
    await workbookRepository.save(mockWb);
    await sheetRepository.save(mockSheet);
  });

  afterEach(async () => {
    await clearAllStores();
    await closeDatabase();
  });

  it('generates a portable .omni ZIP archive with manifest.json and data files', async () => {
    const result = await backupService.createBackup([mockWb], [mockSheet], 'Test_Backup', false);

    expect(result.fileName).toBe('Test_Backup.omni');
    expect(result.blob).toBeDefined();
    expect(result.manifest.version).toBe('1.0.0');
    expect(result.manifest.workbookCount).toBe(1);
    expect(result.manifest.sheetCount).toBe(1);
    expect(result.manifest.workbooksSummary[0]!.cellCount).toBe(2);
  });

  it('inspects and validates archive integrity without writing to IndexedDB', async () => {
    const { blob } = await backupService.createBackup([mockWb], [mockSheet], undefined, false);

    const inspected = await backupService.inspectBackup(blob);

    expect(inspected.manifest.workbookCount).toBe(1);
    expect(inspected.workbooks.length).toBe(1);
    expect(inspected.sheets.length).toBe(1);
    expect(inspected.workbooks[0]!.name).toBe('Corporate Budget');
    expect(inspected.sheets[0]!.cells['0:1']!.value).toBe(75000);
    expect(inspected.warnings).toEqual([]);
  });

  it('restores backup in "new" mode with fresh IDs and safe conflict-free name', async () => {
    const { blob } = await backupService.createBackup([mockWb], [mockSheet], undefined, false);

    const restored = await backupService.restoreBackup(blob, 'new');

    expect(restored.restoredWorkbooks.length).toBe(1);
    expect(restored.restoredSheets.length).toBe(1);

    const newWb = restored.restoredWorkbooks[0]!;
    expect(newWb.id).not.toBe(mockWb.id);
    expect(newWb.name).toContain('Restored');
    expect(restored.restoredSheets[0]!.workbookId).toBe(newWb.id);

    const allWbs = await workbookRepository.getAll();
    expect(allWbs.length).toBe(2);
  });

  it('restores backup in "replace" mode preserving original IDs', async () => {
    const { blob } = await backupService.createBackup([mockWb], [mockSheet], undefined, false);

    await sheetRepository.save({
      ...mockSheet,
      cells: { '0:0': { value: 'Mutated', dataType: 'string' } },
    });

    const restored = await backupService.restoreBackup(blob, 'replace');

    expect(restored.restoredWorkbooks[0]!.id).toBe(mockWb.id);
    expect(restored.restoredSheets[0]!.cells['0:0']!.value).toBe('Marketing');

    const inDbSheet = await sheetRepository.getById(mockSheet.id);
    expect(inDbSheet?.cells['0:0']!.value).toBe('Marketing');
  });
});
