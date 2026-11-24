import { NamedRange, Scenario } from './analysis';

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
  namedRanges?: NamedRange[];
  scenarios?: Scenario[];
}

/**
 * Core Workbook data model.
 */
export interface Workbook {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  lastOpenedAt?: number;
  isStarred?: boolean;
  sheetIds: string[];
  activeSheetId: string;
  folderId?: string | null;
  revision?: number;
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
  lastOpenedAt?: number;
  isStarred?: boolean;
  sheetCount: number;
  activeSheetId: string;
  folderId?: string | null;
  revision?: number;
  metadata?: WorkbookMetadata;
}
