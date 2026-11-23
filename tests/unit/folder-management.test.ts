import { describe, it, expect, beforeEach } from 'vitest';
import { folderService, workbookService } from '@/services';
import { folderRepository } from '@/storage/repositories/folder-repository';
import { workbookRepository } from '@/storage/repositories/workbook-repository';
import { sheetRepository } from '@/storage/repositories/sheet-repository';
import { clearAllStores } from '@/storage/indexeddb/database';

describe('Folder Management & Service', () => {
  beforeEach(async () => {
    await clearAllStores();
  });

  it('creates and retrieves a new folder', async () => {
    const folder = await folderService.createFolder('Financial Models', '#059669');

    expect(folder.id).toBeDefined();
    expect(folder.name).toBe('Financial Models');
    expect(folder.color).toBe('#059669');

    const fromDb = await folderRepository.getById(folder.id);
    expect(fromDb).not.toBeNull();
    expect(fromDb?.name).toBe('Financial Models');
  });

  it('renames a folder', async () => {
    const folder = await folderService.createFolder('Old Folder Name');
    await folderService.renameFolder(folder.id, 'New Folder Name');

    const updated = await folderRepository.getById(folder.id);
    expect(updated?.name).toBe('New Folder Name');
  });

  it('lists folders with dynamic workbook counts', async () => {
    const f1 = await folderService.createFolder('Folder A');
    const f2 = await folderService.createFolder('Folder B');

    // Create 2 workbooks in Folder A and 1 in Folder B
    await workbookService.createWorkbook('Doc 1', f1.id);
    await workbookService.createWorkbook('Doc 2', f1.id);
    await workbookService.createWorkbook('Doc 3', f2.id);

    const summaries = await folderService.listFolders();
    const sumA = summaries.find((s) => s.id === f1.id);
    const sumB = summaries.find((s) => s.id === f2.id);

    expect(sumA?.workbookCount).toBe(2);
    expect(sumB?.workbookCount).toBe(1);
  });

  it('deletes folder with "keep_workbooks" mode, moving workbooks to root', async () => {
    const folder = await folderService.createFolder('Temporary Folder');
    const { workbook, initialSheet } = await workbookService.createWorkbook('Work In Progress', folder.id);

    expect(workbook.folderId).toBe(folder.id);

    // Delete folder while preserving workbooks
    await folderService.deleteFolder(folder.id, 'keep_workbooks');

    // Folder is gone
    const deletedFolder = await folderRepository.getById(folder.id);
    expect(deletedFolder).toBeNull();

    // Workbook still exists and moved to root (folderId is null)
    const preservedWb = await workbookRepository.getById(workbook.id);
    expect(preservedWb).not.toBeNull();
    expect(preservedWb?.folderId).toBeNull();

    // Sheet is still intact
    const preservedSheet = await sheetRepository.getById(initialSheet.id);
    expect(preservedSheet).not.toBeNull();
  });

  it('deletes folder with "delete_all" mode, cascading deletion to all workbooks and sheets', async () => {
    const folder = await folderService.createFolder('Ephemeral Project');
    const { workbook, initialSheet } = await workbookService.createWorkbook('Discardable Doc', folder.id);

    // Delete folder and all its content
    await folderService.deleteFolder(folder.id, 'delete_all');

    // Folder is deleted
    const deletedFolder = await folderRepository.getById(folder.id);
    expect(deletedFolder).toBeNull();

    // Contained workbook is also deleted
    const deletedWb = await workbookRepository.getById(workbook.id);
    expect(deletedWb).toBeNull();

    // Sheet is also deleted
    const deletedSheet = await sheetRepository.getById(initialSheet.id);
    expect(deletedSheet).toBeNull();
  });
});
