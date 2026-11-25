import { Sheet } from '@/types/sheet';
import { SparseCellMap } from '@/types/cell';
import { coordToKey, keyToCoord } from '@/utils/coordinates';
import { shiftFormulaReferences } from '@/engine/calculation/formula-shifter';
import { DEFAULT_GRID_CONFIG } from './constants';

/**
 * Inserts a row at the specified index, shifting existing rows down and updating all formula references.
 */
export function insertRow(sheet: Sheet, atRow: number, position: 'above' | 'below' = 'above'): Sheet {
  const targetIndex = position === 'below' ? atRow + 1 : atRow;
  const newCells: SparseCellMap = {};

  for (const [key, cell] of Object.entries(sheet.cells)) {
    const { row, col } = keyToCoord(key);
    const newCoord = row >= targetIndex ? coordToKey(row + 1, col) : key;
    const updatedFormula = cell.formula
      ? shiftFormulaReferences(cell.formula, { type: 'row_insert', atRow: targetIndex, count: 1 })
      : undefined;

    newCells[newCoord] = {
      ...cell,
      formula: updatedFormula
    };
  }

  const newRowHeights: Record<number, number> = {};
  if (sheet.rowHeights) {
    for (const [rStr, h] of Object.entries(sheet.rowHeights)) {
      const r = Number.parseInt(rStr, 10);
      if (r >= targetIndex) {
        newRowHeights[r + 1] = h;
      } else {
        newRowHeights[r] = h;
      }
    }
  }

  return {
    ...sheet,
    rowCount: sheet.rowCount + 1,
    cells: newCells,
    rowHeights: newRowHeights
  };
}

/**
 * Deletes a row at the specified index, shifting remaining rows up and updating formula references (or creating #REF!).
 */
export function deleteRow(sheet: Sheet, atRow: number): Sheet {
  if (sheet.rowCount <= 1) {
    return sheet; // Do not delete the only row
  }

  const newCells: SparseCellMap = {};

  for (const [key, cell] of Object.entries(sheet.cells)) {
    const { row, col } = keyToCoord(key);
    if (row === atRow) {
      // Discard deleted row's cells
      continue;
    }

    const newCoord = row > atRow ? coordToKey(row - 1, col) : key;
    const updatedFormula = cell.formula
      ? shiftFormulaReferences(cell.formula, { type: 'row_delete', atRow, count: 1 })
      : undefined;

    newCells[newCoord] = {
      ...cell,
      formula: updatedFormula
    };
  }

  const newRowHeights: Record<number, number> = {};
  if (sheet.rowHeights) {
    for (const [rStr, h] of Object.entries(sheet.rowHeights)) {
      const r = Number.parseInt(rStr, 10);
      if (r === atRow) {
        continue;
      } else if (r > atRow) {
        newRowHeights[r - 1] = h;
      } else {
        newRowHeights[r] = h;
      }
    }
  }

  return {
    ...sheet,
    rowCount: Math.max(1, sheet.rowCount - 1),
    cells: newCells,
    rowHeights: newRowHeights
  };
}

/**
 * Inserts a column at the specified index, shifting existing columns right and updating formula references.
 */
export function insertColumn(sheet: Sheet, atCol: number, position: 'before' | 'after' = 'before'): Sheet {
  const targetIndex = position === 'after' ? atCol + 1 : atCol;
  const newCells: SparseCellMap = {};

  for (const [key, cell] of Object.entries(sheet.cells)) {
    const { row, col } = keyToCoord(key);
    const newCoord = col >= targetIndex ? coordToKey(row, col + 1) : key;
    const updatedFormula = cell.formula
      ? shiftFormulaReferences(cell.formula, { type: 'col_insert', atCol: targetIndex, count: 1 })
      : undefined;

    newCells[newCoord] = {
      ...cell,
      formula: updatedFormula
    };
  }

  const newColWidths: Record<number, number> = {};
  if (sheet.columnWidths) {
    for (const [cStr, w] of Object.entries(sheet.columnWidths)) {
      const c = Number.parseInt(cStr, 10);
      if (c >= targetIndex) {
        newColWidths[c + 1] = w;
      } else {
        newColWidths[c] = w;
      }
    }
  }

  return {
    ...sheet,
    columnCount: sheet.columnCount + 1,
    cells: newCells,
    columnWidths: newColWidths
  };
}

/**
 * Deletes a column at the specified index, shifting remaining columns left and updating formula references.
 */
export function deleteColumn(sheet: Sheet, atCol: number): Sheet {
  if (sheet.columnCount <= 1) {
    return sheet; // Do not delete the only column
  }

  const newCells: SparseCellMap = {};

  for (const [key, cell] of Object.entries(sheet.cells)) {
    const { row, col } = keyToCoord(key);
    if (col === atCol) {
      // Discard deleted column's cells
      continue;
    }

    const newCoord = col > atCol ? coordToKey(row, col - 1) : key;
    const updatedFormula = cell.formula
      ? shiftFormulaReferences(cell.formula, { type: 'col_delete', atCol, count: 1 })
      : undefined;

    newCells[newCoord] = {
      ...cell,
      formula: updatedFormula
    };
  }

  const newColWidths: Record<number, number> = {};
  if (sheet.columnWidths) {
    for (const [cStr, w] of Object.entries(sheet.columnWidths)) {
      const c = Number.parseInt(cStr, 10);
      if (c === atCol) {
        continue;
      } else if (c > atCol) {
        newColWidths[c - 1] = w;
      } else {
        newColWidths[c] = w;
      }
    }
  }

  return {
    ...sheet,
    columnCount: Math.max(1, sheet.columnCount - 1),
    cells: newCells,
    columnWidths: newColWidths
  };
}

/**
 * Resizes a row height, clamping to min/max configuration limits.
 */
export function resizeRowHeight(sheet: Sheet, row: number, height: number): Sheet {
  const clamped = Math.max(
    DEFAULT_GRID_CONFIG.minRowHeight,
    Math.min(DEFAULT_GRID_CONFIG.maxRowHeight, Math.round(height))
  );

  return {
    ...sheet,
    rowHeights: {
      ...(sheet.rowHeights || {}),
      [row]: clamped
    }
  };
}

/**
 * Resizes a column width, clamping to min/max configuration limits.
 */
export function resizeColumnWidth(sheet: Sheet, col: number, width: number): Sheet {
  const clamped = Math.max(
    DEFAULT_GRID_CONFIG.minColWidth,
    Math.min(DEFAULT_GRID_CONFIG.maxColWidth, Math.round(width))
  );

  return {
    ...sheet,
    columnWidths: {
      ...(sheet.columnWidths || {}),
      [col]: clamped
    }
  };
}
