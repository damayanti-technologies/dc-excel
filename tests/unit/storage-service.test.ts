import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { storageService } from '@/services/storage-service';
import { versionService } from '@/services/version-service';
import { clearAllStores, closeDatabase } from '@/storage/indexeddb/database';
import { workbookRepository } from '@/storage/repositories/workbook-repository';
import { sheetRepository } from '@/storage/repositories/sheet-repository';
import { Workbook } from '@/types/workbook';
import { Sheet } from '@/types/sheet';

describe('StorageService (Quota Monitoring, Cleanup & Data Integrity)', () => {
  const mockWb: Workbook = {
    id: 'wb-storage-test',
    name: 'Storage Monitoring Test',
    sheetIds: ['sheet-s1'],
    activeSheetId: 'sheet-s1',
    createdAt: 1000,
    updatedAt: 1000,
    revision: 1,
  };

  const mockSheet: Sheet = {
    id: 'sheet-s1',
    workbookId: 'wb-storage-test',
    name: 'Sheet 1',
    index: 0,
    rowCount: 10,
    columnCount: 10,
    cells: { '0:0': { value: 'Data', dataType: 'string' } },
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

  it('calculates storage breakdown across stores', async () => {
    await versionService.createVersion(mockWb, [mockSheet], 'V1');

    const breakdown = await storageService.getStorageBreakdown();

    expect(breakdown).toBeDefined();
    expect(breakdown.workbookCount).toBe(1);
    expect(breakdown.sheetCount).toBe(1);
    expect(breakdown.versionCount).toBe(1);
    expect(breakdown.versionSizeBytes).toBeGreaterThan(0);
  });

  it('purges all historical version checkpoints', async () => {
    await versionService.createVersion(mockWb, [mockSheet], 'V1');
    await versionService.createVersion(mockWb, [mockSheet], 'V2');

    let breakdown = await storageService.getStorageBreakdown();
    expect(breakdown.versionCount).toBe(2);

    const purged = await storageService.cleanupAllVersions();
    expect(purged).toBe(2);

    breakdown = await storageService.getStorageBreakdown();
    expect(breakdown.versionCount).toBe(0);
  });

  it('identifies and cleans up orphaned sheets', async () => {
    // Save an orphaned sheet that references a non-existent workbook
    const orphanSheet: Sheet = {
      id: 'sheet-orphan',
      workbookId: 'non-existent-wb',
      name: 'Orphan Sheet',
      index: 0,
      rowCount: 5,
      columnCount: 5,
      cells: {},
    };
    await sheetRepository.save(orphanSheet);

    const checkBefore = await storageService.checkDataIntegrity();
    expect(checkBefore.isValid).toBe(false);
    expect(checkBefore.orphanedSheets.length).toBe(1);
    expect(checkBefore.orphanedSheets[0]).toBe('sheet-orphan');

    // Run orphan cleanup
    const cleaned = await storageService.cleanupOrphanedSheets();
    expect(cleaned).toBe(1);

    const checkAfter = await storageService.checkDataIntegrity();
    expect(checkAfter.isValid).toBe(true);
    expect(checkAfter.orphanedSheets.length).toBe(0);
  });

  it('reports database healthy when integrity check passes', async () => {
    const report = await storageService.checkDataIntegrity();

    expect(report.isValid).toBe(true);
    expect(report.errors).toEqual([]);
    expect(report.orphanedSheets).toEqual([]);
  });
});
