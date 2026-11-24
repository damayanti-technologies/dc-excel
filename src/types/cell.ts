/**
 * Cell data types supported by OmniSheet.
 */
export type CellDataType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'formula'
  | 'error'
  | 'empty';

/**
 * Primitive cell value types.
 */
export type CellValue = string | number | boolean | Date | null;

/**
 * 0-indexed cell coordinates.
 */
export interface CellCoordinates {
  row: number;
  col: number;
}

/**
 * Rectangular range of cells.
 */
export interface CellRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

/**
 * Border style definition for a single side.
 */
export interface CellBorder {
  style: 'thin' | 'medium' | 'thick' | 'double' | 'dashed' | 'none';
  color: string;
}

/**
 * Cell border configurations.
 */
export interface CellBorders {
  top?: CellBorder;
  right?: CellBorder;
  bottom?: CellBorder;
  left?: CellBorder;
}

/**
 * Comprehensive visual formatting options for a cell.
 */
export interface CellStyle {
  font?: string;
  fontFamily?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  textColor?: string;
  backgroundColor?: string;
  horizontalAlignment?: 'left' | 'center' | 'right' | 'justify';
  verticalAlignment?: 'top' | 'middle' | 'bottom';
  wrapText?: boolean;
  textOverflow?: 'clip' | 'overflow' | 'wrap';
  indentation?: number;
  borders?: CellBorders;
  numberFormat?: string; // Standard format pattern, e.g. "General", "$#,##0.00", "0.00%", "YYYY-MM-DD"
}

/**
 * Optional metadata attached to a cell (e.g. comments, validations, hyperlinks).
 */
export interface CellMetadata {
  comment?: string;
  hyperlink?: string;
  validationRuleId?: string;
  locked?: boolean;
  custom?: Record<string, unknown>;
}

/**
 * Core Cell data model.
 */
export interface Cell {
  value: CellValue;
  formula?: string;
  dataType: CellDataType;
  style?: CellStyle;
  metadata?: CellMetadata;
}

/**
 * Sparse cell storage mapping:
 * Key format is "${row}:${col}" (e.g., "0:0", "4:12").
 *
 * This design avoids allocating memory for empty, unformatted cells,
 * ensuring workbooks with millions of potential grid cells occupy
 * minimal memory and storage.
 */
export type SparseCellMap = Record<string, Cell>;
