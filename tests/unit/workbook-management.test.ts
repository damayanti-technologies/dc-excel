import { describe, it, expect, beforeEach } from 'vitest';
import { workbookService } from '@/services';
import { workbookRepository } from '@/storage/repositories/workbook-repository';
import { sheetRepository } from '@/storage/repositories/sheet-repository';
import { clearAllStores } from '@/storage/indexeddb/database';

describe('Workbook Management & Service', () => {
  beforeEach(async () => {
    await clearAllStores();
  });

  it('creates a new workbook with default Sheet1 and persists both to IndexedDB', async () => {
    const { workbook, initialSheet } = await workbookService.createWorkbook('Quarterly Budget');

    expect(workbook.id).toBeDefined();
    expect(workbook.name).toBe('Quarterly Budget');
    expect(workbook.sheetIds).toContain(initialSheet.id);
    expect(workbook.activeSheetId).toBe(initialSheet.id);
    expect(workbook.isStarred).toBe(false);

    // Verify persistence in IndexedDB
    const retrievedWb = await workbookRepository.getById(workbook.id);
    expect(retrievedWb).not.toBeNull();
    expect(retrievedWb?.name).toBe('Quarterly Budget');

    const retrievedSheet = await sheetRepository.getById(initialSheet.id);
    expect(retrievedSheet).not.toBeNull();
    expect(retrievedSheet?.workbookId).toBe(workbook.id);
    expect(retrievedSheet?.name).toBe('Sheet1');
    expect(retrievedSheet?.rowCount).toBe(1000);
    expect(retrievedSheet?.columnCount).toBe(26);
  });

  it('renames a workbook and persists the updated name', async () => {
    const { workbook } = await workbookService.createWorkbook('Old Name');
    const updated = await workbookService.renameWorkbook(workbook.id, 'New Name');

    expect(updated.name).toBe('New Name');
    const fromDb = await workbookRepository.getById(workbook.id);
    expect(fromDb?.name).toBe('New Name');
  });

  it('duplicates a workbook and deep-copies all sheets with new IDs', async () => {
    const { workbook, initialSheet } = await workbookService.createWorkbook('Original Model');

    // Add sample cell data to original sheet
    await sheetRepository.save({
      ...initialSheet,
      cells: {
        '0:0': { formula: '=SUM(1,2)', value: 3, dataType: 'formula' }
      }
    });

    const duplicate = await workbookService.duplicateWorkbook(workbook.id, 'Original Model (Copy)');

    expect(duplicate.id).not.toBe(workbook.id);
    expect(duplicate.name).toBe('Original Model (Copy)');
    expect(duplicate.sheetIds.length).toBe(1);
    expect(duplicate.sheetIds[0]).not.toBe(initialSheet.id);

    // Check duplicated sheet content
    const targetSheetId = duplicate.sheetIds[0]!;
    const dupSheet = await sheetRepository.getById(targetSheetId);
    expect(dupSheet).not.toBeNull();
    expect(dupSheet?.workbookId).toBe(duplicate.id);
    expect(dupSheet?.cells['0:0']?.formula).toBe('=SUM(1,2)');
  });

  it('toggles star / unstar status', async () => {
    const { workbook } = await workbookService.createWorkbook('Starred Project');

    const status1 = await workbookService.toggleStar(workbook.id);
    expect(status1).toBe(true);

    const starredList = await workbookService.getStarredWorkbooks();
    expect(starredList.some((w) => w.id === workbook.id)).toBe(true);

    const status2 = await workbookService.toggleStar(workbook.id);
    expect(status2).toBe(false);

    const unstarredList = await workbookService.getStarredWorkbooks();
    expect(unstarredList.some((w) => w.id === workbook.id)).toBe(false);
  });

  it('tracks lastOpenedAt when a workbook is opened', async () => {
    const { workbook } = await workbookService.createWorkbook('Tracked Project');
    const initialOpened = workbook.lastOpenedAt;

    // Small delay to ensure timestamp progression
    await new Promise((r) => setTimeout(r, 15));

    const opened = await workbookService.openWorkbook(workbook.id);
    expect(opened?.lastOpenedAt).toBeGreaterThanOrEqual(initialOpened || 0);

    const recent = await workbookService.getRecentWorkbooks(5);
    expect(recent[0]?.id).toBe(workbook.id);
  });

  it('moves workbook into a folder and back to root', async () => {
    const { workbook } = await workbookService.createWorkbook('Movable');
    expect(workbook.folderId).toBeNull();

    await workbookService.moveToFolder(workbook.id, 'folder-alpha');
    const movedWb = await workbookRepository.getById(workbook.id);
    expect(movedWb?.folderId).toBe('folder-alpha');

    await workbookService.moveToFolder(workbook.id, null);
    const rootWb = await workbookRepository.getById(workbook.id);
    expect(rootWb?.folderId).toBeNull();
  });

  it('deletes workbook and cascades deletion to all child sheets', async () => {
    const { workbook, initialSheet } = await workbookService.createWorkbook('To Delete');

    await workbookService.deleteWorkbook(workbook.id);

    const wb = await workbookRepository.getById(workbook.id);
    expect(wb).toBeNull();

    const sheet = await sheetRepository.getById(initialSheet.id);
    expect(sheet).toBeNull();
  });
});
