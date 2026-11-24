import { CellCoordinates, CellRange } from '@/types/cell';

/**
 * Converts zero-indexed (row, col) coordinates to sparse storage key (e.g. "0:0", "4:12").
 */
export function coordToKey(row: number, col: number): string {
  return `${row}:${col}`;
}

/**
 * Parses sparse storage key back to zero-indexed CellCoordinates.
 */
export function keyToCoord(key: string): CellCoordinates {
  const parts = key.split(':');
  if (parts.length !== 2) {
    throw new Error(`Invalid coordinate key format: "${key}". Expected "row:col".`);
  }
  const row = Number.parseInt(parts[0]!, 10);
  const col = Number.parseInt(parts[1]!, 10);
  if (Number.isNaN(row) || Number.isNaN(col)) {
    throw new Error(`Invalid numeric coordinates in key: "${key}"`);
  }
  return { row, col };
}

/**
 * Safely parses sparse storage key back to zero-indexed CellCoordinates, or null if invalid.
 */
export function parseKey(key: string): CellCoordinates | null {
  try {
    return keyToCoord(key);
  } catch {
    return null;
  }
}

/**
 * Converts 0-indexed column number to Excel-style column label (e.g., 0 -> A, 25 -> Z, 26 -> AA).
 */
export function colIndexToName(col: number): string {
  if (col < 0) {
    throw new Error(`Column index cannot be negative: ${col}`);
  }
  let dividend = col + 1;
  let columnName = '';

  while (dividend > 0) {
    const modulo = (dividend - 1) % 26;
    columnName = String.fromCharCode(65 + modulo) + columnName;
    dividend = Math.floor((dividend - modulo) / 26);
  }

  return columnName;
}

/**
 * Converts Excel-style column label to 0-indexed column number (e.g., A -> 0, Z -> 25, AA -> 26).
 */
export function nameToColIndex(name: string): number {
  const cleanName = name.toUpperCase().trim();
  if (!cleanName || !/^[A-Z]+$/.test(cleanName)) {
    throw new Error(`Invalid column name: "${name}"`);
  }
  let index = 0;
  for (let i = 0; i < cleanName.length; i++) {
    index = index * 26 + (cleanName.charCodeAt(i) - 64);
  }
  return index - 1;
}

/**
 * Converts 0-indexed coordinates to Excel A1 notation (e.g., { row: 0, col: 0 } -> "A1").
 */
export function coordToA1(coord: CellCoordinates): string {
  return `${colIndexToName(coord.col)}${coord.row + 1}`;
}

/**
 * Parses Excel A1 notation to 0-indexed coordinates (e.g., "A1" -> { row: 0, col: 0 }).
 */
export function a1ToCoord(a1: string): CellCoordinates | null {
  const match = a1.trim().toUpperCase().match(/^([A-Z]+)([1-9][0-9]*)$/);
  if (!match) return null;
  const colName = match[1]!;
  const rowNum = Number.parseInt(match[2]!, 10);
  return {
    row: rowNum - 1,
    col: nameToColIndex(colName)
  };
}

/**
 * Formats a CellRange to Excel range notation (e.g., "A1:C10").
 */
export function rangeToA1(range: CellRange): string {
  const start = coordToA1({ row: range.startRow, col: range.startCol });
  const end = coordToA1({ row: range.endRow, col: range.endCol });
  return `${start}:${end}`;
}

/**
 * Parses an Excel range notation into a CellRange (e.g., "A1:C10" or single "B2").
 */
export function a1ToRange(a1Range: string): CellRange | null {
  const parts = a1Range.trim().toUpperCase().split(':');
  if (parts.length === 1 && parts[0]) {
    const c = a1ToCoord(parts[0]);
    if (!c) return null;
    return { startRow: c.row, startCol: c.col, endRow: c.row, endCol: c.col };
  }
  if (parts.length === 2 && parts[0] && parts[1]) {
    const start = a1ToCoord(parts[0]);
    const end = a1ToCoord(parts[1]);
    if (!start || !end) return null;
    return {
      startRow: Math.min(start.row, end.row),
      startCol: Math.min(start.col, end.col),
      endRow: Math.max(start.row, end.row),
      endCol: Math.max(start.col, end.col)
    };
  }
  return null;
}

/**
 * Checks if a coordinate is within a range.
 */
export function isCoordInRange(coord: CellCoordinates, range: CellRange): boolean {
  return (
    coord.row >= range.startRow &&
    coord.row <= range.endRow &&
    coord.col >= range.startCol &&
    coord.col <= range.endCol
  );
}
