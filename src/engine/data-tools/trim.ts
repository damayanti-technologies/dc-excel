/**
 * Trim Whitespace Engine
 * Cleans leading, trailing, and repeated whitespace from cells in a range.
 */

import type { Cell, CellRange } from '@/types/cell';
import type { TrimOptions } from '@/types/data-tools';
import { coordToKey } from '@/utils/coordinates';

export interface TrimResult {
  updatedCells: Record<string, Cell>;
  modifiedCount: number;
}

/**
 * Clean a string according to TrimOptions
 */
export function cleanString(text: string, options: TrimOptions): string {
  let res = text;
  if (options.leading && options.trailing) {
    res = res.trim();
  } else if (options.leading) {
    res = res.replace(/^\s+/, '');
  } else if (options.trailing) {
    res = res.replace(/\s+$/, '');
  }

  if (options.repeatedSpaces) {
    res = res.replace(/[^\S\r\n]+/g, ' '); // Collapses consecutive spaces/tabs into a single space
  }

  return res;
}

/**
 * Trim whitespace in all cells within a range
 */
export function trimWhitespace(
  cells: Record<string, Cell>,
  range: CellRange,
  options: TrimOptions = { leading: true, trailing: true, repeatedSpaces: true }
): TrimResult {
  const startRow = Math.min(range.startRow, range.endRow);
  const endRow = Math.max(range.startRow, range.endRow);
  const startCol = Math.min(range.startCol, range.endCol);
  const endCol = Math.max(range.startCol, range.endCol);

  const updatedCells: Record<string, Cell> = {};
  let modifiedCount = 0;

  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const key = coordToKey(r, c);
      const cell = cells[key];
      if (!cell || cell.value == null) continue;

      // Do not mutate formulas
      if (cell.formula) continue;

      if (typeof cell.value === 'string') {
        const cleaned = cleanString(cell.value, options);
        if (cleaned !== cell.value) {
          updatedCells[key] = {
            ...cell,
            value: cleaned,
          };
          modifiedCount++;
        }
      }
    }
  }

  return {
    updatedCells,
    modifiedCount,
  };
}
