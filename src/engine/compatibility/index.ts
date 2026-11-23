import { Workbook } from '@/types/workbook';
import { Sheet } from '@/types/sheet';

export interface ImportResult {
  workbook: Workbook;
  sheets: Sheet[];
  warnings?: string[];
}

export interface IFileCompatibilityService {
  importXLSX(fileData: ArrayBuffer | Blob): Promise<ImportResult>;
  exportXLSX(workbook: Workbook, sheets: Sheet[]): Promise<Blob>;
  importCSV(csvText: string, options?: { delimiter?: string }): Promise<Sheet>;
  exportCSV(sheet: Sheet, options?: { delimiter?: string }): Promise<string>;
}
