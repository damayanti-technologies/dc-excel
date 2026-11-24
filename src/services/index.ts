import { Workbook, WorkbookSummary } from '@/types/workbook';
import { Sheet } from '@/types/sheet';
import { Folder, FolderSummary } from '@/types/folder';
import { workbookRepository } from '@/storage/repositories/workbook-repository';
import { sheetRepository } from '@/storage/repositories/sheet-repository';
import { folderRepository } from '@/storage/repositories/folder-repository';
import { generateId } from '@/utils/id';
import { Logger } from '@/utils/logger';
import { DEFAULT_USER_PREFERENCES } from '@/types/preferences';
import {
  validateSheetName,
  generateUniqueSheetName,
  generateDuplicateSheetName,
  cloneSheet
} from '@/engine/worksheet';

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
  /**
   * Adds a new sheet to an existing workbook.
   * If sheetName is not specified, generates an automatic conflict-free name (e.g. "Sheet1", "Sheet2").
   * Can insert immediately after a specified sheetId, or append at the end.
   */
  public async addSheet(
    workbookId: string,
    sheetName?: string,
    insertAfterSheetId?: string
  ): Promise<Sheet> {
    const workbook = await workbookRepository.getById(workbookId);
    if (!workbook) {
      throw new Error(`Cannot add sheet to non-existent workbook ${workbookId}`);
    }

    const existingSheets = await sheetRepository.getByWorkbookId(workbookId);

    let name = sheetName;
    if (name) {
      const validation = validateSheetName(name, existingSheets);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }
      name = validation.sanitizedName;
    } else {
      name = generateUniqueSheetName(existingSheets);
    }

    const sheetId = generateId('sheet');

    // Determine insertion position in sheetIds array
    let updatedSheetIds = [...workbook.sheetIds];
    if (insertAfterSheetId && updatedSheetIds.includes(insertAfterSheetId)) {
      const targetIdx = updatedSheetIds.indexOf(insertAfterSheetId);
      updatedSheetIds.splice(targetIdx + 1, 0, sheetId);
    } else {
      updatedSheetIds.push(sheetId);
    }

    const newSheetIndex = updatedSheetIds.indexOf(sheetId);

    const newSheet: Sheet = {
      id: sheetId,
      workbookId,
      name,
      index: newSheetIndex,
      rowCount: DEFAULT_USER_PREFERENCES.defaultWorkbookSettings.defaultRowCount,
      columnCount: DEFAULT_USER_PREFERENCES.defaultWorkbookSettings.defaultColumnCount,
      cells: {}
    };

    // Re-index any subsequent sheets
    const sheetsToUpdate: Sheet[] = [newSheet];
    for (const s of existingSheets) {
      const actualIdx = updatedSheetIds.indexOf(s.id);
      if (s.index !== actualIdx) {
        sheetsToUpdate.push({ ...s, index: actualIdx });
      }
    }

    const updatedWb: Workbook = {
      ...workbook,
      sheetIds: updatedSheetIds,
      activeSheetId: sheetId,
      updatedAt: Date.now()
    };

    await sheetRepository.saveMany(sheetsToUpdate);
    await workbookRepository.save(updatedWb);

    Logger.info('WorkbookService', `Added sheet "${name}" (${sheetId}) to workbook ${workbookId}`);
    return newSheet;
  }

  /**
   * Renames a sheet in a workbook with validation.
   */
  public async renameSheet(
    workbookId: string,
    sheetId: string,
    newName: string
  ): Promise<Sheet> {
    const existingSheets = await sheetRepository.getByWorkbookId(workbookId);
    const targetSheet = existingSheets.find((s) => s.id === sheetId);
    if (!targetSheet) {
      throw new Error(`Sheet ${sheetId} not found in workbook ${workbookId}`);
    }

    const validation = validateSheetName(newName, existingSheets, sheetId);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    const updatedSheet: Sheet = {
      ...targetSheet,
      name: validation.sanitizedName
    };

    await sheetRepository.save(updatedSheet);
    Logger.info(
      'WorkbookService',
      `Renamed sheet "${targetSheet.name}" to "${updatedSheet.name}" (${sheetId})`
    );
    return updatedSheet;
  }

  /**
   * Duplicates an existing sheet, copying all cells, formatting, row/col sizes,
   * merged ranges, and metadata with an auto-generated conflict-free name.
   */
  public async duplicateSheet(workbookId: string, sheetId: string): Promise<Sheet> {
    const workbook = await workbookRepository.getById(workbookId);
    if (!workbook) {
      throw new Error(`Workbook ${workbookId} not found`);
    }

    const existingSheets = await sheetRepository.getByWorkbookId(workbookId);
    const targetSheet = existingSheets.find((s) => s.id === sheetId);
    if (!targetSheet) {
      throw new Error(`Sheet ${sheetId} not found to duplicate`);
    }

    const newName = generateDuplicateSheetName(targetSheet.name, existingSheets);
    const newSheetId = generateId('sheet');

    // Insert duplicate immediately after original sheet
    const targetIdx = workbook.sheetIds.indexOf(sheetId);
    const updatedSheetIds = [...workbook.sheetIds];
    if (targetIdx !== -1) {
      updatedSheetIds.splice(targetIdx + 1, 0, newSheetId);
    } else {
      updatedSheetIds.push(newSheetId);
    }

    const newIndex = updatedSheetIds.indexOf(newSheetId);
    const duplicatedSheet = cloneSheet(targetSheet, newSheetId, newName, newIndex);

    // Update indices for all sheets
    const sheetsToUpdate: Sheet[] = [duplicatedSheet];
    for (const s of existingSheets) {
      const currentIdx = updatedSheetIds.indexOf(s.id);
      if (s.index !== currentIdx) {
        sheetsToUpdate.push({ ...s, index: currentIdx });
      }
    }

    const updatedWb: Workbook = {
      ...workbook,
      sheetIds: updatedSheetIds,
      activeSheetId: newSheetId,
      updatedAt: Date.now()
    };

    await sheetRepository.saveMany(sheetsToUpdate);
    await workbookRepository.save(updatedWb);

    Logger.info(
      'WorkbookService',
      `Duplicated sheet "${targetSheet.name}" -> "${newName}" (${newSheetId})`
    );
    return duplicatedSheet;
  }

  /**
   * Deletes a sheet from a workbook.
   * Prevents deletion if it is the only sheet in the workbook.
   * Updates activeSheetId to a neighboring sheet and updates indices.
   */
  public async deleteSheet(
    workbookId: string,
    sheetId: string
  ): Promise<{ remainingSheets: Sheet[]; nextActiveSheetId: string }> {
    const workbook = await workbookRepository.getById(workbookId);
    if (!workbook) {
      throw new Error(`Workbook ${workbookId} not found`);
    }

    const existingSheets = await sheetRepository.getByWorkbookId(workbookId);
    if (existingSheets.length <= 1) {
      throw new Error('Cannot delete the only sheet in a workbook.');
    }

    const deletedIdx = workbook.sheetIds.indexOf(sheetId);
    const updatedSheetIds = workbook.sheetIds.filter((id) => id !== sheetId);

    // Determine next active sheet
    let nextActiveSheetId = workbook.activeSheetId;
    if (workbook.activeSheetId === sheetId) {
      const neighborIdx = Math.max(0, deletedIdx - 1);
      nextActiveSheetId = updatedSheetIds[neighborIdx] || updatedSheetIds[0] || '';
    }

    // Delete sheet record from storage
    await sheetRepository.delete(sheetId);

    // Update indices for remaining sheets
    const remainingSheets: Sheet[] = [];
    for (const s of existingSheets.filter((s) => s.id !== sheetId)) {
      const newIdx = updatedSheetIds.indexOf(s.id);
      remainingSheets.push({ ...s, index: newIdx });
    }

    await sheetRepository.saveMany(remainingSheets);

    const updatedWb: Workbook = {
      ...workbook,
      sheetIds: updatedSheetIds,
      activeSheetId: nextActiveSheetId,
      updatedAt: Date.now()
    };
    await workbookRepository.save(updatedWb);

    Logger.info('WorkbookService', `Deleted sheet ${sheetId} from workbook ${workbookId}`);
    return {
      remainingSheets: remainingSheets.sort((a, b) => a.index - b.index),
      nextActiveSheetId
    };
  }

  /**
   * Reorders sheets by updating sheetIds and sheet index values.
   */
  public async reorderSheets(
    workbookId: string,
    reorderedSheetIds: string[]
  ): Promise<Sheet[]> {
    const workbook = await workbookRepository.getById(workbookId);
    if (!workbook) {
      throw new Error(`Workbook ${workbookId} not found`);
    }

    const existingSheets = await sheetRepository.getByWorkbookId(workbookId);
    const updatedSheets = existingSheets.map((sheet) => {
      const newIndex = reorderedSheetIds.indexOf(sheet.id);
      return {
        ...sheet,
        index: newIndex !== -1 ? newIndex : sheet.index
      };
    });

    const updatedWb: Workbook = {
      ...workbook,
      sheetIds: reorderedSheetIds,
      updatedAt: Date.now()
    };

    await sheetRepository.saveMany(updatedSheets);
    await workbookRepository.save(updatedWb);

    Logger.info('WorkbookService', `Reordered sheets for workbook ${workbookId}`);
    return updatedSheets.sort((a, b) => a.index - b.index);
  }

  /**
   * Moves a sheet one position left or right in the workbook order.
   */
  public async moveSheet(
    workbookId: string,
    sheetId: string,
    direction: 'left' | 'right'
  ): Promise<Sheet[]> {
    const workbook = await workbookRepository.getById(workbookId);
    if (!workbook) {
      throw new Error(`Workbook ${workbookId} not found`);
    }

    const currentIdx = workbook.sheetIds.indexOf(sheetId);
    if (currentIdx === -1) {
      throw new Error(`Sheet ${sheetId} not found in workbook sheetIds`);
    }

    const targetIdx = direction === 'left' ? currentIdx - 1 : currentIdx + 1;
    if (targetIdx < 0 || targetIdx >= workbook.sheetIds.length) {
      // Cannot move further in this direction
      return sheetRepository.getByWorkbookId(workbookId);
    }

    const updatedIds = [...workbook.sheetIds];
    const [movedId] = updatedIds.splice(currentIdx, 1);
    if (movedId) {
      updatedIds.splice(targetIdx, 0, movedId);
    }

    return this.reorderSheets(workbookId, updatedIds);
  }

  /**
   * Sets or clears a worksheet tab's color accent.
   */
  public async setSheetTabColor(
    sheetId: string,
    tabColor: string | null
  ): Promise<Sheet> {
    const sheet = await sheetRepository.getById(sheetId);
    if (!sheet) {
      throw new Error(`Sheet ${sheetId} not found`);
    }

    const updatedSheet: Sheet = {
      ...sheet,
      metadata: {
        ...(sheet.metadata || {}),
        tabColor: tabColor || undefined
      }
    };

    await sheetRepository.save(updatedSheet);
    Logger.info('WorkbookService', `Updated tab color for sheet ${sheetId} to "${tabColor}"`);
    return updatedSheet;
  }

  /**
   * Hides a worksheet.
   * Prevents hiding if this is the only visible worksheet in the workbook.
   * Switches activeSheetId to another visible sheet if the hidden sheet was active.
   */
  public async hideSheet(
    workbookId: string,
    sheetId: string
  ): Promise<{ updatedSheet: Sheet; nextActiveSheetId: string }> {
    const workbook = await workbookRepository.getById(workbookId);
    if (!workbook) {
      throw new Error(`Workbook ${workbookId} not found`);
    }

    const existingSheets = await sheetRepository.getByWorkbookId(workbookId);
    const visibleSheets = existingSheets.filter((s) => !s.metadata?.isHidden);
    if (visibleSheets.length <= 1) {
      throw new Error('Cannot hide the only visible sheet in a workbook.');
    }

    const targetSheet = existingSheets.find((s) => s.id === sheetId);
    if (!targetSheet) {
      throw new Error(`Sheet ${sheetId} not found`);
    }

    const updatedSheet: Sheet = {
      ...targetSheet,
      metadata: {
        ...(targetSheet.metadata || {}),
        isHidden: true
      }
    };

    await sheetRepository.save(updatedSheet);

    let nextActiveSheetId = workbook.activeSheetId;
    if (workbook.activeSheetId === sheetId) {
      const otherVisible = visibleSheets.find((s) => s.id !== sheetId);
      if (otherVisible) {
        nextActiveSheetId = otherVisible.id;
        const updatedWb: Workbook = {
          ...workbook,
          activeSheetId: nextActiveSheetId,
          updatedAt: Date.now()
        };
        await workbookRepository.save(updatedWb);
      }
    }

    Logger.info('WorkbookService', `Hidden sheet "${targetSheet.name}" (${sheetId})`);
    return { updatedSheet, nextActiveSheetId };
  }

  /**
   * Unhides a previously hidden worksheet and makes it active.
   */
  public async unhideSheet(
    workbookId: string,
    sheetId: string
  ): Promise<Sheet> {
    const workbook = await workbookRepository.getById(workbookId);
    if (!workbook) {
      throw new Error(`Workbook ${workbookId} not found`);
    }

    const sheet = await sheetRepository.getById(sheetId);
    if (!sheet) {
      throw new Error(`Sheet ${sheetId} not found`);
    }

    const updatedSheet: Sheet = {
      ...sheet,
      metadata: {
        ...(sheet.metadata || {}),
        isHidden: false
      }
    };

    const updatedWb: Workbook = {
      ...workbook,
      activeSheetId: sheetId,
      updatedAt: Date.now()
    };

    await sheetRepository.save(updatedSheet);
    await workbookRepository.save(updatedWb);

    Logger.info('WorkbookService', `Unhid sheet "${sheet.name}" (${sheetId})`);
    return updatedSheet;
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
export * from './import-export-service';
