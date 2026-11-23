import { Workbook, WorkbookSummary } from '@/types/workbook';
import { Sheet } from '@/types/sheet';
import { Folder, FolderSummary } from '@/types/folder';
import { workbookRepository } from '@/storage/repositories/workbook-repository';
import { sheetRepository } from '@/storage/repositories/sheet-repository';
import { folderRepository } from '@/storage/repositories/folder-repository';
import { generateId } from '@/utils/id';
import { Logger } from '@/utils/logger';
import { DEFAULT_USER_PREFERENCES } from '@/types/preferences';

export class WorkbookService {
  /**
   * Creates a brand new workbook with an initial default sheet and saves both to IndexedDB.
   */
  public async createWorkbook(
    name = 'Untitled Workbook',
    folderId: string | null = null
  ): Promise<{ workbook: Workbook; initialSheet: Sheet }> {
    const workbookId = generateId('wb');
    const sheetId = generateId('sheet');
    const trimmedName = name.trim() || 'Untitled Workbook';

    const workbook: Workbook = {
      id: workbookId,
      name: trimmedName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastOpenedAt: Date.now(),
      isStarred: false,
      sheetIds: [sheetId],
      activeSheetId: sheetId,
      folderId: folderId || null,
      metadata: {
        locale: 'en-US'
      }
    };

    const initialSheet: Sheet = {
      id: sheetId,
      workbookId,
      name: DEFAULT_USER_PREFERENCES.defaultWorkbookSettings.defaultSheetName,
      index: 0,
      rowCount: DEFAULT_USER_PREFERENCES.defaultWorkbookSettings.defaultRowCount,
      columnCount: DEFAULT_USER_PREFERENCES.defaultWorkbookSettings.defaultColumnCount,
      cells: {}
    };

    await workbookRepository.save(workbook);
    await sheetRepository.save(initialSheet);

    Logger.info('WorkbookService', `Created new workbook "${trimmedName}" (${workbookId})`);
    return { workbook, initialSheet };
  }

  /**
   * Retrieves a workbook by ID.
   */
  public async getWorkbook(workbookId: string): Promise<Workbook | null> {
    return workbookRepository.getById(workbookId);
  }

  /**
   * Updates last opened timestamp and returns the workbook.
   */
  public async openWorkbook(workbookId: string): Promise<Workbook | null> {
    await workbookRepository.updateLastOpened(workbookId);
    return workbookRepository.getById(workbookId);
  }

  /**
   * Adds a new sheet to an existing workbook.
   */
  public async addSheet(workbookId: string, sheetName?: string): Promise<Sheet> {
    const workbook = await workbookRepository.getById(workbookId);
    if (!workbook) {
      throw new Error(`Cannot add sheet to non-existent workbook ${workbookId}`);
    }

    const existingSheets = await sheetRepository.getByWorkbookId(workbookId);
    const newSheetIndex = existingSheets.length;
    const name = sheetName || `Sheet${newSheetIndex + 1}`;
    const sheetId = generateId('sheet');

    const newSheet: Sheet = {
      id: sheetId,
      workbookId,
      name,
      index: newSheetIndex,
      rowCount: DEFAULT_USER_PREFERENCES.defaultWorkbookSettings.defaultRowCount,
      columnCount: DEFAULT_USER_PREFERENCES.defaultWorkbookSettings.defaultColumnCount,
      cells: {}
    };

    const updatedSheetIds = [...workbook.sheetIds, sheetId];
    const updatedWb: Workbook = {
      ...workbook,
      sheetIds: updatedSheetIds,
      activeSheetId: sheetId,
      updatedAt: Date.now()
    };

    await sheetRepository.save(newSheet);
    await workbookRepository.save(updatedWb);

    Logger.info('WorkbookService', `Added sheet "${name}" (${sheetId}) to workbook ${workbookId}`);
    return newSheet;
  }

  /**
   * Saves sheet data (cells, rowHeights, columnWidths, dimensions) to IndexedDB.
   */
  public async saveSheet(sheet: Sheet): Promise<void> {
    await sheetRepository.save(sheet);
  }

  /**
   * Retrieves a sheet by its ID.
   */
  public async getSheet(sheetId: string): Promise<Sheet | null> {
    return sheetRepository.getById(sheetId);
  }

  /**
   * Retrieves all sheets for a given workbook.
   */
  public async getSheetsForWorkbook(workbookId: string): Promise<Sheet[]> {
    return sheetRepository.getByWorkbookId(workbookId);
  }

  /**
   * Renames an existing workbook.
   */
  public async renameWorkbook(workbookId: string, newName: string): Promise<Workbook> {
    await workbookRepository.rename(workbookId, newName);
    const updated = await workbookRepository.getById(workbookId);
    if (!updated) {
      throw new Error(`Workbook ${workbookId} not found after rename`);
    }
    return updated;
  }

  /**
   * Toggles the starred status of a workbook.
   */
  public async toggleStar(workbookId: string): Promise<boolean> {
    return workbookRepository.toggleStar(workbookId);
  }

  /**
   * Moves a workbook into a destination folder or root.
   */
  public async moveToFolder(workbookId: string, folderId: string | null): Promise<void> {
    return workbookRepository.moveToFolder(workbookId, folderId);
  }

  /**
   * Duplicates an existing workbook and all its sheets (deep-copy).
   */
  public async duplicateWorkbook(workbookId: string, newName?: string): Promise<Workbook> {
    const original = await workbookRepository.getById(workbookId);
    if (!original) {
      throw new Error(`Cannot duplicate non-existent workbook ${workbookId}`);
    }

    const sheets = await sheetRepository.getByWorkbookId(workbookId);
    const newWbId = generateId('wb');
    const newSheetIds: string[] = [];
    const newSheets: Sheet[] = [];

    for (const sheet of sheets) {
      const newSheetId = generateId('sheet');
      newSheetIds.push(newSheetId);
      newSheets.push({
        ...sheet,
        id: newSheetId,
        workbookId: newWbId,
        cells: { ...sheet.cells }
      });
    }

    const duplicateWb: Workbook = {
      ...original,
      id: newWbId,
      name: newName ? newName.trim() : `${original.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastOpenedAt: Date.now(),
      isStarred: false,
      sheetIds: newSheetIds,
      activeSheetId: newSheetIds[0] || ''
    };

    await workbookRepository.save(duplicateWb);
    await sheetRepository.saveMany(newSheets);

    Logger.info('WorkbookService', `Duplicated workbook ${workbookId} -> ${newWbId}`);
    return duplicateWb;
  }

  /**
   * Deletes a workbook and all child sheets permanently.
   */
  public async deleteWorkbook(workbookId: string): Promise<void> {
    await workbookRepository.delete(workbookId);
    Logger.info('WorkbookService', `Deleted workbook ${workbookId}`);
  }

  /**
   * Lists workbook summaries filtered by folder.
   */
  public async listWorkbooks(folderId: string | null = null): Promise<WorkbookSummary[]> {
    return workbookRepository.getByFolder(folderId);
  }

  /**
   * Lists all workbook summaries.
   */
  public async getAllWorkbooks(): Promise<WorkbookSummary[]> {
    return workbookRepository.getAll();
  }

  /**
   * Lists recently opened/modified workbooks.
   */
  public async getRecentWorkbooks(limit = 10): Promise<WorkbookSummary[]> {
    return workbookRepository.getRecent(limit);
  }

  /**
   * Lists all starred workbooks.
   */
  public async getStarredWorkbooks(): Promise<WorkbookSummary[]> {
    return workbookRepository.getStarred();
  }
}

export class FolderService {
  /**
   * Creates a new folder.
   */
  public async createFolder(name: string, color?: string): Promise<Folder> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error('Folder name cannot be empty');
    }

    const folder: Folder = {
      id: generateId('folder'),
      name: trimmed,
      parentFolderId: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      color: color || '#2563eb'
    };

    await folderRepository.save(folder);
    Logger.info('FolderService', `Created folder "${trimmed}" (${folder.id})`);
    return folder;
  }

  /**
   * Retrieves a folder by ID.
   */
  public async getFolder(folderId: string): Promise<Folder | null> {
    return folderRepository.getById(folderId);
  }

  /**
   * Lists all folders with workbook counts.
   */
  public async listFolders(): Promise<FolderSummary[]> {
    return folderRepository.getAllWithCounts();
  }

  /**
   * Renames a folder.
   */
  public async renameFolder(folderId: string, newName: string): Promise<void> {
    return folderRepository.rename(folderId, newName);
  }

  /**
   * Deletes a folder with user choice:
   * 'keep_workbooks': un-files workbooks to root (folderId = null)
   * 'delete_all': cascades delete to all workbooks and their sheets
   */
  public async deleteFolder(folderId: string, mode: 'keep_workbooks' | 'delete_all'): Promise<void> {
    if (mode === 'keep_workbooks') {
      await folderRepository.deletePreservingWorkbooks(folderId);
    } else {
      await folderRepository.deleteWithWorkbooks(folderId);
    }
  }
}

export const workbookService = new WorkbookService();
export const folderService = new FolderService();
