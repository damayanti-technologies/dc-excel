import { tokenizeFormula } from './tokenizer';
import { parseA1Reference, colIndexToName } from '@/utils/coordinates';

export type ShiftOperation =
  | { type: 'row_insert'; atRow: number; count: number }
  | { type: 'row_delete'; atRow: number; count: number }
  | { type: 'col_insert'; atCol: number; count: number }
  | { type: 'col_delete'; atCol: number; count: number }
  | { type: 'offset'; deltaRow: number; deltaCol: number };

function formatCellRef(
  row: number,
  col: number,
  isRowAbsolute: boolean,
  isColAbsolute: boolean,
  sheetPrefix?: string
): string {
  if (row < 0 || col < 0) {
    return '#REF!';
  }
  const colStr = (isColAbsolute ? '$' : '') + colIndexToName(col);
  const rowStr = (isRowAbsolute ? '$' : '') + (row + 1);
  return (sheetPrefix || '') + colStr + rowStr;
}

function shiftSingleCoord(
  row: number,
  col: number,
  isRowAbsolute: boolean,
  isColAbsolute: boolean,
  op: ShiftOperation
): { row: number; col: number; isRef: boolean } {
  let newRow = row;
  let newCol = col;

  switch (op.type) {
    case 'offset':
      if (!isRowAbsolute) {
        newRow += op.deltaRow;
      }
      if (!isColAbsolute) {
        newCol += op.deltaCol;
      }
      if (newRow < 0 || newCol < 0) {
        return { row: newRow, col: newCol, isRef: true };
      }
      break;

    case 'row_insert':
      if (row >= op.atRow) {
        newRow += op.count;
      }
      break;

    case 'row_delete':
      if (row >= op.atRow && row < op.atRow + op.count) {
        return { row: -1, col: newCol, isRef: true };
      }
      if (row >= op.atRow + op.count) {
        newRow -= op.count;
      }
      break;

    case 'col_insert':
      if (col >= op.atCol) {
        newCol += op.count;
      }
      break;

    case 'col_delete':
      if (col >= op.atCol && col < op.atCol + op.count) {
        return { row: newRow, col: -1, isRef: true };
      }
      if (col >= op.atCol + op.count) {
        newCol -= op.count;
      }
      break;
  }

  return { row: newRow, col: newCol, isRef: false };
}

function shiftRangeCoords(
  r1: number,
  c1: number,
  isR1Abs: boolean,
  isC1Abs: boolean,
  r2: number,
  c2: number,
  isR2Abs: boolean,
  isC2Abs: boolean,
  op: ShiftOperation
): {
  r1: number;
  c1: number;
  r2: number;
  c2: number;
  isRef: boolean;
} {
  const minR = Math.min(r1, r2);
  const maxR = Math.max(r1, r2);
  const minC = Math.min(c1, c2);
  const maxC = Math.max(c1, c2);

  let newMinR = minR;
  let newMaxR = maxR;
  let newMinC = minC;
  let newMaxC = maxC;

  switch (op.type) {
    case 'offset': {
      const s1 = shiftSingleCoord(r1, c1, isR1Abs, isC1Abs, op);
      const s2 = shiftSingleCoord(r2, c2, isR2Abs, isC2Abs, op);
      if (s1.isRef || s2.isRef) {
        return { r1: -1, c1: -1, r2: -1, c2: -1, isRef: true };
      }
      return { r1: s1.row, c1: s1.col, r2: s2.row, c2: s2.col, isRef: false };
    }

    case 'row_insert': {
      if (op.atRow > minR && op.atRow <= maxR) {
        // Expand range
        newMaxR += op.count;
      } else if (op.atRow <= minR) {
        // Shift entire range down
        newMinR += op.count;
        newMaxR += op.count;
      }
      break;
    }

    case 'row_delete': {
      const delStart = op.atRow;
      const delEnd = op.atRow + op.count - 1;

      if (delStart <= minR && delEnd >= maxR) {
        // Entire range was deleted
        return { r1: -1, c1: -1, r2: -1, c2: -1, isRef: true };
      }

      if (delStart > minR && delStart <= maxR) {
        // Range shrank
        newMaxR = Math.max(newMinR, newMaxR - op.count);
      } else if (delStart < minR) {
        newMinR = Math.max(0, newMinR - op.count);
        newMaxR = Math.max(0, newMaxR - op.count);
      }
      break;
    }

    case 'col_insert': {
      if (op.atCol > minC && op.atCol <= maxC) {
        // Expand range
        newMaxC += op.count;
      } else if (op.atCol <= minC) {
        // Shift entire range right
        newMinC += op.count;
        newMaxC += op.count;
      }
      break;
    }

    case 'col_delete': {
      const delStart = op.atCol;
      const delEnd = op.atCol + op.count - 1;

      if (delStart <= minC && delEnd >= maxC) {
        // Entire column range deleted
        return { r1: -1, c1: -1, r2: -1, c2: -1, isRef: true };
      }

      if (delStart > minC && delStart <= maxC) {
        newMaxC = Math.max(newMinC, newMaxC - op.count);
      } else if (delStart < minC) {
        newMinC = Math.max(0, newMinC - op.count);
        newMaxC = Math.max(0, newMaxC - op.count);
      }
      break;
    }
  }

  // Preserve relative orientation
  const finalR1 = r1 <= r2 ? newMinR : newMaxR;
  const finalR2 = r1 <= r2 ? newMaxR : newMinR;
  const finalC1 = c1 <= c2 ? newMinC : newMaxC;
  const finalC2 = c1 <= c2 ? newMaxC : newMinC;

  return { r1: finalR1, c1: finalC1, r2: finalR2, c2: finalC2, isRef: false };
}

function extractSheetPrefix(tokenVal: string): { sheetPrefix?: string; a1: string } {
  const match = tokenVal.match(/^((?:'[^']+'|[A-Za-z0-9_]+)!)?(.+)$/);
  if (match && match[1]) {
    return { sheetPrefix: match[1], a1: match[2]! };
  }
  return { a1: tokenVal };
}

/**
 * Shifts cell references in a formula string according to row/column insertion, deletion, or relative moving.
 * Preserves all string literals, function names, and operators untouched.
 */
export function shiftFormulaReferences(formula: string, op: ShiftOperation): string {
  if (!formula || !formula.startsWith('=')) {
    return formula;
  }

  const tokens = tokenizeFormula(formula);
  let result = '=';
  let i = 0;

  while (i < tokens.length) {
    const t = tokens[i]!;

    if (t.type === 'EOF') {
      break;
    }

    // Check for range: CELL_REF : CELL_REF
    if (
      t.type === 'CELL_REF' &&
      i + 2 < tokens.length &&
      tokens[i + 1]!.type === 'COLON' &&
      tokens[i + 2]!.type === 'CELL_REF'
    ) {
      const t1 = t;
      const t2 = tokens[i + 2]!;
      const { sheetPrefix: p1, a1: a1_1 } = extractSheetPrefix(t1.value);
      const { sheetPrefix: p2, a1: a1_2 } = extractSheetPrefix(t2.value);

      const parsed1 = parseA1Reference(a1_1);
      const parsed2 = parseA1Reference(a1_2);

      if (parsed1 && parsed2) {
        const shifted = shiftRangeCoords(
          parsed1.row,
          parsed1.col,
          parsed1.isRowAbsolute,
          parsed1.isColAbsolute,
          parsed2.row,
          parsed2.col,
          parsed2.isRowAbsolute,
          parsed2.isColAbsolute,
          op
        );

        if (shifted.isRef) {
          result += '#REF!';
        } else {
          const ref1 = formatCellRef(shifted.r1, shifted.c1, parsed1.isRowAbsolute, parsed1.isColAbsolute, p1);
          const ref2 = formatCellRef(shifted.r2, shifted.c2, parsed2.isRowAbsolute, parsed2.isColAbsolute, p2);
          result += `${ref1}:${ref2}`;
        }

        i += 3;
        continue;
      }
    }

    // Standalone CELL_REF
    if (t.type === 'CELL_REF') {
      const { sheetPrefix, a1 } = extractSheetPrefix(t.value);
      const parsed = parseA1Reference(a1);

      if (parsed) {
        const shifted = shiftSingleCoord(
          parsed.row,
          parsed.col,
          parsed.isRowAbsolute,
          parsed.isColAbsolute,
          op
        );

        if (shifted.isRef) {
          result += '#REF!';
        } else {
          result += formatCellRef(
            shifted.row,
            shifted.col,
            parsed.isRowAbsolute,
            parsed.isColAbsolute,
            sheetPrefix
          );
        }

        i++;
        continue;
      }
    }

    // Double quoted string literal: preserve escaped quotes
    if (t.type === 'STRING') {
      result += `"${t.value.replace(/"/g, '""')}"`;
      i++;
      continue;
    }

    // All other tokens (operators, numbers, identifiers, commas, parens)
    result += t.value;
    i++;
  }

  return result;
}
