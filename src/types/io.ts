import { CellRange } from './cell';
import { Sheet } from './sheet';

/**
 * Supported file formats for import and export.
 */
export type SupportedImportFormat = 'xlsx' | 'xls' | 'csv' | 'tsv';
export type SupportedExportFormat = 'xlsx' | 'csv' | 'tsv';

/**
 * Delimiter options for CSV/TSV import and export.
 */
export type DelimiterOption = ',' | ';' | '\t' | '|' | string;

/**
 * CSV / TSV Import Configuration.
 */
export interface CsvImportConfig {
  delimiter: DelimiterOption;
  quoteChar: string;
  hasHeaders: boolean;
  autoTypeDetection: boolean;
  emptyCellHandling: 'empty' | 'null';
  encoding: 'utf-8';
}

/**
 * CSV / TSV Export Configuration.
 */
export interface CsvExportConfig {
  delimiter: DelimiterOption;
  quoteChar: string;
  includeHeaders: boolean;
  exportFormulas: boolean; // false = export calculated values; true = export formula string
  formulaInjectionProtection: boolean; // prefix dangerous prefixes (=, +, -, @) with '
  selectedRange?: CellRange;
  lineEnding?: '\n' | '\r\n';
}

/**
 * Excel (.xlsx) Export Configuration.
 */
export interface ExcelExportConfig {
  fileName: string;
  selectedSheetIds?: string[]; // If omitted, exports all non-hidden sheets
  includeHiddenSheets?: boolean;
}

/**
 * Level of compatibility detected for a specific feature.
 */
export type CompatibilityLevel = 'full' | 'partial' | 'unsupported';

/**
 * Feature Compatibility Breakdown.
 */
export interface FeatureCompatibilityReport {
  cellValues: CompatibilityLevel;
  formulas: CompatibilityLevel;
  formatting: CompatibilityLevel;
  charts: CompatibilityLevel;
  namedRanges: CompatibilityLevel;
  dataValidation: CompatibilityLevel;
  freezePanes: CompatibilityLevel;
}

/**
 * Parsed File Metadata and Compatibility Summary.
 */
export interface FilePreviewSummary {
  fileName: string;
  fileSize: number;
  fileType: SupportedImportFormat;
  workbookName: string;
  sheetNames: string[];
  sheetDimensions: Record<string, { rowCount: number; columnCount: number; cellCount: number }>;
  warnings: string[];
  compatibility: FeatureCompatibilityReport;
  sampleRows: Record<string, (string | number | boolean | null)[][]>; // sheetName -> 2D preview
}

/**
 * Options chosen by user in the Import Dialog.
 */
export interface ImportExecutionOptions {
  fileName: string;
  selectedSheetNames: string[];
  workbookName: string;
  targetWorkbook: 'new' | 'current';
  csvConfig?: CsvImportConfig;
}

/**
 * Result of a file import operation.
 */
export interface ImportResult {
  success: boolean;
  workbookId: string;
  workbookName: string;
  sheetCount: number;
  totalCellCount: number;
  warnings: string[];
  sheets: Sheet[];
}
