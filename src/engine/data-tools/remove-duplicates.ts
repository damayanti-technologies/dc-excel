import { SparseCellMap } from '@/types/sheet';
import { Cell } from '@/types/cell';
import { RemoveDuplicatesConfig } from '@/types/data-tools';
import { coordToKey } from '@/utils/coordinates';

export interface RemoveDuplicatesPreview {
  totalRows: number;
  duplicateRowCount: number;
  uniqueRowCount: number;
  duplicateRowIndices: number[];
}

/**
 * Builds a string composite key representing the values of comparison columns in a row.
 */
function getRowCompositeKey(cells: SparseCellMap, row: number, compareCols: number[]): string {
  return compareCols
    .map((col) => {
      const cell = cells[coordToKey(row, col)];
      const val = cell?.value;
      return val === null || val === undefined ? '' : String(val).trim().toLowerCase();
    })
    .join('|||');
}

/**
 * Previews duplicate detection within a range without altering data.
 */
export function previewRemoveDuplicates(
  cells: SparseCellMap,
  config: RemoveDuplicatesConfig
): RemoveDuplicatesPreview {
  const { range, compareCols, hasHeaders } = config;
  const startRow = hasHeaders ? range.startRow + 1 : range.startRow;
  const endRow = range.endRow;

  if (startRow > endRow || compareCols.length === 0) {
    return {
      totalRows: 0,
      duplicateRowCount: 0,
      uniqueRowCount: 0,
      duplicateRowIndices: []
    };
  }

  const seenKeys = new Set<string>();
  const duplicateRowIndices: number[] = [];
  let totalRows = 0;

  for (let r = startRow; r <= endRow; r++) {
    totalRows++;
    const key = getRowCompositeKey(cells, r, compareCols);
    if (seenKeys.has(key)) {
      duplicateRowIndices.push(r);
    } else {
      seenKeys.add(key);
    }
  }

  return {
    totalRows,
    duplicateRowCount: duplicateRowIndices.length,
    uniqueRowCount: totalRows - duplicateRowIndices.length,
    duplicateRowIndices
  };
}

/**
 * Removes duplicate rows, shifts remaining rows upward, and cleans sparse cell records.
 */
export function executeRemoveDuplicates(
  cells: SparseCellMap,
  config: RemoveDuplicatesConfig
): { updatedCells: SparseCellMap; removedCount: number } {
  const preview = previewRemoveDuplicates(cells, config);
  if (preview.duplicateRowCount === 0) {
    return { updatedCells: { ...cells }, removedCount: 0 };
  }

  const { range, hasHeaders } = config;
  const startRow = hasHeaders ? range.startRow + 1 : range.startRow;
  const endRow = range.endRow;
  const duplicateSet = new Set(preview.duplicateRowIndices);

  // 1. Collect unique rows in original order
  const preservedRows: Array<Map<number, Cell>> = [];
  for (let r = startRow; r <= endRow; r++) {
    if (!duplicateSet.has(r)) {
      const rowMap = new Map<number, Cell>();
      for (let c = range.startCol; c <= range.endCol; c++) {
        const cell = cells[coordToKey(r, c)];
        if (cell) {
          rowMap.set(c, { ...cell });
        }
      }
      preservedRows.push(rowMap);
    }
  }

  // 2. Clear old range rows from map
  const updatedCells: SparseCellMap = { ...cells };
  for (let r = startRow; r <= endRow; r++) {
    for (let c = range.startCol; c <= range.endCol; c++) {
      delete updatedCells[coordToKey(r, c)];
    }
  }

  // 3. Write preserved rows back into shifted positions
  preservedRows.forEach((rowMap, idx) => {
    const targetRow = startRow + idx;
    for (const [col, cell] of rowMap.entries()) {
      updatedCells[coordToKey(targetRow, col)] = cell;
    }
  });

  return {
    updatedCells,
    removedCount: preview.duplicateRowCount
  };
}
