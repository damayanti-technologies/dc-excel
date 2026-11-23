import { Workbook, WorkbookSummary } from './workbook';
import { Sheet, SheetSummary } from './sheet';
import { Folder } from './folder';
import { UserPreferences } from './preferences';

export type PersistenceStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface IWorkbookRepository {
  getAll(): Promise<WorkbookSummary[]>;
  getById(id: string): Promise<Workbook | null>;
  save(workbook: Workbook): Promise<void>;
  delete(id: string): Promise<void>;
  getByFolder(folderId: string | null): Promise<WorkbookSummary[]>;
}

export interface ISheetRepository {
  getByWorkbookId(workbookId: string): Promise<Sheet[]>;
  getSummariesByWorkbookId(workbookId: string): Promise<SheetSummary[]>;
  getById(id: string): Promise<Sheet | null>;
  save(sheet: Sheet): Promise<void>;
  saveMany(sheets: Sheet[]): Promise<void>;
  delete(id: string): Promise<void>;
  deleteByWorkbookId(workbookId: string): Promise<void>;
}

export interface IFolderRepository {
  getAll(): Promise<Folder[]>;
  getById(id: string): Promise<Folder | null>;
  save(folder: Folder): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface IPreferencesRepository {
  get(): Promise<UserPreferences>;
  save(preferences: UserPreferences): Promise<void>;
}

export interface StorageQuotaInfo {
  usageBytes: number;
  quotaBytes: number;
  percentageUsed: number;
}
