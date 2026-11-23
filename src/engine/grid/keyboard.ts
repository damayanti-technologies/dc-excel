import { CellCoordinates, CellRange } from '@/types/cell';
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
}

export interface KeyboardNavResult {
  nextActiveCell: CellCoordinates;
  nextAnchorCell: CellCoordinates;
  nextSelectedRange: CellRange;
  shouldScroll: boolean;
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
    visibleRowCount = 20
  } = params;

  const isCtrl = ctrlKey || metaKey;
  let targetRow = activeCell.row;
  let targetCol = activeCell.col;
  let isNavKey = true;

  switch (key) {
    case 'ArrowUp':
      targetRow = Math.max(0, activeCell.row - 1);
      break;
    case 'ArrowDown':
      targetRow = Math.min(rowCount - 1, activeCell.row + 1);
      break;
    case 'ArrowLeft':
      targetCol = Math.max(0, activeCell.col - 1);
      break;
    case 'ArrowRight':
      targetCol = Math.min(colCount - 1, activeCell.col + 1);
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
