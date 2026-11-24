import { Cell, CellValue } from '../../types/cell';
import { SubtotalConfig, RowGroup } from '../../types/analysis';
import { coordToKey, keyToCoord, colIndexToName } from '../../utils/coordinates';

export interface SubtotalResult {
  newCells: Record<string, Cell>;
  newRowGroups: RowGroup[];
  rowsAdded: number;
}

/**
 * Maps aggregation string to Excel SUBTOTAL function code
 */
function getSubtotalFunctionCode(agg: SubtotalConfig['agg']): number {
  switch (agg) {
    case 'average':
      return 1;
    case 'count':
      return 2;
    case 'max':
      return 4;
    case 'min':
      return 5;
    case 'sum':
    default:
      return 9;
  }
}

/**
 * Computes an aggregate value for a list of numbers
 */
function computeAgg(numbers: number[], agg: SubtotalConfig['agg']): number {
  if (numbers.length === 0) return 0;
  switch (agg) {
    case 'average':
      return numbers.reduce((a, b) => a + b, 0) / numbers.length;
    case 'count':
      return numbers.length;
    case 'max':
      return Math.max(...numbers);
    case 'min':
      return Math.min(...numbers);
    case 'sum':
    default:
      return numbers.reduce((a, b) => a + b, 0);
  }
}

/**
 * Applies Subtotals to a range, inserting subtotal rows and generating outline groups.
 */
export function applySubtotals(
  config: SubtotalConfig,
  currentCells: Record<string, Cell>
): SubtotalResult {
  const { range, groupByCol, agg, targetCols, addGrandTotal } = config;
  const funcCode = getSubtotalFunctionCode(agg);

  const minRow = Math.min(range.startRow, range.endRow);
  const maxRow = Math.max(range.startRow, range.endRow);

  // Group consecutive rows with the same value in groupByCol
  interface GroupInfo {
    groupValue: CellValue;
    startRow: number;
    endRow: number;
  }

  const groups: GroupInfo[] = [];
  let currentVal: CellValue = null;
  let currentStart = minRow;

  for (let r = minRow; r <= maxRow; r++) {
    const key = coordToKey(r, groupByCol);
    const cellVal = currentCells[key]?.value ?? '';

    if (r === minRow) {
      currentVal = cellVal;
      currentStart = r;
    } else if (cellVal !== currentVal) {
      groups.push({
        groupValue: currentVal,
        startRow: currentStart,
        endRow: r - 1,
      });
      currentVal = cellVal;
      currentStart = r;
    }
  }

  // Final group
  groups.push({
    groupValue: currentVal,
    startRow: currentStart,
    endRow: maxRow,
  });

  // Rebuild the cells map inserting rows.
  const newCells: Record<string, Cell> = {};
  const newRowGroups: RowGroup[] = [];

  // Copy rows before minRow unchanged
  for (const [key, cell] of Object.entries(currentCells)) {
    const coord = keyToCoord(key);
    if (coord.row < minRow) {
      newCells[key] = { ...cell };
    }
  }

  let rowOffset = 0;
  const subtotalRowIndices: number[] = [];

  for (const group of groups) {
    const mappedStartRow = group.startRow + rowOffset;

    // Copy rows in this group with updated row index
    for (let r = group.startRow; r <= group.endRow; r++) {
      const targetR = r + rowOffset;
      for (let c = 0; c <= 100; c++) {
        const sourceKey = coordToKey(r, c);
        const cell = currentCells[sourceKey];
        if (cell) {
          newCells[coordToKey(targetR, c)] = { ...cell };
        }
      }
    }

    const mappedEndRow = group.endRow + rowOffset;
    const subtotalRow = mappedEndRow + 1;
    rowOffset++;
    subtotalRowIndices.push(subtotalRow);

    // Create outline group for the group's rows
    newRowGroups.push({
      startRow: mappedStartRow,
      endRow: mappedEndRow,
      level: 1,
      isCollapsed: false,
    });

    // Populate subtotal row
    // 1. Label cell in groupByCol
    const labelKey = coordToKey(subtotalRow, groupByCol);
    const groupName =
      group.groupValue !== null && group.groupValue !== ''
        ? String(group.groupValue)
        : 'Total';
    newCells[labelKey] = {
      value: `${groupName} Total`,
      dataType: 'string',
      style: {
        bold: true,
        backgroundColor: '#f1f5f9',
      },
    };

    // 2. Aggregate values for each targetCol
    for (const targetCol of targetCols) {
      const colLetter = colIndexToName(targetCol);
      const startRef = `${colLetter}${mappedStartRow + 1}`;
      const endRef = `${colLetter}${mappedEndRow + 1}`;
      const formula = `=SUBTOTAL(${funcCode}, ${startRef}:${endRef})`;

      // Calculate actual number value
      const nums: number[] = [];
      for (let r = mappedStartRow; r <= mappedEndRow; r++) {
        const val = newCells[coordToKey(r, targetCol)]?.value;
        if (typeof val === 'number') nums.push(val);
        else if (typeof val === 'string' && !isNaN(parseFloat(val))) nums.push(parseFloat(val));
      }
      const aggVal = computeAgg(nums, agg);

      const cellKey = coordToKey(subtotalRow, targetCol);
      newCells[cellKey] = {
        value: aggVal,
        formula,
        dataType: 'number',
        style: {
          bold: true,
          backgroundColor: '#f1f5f9',
        },
      };
    }
  }

  // Add Grand Total row if requested
  if (addGrandTotal) {
    const lastSubtotalRow =
      subtotalRowIndices.length > 0
        ? subtotalRowIndices[subtotalRowIndices.length - 1]!
        : maxRow + rowOffset;
    const grandTotalRow = lastSubtotalRow + 1;
    rowOffset++;

    const labelKey = coordToKey(grandTotalRow, groupByCol);
    newCells[labelKey] = {
      value: 'Grand Total',
      dataType: 'string',
      style: {
        bold: true,
        backgroundColor: '#e2e8f0',
      },
    };

    for (const targetCol of targetCols) {
      const colLetter = colIndexToName(targetCol);
      const startRef = `${colLetter}${minRow + 1}`;
      const endRef = `${colLetter}${grandTotalRow}`; // Prior to grand total
      const formula = `=SUBTOTAL(${funcCode}, ${startRef}:${endRef})`;

      // In Excel, SUBTOTAL ignores nested SUBTOTALs
      const nums: number[] = [];
      for (let r = minRow; r < grandTotalRow; r++) {
        if (!subtotalRowIndices.includes(r)) {
          const val = newCells[coordToKey(r, targetCol)]?.value;
          if (typeof val === 'number') nums.push(val);
          else if (typeof val === 'string' && !isNaN(parseFloat(val))) nums.push(parseFloat(val));
        }
      }
      const aggVal = computeAgg(nums, agg);

      const cellKey = coordToKey(grandTotalRow, targetCol);
      newCells[cellKey] = {
        value: aggVal,
        formula,
        dataType: 'number',
        style: {
          bold: true,
          backgroundColor: '#e2e8f0',
        },
      };
    }

    // Outer level 2 group for all data
    newRowGroups.push({
      startRow: minRow,
      endRow: grandTotalRow - 1,
      level: 2,
      isCollapsed: false,
    });
  }

  // Copy rows after original maxRow with rowOffset
  for (const [key, cell] of Object.entries(currentCells)) {
    const coord = keyToCoord(key);
    if (coord.row > maxRow) {
      const targetR = coord.row + rowOffset;
      newCells[coordToKey(targetR, coord.col)] = { ...cell };
    }
  }

  return {
    newCells,
    newRowGroups,
    rowsAdded: rowOffset,
  };
}

/**
 * Removes subtotals from a sheet's cells and removes subtotal row groups.
 */
export function removeSubtotals(
  currentCells: Record<string, Cell>
): { newCells: Record<string, Cell>; newRowGroups: RowGroup[] } {
  const rowsToRemove = new Set<number>();

  for (const [key, cell] of Object.entries(currentCells)) {
    const coord = keyToCoord(key);
    if (
      cell.formula &&
      cell.formula.toUpperCase().startsWith('=SUBTOTAL')
    ) {
      rowsToRemove.add(coord.row);
    } else if (
      typeof cell.value === 'string' &&
      (cell.value.endsWith(' Total') || cell.value === 'Grand Total')
    ) {
      rowsToRemove.add(coord.row);
    }
  }

  if (rowsToRemove.size === 0) {
    return { newCells: currentCells, newRowGroups: [] };
  }

  const sortedRemovedRows = Array.from(rowsToRemove).sort((a, b) => a - b);
  const newCells: Record<string, Cell> = {};

  for (const [key, cell] of Object.entries(currentCells)) {
    const coord = keyToCoord(key);
    if (rowsToRemove.has(coord.row)) {
      continue;
    }

    const shiftCount = sortedRemovedRows.filter((r) => r < coord.row).length;
    const targetRow = coord.row - shiftCount;

    newCells[coordToKey(targetRow, coord.col)] = { ...cell };
  }

  return {
    newCells,
    newRowGroups: [],
  };
}

/**
 * Checks if a given row is currently collapsed under any active row groups
 */
export function isRowCollapsed(rowIndex: number, groups: RowGroup[]): boolean {
  for (const group of groups) {
    if (group.isCollapsed && rowIndex >= group.startRow && rowIndex <= group.endRow) {
      return true;
    }
  }
  return false;
}

/**
 * Toggles collapse state of a specific row group
 */
export function toggleRowGroup(
  groups: RowGroup[],
  groupIndex: number
): RowGroup[] {
  return groups.map((g, idx) =>
    idx === groupIndex ? { ...g, isCollapsed: !g.isCollapsed } : g
  );
}

/**
 * Adds a manual row group outline
 */
export function addRowGroup(
  existingGroups: RowGroup[],
  startRow: number,
  endRow: number
): RowGroup[] {
  const minR = Math.min(startRow, endRow);
  const maxR = Math.max(startRow, endRow);

  // Determine outline level: if inside an existing group, level = parent.level + 1
  let level = 1;
  for (const g of existingGroups) {
    if (minR >= g.startRow && maxR <= g.endRow) {
      level = Math.max(level, g.level + 1);
    }
  }

  const newGroup: RowGroup = {
    startRow: minR,
    endRow: maxR,
    level: Math.min(level, 3), // max 3 outline levels
    isCollapsed: false,
  };

  return [...existingGroups, newGroup].sort((a, b) => a.startRow - b.startRow);
}

/**
 * Removes a manual row group outline overlapping the selected range
 */
export function removeRowGroup(
  existingGroups: RowGroup[],
  startRow: number,
  endRow: number
): RowGroup[] {
  const minR = Math.min(startRow, endRow);
  const maxR = Math.max(startRow, endRow);

  return existingGroups.filter(
    (g) => !(g.startRow >= minR && g.endRow <= maxR)
  );
}
