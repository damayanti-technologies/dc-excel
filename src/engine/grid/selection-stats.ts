import { CellRange, CellCoordinates, SparseCellMap } from '@/types/cell';
import { keyToCoord } from '@/utils/coordinates';

export interface SelectionStatistics {
  cellCount: number;
  numericCount: number;
  sum: number;
  average: number;
  min: number;
  max: number;
  hasNumbers: boolean;
}

/**
 * Computes live selection statistics (Sum, Average, Min, Max, Count, Numeric Count)
 * for the currently active or selected range in the sheet.
 * Uses the sparse cell map for lightning-fast calculations even on massive selections.
 */
export function calculateSelectionStatistics(
  range: CellRange | null,
  activeCell: CellCoordinates | null,
  cells: SparseCellMap
): SelectionStatistics {
  const targetRange: CellRange | null = range || (activeCell ? {
    startRow: activeCell.row,
    startCol: activeCell.col,
    endRow: activeCell.row,
    endCol: activeCell.col
  } : null);

  if (!targetRange) {
    return {
      cellCount: 0,
      numericCount: 0,
      sum: 0,
      average: 0,
      min: 0,
      max: 0,
      hasNumbers: false
    };
  }

  const rMin = Math.min(targetRange.startRow, targetRange.endRow);
  const rMax = Math.max(targetRange.startRow, targetRange.endRow);
  const cMin = Math.min(targetRange.startCol, targetRange.endCol);
  const cMax = Math.max(targetRange.startCol, targetRange.endCol);

  const totalCells = (rMax - rMin + 1) * (cMax - cMin + 1);

  let numericCount = 0;
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;

  // Determine whether to scan the bounding box or the populated keys in the sparse map
  const boxSize = totalCells;
  const populatedKeys = Object.keys(cells);

  if (boxSize <= populatedKeys.length && boxSize <= 5000) {
    // Small range: directly check cells within box
    for (let r = rMin; r <= rMax; r++) {
      for (let c = cMin; c <= cMax; c++) {
        const cell = cells[`${r}:${c}`];
        if (cell && cell.value !== null && cell.value !== undefined && cell.value !== '') {
          const num = typeof cell.value === 'number' ? cell.value : Number(cell.value);
          if (!isNaN(num) && typeof cell.value !== 'boolean') {
            numericCount++;
            sum += num;
            if (num < min) min = num;
            if (num > max) max = num;
          }
        }
      }
    }
  } else {
    // Large range or entire column/sheet: iterate populated sparse keys
    for (let i = 0; i < populatedKeys.length; i++) {
      const key = populatedKeys[i];
      if (!key) continue;
      const coord = keyToCoord(key);
      if (
        coord.row >= rMin &&
        coord.row <= rMax &&
        coord.col >= cMin &&
        coord.col <= cMax
      ) {
        const cell = cells[key];
        if (cell && cell.value !== null && cell.value !== undefined && cell.value !== '') {
          const num = typeof cell.value === 'number' ? cell.value : Number(cell.value);
          if (!isNaN(num) && typeof cell.value !== 'boolean') {
            numericCount++;
            sum += num;
            if (num < min) min = num;
            if (num > max) max = num;
          }
        }
      }
    }
  }

  const hasNumbers = numericCount > 0;
  const average = hasNumbers ? sum / numericCount : 0;

  return {
    cellCount: totalCells,
    numericCount,
    sum: hasNumbers ? sum : 0,
    average: hasNumbers ? average : 0,
    min: hasNumbers ? min : 0,
    max: hasNumbers ? max : 0,
    hasNumbers
  };
}
