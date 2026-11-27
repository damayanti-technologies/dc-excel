import { Cell, CellCoordinates, CellRange, CellValue } from '@/types/cell';
import { Sheet } from '@/types/sheet';
import { ASTNode, EvaluationContext } from './types';
import { parseFormula } from './parser';
import { evaluateAST, evaluateRootAST } from './evaluator';
import { DependencyGraph, extractReferencesFromAST } from './dependency-graph';
import { FormulaError, isFormulaError, BoxedLiteralString, isBoxedLiteral } from './errors';
import { coordToKey, keyToCoord } from '@/utils/coordinates';
import { dateToSerial } from './date-utils';

/**
 * Creates an EvaluationContext backed by a cells map, with cross-sheet resolution
 * and bounded full-column/full-row iteration.
 */
export function createEvaluationContext(
  cells: Record<string, Cell>,
  namedRangeResolver?: (name: string) => { range: CellRange; sheetId?: string } | null,
  getCrossSheetCells?: (sheetName: string) => Record<string, Cell> | undefined,
  currentSheetName?: string,
  currentCoord?: CellCoordinates
): EvaluationContext {
  const getTargetCells = (sheetName?: string) => {
    if (sheetName && getCrossSheetCells) {
      const cross = getCrossSheetCells(sheetName);
      if (cross) return cross;
    }
    return cells;
  };

  const colStoreCache = new Map<string, Map<number, (Cell | undefined)[]>>();

  const getColStore = (target: Record<string, Cell>, sheetTag: string): Map<number, (Cell | undefined)[]> => {
    let colStore = colStoreCache.get(sheetTag);
    if (!colStore) {
      colStore = new Map();
      colStoreCache.set(sheetTag, colStore);
      for (const [key, cell] of Object.entries(target)) {
        const colonIdx = key.indexOf(':');
        if (colonIdx === -1) continue;
        const r = Number.parseInt(key.slice(0, colonIdx), 10);
        const c = Number.parseInt(key.slice(colonIdx + 1), 10);
        let arr = colStore.get(c);
        if (!arr) {
          arr = [];
          colStore.set(c, arr);
        }
        arr[r] = cell;
      }
    }
    return colStore;
  };

  return {
    currentSheetName,
    currentCoord,
    getCellValue: (coord: CellCoordinates, sheetName?: string) => {
      const target = getTargetCells(sheetName);
      const cell = target[coordToKey(coord.row, coord.col)];
      if (!cell) return null;
      if (cell.dataType === 'string' && typeof cell.value === 'string' && isFormulaError(cell.value)) {
        const boxed: BoxedLiteralString = new String(cell.value);
        boxed.__isLiteralText = true;
        return boxed as unknown as CellValue;
      }
      return cell.value ?? null;
    },
    getCellRawOrFormula: (coord: CellCoordinates, sheetName?: string) => {
      const target = getTargetCells(sheetName);
      const cell = target[coordToKey(coord.row, coord.col)];
      return cell?.formula ?? (cell?.value !== null && cell?.value !== undefined ? String(cell.value) : undefined);
    },
    getRangeValues: (range: CellRange, sheetName?: string) => {
      const target = getTargetCells(sheetName);
      const sheetTag = sheetName?.toLowerCase() || currentSheetName?.toLowerCase() || '__current__';
      const colStore = getColStore(target, sheetTag);

      // Determine bounding box of populated cells so full columns/rows (e.g. A:A) don't iterate 100k+ times.
      // Bounded ranges (e.g. A1:A3, B2:D10) must inspect all requested cells including sparse/empty cells!
      let maxPopulatedRow = 0;
      let maxPopulatedCol = 0;
      const isUnboundedRow = range.endRow >= 100000;
      const isUnboundedCol = range.endCol >= 10000;

      if (isUnboundedRow || isUnboundedCol) {
        for (const [c, arr] of colStore.entries()) {
          if (arr.length - 1 > maxPopulatedRow) maxPopulatedRow = arr.length - 1;
          if (c > maxPopulatedCol) maxPopulatedCol = c;
        }
      }

      const effectiveEndRow = isUnboundedRow
        ? Math.min(range.endRow, Math.max(maxPopulatedRow, range.startRow))
        : range.endRow;
      const effectiveEndCol = isUnboundedCol
        ? Math.min(range.endCol, Math.max(maxPopulatedCol, range.startCol))
        : range.endCol;

      // Fast path for 1D column vector range (e.g. A1:Ak)
      if (range.startCol === effectiveEndCol) {
        const colArr = colStore.get(range.startCol);
        const result: CellValue[][] = [];
        for (let r = range.startRow; r <= effectiveEndRow; r++) {
          const cell = colArr ? colArr[r] : undefined;
          let val = cell?.value ?? null;
          if (cell?.dataType === 'string' && typeof val === 'string' && isFormulaError(val)) {
            const boxed: BoxedLiteralString = new String(val);
            boxed.__isLiteralText = true;
            val = boxed as unknown as CellValue;
          }
          result.push([val]);
        }
        return result.length > 0 ? result : [[null]];
      }

      const result: CellValue[][] = [];
      for (let r = range.startRow; r <= effectiveEndRow; r++) {
        const rowVals: CellValue[] = [];
        for (let c = range.startCol; c <= effectiveEndCol; c++) {
          const colArr = colStore.get(c);
          const cell = colArr ? colArr[r] : undefined;
          let val = cell?.value ?? null;
          if (cell?.dataType === 'string' && typeof val === 'string' && isFormulaError(val)) {
            const boxed: BoxedLiteralString = new String(val);
            boxed.__isLiteralText = true;
            val = boxed as unknown as CellValue;
          }
          rowVals.push(val);
        }
        result.push(rowVals);
      }
      return result.length > 0 ? result : [[null]];
    },
    iterateRangeValues: (range: CellRange, sheetName: string | undefined, callback: (val: CellValue) => boolean | void) => {
      const target = getTargetCells(sheetName);
      const sheetTag = sheetName?.toLowerCase() || currentSheetName?.toLowerCase() || '__current__';
      const colStore = getColStore(target, sheetTag);

      let maxPopulatedRow = 0;
      let maxPopulatedCol = 0;
      const isUnboundedRow = range.endRow >= 100000;
      const isUnboundedCol = range.endCol >= 10000;

      if (isUnboundedRow || isUnboundedCol) {
        for (const [c, arr] of colStore.entries()) {
          if (arr.length - 1 > maxPopulatedRow) maxPopulatedRow = arr.length - 1;
          if (c > maxPopulatedCol) maxPopulatedCol = c;
        }
      }

      const effectiveEndRow = isUnboundedRow
        ? Math.min(range.endRow, Math.max(maxPopulatedRow, range.startRow))
        : range.endRow;
      const effectiveEndCol = isUnboundedCol
        ? Math.min(range.endCol, Math.max(maxPopulatedCol, range.startCol))
        : range.endCol;

      for (let c = range.startCol; c <= effectiveEndCol; c++) {
        const colArr = colStore.get(c);
        for (let r = range.startRow; r <= effectiveEndRow; r++) {
          const cell = colArr ? colArr[r] : undefined;
          let val = cell?.value ?? null;
          if (cell?.dataType === 'string' && typeof val === 'string' && isFormulaError(val)) {
            const boxed: BoxedLiteralString = new String(val);
            boxed.__isLiteralText = true;
            val = boxed as unknown as CellValue;
          }
          if (callback(val) === false) return;
        }
      }
    },
    syncCell: (coord: CellCoordinates, cell: Cell, sheetName?: string) => {
      const sheetTag = sheetName?.toLowerCase() || currentSheetName?.toLowerCase() || '__current__';
      const store = colStoreCache.get(sheetTag);
      if (store) {
        let arr = store.get(coord.col);
        if (!arr) {
          arr = [];
          store.set(coord.col, arr);
        }
        arr[coord.row] = cell;
      }
    },
    resolveNamedRange: namedRangeResolver
  };
}

/**
 * Parses user raw text input to infer appropriate type and initial structure.
 */
export function parseRawCellValue(input: string): {
  value: CellValue;
  formula?: string;
  dataType: Cell['dataType'];
  format?: string;
} {
  const trimmed = input.trim();

  // 1. Empty
  if (trimmed === '') {
    return { value: null, dataType: 'empty' };
  }

  // 2. Formula (starts with '=')
  if (trimmed.startsWith('=')) {
    return {
      value: null,
      formula: trimmed,
      dataType: 'formula'
    };
  }

  // 3. Boolean
  if (trimmed.toUpperCase() === 'TRUE') {
    return { value: true, dataType: 'boolean' };
  }
  if (trimmed.toUpperCase() === 'FALSE') {
    return { value: false, dataType: 'boolean' };
  }

  // 4. Percentage e.g. 50%, 12.5%, -5%
  if (/^[+-]?[0-9]+(\.[0-9]+)?\s*%$|^[+-]?[0-9]{1,3}(,[0-9]{3})+(\.[0-9]+)?\s*%$/.test(trimmed)) {
    const rawNum = trimmed.replace(/%/g, '').replace(/,/g, '').trim();
    const num = Number(rawNum);
    if (!Number.isNaN(num) && Number.isFinite(num)) {
      const hasDecimals = rawNum.includes('.');
      return {
        value: num / 100,
        dataType: 'number',
        format: hasDecimals ? '0.00%' : '0%'
      };
    }
  }

  // 5. Currency e.g. $5, $5.00, $ 1,000, -$50, ($100), €50, £10, ₹500, ¥1000
  const currencyMatch =
    trimmed.match(/^([+-])?\s*([$€£¥₹])\s*([0-9]{1,3}(,[0-9]{3})*(\.[0-9]+)?|[0-9]+(\.[0-9]+)?)$/) ||
    trimmed.match(/^\(([0-9]{1,3}(,[0-9]{3})*(\.[0-9]+)?|[0-9]+(\.[0-9]+)?)\s*([$€£¥₹])\)$/) ||
    trimmed.match(/^\(\s*([$€£¥₹])\s*([0-9]{1,3}(,[0-9]{3})*(\.[0-9]+)?|[0-9]+(\.[0-9]+)?)\)$/);
  if (currencyMatch) {
    const isNegative = trimmed.startsWith('-') || trimmed.startsWith('(');
    const cleanNum = trimmed.replace(/[$€£¥₹(),+\-\s]/g, '');
    const num = Number(cleanNum);
    if (!Number.isNaN(num) && Number.isFinite(num)) {
      const finalVal = isNegative ? -num : num;
      const hasDecimals = cleanNum.includes('.');
      const symbol = trimmed.match(/[$€£¥₹]/)?.[0] || '$';
      return {
        value: finalVal,
        dataType: 'number',
        format: hasDecimals ? `${symbol}#,##0.00` : `${symbol}#,##0`
      };
    }
  }

  // 6. Standard integer, float, scientific notation (e.g. 1E5, 1e3, 2.5e-3, +5, -42)
  if (
    /^[+-]?[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?$/.test(trimmed) ||
    /^[+-]?\.[0-9]+([eE][+-]?[0-9]+)?$/.test(trimmed)
  ) {
    const num = Number(trimmed);
    if (!Number.isNaN(num) && Number.isFinite(num)) {
      return { value: num, dataType: 'number' };
    }
  }

  // 6. Number with thousands commas (e.g. 1,000 or 1,234,567.89 or +1,000)
  if (/^[+-]?[0-9]{1,3}(,[0-9]{3})+(\.[0-9]+)?$/.test(trimmed)) {
    const cleanNum = trimmed.replace(/,/g, '');
    const num = Number(cleanNum);
    if (!Number.isNaN(num) && Number.isFinite(num)) {
      const hasDecimals = cleanNum.includes('.');
      return {
        value: num,
        dataType: 'number',
        format: hasDecimals ? '#,##0.00' : '#,##0'
      };
    }
  }

  // 7. ISO Date e.g. 2024-01-05
  const dateMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateMatch) {
    const y = parseInt(dateMatch[1]!, 10);
    const m = parseInt(dateMatch[2]!, 10);
    const d = parseInt(dateMatch[3]!, 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const serial = dateToSerial(y, m, d);
      return {
        value: serial,
        dataType: 'date',
        format: 'YYYY-MM-DD'
      };
    }
  }

  // 8. String
  return { value: input, dataType: 'string' };
}

/**
 * Central calculation engine managing AST caching, dependency graphs,
 * formula evaluation, and topological recalculation.
 */
export class CalculationEngine {
  private dependencyGraph = new DependencyGraph();
  private astCache = new Map<string, ASTNode>();
  private spillTracking = new Map<string, Set<string>>();

  private clearSpillChildren(cells: Record<string, Cell>, anchorKey: string): void {
    const children = this.spillTracking.get(anchorKey);
    if (children) {
      for (const childKey of children) {
        if (cells[childKey]?.spillParent === anchorKey) {
          delete cells[childKey];
        }
      }
      this.spillTracking.delete(anchorKey);
    }
  }

  private applySpill(
    cells: Record<string, Cell>,
    anchorKey: string,
    result: unknown
  ): { anchorValue: CellValue; isSpillError: boolean } {
    if (
      !Array.isArray(result) ||
      (result.length <= 1 && (!result[0] || !Array.isArray(result[0]) || result[0].length <= 1))
    ) {
      const singleVal = Array.isArray(result)
        ? (Array.isArray(result[0]) ? (result[0][0] ?? null) : (result[0] ?? null))
        : (result as CellValue);
      this.clearSpillChildren(cells, anchorKey);
      return { anchorValue: singleVal, isSpillError: false };
    }

    const grid = result as CellValue[][];
    const anchorCoord = keyToCoord(anchorKey);
    const rows = grid.length;
    const prevChildren = this.spillTracking.get(anchorKey) || new Set<string>();

    // 1. Check for collision/blockage
    for (let r = 0; r < rows; r++) {
      const rowLen = grid[r]?.length || 0;
      for (let c = 0; c < rowLen; c++) {
        if (r === 0 && c === 0) continue;
        const targetKey = coordToKey(anchorCoord.row + r, anchorCoord.col + c);
        const existing = cells[targetKey];
        if (existing) {
          const hasContent = existing.formula || (existing.value !== null && existing.value !== undefined && existing.value !== '');
          if (hasContent && existing.spillParent !== anchorKey) {
            this.clearSpillChildren(cells, anchorKey);
            return { anchorValue: FormulaError.SPILL, isSpillError: true };
          }
        }
      }
    }

    // 2. Populate spilled cells
    const newChildren = new Set<string>();
    for (let r = 0; r < rows; r++) {
      const rowLen = grid[r]?.length || 0;
      for (let c = 0; c < rowLen; c++) {
        if (r === 0 && c === 0) continue;
        const childKey = coordToKey(anchorCoord.row + r, anchorCoord.col + c);
        newChildren.add(childKey);
        const val = grid[r]![c] ?? null;
        const isErr = isFormulaError(val);
        cells[childKey] = {
          value: val,
          dataType: isErr ? 'error' : typeof val === 'number' ? 'number' : typeof val === 'boolean' ? 'boolean' : 'string',
          spillParent: anchorKey
        };
      }
    }

    // Clear old children outside new bounds
    for (const oldChild of prevChildren) {
      if (!newChildren.has(oldChild) && cells[oldChild]?.spillParent === anchorKey) {
        delete cells[oldChild];
      }
    }
    this.spillTracking.set(anchorKey, newChildren);

    const anchorVal = grid[0]?.[0] ?? null;
    return { anchorValue: anchorVal, isSpillError: false };
  }

  /**
   * Evaluates a standalone formula string in the context of given cells.
   */
  public evaluateFormula(
    formula: string,
    cells: Record<string, Cell>,
    namedRangeResolver?: (name: string) => { range: CellRange; sheetId?: string } | null,
    getCrossSheetCells?: (sheetName: string) => Record<string, Cell> | undefined,
    currentSheetName?: string,
    currentCoord?: CellCoordinates
  ): CellValue {
    const ast = parseFormula(formula);
    const context = createEvaluationContext(cells, namedRangeResolver, getCrossSheetCells, currentSheetName, currentCoord);
    const evalResult = evaluateAST(ast, context);
    if (Array.isArray(evalResult)) {
      const firstRow = evalResult[0];
      const scalar = Array.isArray(firstRow) ? firstRow[0] : firstRow;
      return scalar instanceof String ? scalar.valueOf() : (scalar ?? null);
    }
    return evalResult instanceof String ? evalResult.valueOf() : evalResult;
  }

  /**
   * Rebuilds dependencies and recalculates all formula cells in a sheet.
   * Typically called on initial workbook load or recovery.
   */
  public recalculateSheet(
    sheet: Sheet,
    namedRangeResolver?: (name: string) => { range: CellRange; sheetId?: string } | null,
    getCrossSheetCells?: (sheetName: string) => Record<string, Cell> | undefined
  ): {
    updatedCells: Record<string, Cell>;
    cycles: string[];
  } {
    this.dependencyGraph.clear();
    this.astCache.clear();
    this.spillTracking.clear();

    const cellsCopy = { ...sheet.cells };
    const formulaCells = new Map<string, { formula: string; ast: ASTNode }>();

    // 1. First pass: find all cells containing formulas, parse AST, register dependencies
    for (const [key, cell] of Object.entries(cellsCopy)) {
      const formulaStr = cell.formula || (typeof cell.value === 'string' && cell.value.startsWith('=') ? cell.value : null);
      if (formulaStr && formulaStr.startsWith('=')) {
        const ast = parseFormula(formulaStr);
        this.astCache.set(key, ast);
        const precedents = extractReferencesFromAST(ast, namedRangeResolver, sheet.name);
        this.dependencyGraph.setCellDependencies(key, precedents);
        formulaCells.set(key, { formula: formulaStr, ast });
      }
    }

    // 2. Identify cycles and topological evaluation order in a single O(V + E) pass
    const formulaKeys = Array.from(formulaCells.keys());
    const { order, cycleCells } = this.dependencyGraph.getTopologicalOrderAndCycles(formulaKeys);

    // 3. Mark cycle cells
    for (const cycleKey of cycleCells) {
      const orig = cellsCopy[cycleKey];
      if (orig) {
        cellsCopy[cycleKey] = {
          ...orig,
          value: FormulaError.CYCLE,
          dataType: 'error'
        };
      }
    }

    // 4. Calculate non-cycle formula cells in topological order
    const context = createEvaluationContext(cellsCopy, namedRangeResolver, getCrossSheetCells, sheet.name);
    for (const key of order) {
      const fInfo = formulaCells.get(key);
      if (!fInfo) continue;

      context.currentCoord = keyToCoord(key);
      const evalResult = evaluateRootAST(fInfo.ast, context);
      const { anchorValue, isSpillError } = this.applySpill(cellsCopy, key, evalResult);
      const isLiteral = isBoxedLiteral(anchorValue);
      const unwrappedResult = anchorValue instanceof String ? anchorValue.valueOf() : anchorValue;
      const isErr = isSpillError || (!isLiteral && isFormulaError(unwrappedResult));

      cellsCopy[key] = {
        ...cellsCopy[key]!,
        value: unwrappedResult,
        formula: fInfo.formula,
        dataType: isErr ? 'error' : 'formula'
      };
      const coord = keyToCoord(key);
      if (coord) {
        context.syncCell?.(coord, cellsCopy[key]!, sheet.name);
      }
    }

    return { updatedCells: cellsCopy, cycles: Array.from(cycleCells) };
  }

  /**
   * Handles user editing of a cell value or formula.
   * Updates dependencies and recalculates all affected downstream cells in topological order.
   */
  public updateCellInput(
    currentCells: Record<string, Cell>,
    coord: CellCoordinates,
    rawInput: string,
    namedRangeResolver?: (name: string) => { range: CellRange; sheetId?: string } | null,
    getCrossSheetCells?: (sheetName: string) => Record<string, Cell> | undefined,
    currentSheetName?: string
  ): {
    updatedCells: Record<string, Cell>;
    recalculatedCount: number;
    error?: string;
  } {
    const key = coordToKey(coord.row, coord.col);
    const updatedCells: Record<string, Cell> = { ...currentCells };
    const parsed = parseRawCellValue(rawInput);

    // 1. Process target cell
    if (parsed.dataType === 'empty') {
      this.clearSpillChildren(updatedCells, key);
      this.dependencyGraph.removeCell(key);
      this.astCache.delete(key);
      delete updatedCells[key];
    } else if (parsed.formula) {
      // Cell contains formula
      const ast = parseFormula(parsed.formula);
      this.astCache.set(key, ast);
      const precedents = extractReferencesFromAST(ast, namedRangeResolver, currentSheetName);
      this.dependencyGraph.setCellDependencies(key, precedents);

      // Check if self or newly formed dependency is circular
      if (this.dependencyGraph.hasCircularDependency(key)) {
        this.clearSpillChildren(updatedCells, key);
        updatedCells[key] = {
          value: FormulaError.CYCLE,
          formula: parsed.formula,
          dataType: 'error'
        };
      } else {
        const context = createEvaluationContext(updatedCells, namedRangeResolver, getCrossSheetCells, currentSheetName, keyToCoord(key));
        const evalResult = evaluateRootAST(ast, context);
        const { anchorValue, isSpillError } = this.applySpill(updatedCells, key, evalResult);
        const isLiteral = isBoxedLiteral(anchorValue);
        const unwrapped = anchorValue instanceof String ? anchorValue.valueOf() : anchorValue;
        const isErr = isSpillError || (!isLiteral && isFormulaError(unwrapped));
        updatedCells[key] = {
          ...(updatedCells[key] || {}),
          value: unwrapped,
          formula: parsed.formula,
          dataType: isErr ? 'error' : 'formula'
        };
      }
    } else {
      // Cell contains literal value
      this.clearSpillChildren(updatedCells, key);
      this.dependencyGraph.removeCell(key);
      this.astCache.delete(key);
      const existingCell = updatedCells[key];
      updatedCells[key] = {
        ...(existingCell || {}),
        value: parsed.value,
        dataType: parsed.dataType,
        formula: undefined,
        style: parsed.format
          ? { ...(existingCell?.style || {}), numberFormat: parsed.format }
          : existingCell?.style
      };
    }

    // 2. Determine affected downstream dependents in topological order
    const { order, hasCycle, cycleCells } = this.dependencyGraph.getRecalculationOrder([key]);

    // Handle any newly introduced cycle cells
    if (hasCycle) {
      for (const cKey of cycleCells) {
        if (updatedCells[cKey]) {
          updatedCells[cKey] = {
            ...updatedCells[cKey],
            value: FormulaError.CYCLE,
            dataType: 'error'
          };
        }
      }
    }

    // 3. Recalculate downstream non-cycle cells in topological order
    const context = createEvaluationContext(updatedCells, namedRangeResolver, getCrossSheetCells, currentSheetName);
    let count = 0;

    for (const depKey of order) {
      if (cycleCells.has(depKey)) continue;

      const cell = updatedCells[depKey];
      if (!cell || !cell.formula) continue;

      let ast = this.astCache.get(depKey);
      if (!ast) {
        ast = parseFormula(cell.formula);
        this.astCache.set(depKey, ast);
      }

      context.currentCoord = keyToCoord(depKey);
      const evalResult = evaluateRootAST(ast, context);
      const { anchorValue, isSpillError } = this.applySpill(updatedCells, depKey, evalResult);
      const isLiteral = isBoxedLiteral(anchorValue);
      const unwrapped = anchorValue instanceof String ? anchorValue.valueOf() : anchorValue;
      const isErr = isSpillError || (!isLiteral && isFormulaError(unwrapped));
      updatedCells[depKey] = {
        ...cell,
        value: unwrapped,
        dataType: isErr ? 'error' : 'formula'
      };
      const coord = keyToCoord(depKey);
      if (coord) {
        context.syncCell?.(coord, updatedCells[depKey]!, currentSheetName);
      }
      count++;
    }

    return { updatedCells, recalculatedCount: count };
  }

  /**
   * Clears all caches and dependency tracking.
   */
  public clear(): void {
    this.dependencyGraph.clear();
    this.astCache.clear();
    this.spillTracking.clear();
  }

  /**
   * Helper to retrieve dependency nodes.
   */
  public getDependencies(coord: CellCoordinates) {
    const key = coordToKey(coord.row, coord.col);
    return {
      precedents: this.dependencyGraph.getPrecedents(key).map(keyToCoord),
      dependents: this.dependencyGraph.getDirectDependents(key).map(keyToCoord)
    };
  }
}

/**
 * Singleton Calculation Engine instance.
 */
export const calculationEngine = new CalculationEngine();
