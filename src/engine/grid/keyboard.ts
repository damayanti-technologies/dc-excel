import { CellCoordinates, CellRange, SparseCellMap } from '@/types/cell';
import { coordToKey } from '@/utils/coordinates';
import { normalizeRange } from './selection';

export interface KeyboardNavParams {
  key: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  activeCell: CellCoordinates;
  anchorCell: CellCoordinates;
  selectedRange: CellRange;
  rowCount: number;
  colCount: number;
  maxUsedCoord?: CellCoordinates;
  visibleRowCount?: number;
  cells?: SparseCellMap;
}

export interface KeyboardNavResult {
  nextActiveCell: CellCoordinates;
  nextAnchorCell: CellCoordinates;
  nextSelectedRange: CellRange;
  shouldScroll: boolean;
}

function hasContent(cells: SparseCellMap | undefined, row: number, col: number): boolean {
  if (!cells) return false;
  const cell = cells[coordToKey(row, col)];
  if (!cell) return false;
  if (cell.formula) return true;
  return cell.value !== null && cell.value !== undefined && cell.value !== '';
}

/**
 * Finds the edge of a contiguous data block (Excel/Google Sheets Ctrl+Arrow behavior)
 */
function findDataEdge(
  startRow: number,
  startCol: number,
  dRow: number,
  dCol: number,
  rowCount: number,
  colCount: number,
  cells?: SparseCellMap
): { row: number; col: number } {
  if (!cells) {
    let r = startRow;
    let c = startCol;
    if (dRow < 0) r = 0;
    else if (dRow > 0) r = rowCount - 1;
    if (dCol < 0) c = 0;
    else if (dCol > 0) c = colCount - 1;
    return { row: r, col: c };
  }

  let currR = startRow;
  let currC = startCol;
  const currFilled = hasContent(cells, currR, currC);

  const nextR = currR + dRow;
  const nextC = currC + dCol;

  // If already at boundary
  if (nextR < 0 || nextR >= rowCount || nextC < 0 || nextC >= colCount) {
    return { row: currR, col: currC };
  }

  const nextFilled = hasContent(cells, nextR, nextC);

  if (currFilled) {
    if (nextFilled) {
      // Move to the last filled cell in this contiguous block
      while (
        currR + dRow >= 0 &&
        currR + dRow < rowCount &&
        currC + dCol >= 0 &&
        currC + dCol < colCount &&
        hasContent(cells, currR + dRow, currC + dCol)
      ) {
        currR += dRow;
        currC += dCol;
      }
    } else {
      // Current is filled, next is empty -> jump across empty space to next filled cell
      while (
        currR + dRow >= 0 &&
        currR + dRow < rowCount &&
        currC + dCol >= 0 &&
        currC + dCol < colCount &&
        !hasContent(cells, currR + dRow, currC + dCol)
      ) {
        currR += dRow;
        currC += dCol;
      }
      // If we stopped before hitting boundary and found a filled cell, take it
      if (
        currR + dRow >= 0 &&
        currR + dRow < rowCount &&
        currC + dCol >= 0 &&
        currC + dCol < colCount &&
        hasContent(cells, currR + dRow, currC + dCol)
      ) {
        currR += dRow;
        currC += dCol;
      }
    }
  } else {
    // Current is empty -> jump across empty space to next filled cell or edge
    while (
      currR + dRow >= 0 &&
      currR + dRow < rowCount &&
      currC + dCol >= 0 &&
      currC + dCol < colCount &&
      !hasContent(cells, currR + dRow, currC + dCol)
    ) {
      currR += dRow;
      currC += dCol;
    }
    // Step into the filled cell if found
    if (
      currR + dRow >= 0 &&
      currR + dRow < rowCount &&
      currC + dCol >= 0 &&
      currC + dCol < colCount &&
      hasContent(cells, currR + dRow, currC + dCol)
    ) {
      currR += dRow;
      currC += dCol;
    }
  }

  return { row: currR, col: currC };
}

/**
 * Handles keyboard navigation within the spreadsheet grid.
 */
export function handleGridKeyboardNavigation(
  params: KeyboardNavParams
): KeyboardNavResult | null {
  const {
    key,
    shiftKey,
    ctrlKey,
    metaKey,
    activeCell,
    anchorCell,
    rowCount,
    colCount,
    maxUsedCoord,
    visibleRowCount = 20,
    cells
  } = params;

  const isCtrl = ctrlKey || metaKey;
  let targetRow = activeCell.row;
  let targetCol = activeCell.col;
  let isNavKey = true;

  switch (key) {
    case 'ArrowUp':
      if (isCtrl) {
        const edge = findDataEdge(activeCell.row, activeCell.col, -1, 0, rowCount, colCount, cells);
        targetRow = edge.row;
        targetCol = edge.col;
      } else {
        targetRow = Math.max(0, activeCell.row - 1);
      }
      break;
    case 'ArrowDown':
      if (isCtrl) {
        const edge = findDataEdge(activeCell.row, activeCell.col, 1, 0, rowCount, colCount, cells);
        targetRow = edge.row;
        targetCol = edge.col;
      } else {
        targetRow = Math.min(rowCount - 1, activeCell.row + 1);
      }
      break;
    case 'ArrowLeft':
      if (isCtrl) {
        const edge = findDataEdge(activeCell.row, activeCell.col, 0, -1, rowCount, colCount, cells);
        targetRow = edge.row;
        targetCol = edge.col;
      } else {
        targetCol = Math.max(0, activeCell.col - 1);
      }
      break;
    case 'ArrowRight':
      if (isCtrl) {
        const edge = findDataEdge(activeCell.row, activeCell.col, 0, 1, rowCount, colCount, cells);
        targetRow = edge.row;
        targetCol = edge.col;
      } else {
        targetCol = Math.min(colCount - 1, activeCell.col + 1);
      }
      break;
    case 'Tab':
      if (shiftKey) {
        targetCol = Math.max(0, activeCell.col - 1);
      } else {
        targetCol = Math.min(colCount - 1, activeCell.col + 1);
      }
      break;
    case 'Enter':
      if (shiftKey) {
        targetRow = Math.max(0, activeCell.row - 1);
      } else {
        targetRow = Math.min(rowCount - 1, activeCell.row + 1);
      }
      break;
    case 'Home':
      if (isCtrl) {
        targetRow = 0;
        targetCol = 0;
      } else {
        targetCol = 0;
      }
      break;
    case 'End':
      if (isCtrl) {
        targetRow = maxUsedCoord ? Math.min(rowCount - 1, maxUsedCoord.row) : rowCount - 1;
        targetCol = maxUsedCoord ? Math.min(colCount - 1, maxUsedCoord.col) : colCount - 1;
      } else {
        targetCol = colCount - 1;
      }
      break;
    case 'PageUp':
      targetRow = Math.max(0, activeCell.row - visibleRowCount);
      break;
    case 'PageDown':
      targetRow = Math.min(rowCount - 1, activeCell.row + visibleRowCount);
      break;
    default:
      isNavKey = false;
      break;
  }

  if (!isNavKey) {
    return null;
  }

  // If Shift is held (and not Tab or Enter which use Shift for reverse direction):
  if (shiftKey && key !== 'Tab' && key !== 'Enter') {
    // Extend range from anchorCell to targetRow/targetCol
    const nextRange = normalizeRange({
      startRow: anchorCell.row,
      startCol: anchorCell.col,
      endRow: targetRow,
      endCol: targetCol
    });

    return {
      nextActiveCell: { row: targetRow, col: targetCol },
      nextAnchorCell: anchorCell,
      nextSelectedRange: nextRange,
      shouldScroll: true
    };
  }

  // Regular navigation without Shift: collapse range to target single cell
  const nextTarget = { row: targetRow, col: targetCol };
  return {
    nextActiveCell: nextTarget,
    nextAnchorCell: nextTarget,
    nextSelectedRange: {
      startRow: targetRow,
      startCol: targetCol,
      endRow: targetRow,
      endCol: targetCol
    },
    shouldScroll: true
  };
}
