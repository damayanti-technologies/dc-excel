import { Cell, CellCoordinates, CellRange, CellValue } from '@/types/cell';
import { Sheet } from '@/types/sheet';
import { ASTNode, EvaluationContext } from './types';
import { parseFormula } from './parser';
import { evaluateAST } from './evaluator';
import { DependencyGraph, extractReferencesFromAST } from './dependency-graph';
import { FormulaError, isFormulaError } from './errors';
import { coordToKey, keyToCoord } from '@/utils/coordinates';

/**
 * Creates an EvaluationContext backed by a cells map.
 */
export function createEvaluationContext(
  cells: Record<string, Cell>,
  namedRangeResolver?: (name: string) => { range: CellRange; sheetId?: string } | null
): EvaluationContext {
  return {
    getCellValue: (coord: CellCoordinates) => {
      const key = coordToKey(coord.row, coord.col);
      const cell = cells[key];
      return cell?.value ?? null;
    },
    getCellRawOrFormula: (coord: CellCoordinates) => {
      const key = coordToKey(coord.row, coord.col);
      const cell = cells[key];
      return cell?.formula ?? (cell?.value !== null && cell?.value !== undefined ? String(cell.value) : undefined);
    },
    getRangeValues: (range: CellRange) => {
      const result: CellValue[][] = [];
      for (let r = range.startRow; r <= range.endRow; r++) {
        const rowVals: CellValue[] = [];
        for (let c = range.startCol; c <= range.endCol; c++) {
          const key = coordToKey(r, c);
          const cell = cells[key];
          rowVals.push(cell?.value ?? null);
        }
        result.push(rowVals);
      }
      return result;
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

  // 4. Number (standard integer, float, scientific notation)
  // Check if pure numeric (avoiding Date or partial string parses)
  if (/^-?[0-9]+(\.[0-9]+)?$/.test(trimmed) || /^-?\.[0-9]+$/.test(trimmed)) {
    const num = Number(trimmed);
    if (!Number.isNaN(num) && Number.isFinite(num)) {
      return { value: num, dataType: 'number' };
    }
  }

  // 5. String
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
    namedRangeResolver?: (name: string) => { range: CellRange; sheetId?: string } | null
  ): CellValue {
    const ast = parseFormula(formula);
    const context = createEvaluationContext(cells, namedRangeResolver);
    return evaluateAST(ast, context);
  }

  /**
   * Rebuilds dependencies and recalculates all formula cells in a sheet.
   * Typically called on initial workbook load or recovery.
   */
  public recalculateSheet(
    sheet: Sheet,
    namedRangeResolver?: (name: string) => { range: CellRange; sheetId?: string } | null
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
        const precedents = extractReferencesFromAST(ast, namedRangeResolver);
        this.dependencyGraph.setCellDependencies(key, precedents);
        formulaCells.set(key, { formula: formulaStr, ast });
      }
    }

    // 2. Identify cycles
    const cycles: string[] = [];
    for (const key of formulaCells.keys()) {
      if (this.dependencyGraph.hasCircularDependency(key)) {
        cycles.push(key);
      }
    }

    // 3. Mark cycle cells
    for (const cycleKey of cycles) {
      const orig = cellsCopy[cycleKey]!;
      cellsCopy[cycleKey] = {
        ...orig,
        value: FormulaError.CYCLE,
        dataType: 'error'
      };
    }

    // 4. Calculate non-cycle formula cells in topological order
    const allNonCycleKeys = Array.from(formulaCells.keys()).filter((k) => !cycles.includes(k));
    const fullOrder = this.dependencyGraph.getFullTopologicalOrder(allNonCycleKeys);

    const context = createEvaluationContext(cellsCopy, namedRangeResolver);
    for (const key of fullOrder) {
      if (cycles.includes(key)) continue;
      const fInfo = formulaCells.get(key);
      if (!fInfo) continue;

      const evalResult = evaluateAST(fInfo.ast, context);
      const isErr = isFormulaError(evalResult);

      cellsCopy[key] = {
        ...cellsCopy[key]!,
        value: evalResult,
        formula: fInfo.formula,
        dataType: isErr ? 'error' : 'formula'
      };
    }

    return { updatedCells: cellsCopy, cycles };
  }

  /**
   * Handles user editing of a cell value or formula.
   * Updates dependencies and recalculates all affected downstream cells in topological order.
   */
  public updateCellInput(
    currentCells: Record<string, Cell>,
    coord: CellCoordinates,
    rawInput: string,
    namedRangeResolver?: (name: string) => { range: CellRange; sheetId?: string } | null
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
      const precedents = extractReferencesFromAST(ast, namedRangeResolver);
      this.dependencyGraph.setCellDependencies(key, precedents);

      // Check if self or newly formed dependency is circular
      if (this.dependencyGraph.hasCircularDependency(key)) {
        updatedCells[key] = {
          value: FormulaError.CYCLE,
          formula: parsed.formula,
          dataType: 'error'
        };
      } else {
        const context = createEvaluationContext(updatedCells, namedRangeResolver);
        const evalResult = evaluateAST(ast, context);
        const isErr = isFormulaError(evalResult);
        updatedCells[key] = {
          value: evalResult,
          formula: parsed.formula,
          dataType: isErr ? 'error' : 'formula'
        };
      }
    } else {
      // Cell contains literal value
      this.dependencyGraph.removeCell(key);
      this.astCache.delete(key);
      updatedCells[key] = {
        value: parsed.value,
        dataType: parsed.dataType
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
    const context = createEvaluationContext(updatedCells, namedRangeResolver);
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

      if (this.dependencyGraph.hasCircularDependency(depKey)) {
        updatedCells[depKey] = {
          ...cell,
          value: FormulaError.CYCLE,
          dataType: 'error'
        };
      } else {
        const evalResult = evaluateAST(ast, context);
        const isErr = isFormulaError(evalResult);
        updatedCells[depKey] = {
          ...cell,
          value: evalResult,
          dataType: isErr ? 'error' : 'formula'
        };
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
