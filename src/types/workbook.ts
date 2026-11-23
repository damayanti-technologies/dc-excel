/**
 * Extended metadata associated with a workbook.
 */
export interface WorkbookMetadata {
  author?: string;
  description?: string;
  tags?: string[];
  isFavorite?: boolean;
  version?: number;
  locale?: string;
}

/**
 * Core Workbook data model.
 */
export interface Workbook {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  sheetIds: string[];
  activeSheetId: string;
  folderId?: string | null;
  metadata?: WorkbookMetadata;
}

/**
 * Lightweight workbook summary for dashboard list views and file management.
 */
export interface WorkbookSummary {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  sheetCount: number;
  activeSheetId: string;
  folderId?: string | null;
  metadata?: WorkbookMetadata;
}
