import { FunctionDefinition } from '../types';
import { FormulaError, isFormulaError } from '../errors';
import {
  coerceBoolean,
  coerceNumber,
  coerceString,
  matchWildcard,
  resolveTo1DArray,
  resolveTo2DArray
} from './helpers';
import { CellValue } from '@/types/cell';
import { a1ToCoord } from '@/utils/coordinates';

function valuesEqual(a: CellValue, b: CellValue): boolean {
  if (a === b) return true;
  if (
    typeof b === 'string' &&
    (b.includes('*') || b.includes('?') || b.includes('~'))
  ) {
    const target = coerceString(a);
    if (matchWildcard(target, b)) return true;
  }
  if (typeof a === 'string' && typeof b === 'string') {
    return a.toUpperCase() === b.toUpperCase();
  }
  if (typeof a === 'number' && typeof b === 'number') {
    return a === b;
  }
  // Coerce string numbers
  if (typeof a === 'number' && typeof b === 'string' && b.trim() !== '') {
    const numB = Number(b);
    return !Number.isNaN(numB) && a === numB;
  }
  if (typeof a === 'string' && typeof b === 'number' && a.trim() !== '') {
    const numA = Number(a);
    return !Number.isNaN(numA) && numA === b;
  }
  return false;
}

export const lookupFunctions: FunctionDefinition[] = [
  // 1. VLOOKUP
  {
    name: 'VLOOKUP',
    category: 'Lookup & Reference',
    description:
      'Looks for a value in the leftmost column of a table, and returns a value in the same row from a specified column.',
    minArgs: 3,
    maxArgs: 4,
    returnType: 'any',
    args: [
      {
        name: 'lookup_value',
        description: 'The value to search for in the first column of the table.',
        type: 'any'
      },
      {
        name: 'table_array',
        description: 'Two or more columns of data (e.g. A2:D20).',
        type: 'range'
      },
      {
        name: 'col_index_num',
        description: 'The 1-based column number in table_array from which the matching value must be returned.',
        type: 'number'
      },
      {
        name: 'range_lookup',
        description: 'TRUE for approximate match (sorted), FALSE for exact match. Defaults to TRUE.',
        type: 'boolean',
        optional: true,
        defaultValue: 'TRUE'
      }
    ],
    examples: ['=VLOOKUP("A101", A2:C50, 2, FALSE)', '=VLOOKUP(10, A1:B10, 2)'],
    handler: (args, context, evaluate) => {
      const lookupVal = evaluate(args[0]!, context);
      if (isFormulaError(lookupVal)) return lookupVal;

      const tableGrid = resolveTo2DArray(args[1]!, context, evaluate);
      if (typeof tableGrid === 'string') return tableGrid;
      if (tableGrid.length === 0 || tableGrid[0]!.length === 0) {
        return FormulaError.NA;
      }

      const colIndexEval = evaluate(args[2]!, context);
      if (isFormulaError(colIndexEval)) return colIndexEval;
      const { num: colIndex, error: colErr } = coerceNumber(colIndexEval);
      if (colErr) return FormulaError.VALUE;

      const numCols = tableGrid[0]!.length;
      if (colIndex < 1 || colIndex > numCols) {
        return FormulaError.REF;
      }

      let isApprox = true;
      if (args.length >= 4) {
        const rangeVal = evaluate(args[3]!, context);
        if (isFormulaError(rangeVal)) return rangeVal;
        isApprox = coerceBoolean(rangeVal);
      }

      const targetCol = Math.floor(colIndex) - 1;

      if (!isApprox) {
        // Exact match
        for (let r = 0; r < tableGrid.length; r++) {
          const firstVal = tableGrid[r]![0]!;
          if (valuesEqual(firstVal, lookupVal)) {
            const ret = tableGrid[r]![targetCol]!;
            return ret ?? '';
          }
        }
        return FormulaError.NA;
      } else {
        // Approximate match (assumes column 0 sorted ascending)
        let bestRow = -1;
        for (let r = 0; r < tableGrid.length; r++) {
          const cellVal = tableGrid[r]![0]!;
          if (cellVal === null || cellVal === undefined) continue;

          if (valuesEqual(cellVal, lookupVal)) {
            bestRow = r;
            break;
          }

          // Compare numeric or string order
          if (typeof lookupVal === 'number' && typeof cellVal === 'number') {
            if (cellVal <= lookupVal) {
              bestRow = r;
            } else {
              break;
            }
          } else {
            const cStr = coerceString(cellVal).toUpperCase();
            const lStr = coerceString(lookupVal).toUpperCase();
            if (cStr <= lStr) {
              bestRow = r;
            } else {
              break;
            }
          }
        }

        if (bestRow === -1) {
          return FormulaError.NA;
        }
        return tableGrid[bestRow]![targetCol] ?? '';
      }
    }
  },

  // 2. HLOOKUP
  {
    name: 'HLOOKUP',
    category: 'Lookup & Reference',
    description:
      'Looks for a value in the top row of a table, and returns a value in the same column from a specified row.',
    minArgs: 3,
    maxArgs: 4,
    returnType: 'any',
    args: [
      {
        name: 'lookup_value',
        description: 'The value to search for in the first row of the table.',
        type: 'any'
      },
      {
        name: 'table_array',
        description: 'The table of information in which data is looked up.',
        type: 'range'
      },
      {
        name: 'row_index_num',
        description: 'The 1-based row number in table_array from which the matching value must be returned.',
        type: 'number'
      },
      {
        name: 'range_lookup',
        description: 'TRUE for approximate match, FALSE for exact match. Defaults to TRUE.',
        type: 'boolean',
        optional: true,
        defaultValue: 'TRUE'
      }
    ],
    examples: ['=HLOOKUP("Sales", A1:Z5, 3, FALSE)'],
    handler: (args, context, evaluate) => {
      const lookupVal = evaluate(args[0]!, context);
      if (isFormulaError(lookupVal)) return lookupVal;

      const tableGrid = resolveTo2DArray(args[1]!, context, evaluate);
      if (typeof tableGrid === 'string') return tableGrid;
      if (tableGrid.length === 0 || tableGrid[0]!.length === 0) {
        return FormulaError.NA;
      }

      const rowIndexEval = evaluate(args[2]!, context);
      if (isFormulaError(rowIndexEval)) return rowIndexEval;
      const { num: rowIndex, error: rowErr } = coerceNumber(rowIndexEval);
      if (rowErr) return FormulaError.VALUE;

      const numRows = tableGrid.length;
      if (rowIndex < 1 || rowIndex > numRows) {
        return FormulaError.REF;
      }

      let isApprox = true;
      if (args.length >= 4) {
        const rangeVal = evaluate(args[3]!, context);
        if (isFormulaError(rangeVal)) return rangeVal;
        isApprox = coerceBoolean(rangeVal);
      }

      const targetRow = Math.floor(rowIndex) - 1;
      const numCols = tableGrid[0]!.length;

      if (!isApprox) {
        for (let c = 0; c < numCols; c++) {
          const firstVal = tableGrid[0]![c]!;
          if (valuesEqual(firstVal, lookupVal)) {
            return tableGrid[targetRow]![c] ?? '';
          }
        }
        return FormulaError.NA;
      } else {
        let bestCol = -1;
        for (let c = 0; c < numCols; c++) {
          const cellVal = tableGrid[0]![c]!;
          if (cellVal === null || cellVal === undefined) continue;

          if (valuesEqual(cellVal, lookupVal)) {
            bestCol = c;
            break;
          }

          if (typeof lookupVal === 'number' && typeof cellVal === 'number') {
            if (cellVal <= lookupVal) {
              bestCol = c;
            } else {
              break;
            }
          } else {
            const cStr = coerceString(cellVal).toUpperCase();
            const lStr = coerceString(lookupVal).toUpperCase();
            if (cStr <= lStr) {
              bestCol = c;
            } else {
              break;
            }
          }
        }

        if (bestCol === -1) {
          return FormulaError.NA;
        }
        return tableGrid[targetRow]![bestCol] ?? '';
      }
    }
  },

  // 3. XLOOKUP
  {
    name: 'XLOOKUP',
    category: 'Lookup & Reference',
    description:
      'Searches a range or array for a match and returns the corresponding item from a second range or array.',
    minArgs: 3,
    maxArgs: 6,
    returnType: 'any',
    args: [
      { name: 'lookup_value', description: 'The value to search for.', type: 'any' },
      { name: 'lookup_array', description: 'The array or range to search.', type: 'array' },
      { name: 'return_array', description: 'The array or range to return.', type: 'array' },
      {
        name: 'if_not_found',
        description: 'Where a valid match is not found, return the [if_not_found] text.',
        type: 'any',
        optional: true,
        defaultValue: '#N/A'
      },
      {
        name: 'match_mode',
        description: '0 = Exact (default), -1 = Exact or next smaller, 1 = Exact or next larger, 2 = Wildcard.',
        type: 'number',
        optional: true,
        defaultValue: '0'
      },
      {
        name: 'search_mode',
        description: '1 = Search first to last (default), -1 = Search last to first.',
        type: 'number',
        optional: true,
        defaultValue: '1'
      }
    ],
    examples: [
      '=XLOOKUP(E2, A2:A20, B2:B20, "Not Found")',
      '=XLOOKUP("Smith*", A2:A20, C2:C20, "Missing", 2)'
    ],
    handler: (args, context, evaluate) => {
      const lookupVal = evaluate(args[0]!, context);
      if (isFormulaError(lookupVal)) return lookupVal;

      const lookupFlat = resolveTo1DArray(args[1]!, context, evaluate);
      if (typeof lookupFlat === 'string') return lookupFlat;

      const returnFlat = resolveTo1DArray(args[2]!, context, evaluate);
      if (typeof returnFlat === 'string') return returnFlat;

      if (lookupFlat.length !== returnFlat.length) {
        return FormulaError.VALUE;
      }

      let ifNotFound: CellValue = FormulaError.NA;
      if (args.length >= 4 && args[3]!.type !== 'Empty') {
        ifNotFound = evaluate(args[3]!, context);
      }

      let matchMode = 0; // 0: exact, -1: exact or smaller, 1: exact or larger, 2: wildcard
      if (args.length >= 5 && args[4]!.type !== 'Empty') {
        const mm = evaluate(args[4]!, context);
        if (isFormulaError(mm)) return mm;
        matchMode = Math.trunc(coerceNumber(mm).num);
      }

      let searchMode = 1; // 1: first to last, -1: last to first
      if (args.length >= 6 && args[5]!.type !== 'Empty') {
        const sm = evaluate(args[5]!, context);
        if (isFormulaError(sm)) return sm;
        searchMode = Math.trunc(coerceNumber(sm).num);
      }

      const indices: number[] = [];
      const len = lookupFlat.length;
      if (searchMode === -1) {
        for (let i = len - 1; i >= 0; i--) indices.push(i);
      } else {
        for (let i = 0; i < len; i++) indices.push(i);
      }

      let matchedIdx = -1;

      if (matchMode === 0) {
        // Exact match
        for (const i of indices) {
          if (valuesEqual(lookupFlat[i]!, lookupVal)) {
            matchedIdx = i;
            break;
          }
        }
      } else if (matchMode === 2) {
        // Wildcard match
        const pattern = coerceString(lookupVal);
        for (const i of indices) {
          const target = coerceString(lookupFlat[i]!);
          if (matchWildcard(target, pattern)) {
            matchedIdx = i;
            break;
          }
        }
      } else if (matchMode === -1) {
        // Exact or next smaller
        let bestSmallerIdx = -1;
        let exactIdx = -1;

        for (const i of indices) {
          const val = lookupFlat[i]!;
          if (valuesEqual(val, lookupVal)) {
            exactIdx = i;
            break;
          }
          if (typeof val === 'number' && typeof lookupVal === 'number' && val < lookupVal) {
            if (bestSmallerIdx === -1 || val > (lookupFlat[bestSmallerIdx] as number)) {
              bestSmallerIdx = i;
            }
          }
        }

        matchedIdx = exactIdx !== -1 ? exactIdx : bestSmallerIdx;
      } else if (matchMode === 1) {
        // Exact or next larger
        let bestLargerIdx = -1;
        let exactIdx = -1;

        for (const i of indices) {
          const val = lookupFlat[i]!;
          if (valuesEqual(val, lookupVal)) {
            exactIdx = i;
            break;
          }
          if (typeof val === 'number' && typeof lookupVal === 'number' && val > lookupVal) {
            if (bestLargerIdx === -1 || val < (lookupFlat[bestLargerIdx] as number)) {
              bestLargerIdx = i;
            }
          }
        }

        matchedIdx = exactIdx !== -1 ? exactIdx : bestLargerIdx;
      }

      if (matchedIdx === -1) {
        return ifNotFound;
      }

      return returnFlat[matchedIdx] ?? '';
    }
  },

  // 4. INDEX
  {
    name: 'INDEX',
    category: 'Lookup & Reference',
    description:
      'Returns the value of an element in a table or an array, selected by the row and column number indexes.',
    minArgs: 2,
    maxArgs: 3,
    returnType: 'any',
    args: [
      { name: 'array', description: 'A range of cells or an array constant.', type: 'range' },
      { name: 'row_num', description: 'The row number in array from which to return a value.', type: 'number' },
      {
        name: 'column_num',
        description: 'The column number in array from which to return a value.',
        type: 'number',
        optional: true
      }
    ],
    examples: ['=INDEX(B2:B20, 5)', '=INDEX(A1:D10, 2, 3)'],
    handler: (args, context, evaluate) => {
      const grid = resolveTo2DArray(args[0]!, context, evaluate);
      if (typeof grid === 'string') return grid;

      const numRows = grid.length;
      const numCols = grid[0]?.length ?? 0;
      if (numRows === 0 || numCols === 0) return FormulaError.REF;

      const rowEval = evaluate(args[1]!, context);
      if (isFormulaError(rowEval)) return rowEval;
      const { num: rowNum, error: rErr } = coerceNumber(rowEval);
      if (rErr) return FormulaError.VALUE;

      let colNum = 1;
      if (args.length >= 3 && args[2]!.type !== 'Empty') {
        const colEval = evaluate(args[2]!, context);
        if (isFormulaError(colEval)) return colEval;
        const { num: cNum, error: cErr } = coerceNumber(colEval);
        if (cErr) return FormulaError.VALUE;
        colNum = cNum;
      } else if (numRows === 1 && numCols > 1) {
        // If 1D row array and only 1 coordinate provided, row_num is used as colNum
        colNum = rowNum;
        return colNum >= 1 && colNum <= numCols ? (grid[0]![Math.floor(colNum) - 1] ?? '') : FormulaError.REF;
      }

      const r = Math.floor(rowNum) - 1;
      const c = Math.floor(colNum) - 1;

      if (r < 0 || r >= numRows || c < 0 || c >= numCols) {
        return FormulaError.REF;
      }

      return grid[r]![c] ?? '';
    }
  },

  // 5. MATCH
  {
    name: 'MATCH',
    category: 'Lookup & Reference',
    description:
      'Returns the relative position of an item in an array that matches a specified value in a specified order.',
    minArgs: 2,
    maxArgs: 3,
    returnType: 'number',
    args: [
      { name: 'lookup_value', description: 'The value that you want to match in lookup_array.', type: 'any' },
      { name: 'lookup_array', description: 'The range of cells being searched.', type: 'array' },
      {
        name: 'match_type',
        description: '1 = Less than (sorted asc), 0 = Exact match, -1 = Greater than (sorted desc). Default 1.',
        type: 'number',
        optional: true,
        defaultValue: '1'
      }
    ],
    examples: ['=MATCH(E2, A2:A20, 0)', '=MATCH(50, B2:B10, 1)'],
    handler: (args, context, evaluate) => {
      const lookupVal = evaluate(args[0]!, context);
      if (isFormulaError(lookupVal)) return lookupVal;

      const flat = resolveTo1DArray(args[1]!, context, evaluate);
      if (typeof flat === 'string') return flat;
      if (flat.length === 0) return FormulaError.NA;

      let matchType = 1;
      if (args.length >= 3 && args[2]!.type !== 'Empty') {
        const mt = evaluate(args[2]!, context);
        if (isFormulaError(mt)) return mt;
        matchType = Math.trunc(coerceNumber(mt).num);
      }

      if (matchType === 0) {
        // Exact match
        for (let i = 0; i < flat.length; i++) {
          if (valuesEqual(flat[i]!, lookupVal)) {
            return i + 1; // 1-based index
          }
        }
        return FormulaError.NA;
      } else if (matchType === 1) {
        // Largest value <= lookupVal (ascending order)
        let best = -1;
        for (let i = 0; i < flat.length; i++) {
          const val = flat[i]!;
          if (valuesEqual(val, lookupVal)) {
            best = i;
            break;
          }
          if (typeof val === 'number' && typeof lookupVal === 'number') {
            if (val <= lookupVal) {
              best = i;
            } else {
              break;
            }
          } else {
            const vStr = coerceString(val).toUpperCase();
            const lStr = coerceString(lookupVal).toUpperCase();
            if (vStr <= lStr) {
              best = i;
            } else {
              break;
            }
          }
        }
        return best !== -1 ? best + 1 : FormulaError.NA;
      } else if (matchType === -1) {
        // Smallest value >= lookupVal (descending order)
        let best = -1;
        for (let i = 0; i < flat.length; i++) {
          const val = flat[i]!;
          if (valuesEqual(val, lookupVal)) {
            best = i;
            break;
          }
          if (typeof val === 'number' && typeof lookupVal === 'number') {
            if (val >= lookupVal) {
              best = i;
            } else {
              break;
            }
          } else {
            const vStr = coerceString(val).toUpperCase();
            const lStr = coerceString(lookupVal).toUpperCase();
            if (vStr >= lStr) {
              best = i;
            } else {
              break;
            }
          }
        }
        return best !== -1 ? best + 1 : FormulaError.NA;
      }

      return FormulaError.VALUE;
    }
  },

  // 12. ROW
  {
    name: 'ROW',
    category: 'Lookup & Reference',
    description: 'Returns the row number of a reference.',
    minArgs: 0,
    maxArgs: 1,
    returnType: 'number',
    args: [
      { name: 'reference', description: 'The cell or range of cells for which you want the row number.', type: 'any', optional: true }
    ],
    examples: ['=ROW(C5)', '=ROW()'],
    handler: (args, context) => {
      if (!args[0] || args[0].type === 'Empty') {
        return context?.currentCoord ? context.currentCoord.row + 1 : 1;
      }
      const arg = args[0];
      if (arg.type === 'CellRef') {
        return arg.coord.row + 1;
      }
      if (arg.type === 'RangeRef') {
        return arg.range.startRow + 1;
      }
      return 1;
    }
  },

  // 13. COLUMN
  {
    name: 'COLUMN',
    category: 'Lookup & Reference',
    description: 'Returns the column number of a reference.',
    minArgs: 0,
    maxArgs: 1,
    returnType: 'number',
    args: [
      { name: 'reference', description: 'The cell or range of cells for which you want the column number.', type: 'any', optional: true }
    ],
    examples: ['=COLUMN(C5)', '=COLUMN()'],
    handler: (args, context) => {
      if (!args[0] || args[0].type === 'Empty') {
        return context?.currentCoord ? context.currentCoord.col + 1 : 1;
      }
      const arg = args[0];
      if (arg.type === 'CellRef') {
        return arg.coord.col + 1;
      }
      if (arg.type === 'RangeRef') {
        return arg.range.startCol + 1;
      }
      return 1;
    }
  },

  // 14. OFFSET
  {
    name: 'OFFSET',
    category: 'Lookup & Reference',
    description: 'Returns a reference to a range that is a specified number of rows and columns from a cell or range of cells.',
    minArgs: 3,
    maxArgs: 5,
    returnType: 'any',
    args: [
      { name: 'reference', description: 'The reference from which you want to base the offset.', type: 'range' },
      { name: 'rows', description: 'The number of rows, up or down, that you want the upper-left cell to refer to.', type: 'number' },
      { name: 'cols', description: 'The number of columns, to the left or right, that you want the upper-left cell to refer to.', type: 'number' },
      { name: 'height', description: 'The height, in number of rows, that you want the returned reference to be.', type: 'number', optional: true },
      { name: 'width', description: 'The width, in number of columns, that you want the returned reference to be.', type: 'number', optional: true }
    ],
    examples: ['=OFFSET(A1, 2, 3)', '=OFFSET(B2, -1, 1, 1, 1)'],
    handler: (args, context, evaluate) => {
      const refArg = args[0]!;
      let baseRow = 0;
      let baseCol = 0;
      let sheetName: string | undefined = undefined;

      if (refArg.type === 'CellRef') {
        baseRow = refArg.coord.row;
        baseCol = refArg.coord.col;
        sheetName = refArg.sheetName;
      } else if (refArg.type === 'RangeRef') {
        baseRow = refArg.range.startRow;
        baseCol = refArg.range.startCol;
        sheetName = refArg.sheetName;
      } else {
        return FormulaError.VALUE;
      }

      const rowsEval = evaluate(args[1]!, context);
      if (isFormulaError(rowsEval)) return rowsEval;
      const { num: dRow, error: errR } = coerceNumber(rowsEval);
      if (errR) return errR;

      const colsEval = evaluate(args[2]!, context);
      if (isFormulaError(colsEval)) return colsEval;
      const { num: dCol, error: errC } = coerceNumber(colsEval);
      if (errC) return errC;

      const targetRow = baseRow + Math.trunc(dRow);
      const targetCol = baseCol + Math.trunc(dCol);

      if (targetRow < 0 || targetCol < 0) {
        return FormulaError.REF;
      }

      let h = 1;
      let w = 1;
      if (args[3]) {
        const hEval = evaluate(args[3]!, context);
        if (isFormulaError(hEval)) return hEval;
        const { num, error } = coerceNumber(hEval);
        if (error || num <= 0) return FormulaError.VALUE;
        h = Math.trunc(num);
      }
      if (args[4]) {
        const wEval = evaluate(args[4]!, context);
        if (isFormulaError(wEval)) return wEval;
        const { num, error } = coerceNumber(wEval);
        if (error || num <= 0) return FormulaError.VALUE;
        w = Math.trunc(num);
      }

      if (h === 1 && w === 1) {
        return context.getCellValue({ row: targetRow, col: targetCol }, sheetName);
      }

      const grid = context.getRangeValues(
        { startRow: targetRow, startCol: targetCol, endRow: targetRow + h - 1, endCol: targetCol + w - 1 },
        sheetName
      );
      return grid[0]?.[0] ?? null;
    }
  },

  // 15. INDIRECT
  {
    name: 'INDIRECT',
    category: 'Lookup & Reference',
    description: 'Returns the reference specified by a text string.',
    minArgs: 1,
    maxArgs: 2,
    returnType: 'any',
    args: [
      { name: 'ref_text', description: 'A reference to a cell that contains an A1-style reference.', type: 'string' },
      { name: 'a1', description: 'A logical value that specifies what type of reference is contained in the cell ref_text.', type: 'boolean', optional: true }
    ],
    examples: ['=INDIRECT("A1")', '=INDIRECT("Sheet2!B5")'],
    handler: (args, context, evaluate) => {
      const textEval = evaluate(args[0]!, context);
      if (isFormulaError(textEval)) return textEval;

      const raw = coerceString(textEval).trim();
      if (!raw) return FormulaError.REF;

      // Extract sheet qualifier if present (e.g. Sheet2!A1 or 'My Sheet'!A1)
      let sheetName: string | undefined = undefined;
      let cellOrRange = raw;
      if (raw.includes('!')) {
        const parts = raw.split('!');
        const rawSheet = parts[0]!.replace(/^['"]|['"]$/g, '');
        sheetName = rawSheet;
        cellOrRange = parts[1]!;
      }

      // Check if range e.g. A1:B10
      if (cellOrRange.includes(':')) {
        const rParts = cellOrRange.split(':');
        const c1 = a1ToCoord(rParts[0]!);
        const c2 = a1ToCoord(rParts[1]!);
        if (!c1 || !c2) return FormulaError.REF;
        const range = {
          startRow: Math.min(c1.row, c2.row),
          startCol: Math.min(c1.col, c2.col),
          endRow: Math.max(c1.row, c2.row),
          endCol: Math.max(c1.col, c2.col)
        };
        const grid = context.getRangeValues(range, sheetName);
        return grid[0]?.[0] ?? null;
      }

      // Single cell reference
      const coord = a1ToCoord(cellOrRange);
      if (!coord) return FormulaError.REF;

      return context.getCellValue(coord, sheetName);
    }
  },

  // 16. UNIQUE
  {
    name: 'UNIQUE',
    category: 'Lookup & Reference',
    description: 'Returns a list of unique values in a list or range.',
    minArgs: 1,
    maxArgs: 3,
    returnType: 'array',
    args: [
      { name: 'array', description: 'The range or array from which you want to return unique values.', type: 'array' },
      { name: 'by_col', description: 'How to compare: FALSE to compare by row (default), TRUE to compare by column.', type: 'boolean', optional: true },
      { name: 'exactly_once', description: 'TRUE returns values that occur only once. FALSE returns all distinct values.', type: 'boolean', optional: true }
    ],
    examples: ['=UNIQUE(A1:A10)', '=UNIQUE(A1:B10, FALSE, TRUE)'],
    handler: (args, context, evaluate) => {
      const grid = resolveTo2DArray(args[0]!, context, evaluate);
      if (typeof grid === 'string') return grid;

      let exactlyOnce = false;
      if (args[2]) {
        const eEval = evaluate(args[2]!, context);
        if (isFormulaError(eEval)) return eEval;
        exactlyOnce = coerceBoolean(eEval);
      }

      // Deduplicate rows
      const counts = new Map<string, { count: number; row: CellValue[] }>();
      const order: string[] = [];

      for (const row of grid) {
        const key = JSON.stringify(row);
        if (!counts.has(key)) {
          counts.set(key, { count: 1, row });
          order.push(key);
        } else {
          counts.get(key)!.count++;
        }
      }

      const resultRows: CellValue[][] = [];
      for (const key of order) {
        const item = counts.get(key)!;
        if (exactlyOnce) {
          if (item.count === 1) {
            resultRows.push(item.row);
          }
        } else {
          resultRows.push(item.row);
        }
      }

      if (resultRows.length === 0) return FormulaError.NA;
      return resultRows;
    }
  },

  // 17. FILTER
  {
    name: 'FILTER',
    category: 'Lookup & Reference',
    description: 'Filters a range of data based on criteria you define.',
    minArgs: 2,
    maxArgs: 3,
    returnType: 'array',
    args: [
      { name: 'array', description: 'The range or array to filter.', type: 'array' },
      { name: 'include', description: 'A boolean array whose height or width is the same as array.', type: 'array' },
      { name: 'if_empty', description: 'Value to return if all values in the include array are empty or false.', type: 'any', optional: true }
    ],
    examples: ['=FILTER(A1:B10, A1:A10>5)', '=FILTER(A1:B10, A1:A10="Yes", "None")'],
    handler: (args, context, evaluate) => {
      const grid = resolveTo2DArray(args[0]!, context, evaluate);
      if (typeof grid === 'string') return grid;

      const incGrid = resolveTo2DArray(args[1]!, context, evaluate);

      const matchedRows: CellValue[][] = [];
      for (let r = 0; r < grid.length; r++) {
        let isIncluded = false;

        // Check if condition is a vector comparison expression e.g. B1:B4 >= 30
        if (args[1]!.type === 'BinaryOp') {
          const binOp = args[1]!;
          let leftVal: CellValue = null;
          let rightVal: CellValue = null;

          if (binOp.left.type === 'RangeRef') {
            const rGrid = context.getRangeValues(binOp.left.range, binOp.left.sheetName);
            leftVal = rGrid[r]?.[0] ?? null;
          } else {
            leftVal = evaluate(binOp.left, context);
          }

          if (binOp.right.type === 'RangeRef') {
            const rGrid = context.getRangeValues(binOp.right.range, binOp.right.sheetName);
            rightVal = rGrid[r]?.[0] ?? null;
          } else {
            rightVal = evaluate(binOp.right, context);
          }

          if (typeof leftVal === 'number' && typeof rightVal === 'number') {
            switch (binOp.operator) {
              case '=': isIncluded = leftVal === rightVal; break;
              case '<>': isIncluded = leftVal !== rightVal; break;
              case '<': isIncluded = leftVal < rightVal; break;
              case '<=': isIncluded = leftVal <= rightVal; break;
              case '>': isIncluded = leftVal > rightVal; break;
              case '>=': isIncluded = leftVal >= rightVal; break;
            }
          } else {
            const lStr = String(leftVal ?? '').toUpperCase();
            const rStr = String(rightVal ?? '').toUpperCase();
            switch (binOp.operator) {
              case '=': isIncluded = lStr === rStr; break;
              case '<>': isIncluded = lStr !== rStr; break;
              case '<': isIncluded = lStr < rStr; break;
              case '<=': isIncluded = lStr <= rStr; break;
              case '>': isIncluded = lStr > rStr; break;
              case '>=': isIncluded = lStr >= rStr; break;
            }
          }
        } else if (typeof incGrid !== 'string') {
          const incVal = incGrid[r]?.[0] ?? incGrid[0]?.[r] ?? false;
          if (isFormulaError(incVal)) return incVal;
          isIncluded = coerceBoolean(incVal);
        }

        if (isIncluded) {
          matchedRows.push(grid[r]!);
        }
      }

      if (matchedRows.length === 0) {
        if (args[2]) {
          return evaluate(args[2]!, context);
        }
        return FormulaError.NA;
      }

      return matchedRows;
    }
  },

  // 18. SORT
  {
    name: 'SORT',
    category: 'Lookup & Reference',
    description: 'Sorts the contents of a range or array.',
    minArgs: 1,
    maxArgs: 4,
    returnType: 'array',
    args: [
      { name: 'array', description: 'The range or array to sort.', type: 'array' },
      { name: 'sort_index', description: 'A number indicating the row or column to sort by (default 1).', type: 'number', optional: true },
      { name: 'sort_order', description: '1 for ascending (default), -1 for descending.', type: 'number', optional: true },
      { name: 'by_col', description: 'FALSE to sort by row (default), TRUE to sort by column.', type: 'boolean', optional: true }
    ],
    examples: ['=SORT(A1:B10)', '=SORT(A1:B10, 2, -1)'],
    handler: (args, context, evaluate) => {
      const grid = resolveTo2DArray(args[0]!, context, evaluate);
      if (typeof grid === 'string') return grid;

      let sortColIdx = 0;
      if (args[1]) {
        const sVal = evaluate(args[1]!, context);
        if (isFormulaError(sVal)) return sVal;
        const { num, error } = coerceNumber(sVal);
        if (error || num < 1) return FormulaError.VALUE;
        sortColIdx = Math.trunc(num) - 1;
      }

      let ascending = true;
      if (args[2]) {
        const oVal = evaluate(args[2]!, context);
        if (isFormulaError(oVal)) return oVal;
        const { num, error } = coerceNumber(oVal);
        if (error) return error;
        ascending = num >= 0;
      }

      const rowsCopy = [...grid];
      rowsCopy.sort((rowA, rowB) => {
        const valA = rowA[sortColIdx] ?? null;
        const valB = rowB[sortColIdx] ?? null;

        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        let cmp = 0;
        if (typeof valA === 'number' && typeof valB === 'number') {
          cmp = valA - valB;
        } else {
          cmp = String(valA).localeCompare(String(valB));
        }

        return ascending ? cmp : -cmp;
      });

      return rowsCopy;
    }
  }
];
