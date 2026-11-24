import { CellCoordinates, CellRange, SparseCellMap } from '@/types/cell';
import { Sheet } from '@/types/sheet';
import { coordToKey } from '@/utils/coordinates';

/**
 * Normalizes a CellRange so that start is top-left and end is bottom-right.
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
 * Checks if two CellRanges intersect.
 */
export function rangesIntersect(r1: CellRange, r2: CellRange): boolean {
  const n1 = normalizeRange(r1);
  const n2 = normalizeRange(r2);

  return !(
    n1.endRow < n2.startRow ||
    n1.startRow > n2.endRow ||
    n1.endCol < n2.startCol ||
    n1.startCol > n2.endCol
  );
}

/**
 * Checks if two CellRanges are identical.
 */
export function rangesEqual(r1: CellRange, r2: CellRange): boolean {
  const n1 = normalizeRange(r1);
  const n2 = normalizeRange(r2);
  return (
    n1.startRow === n2.startRow &&
    n1.startCol === n2.startCol &&
    n1.endRow === n2.endRow &&
    n1.endCol === n2.endCol
  );
}

/**
 * Finds the merged range that encloses the given cell, or null if cell is not merged.
 */
export function getMergedRangeForCell(
  mergedRanges: CellRange[] | undefined,
  row: number,
  col: number
): CellRange | null {
  if (!mergedRanges || mergedRanges.length === 0) return null;

  for (const m of mergedRanges) {
    const n = normalizeRange(m);
    if (row >= n.startRow && row <= n.endRow && col >= n.startCol && col <= n.endCol) {
      return n;
    }
  }

  return null;
}

/**
 * Determines whether a cell is the primary anchor (top-left) of a merged range.
 */
export function isMergeAnchor(mergedRange: CellRange, row: number, col: number): boolean {
  const n = normalizeRange(mergedRange);
  return n.startRow === row && n.startCol === col;
}

/**
 * Determines whether a cell is covered by a merge (i.e., inside a merged range but NOT the anchor).
 */
export function isCellCoveredByMerge(
  mergedRanges: CellRange[] | undefined,
  row: number,
  col: number
): boolean {
  const m = getMergedRangeForCell(mergedRanges, row, col);
  if (!m) return false;
  return !isMergeAnchor(m, row, col);
}

/**
 * Checks whether any cell other than the top-left anchor has populated content in a target merge range.
 */
export function checkNonAnchorPopulated(
  cells: SparseCellMap,
  range: CellRange
): { hasPopulated: boolean; populatedCoords: CellCoordinates[] } {
  const n = normalizeRange(range);
  const populatedCoords: CellCoordinates[] = [];

  for (let r = n.startRow; r <= n.endRow; r++) {
    for (let c = n.startCol; c <= n.endCol; c++) {
      if (r === n.startRow && c === n.startCol) continue; // skip anchor

      const key = coordToKey(r, c);
      const cell = cells[key];
      if (cell && (cell.value !== null && cell.value !== undefined && cell.value !== '' || cell.formula)) {
        populatedCoords.push({ row: r, col: c });
      }
    }
  }

  return {
    hasPopulated: populatedCoords.length > 0,
    populatedCoords
  };
}

/**
 * Checks if a target range can be safely merged without conflicting with existing partial merges.
 */
export function canMergeRange(
  existingMerges: CellRange[] | undefined,
  targetRange: CellRange
): { canMerge: boolean; reason?: string } {
  const n = normalizeRange(targetRange);

  if (n.startRow === n.endRow && n.startCol === n.endCol) {
    return { canMerge: false, reason: 'Range must contain at least 2 cells to merge.' };
  }

  if (!existingMerges || existingMerges.length === 0) {
    return { canMerge: true };
  }

  for (const m of existingMerges) {
    if (rangesEqual(m, n)) {
      return { canMerge: false, reason: 'Range is already merged.' };
    }
    if (rangesIntersect(m, n)) {
      return {
        canMerge: false,
        reason: 'Cannot merge range that partially intersects an existing merged cell. Unmerge first.'
      };
    }
  }

  return { canMerge: true };
}

/**
 * Executes a merge operation on a sheet.
 * Supports:
 * - 'all': Single merged rectangular range.
 * - 'across': Merges each row horizontally.
 * - 'center': Single merged rectangular range with center alignment on anchor.
 */
export function mergeRange(
  sheet: Sheet,
  range: CellRange,
  mode: 'all' | 'across' | 'center' = 'all'
): { updatedSheet: Sheet; mergedRangesAdded: CellRange[] } {
  const n = normalizeRange(range);
  const existing = sheet.mergedRanges ? [...sheet.mergedRanges] : [];
  const added: CellRange[] = [];
  const updatedCells: SparseCellMap = { ...sheet.cells };

  if (mode === 'across') {
    // Merge each row across the columns
    for (let r = n.startRow; r <= n.endRow; r++) {
      if (n.startCol < n.endCol) {
        const rowRange: CellRange = {
          startRow: r,
          startCol: n.startCol,
          endRow: r,
          endCol: n.endCol
        };
        existing.push(rowRange);
        added.push(rowRange);
      }
    }
  } else {
    // 'all' or 'center'
    existing.push(n);
    added.push(n);

    if (mode === 'center') {
      const anchorKey = coordToKey(n.startRow, n.startCol);
      const anchorCell = updatedCells[anchorKey];
      if (anchorCell) {
        updatedCells[anchorKey] = {
          ...anchorCell,
          style: {
            ...(anchorCell.style || {}),
            horizontalAlignment: 'center'
          }
        };
      } else {
        updatedCells[anchorKey] = {
          value: null,
          dataType: 'empty',
          style: {
            horizontalAlignment: 'center'
          }
        };
      }
    }
  }

  return {
    updatedSheet: {
      ...sheet,
      cells: updatedCells,
      mergedRanges: existing
    },
    mergedRangesAdded: added
  };
}

/**
 * Unmerges any merged ranges that intersect with the given range.
 */
export function unmergeRange(
  sheet: Sheet,
  range: CellRange
): { updatedSheet: Sheet; unmergedCount: number } {
  if (!sheet.mergedRanges || sheet.mergedRanges.length === 0) {
    return { updatedSheet: sheet, unmergedCount: 0 };
  }

  const n = normalizeRange(range);
  const remaining: CellRange[] = [];
  let unmergedCount = 0;

  for (const m of sheet.mergedRanges) {
    if (rangesIntersect(m, n)) {
      unmergedCount++;
    } else {
      remaining.push(m);
    }
  }

  return {
    updatedSheet: {
      ...sheet,
      mergedRanges: remaining
    },
    unmergedCount
  };
}
