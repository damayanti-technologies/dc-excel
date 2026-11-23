/**
 * Folder model for organizational grouping of workbooks.
 */
export interface Folder {
  id: string;
  name: string;
  parentFolderId: string | null;
  createdAt: number;
  updatedAt: number;
  color?: string;
}

/**
 * Folder summary including aggregated workbook counts.
 */
export interface FolderSummary extends Folder {
  workbookCount: number;
}
