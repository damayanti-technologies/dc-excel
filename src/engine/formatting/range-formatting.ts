import { CellBorder, CellBorders, CellRange, CellStyle, SparseCellMap } from '@/types/cell';
import { BorderPosition, BorderStyleType } from '@/types/formatting';
import { coordToKey } from '@/utils/coordinates';

/**
 * Strips undefined properties from a partial style update to avoid polluting cell objects.
 */
function cleanStyle<T extends object>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}

/**
 * Applies visual styling properties to all cells within a rectangular range.
 * Preserves existing cell values, formulas, and unmentioned style attributes.
 */
export function applyStyleToRange(
  cells: SparseCellMap,
  range: CellRange,
  styleUpdate: Partial<CellStyle>
): SparseCellMap {
  const updated: SparseCellMap = { ...cells };
  const cleaned = cleanStyle(styleUpdate);

  const minRow = Math.min(range.startRow, range.endRow);
  const maxRow = Math.max(range.startRow, range.endRow);
  const minCol = Math.min(range.startCol, range.endCol);
  const maxCol = Math.max(range.startCol, range.endCol);

  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      const key = coordToKey(r, c);
      const existing = updated[key];

      if (existing) {
        updated[key] = {
          ...existing,
          style: {
            ...(existing.style || {}),
            ...cleaned
          }
        };
      } else {
        // Materialize sparse cell with formatting
        updated[key] = {
          value: null,
          dataType: 'empty',
          style: {
            ...cleaned
          }
        };
      }
    }
  }

  return updated;
}

/**
 * Applies targeted border configurations across cells in a range.
 */
export function applyBordersToRange(
  cells: SparseCellMap,
  range: CellRange,
  position: BorderPosition,
  style: BorderStyleType = 'thin',
  color = '#000000'
): SparseCellMap {
  const updated: SparseCellMap = { ...cells };
  const borderDef: CellBorder = { style, color };

  const minRow = Math.min(range.startRow, range.endRow);
  const maxRow = Math.max(range.startRow, range.endRow);
  const minCol = Math.min(range.startCol, range.endCol);
  const maxCol = Math.max(range.startCol, range.endCol);

  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      const key = coordToKey(r, c);
      const existing = updated[key];
      const currentBorders: CellBorders = { ...(existing?.style?.borders || {}) };

      if (position === 'none') {
        // Clear all borders
        if (existing?.style) {
          const { borders: _, ...restStyle } = existing.style;
          updated[key] = {
            ...existing,
            style: restStyle
          };
        }
        continue;
      }

      if (position === 'all') {
        currentBorders.top = borderDef;
        currentBorders.bottom = borderDef;
        currentBorders.left = borderDef;
        currentBorders.right = borderDef;
      } else if (position === 'outside' || position === 'thick-outside') {
        const outsideDef = position === 'thick-outside' ? { style: 'thick' as BorderStyleType, color } : borderDef;
        if (r === minRow) currentBorders.top = outsideDef;
        if (r === maxRow) currentBorders.bottom = outsideDef;
        if (c === minCol) currentBorders.left = outsideDef;
        if (c === maxCol) currentBorders.right = outsideDef;
      } else if (position === 'top' && r === minRow) {
        currentBorders.top = borderDef;
      } else if (position === 'bottom' && r === maxRow) {
        currentBorders.bottom = borderDef;
      } else if (position === 'left' && c === minCol) {
        currentBorders.left = borderDef;
      } else if (position === 'right' && c === maxCol) {
        currentBorders.right = borderDef;
      } else if (position === 'inside') {
        if (r < maxRow) currentBorders.bottom = borderDef;
        if (c < maxCol) currentBorders.right = borderDef;
      } else if (position === 'horizontal') {
        currentBorders.top = borderDef;
        currentBorders.bottom = borderDef;
      } else if (position === 'vertical') {
        currentBorders.left = borderDef;
        currentBorders.right = borderDef;
      }

      const newStyle: CellStyle = {
        ...(existing?.style || {}),
        borders: currentBorders
      };

      if (existing) {
        updated[key] = {
          ...existing,
          style: newStyle
        };
      } else {
        updated[key] = {
          value: null,
          dataType: 'empty',
          style: newStyle
        };
      }
    }
  }

  return updated;
}

/**
 * Clears all formatting from a range of cells, preserving raw values, formulas, and data types.
 * Prunes unpopulated sparse cells to prevent memory bloat.
 */
export function clearFormattingFromRange(
  cells: SparseCellMap,
  range: CellRange
): SparseCellMap {
  const updated: SparseCellMap = { ...cells };

  const minRow = Math.min(range.startRow, range.endRow);
  const maxRow = Math.max(range.startRow, range.endRow);
  const minCol = Math.min(range.startCol, range.endCol);
  const maxCol = Math.max(range.startCol, range.endCol);

  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      const key = coordToKey(r, c);
      const existing = updated[key];
      if (!existing) continue;

      const hasContent =
        existing.value !== null &&
        existing.value !== undefined &&
        existing.value !== '' ||
        !!existing.formula;

      if (!hasContent) {
        // Safe to prune empty formatted cell
        delete updated[key];
      } else {
        const { style: _, ...cellWithoutStyle } = existing;
        updated[key] = cellWithoutStyle;
      }
    }
  }

  return updated;
}
