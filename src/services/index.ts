import { Workbook, WorkbookSummary } from '@/types/workbook';
import { Sheet } from '@/types/sheet';
import { workbookRepository } from '@/storage/repositories/workbook-repository';
import { sheetRepository } from '@/storage/repositories/sheet-repository';
import { generateId } from '@/utils/id';
import { Logger } from '@/utils/logger';
import { DEFAULT_USER_PREFERENCES } from '@/types/preferences';

export class WorkbookService {
  /**
   * Creates a brand new workbook with an initial default sheet and saves both to IndexedDB.
   */
  public async createWorkbook(name = 'Untitled Workbook', folderId: string | null = null): Promise<{ workbook: Workbook; initialSheet: Sheet }> {
    const workbookId = generateId('wb');
    const sheetId = generateId('sheet');

    const workbook: Workbook = {
      id: workbookId,
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sheetIds: [sheetId],
      activeSheetId: sheetId,
      folderId,
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

    Logger.info('WorkbookService', `Created new workbook "${name}" with ID: ${workbookId}`);
    return { workbook, initialSheet };
  }

  /**
   * Duplicates an existing workbook and all its sheets.
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
      name: newName || `${original.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sheetIds: newSheetIds,
      activeSheetId: newSheetIds[0]!
    };

    await workbookRepository.save(duplicateWb);
    await sheetRepository.saveMany(newSheets);

    Logger.info('WorkbookService', `Duplicated workbook ${workbookId} -> ${newWbId}`);
    return duplicateWb;
  }

  /**
   * Deletes a workbook and all child sheets.
   */
  public async deleteWorkbook(workbookId: string): Promise<void> {
    await workbookRepository.delete(workbookId);
    Logger.info('WorkbookService', `Deleted workbook ${workbookId}`);
  }

  /**
   * Lists workbook summaries for dashboard display.
   */
  public async listWorkbooks(folderId: string | null = null): Promise<WorkbookSummary[]> {
    return workbookRepository.getByFolder(folderId);
  }
}

export const workbookService = new WorkbookService();
