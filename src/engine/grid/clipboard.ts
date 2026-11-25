import { Cell, CellCoordinates, CellRange, SparseCellMap } from '@/types/cell';
import { Sheet } from '@/types/sheet';
import { coordToKey } from '@/utils/coordinates';
import { normalizeRange } from './selection';
import { ClipboardPayload, PasteResult } from './types';
import { shiftFormulaReferences } from '@/engine/calculation/formula-shifter';
import { Logger } from '@/utils/logger';

// In-memory fallback clipboard cache
let memoryClipboard: ClipboardPayload | null = null;

/**
 * Serializes a selected range of cells into Tab-Separated Values (TSV) and structured payload.
 */
export function serializeRangeToClipboard(range: CellRange, cells: SparseCellMap): ClipboardPayload {
  const norm = normalizeRange(range);
  const rowCount = norm.endRow - norm.startRow + 1;
  const colCount = norm.endCol - norm.startCol + 1;

  const matrix: string[][] = [];
  const copiedCells: SparseCellMap = {};
  const tsvRows: string[] = [];

  for (let r = norm.startRow; r <= norm.endRow; r++) {
    const rowValues: string[] = [];
    const relR = r - norm.startRow;

    for (let c = norm.startCol; c <= norm.endCol; c++) {
      const relC = c - norm.startCol;
      const key = coordToKey(r, c);
      const cell = cells[key];

      let cellText = '';
      if (cell) {
        copiedCells[coordToKey(relR, relC)] = { ...cell };
        if (cell.formula) {
          cellText = cell.formula;
        } else if (cell.value !== null && cell.value !== undefined) {
          cellText = String(cell.value);
        }
      }

      rowValues.push(cellText);
    }

    matrix.push(rowValues);
    tsvRows.push(rowValues.join('\t'));
  }

  const rawText = tsvRows.join('\n');
  const payload: ClipboardPayload = {
    rawText,
    matrix,
    cells: copiedCells,
    rowCount,
    colCount,
    sourceRange: norm
  };

  memoryClipboard = payload;
  return payload;
}

/**
 * Copies a range to the system clipboard and internal cache.
 */
export async function copyRange(range: CellRange, cells: SparseCellMap): Promise<ClipboardPayload> {
  const payload = serializeRangeToClipboard(range, cells);

  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(payload.rawText);
      Logger.debug('Clipboard', `Copied ${payload.rowCount}x${payload.colCount} range to system clipboard`);
    } catch (err) {
      Logger.warn('Clipboard', 'Clipboard writeText failed or was blocked; using internal fallback', err);
    }
  }

  return payload;
}

/**
 * Parses TSV text into a 2D string matrix.
 */
export function parseTSV(tsv: string): string[][] {
  const normalized = tsv.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // If ends with a newline, strip trailing one
  const clean = normalized.endsWith('\n') ? normalized.slice(0, -1) : normalized;
  if (!clean) return [[]];

  const lines = clean.split('\n');
  return lines.map((line) => line.split('\t'));
}

/**
 * Pastes clipboard text or internal payload into the target sheet starting at targetCoord.
 * Preserves raw values and does NOT execute formulas.
 */
export function applyPasteData(
  targetCoord: CellCoordinates,
  text: string,
  sheet: Sheet
): PasteResult {
  const matrix = parseTSV(text);
  const rows = matrix.length;
  const cols = matrix.reduce((max, r) => Math.max(max, r.length), 0);

  if (rows === 0 || cols === 0) {
    return {
      updatedCells: {},
      pastedRange: {
        startRow: targetCoord.row,
        startCol: targetCoord.col,
        endRow: targetCoord.row,
        endCol: targetCoord.col
      }
    };
  }

  const updatedCells: Record<string, Cell> = {};
  const endRow = targetCoord.row + rows - 1;
  const endCol = targetCoord.col + cols - 1;

  // Check if pasting internal clipboard with rich cell metadata and formatting
  const hasMatchingInternal = Boolean(
    memoryClipboard &&
    memoryClipboard.sourceRange &&
    memoryClipboard.rawText.replace(/\r/g, '').trim() === text.replace(/\r/g, '').trim()
  );

  const deltaRow = hasMatchingInternal && memoryClipboard?.sourceRange
    ? targetCoord.row - memoryClipboard.sourceRange.startRow
    : 0;
  const deltaCol = hasMatchingInternal && memoryClipboard?.sourceRange
    ? targetCoord.col - memoryClipboard.sourceRange.startCol
    : 0;

  for (let r = 0; r < rows; r++) {
    const rowValues = matrix[r] || [];
    const destRow = targetCoord.row + r;

    for (let c = 0; c < rowValues.length; c++) {
      const destCol = targetCoord.col + c;
      const rawVal = rowValues[c] ?? '';
      const key = coordToKey(destRow, destCol);

      const cachedCell = hasMatchingInternal ? memoryClipboard?.cells[coordToKey(r, c)] : undefined;

      // Infer primitive data type without executing formulas
      let val: string | number | boolean | null = rawVal;
      let dataType: 'string' | 'number' | 'boolean' | 'empty' = 'string';

      if (rawVal === '') {
        val = null;
        dataType = 'empty';
      } else if (rawVal.toLowerCase() === 'true') {
        val = true;
        dataType = 'boolean';
      } else if (rawVal.toLowerCase() === 'false') {
        val = false;
        dataType = 'boolean';
      } else if (!Number.isNaN(Number(rawVal)) && rawVal.trim() !== '') {
        val = Number(rawVal);
        dataType = 'number';
      }

      // Determine formula, shifting references if source delta is non-zero
      let formula: string | undefined = undefined;
      const rawFormula = cachedCell?.formula || (rawVal.startsWith('=') ? rawVal : undefined);
      if (rawFormula) {
        if (deltaRow !== 0 || deltaCol !== 0) {
          formula = shiftFormulaReferences(rawFormula, {
            type: 'offset',
            deltaRow,
            deltaCol,
          });
        } else {
          formula = rawFormula;
        }
      }

      // Preserve rich formatting and attributes if copied internally
      if (cachedCell) {
        updatedCells[key] = {
          ...cachedCell,
          value: formula ? cachedCell.value : val,
          dataType: formula ? 'string' : (cachedCell.dataType || dataType),
          formula,
        };
      } else {
        updatedCells[key] = {
          value: val,
          dataType,
          formula,
        };
      }
    }
  }

  const result: PasteResult = {
    updatedCells,
    pastedRange: {
      startRow: targetCoord.row,
      startCol: targetCoord.col,
      endRow,
      endCol
    }
  };

  if (endRow >= sheet.rowCount) {
    result.newRowCount = endRow + 1;
  }
  if (endCol >= sheet.columnCount) {
    result.newColCount = endCol + 1;
  }

  return result;
}

/**
 * Retrieves the current clipboard text, checking system clipboard with fallback to internal cache.
 */
export async function getClipboardText(): Promise<string> {
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
    try {
      const text = await navigator.clipboard.readText();
      if (text) return text;
    } catch {
      // Permission rejected or not focused; fall back to internal
    }
  }

  return memoryClipboard?.rawText || '';
}

/**
 * Gets cached internal payload.
 */
export function getInternalClipboard(): ClipboardPayload | null {
  return memoryClipboard;
}
