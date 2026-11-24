import { CellRange, SparseCellMap } from './cell';

export type { CellRange, SparseCellMap };

/**
 * Metadata configuration for a sheet tab.
 */
export interface SheetMetadata {
  isHidden?: boolean;
  tabColor?: string;
  isProtected?: boolean;
  zoom?: number;
  showGridLines?: boolean;
  showRowColHeaders?: boolean;
}

/**
 * Sheet data model representing a single spreadsheet worksheet.
 */
export interface Sheet {
  id: string;
  workbookId: string;
  name: string;
  index: number;
  rowCount: number;
  columnCount: number;
  cells: SparseCellMap;
  rowHeights?: Record<number, number>;
  columnWidths?: Record<number, number>;
  mergedRanges?: CellRange[];
  metadata?: SheetMetadata;
}

/**
 * Lightweight sheet summary used for tab lists without loading all cells into memory.
 */
export interface SheetSummary {
  id: string;
  workbookId: string;
  name: string;
  index: number;
  rowCount: number;
  columnCount: number;
  cellCount: number;
  metadata?: SheetMetadata;
}
