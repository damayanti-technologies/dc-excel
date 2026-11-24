/**
 * Text to Columns Engine
 * Supports delimited (comma, semicolon, tab, space, custom, consecutive delimiters)
 * and fixed-width splits with preview and overwrite detection.
 */

import type { Cell } from '@/types/cell';
import type { TextToColumnsOptions } from '@/types/data-tools';
import { coordToKey } from '@/utils/coordinates';

export interface TextToColumnsPreview {
  rows: string[][];
  maxCols: number;
  hasOverwriteRisk: boolean;
  overwrittenCellKeys: string[];
}

export interface TextToColumnsResult {
  updatedCells: Record<string, Cell>;
  clearedCellKeys: string[];
  maxColsCreated: number;
}

/**
 * Split a single string by delimiter settings
 */
export function splitByDelimiters(
  text: string,
  delimiters: NonNullable<TextToColumnsOptions['delimiters']>
): string[] {
  const chars: string[] = [];
  if (delimiters.comma) chars.push(',');
  if (delimiters.semicolon) chars.push(';');
  if (delimiters.tab) chars.push('\t');
  if (delimiters.space) chars.push(' ');
  if (delimiters.custom && delimiters.custom.length > 0) {
    chars.push(delimiters.custom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  }

  if (chars.length === 0) {
    return [text];
  }

  const pattern = chars.join('');
  let regex: RegExp;
  if (delimiters.treatConsecutiveAsOne) {
    regex = new RegExp(`[${pattern}]+`);
  } else {
    regex = new RegExp(`[${pattern}]`);
  }

  return text.split(regex);
}

/**
 * Split a single string by fixed width character offsets
 */
export function splitByFixedWidth(text: string, offsets: number[]): string[] {
  if (!offsets || offsets.length === 0) {
    return [text];
  }

  const sortedOffsets = [...offsets].filter((o) => o > 0).sort((a, b) => a - b);
  const parts: string[] = [];
  let prev = 0;

  for (const offset of sortedOffsets) {
    if (offset > prev) {
      parts.push(text.slice(prev, offset));
      prev = offset;
    }
  }

  if (prev < text.length) {
    parts.push(text.slice(prev));
  }

  return parts;
}

/**
 * Preview Text to Columns operation on a range
 */
export function previewTextToColumns(
  cells: Record<string, Cell>,
  options: TextToColumnsOptions
): TextToColumnsPreview {
  const { range, mode, delimiters, fixedWidths, destinationStartCol } = options;
  const startRow = Math.min(range.startRow, range.endRow);
  const endRow = Math.max(range.startRow, range.endRow);
  const sourceCol = Math.min(range.startCol, range.endCol);

  const rows: string[][] = [];
  let maxCols = 0;

  for (let r = startRow; r <= endRow; r++) {
    const key = coordToKey(r, sourceCol);
    const cell = cells[key];
    const val = cell?.value != null ? String(cell.value) : '';

    let tokens: string[];
    if (mode === 'fixed_width') {
      tokens = splitByFixedWidth(val, fixedWidths || []);
    } else {
      tokens = splitByDelimiters(
        val,
        delimiters || {
          comma: true,
          semicolon: false,
          tab: false,
          space: false,
          treatConsecutiveAsOne: false,
        }
      );
    }

    rows.push(tokens);
    if (tokens.length > maxCols) {
      maxCols = tokens.length;
    }
  }

  // Check overwrite risk in destination columns (excluding original source cell if destinationStartCol === sourceCol)
  const overwrittenCellKeys: string[] = [];
  for (let r = startRow; r <= endRow; r++) {
    const rowTokens = rows[r - startRow] || [];
    for (let c = 0; c < rowTokens.length; c++) {
      const destCol = destinationStartCol + c;
      if (destCol === sourceCol) continue; // Original cell will be updated with token[0], not an overwrite surprise

      const targetKey = coordToKey(r, destCol);
      const existing = cells[targetKey];
      if (existing && existing.value != null && String(existing.value) !== '') {
        overwrittenCellKeys.push(targetKey);
      }
    }
  }

  return {
    rows,
    maxCols,
    hasOverwriteRisk: overwrittenCellKeys.length > 0,
    overwrittenCellKeys,
  };
}

/**
 * Execute Text to Columns operation
 */
export function executeTextToColumns(
  cells: Record<string, Cell>,
  options: TextToColumnsOptions
): TextToColumnsResult {
  const { range, mode, delimiters, fixedWidths, destinationStartCol } = options;
  const startRow = Math.min(range.startRow, range.endRow);
  const endRow = Math.max(range.startRow, range.endRow);
  const sourceCol = Math.min(range.startCol, range.endCol);

  const updatedCells: Record<string, Cell> = {};
  const clearedCellKeys: string[] = [];
  let maxColsCreated = 0;

  for (let r = startRow; r <= endRow; r++) {
    const sourceKey = coordToKey(r, sourceCol);
    const sourceCell = cells[sourceKey];
    const val = sourceCell?.value != null ? String(sourceCell.value) : '';

    let tokens: string[];
    if (mode === 'fixed_width') {
      tokens = splitByFixedWidth(val, fixedWidths || []);
    } else {
      tokens = splitByDelimiters(
        val,
        delimiters || {
          comma: true,
          semicolon: false,
          tab: false,
          space: false,
          treatConsecutiveAsOne: false,
        }
      );
    }

    if (tokens.length > maxColsCreated) {
      maxColsCreated = tokens.length;
    }

    for (let c = 0; c < tokens.length; c++) {
      const destCol = destinationStartCol + c;
      const destKey = coordToKey(r, destCol);
      const token = tokens[c] ?? '';

      // Convert number strings to numbers if numeric
      let parsedValue: string | number = token;
      if (token.trim() !== '' && !isNaN(Number(token))) {
        parsedValue = Number(token);
      }

      const existingDest = cells[destKey];
      updatedCells[destKey] = {
        value: parsedValue,
        dataType: typeof parsedValue === 'number' ? 'number' : 'string',
        style: existingDest?.style || sourceCell?.style,
      };
    }
  }

  return {
    updatedCells,
    clearedCellKeys,
    maxColsCreated,
  };
}
