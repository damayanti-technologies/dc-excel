/**
 * Folder model for organizational grouping of workbooks.
 */
export interface Folder {
  id: string;
  name: string;
  parentFolderId: string | null;
  createdAt: number;
  updatedAt: number;
}
