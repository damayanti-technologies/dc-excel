import { CellRange, SparseCellMap } from './cell';
import { FreezePaneConfig, FilterConfig, DataValidationRule } from './data-tools';
import { ConditionalFormatRule, RowGroup, SubtotalConfig, PivotTableConfig } from './analysis';

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
  freezePanes?: FreezePaneConfig;
  filterConfig?: FilterConfig;
  hiddenRows?: number[];
  dataValidations?: DataValidationRule[];
  conditionalFormats?: ConditionalFormatRule[];
  rowGroups?: RowGroup[];
  subtotals?: SubtotalConfig;
  pivotTables?: PivotTableConfig[];
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
