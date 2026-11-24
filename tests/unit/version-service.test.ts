import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { versionService } from '@/services/version-service';
import { clearAllStores, closeDatabase } from '@/storage/indexeddb/database';
import { workbookRepository } from '@/storage/repositories/workbook-repository';
import { sheetRepository } from '@/storage/repositories/sheet-repository';
import { Workbook } from '@/types/workbook';
import { Sheet } from '@/types/sheet';

describe('VersionService (Workbook Version History & Checkpoints)', () => {
  const mockWorkbook: Workbook = {
    id: 'wb-version-test',
    name: 'Version Test Workbook',
    sheetIds: ['sheet-v1'],
    activeSheetId: 'sheet-v1',
    createdAt: 1000,
    updatedAt: 1000,
    revision: 1,
  };

  const mockSheet: Sheet = {
    id: 'sheet-v1',
    workbookId: 'wb-version-test',
    name: 'Sheet1',
    index: 0,
    rowCount: 10,
    columnCount: 10,
    cells: {
      '0:0': { value: 100, dataType: 'number' },
    },
  };

  beforeEach(async () => {
    await clearAllStores();
    await workbookRepository.save(mockWorkbook);
    await sheetRepository.save(mockSheet);
  });

  afterEach(async () => {
    await clearAllStores();
    await closeDatabase();
  });

  it('creates manual version checkpoints with label and description', async () => {
    const v = await versionService.createVersion(
      mockWorkbook,
      [mockSheet],
      'Initial Baseline',
      'First user milestone',
      true
    );

    expect(v.id).toBeDefined();
    expect(v.workbookId).toBe('wb-version-test');
    expect(v.isManual).toBe(true);
    expect(v.label).toBe('Initial Baseline');
    expect(v.description).toBe('First user milestone');
    expect(v.sheetsSnapshot.length).toBe(1);
    expect(v.sizeBytes).toBeGreaterThan(0);

    const list = await versionService.getVersions('wb-version-test');
    expect(list.length).toBe(1);
    expect(list[0]!.id).toBe(v.id);
  });

  it('retrieves versions sorted chronologically descending', async () => {
    await versionService.createVersion(mockWorkbook, [mockSheet], 'Auto Save 1', undefined, false);
    await new Promise((r) => setTimeout(r, 10));
    await versionService.createVersion(mockWorkbook, [mockSheet], 'Manual Checkpoint', undefined, true);

    const list = await versionService.getVersions('wb-version-test');
    expect(list.length).toBe(2);
    expect(list[0]!.label).toBe('Manual Checkpoint');
    expect(list[1]!.label).toBe('Auto Save 1');
  });

  it('restores a version and creates a pre-restore safety checkpoint', async () => {
    // 1. Create baseline version
    const baseline = await versionService.createVersion(
      mockWorkbook,
      [mockSheet],
      'Baseline v1',
      undefined,
      true
    );

    // 2. Modify workbook state
    const modifiedSheet: Sheet = {
      ...mockSheet,
      cells: {
        '0:0': { value: 999, dataType: 'number' },
        '1:1': { value: 'New Data', dataType: 'string' },
      },
    };
    await sheetRepository.save(modifiedSheet);

    // 3. Restore baseline version
    const restored = await versionService.restoreVersion(
      baseline.id,
      mockWorkbook,
      [modifiedSheet]
    );

    expect(restored.workbook.name).toBe('Version Test Workbook');
    expect(restored.sheets.length).toBe(1);
    expect(restored.sheets[0]!.cells['0:0']!.value).toBe(100);

    // 4. Verify pre-restore safety checkpoint was automatically created
    const allVersions = await versionService.getVersions('wb-version-test');
    const safetyVersion = allVersions.find((v) => v.label.includes('Pre-restore safety backup'));
    expect(safetyVersion).toBeDefined();
    expect(safetyVersion?.isManual).toBe(false);
  });

  it('deletes specific version checkpoints', async () => {
    const v1 = await versionService.createVersion(mockWorkbook, [mockSheet], 'V1');
    const v2 = await versionService.createVersion(mockWorkbook, [mockSheet], 'V2');

    expect((await versionService.getVersions('wb-version-test')).length).toBe(2);

    await versionService.deleteVersion(v1.id);

    const remaining = await versionService.getVersions('wb-version-test');
    expect(remaining.length).toBe(1);
    expect(remaining[0]!.id).toBe(v2.id);
  });
});
