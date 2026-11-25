import { SparseCellMap } from '@/types/sheet';
import { Cell, CellRange, CellCoordinates } from '@/types/cell';
import { SortConfig } from '@/types/data-tools';
import { coordToKey, parseKey } from '@/utils/coordinates';
import { shiftFormulaReferences } from '@/engine/calculation/formula-shifter';

/**
 * Compares two cell values in standard spreadsheet order:
 * 1. Numbers / Dates compared numerically
 * 2. Strings compared via localeCompare
 * 3. Booleans (FALSE < TRUE)
 * 4. Blanks / empty cells are ALWAYS placed at the very bottom in both ASC and DESC
 */
export function compareCellValues(
  val1: unknown,
  val2: unknown,
  direction: 'asc' | 'desc' = 'asc'
): number {
  const isBlank1 = val1 === null || val1 === undefined || val1 === '';
  const isBlank2 = val2 === null || val2 === undefined || val2 === '';

  // Blanks always sort to the bottom regardless of direction
  if (isBlank1 && isBlank2) return 0;
  if (isBlank1) return 1;
  if (isBlank2) return -1;

  const mult = direction === 'desc' ? -1 : 1;

  // Numbers or numeric strings
  const num1 = typeof val1 === 'number' ? val1 : Number(val1);
  const num2 = typeof val2 === 'number' ? val2 : Number(val2);
  const isNum1 = !Number.isNaN(num1) && typeof val1 !== 'boolean';
  const isNum2 = !Number.isNaN(num2) && typeof val2 !== 'boolean';

  if (isNum1 && isNum2) {
    return (num1 - num2) * mult;
  }

  // Dates
  if (val1 instanceof Date && val2 instanceof Date) {
    return (val1.getTime() - val2.getTime()) * mult;
  }

  // Booleans
  if (typeof val1 === 'boolean' && typeof val2 === 'boolean') {
    return (Number(val1) - Number(val2)) * mult;
  }

  // Strings
  return String(val1).localeCompare(String(val2), undefined, { numeric: true, sensitivity: 'base' }) * mult;
}

/**
 * Automatically detects the contiguous rectangular data range around a single cell coordinate.
 */
export function detectTableRange(
  cells: SparseCellMap,
  startCoord: CellCoordinates,
  maxRows = 1000,
  maxCols = 50
): CellRange {
  const populatedCoords: CellCoordinates[] = [];

  for (const key of Object.keys(cells)) {
    const coord = parseKey(key);
    if (coord) {
      populatedCoords.push(coord);
    }
  }

  if (populatedCoords.length === 0) {
    return {
      startRow: startCoord.row,
      startCol: startCoord.col,
      endRow: startCoord.row,
      endCol: startCoord.col
    };
  }

  // Find contiguous bounding box
  let minRow = startCoord.row;
  let maxRow = startCoord.row;
  let minCol = startCoord.col;
  let maxCol = startCoord.col;

  // Expand bounds to include any cell that shares or is adjacent to populated cells
  let expanded = true;
  while (expanded) {
    expanded = false;
    for (const c of populatedCoords) {
      if (
        c.row >= Math.max(0, minRow - 1) &&
        c.row <= Math.min(maxRows - 1, maxRow + 1) &&
        c.col >= Math.max(0, minCol - 1) &&
        c.col <= Math.min(maxCols - 1, maxCol + 1)
      ) {
        if (c.row < minRow) { minRow = c.row; expanded = true; }
        if (c.row > maxRow) { maxRow = c.row; expanded = true; }
        if (c.col < minCol) { minCol = c.col; expanded = true; }
        if (c.col > maxCol) { maxCol = c.col; expanded = true; }
      }
    }
  }

  return {
    startRow: minRow,
    startCol: minCol,
    endRow: maxRow,
    endCol: maxCol
  };
}

/**
 * Sorts rows within the specified range according to multi-level sorting criteria.
 * Preserves all columns in each row to ensure records are not separated.
 */
export function sortRange(cells: SparseCellMap, config: SortConfig): SparseCellMap {
  const { range, levels, hasHeaders } = config;
  const dataStartRow = hasHeaders ? range.startRow + 1 : range.startRow;
  const dataEndRow = range.endRow;

  if (dataStartRow >= dataEndRow || levels.length === 0) {
    return { ...cells };
  }

  // 1. Collect each row's data slice
  interface RowRecord {
    originalRow: number;
    cells: Map<number, Cell>; // col -> cell object
  }

  const rows: RowRecord[] = [];
  for (let r = dataStartRow; r <= dataEndRow; r++) {
    const rowMap = new Map<number, Cell>();
    for (let c = range.startCol; c <= range.endCol; c++) {
      const key = coordToKey(r, c);
      const cell = cells[key];
      if (cell) {
        rowMap.set(c, { ...cell });
      }
    }
    rows.push({ originalRow: r, cells: rowMap });
  }

  // 2. Multi-level sort
  rows.sort((rowA, rowB) => {
    for (const level of levels) {
      const cellA = rowA.cells.get(level.col);
      const cellB = rowB.cells.get(level.col);
      const cmp = compareCellValues(cellA?.value, cellB?.value, level.direction);
      if (cmp !== 0) {
        return cmp;
      }
    }
    return rowA.originalRow - rowB.originalRow;
  });

  // 3. Write sorted row data back to SparseCellMap
  const updatedCells: SparseCellMap = { ...cells };

  // First, clear old range cells from the map
  for (let r = dataStartRow; r <= dataEndRow; r++) {
    for (let c = range.startCol; c <= range.endCol; c++) {
      delete updatedCells[coordToKey(r, c)];
    }
  }

  // Second, assign sorted cells to their new row positions, shifting formulas if row moved
  rows.forEach((rowRecord, idx) => {
    const targetRow = dataStartRow + idx;
    const deltaRow = targetRow - rowRecord.originalRow;
    for (const [col, cell] of rowRecord.cells.entries()) {
      if (cell) {
        let cellToPlace = cell;
        if (cell.formula && deltaRow !== 0) {
          const shiftedFormula = shiftFormulaReferences(cell.formula, {
            type: 'offset',
            deltaRow,
            deltaCol: 0,
          });
          cellToPlace = { ...cell, formula: shiftedFormula };
        }
        updatedCells[coordToKey(targetRow, col)] = cellToPlace;
      }
    }
  });

  return updatedCells;
}
