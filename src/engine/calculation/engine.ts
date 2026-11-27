import { Cell, CellCoordinates, CellRange, CellValue } from '@/types/cell';
import { Sheet } from '@/types/sheet';
import { ASTNode, EvaluationContext } from './types';
import { parseFormula } from './parser';
import { evaluateAST } from './evaluator';
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

  return {
    currentSheetName,
    currentCoord,
    getCellValue: (coord: CellCoordinates, sheetName?: string) => {
      const target = getTargetCells(sheetName);
      const key = coordToKey(coord.row, coord.col);
      const cell = target[key];
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
      const key = coordToKey(coord.row, coord.col);
      const cell = target[key];
      return cell?.formula ?? (cell?.value !== null && cell?.value !== undefined ? String(cell.value) : undefined);
    },
    getRangeValues: (range: CellRange, sheetName?: string) => {
      const target = getTargetCells(sheetName);

      // Determine bounding box of populated cells so full columns/rows (e.g. A:A) don't iterate 100k+ times.
      // Bounded ranges (e.g. A1:A3, B2:D10) must inspect all requested cells including sparse/empty cells!
      let maxPopulatedRow = 0;
      let maxPopulatedCol = 0;
      const isUnboundedRow = range.endRow >= 100000;
      const isUnboundedCol = range.endCol >= 10000;

      if (isUnboundedRow || isUnboundedCol) {
        for (const k of Object.keys(target)) {
          const c = keyToCoord(k);
          if (c.row > maxPopulatedRow) maxPopulatedRow = c.row;
          if (c.col > maxPopulatedCol) maxPopulatedCol = c.col;
        }
      }

      const effectiveEndRow = isUnboundedRow
        ? Math.min(range.endRow, Math.max(maxPopulatedRow, range.startRow))
        : range.endRow;
      const effectiveEndCol = isUnboundedCol
        ? Math.min(range.endCol, Math.max(maxPopulatedCol, range.startCol))
        : range.endCol;

      const result: CellValue[][] = [];
      for (let r = range.startRow; r <= effectiveEndRow; r++) {
        const rowVals: CellValue[] = [];
        for (let c = range.startCol; c <= effectiveEndCol; c++) {
          const key = coordToKey(r, c);
          const cell = target[key];
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
        format: hasDecimals ? `"${symbol}"#,##0.00` : `"${symbol}"#,##0`
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
      const evalResult = evaluateAST(fInfo.ast, context);
      const isLiteral = isBoxedLiteral(evalResult);
      const unwrappedResult = evalResult instanceof String ? evalResult.valueOf() : evalResult;
      const isErr = !isLiteral && isFormulaError(unwrappedResult);

      cellsCopy[key] = {
        ...cellsCopy[key]!,
        value: unwrappedResult,
        formula: fInfo.formula,
        dataType: isErr ? 'error' : 'formula'
      };
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
        updatedCells[key] = {
          value: FormulaError.CYCLE,
          formula: parsed.formula,
          dataType: 'error'
        };
      } else {
        const context = createEvaluationContext(updatedCells, namedRangeResolver, getCrossSheetCells, currentSheetName, keyToCoord(key));
        const evalResult = evaluateAST(ast, context);
        const isLiteral = isBoxedLiteral(evalResult);
        const unwrapped = evalResult instanceof String ? evalResult.valueOf() : evalResult;
        const isErr = !isLiteral && isFormulaError(unwrapped);
        updatedCells[key] = {
          ...(updatedCells[key] || {}),
          value: unwrapped,
          formula: parsed.formula,
          dataType: isErr ? 'error' : 'formula'
        };
      }
    } else {
      // Cell contains literal value
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
      const evalResult = evaluateAST(ast, context);
      const isLiteral = isBoxedLiteral(evalResult);
      const unwrapped = evalResult instanceof String ? evalResult.valueOf() : evalResult;
      const isErr = !isLiteral && isFormulaError(unwrapped);
      updatedCells[depKey] = {
        ...cell,
        value: unwrapped,
        dataType: isErr ? 'error' : 'formula'
      };
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
