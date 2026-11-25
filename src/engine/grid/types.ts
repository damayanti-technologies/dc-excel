import { CellRange, Cell, SparseCellMap } from '@/types/cell';

/**
 * Grid configuration parameters.
 */
export interface GridConfig {
  defaultRowHeight: number;
  defaultColWidth: number;
  rowHeaderWidth: number;
  colHeaderHeight: number;
  minRowHeight: number;
  minColWidth: number;
  maxRowHeight: number;
  maxColWidth: number;
  defaultRowCount: number;
  defaultColumnCount: number;
  rowOverscan: number;
  colOverscan: number;
}

/**
 * Calculated visible viewport metrics for 2D virtualization.
 */
export interface GridViewport {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
  scrollTop: number;
  scrollLeft: number;
  viewportWidth: number;
  viewportHeight: number;
  totalWidth: number;
  totalHeight: number;
}

/**
 * Pixel bounding box rectangle.
 */
export interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Active row or column header resize interaction state.
 */
export interface ResizeTarget {
  type: 'row' | 'col';
  index: number;
  startPos: number;
  initialSize: number;
  currentSize: number;
}

/**
 * Clipboard data payload for spreadsheet copy & paste.
 */
export interface ClipboardPayload {
  rawText: string;
  matrix: string[][];
  cells: SparseCellMap;
  rowCount: number;
  colCount: number;
  sourceRange?: CellRange;
}

/**
 * Result of pasting clipboard content into the spreadsheet sheet.
 */
export interface PasteResult {
  updatedCells: Record<string, Cell>;
  pastedRange: CellRange;
  newRowCount?: number;
  newColCount?: number;
}
