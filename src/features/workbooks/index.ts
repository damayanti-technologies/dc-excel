import { Workbook, WorkbookSummary } from '@/types/workbook';

/**
 * Workbook management domain operations contract.
 * Bridges presentation features with underlying repository storage.
 */
export interface IWorkbookService {
  createWorkbook(name?: string, folderId?: string | null): Promise<Workbook>;
  duplicateWorkbook(id: string, newName?: string): Promise<Workbook>;
  renameWorkbook(id: string, newName: string): Promise<void>;
  deleteWorkbook(id: string): Promise<void>;
  listSummaries(folderId?: string | null): Promise<WorkbookSummary[]>;
}
