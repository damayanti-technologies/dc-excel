import { CellCoordinates, CellRange } from '@/types/cell';
import { coordToA1 } from '@/utils/coordinates';

/**
 * Normalizes a range so start <= end for both row and col.
 */
export function normalizeRange(range: CellRange): CellRange {
  return {
    startRow: Math.min(range.startRow, range.endRow),
    startCol: Math.min(range.startCol, range.endCol),
    endRow: Math.max(range.startRow, range.endRow),
    endCol: Math.max(range.startCol, range.endCol)
  };
}

/**
 * Creates a normalized range from an anchor coordinate and a current coordinate.
 */
export function createRange(anchor: CellCoordinates, current: CellCoordinates): CellRange {
  return normalizeRange({
    startRow: anchor.row,
    startCol: anchor.col,
    endRow: current.row,
    endCol: current.col
  });
}

/**
 * Checks whether a coordinate lies within a range.
 */
export function isCellInRange(coord: CellCoordinates, range: CellRange | null): boolean {
  if (!range) return false;
  const norm = normalizeRange(range);
  return (
    coord.row >= norm.startRow &&
    coord.row <= norm.endRow &&
    coord.col >= norm.startCol &&
    coord.col <= norm.endCol
  );
}

/**
 * Checks whether a coordinate is the active cell.
 */
export function isCellActive(coord: CellCoordinates, active: CellCoordinates | null): boolean {
  if (!active) return false;
  return coord.row === active.row && coord.col === active.col;
}

/**
 * Checks if a range represents a single cell.
 */
export function isSingleCell(range: CellRange | null): boolean {
  if (!range) return false;
  return range.startRow === range.endRow && range.startCol === range.endCol;
}

/**
 * Calculates number of rows and columns in a range.
 */
export function getRangeDimensions(range: CellRange): { rows: number; cols: number } {
  const norm = normalizeRange(range);
  return {
    rows: norm.endRow - norm.startRow + 1,
    cols: norm.endCol - norm.startCol + 1
  };
}

/**
 * Formats a range for UI display (e.g. "A1", "A1:B5", or "3R × 2C" while actively dragging).
 */
export function formatRangeLabel(range: CellRange | null, isDragging = false): string {
  if (!range) return '';
  const norm = normalizeRange(range);
  if (isSingleCell(norm)) {
    return coordToA1({ row: norm.startRow, col: norm.startCol });
  }
  if (isDragging) {
    const { rows, cols } = getRangeDimensions(norm);
    return `${rows}R × ${cols}C`;
  }
  const start = coordToA1({ row: norm.startRow, col: norm.startCol });
  const end = coordToA1({ row: norm.endRow, col: norm.endCol });
  return `${start}:${end}`;
}

/**
 * Determines whether a given row or column header should be highlighted.
 */
export function isHeaderHighlighted(
  index: number,
  range: CellRange | null,
  type: 'row' | 'col'
): boolean {
  if (!range) return false;
  const norm = normalizeRange(range);
  if (type === 'row') {
    return index >= norm.startRow && index <= norm.endRow;
  }
  return index >= norm.startCol && index <= norm.endCol;
}
