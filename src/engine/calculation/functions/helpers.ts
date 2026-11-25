import { ASTNode, EvaluationContext } from '../types';
import { FormulaError, isFormulaError } from '../errors';
import { CellValue } from '@/types/cell';

/**
 * Coerces an evaluated spreadsheet value to a number.
 */
export function coerceNumber(val: CellValue): { num: number; error?: string } {
  if (isFormulaError(val)) return { num: 0, error: val };
  if (val === null || val === undefined || val === '') return { num: 0 };
  if (typeof val === 'number') {
    if (Number.isNaN(val) || !Number.isFinite(val)) {
      return { num: 0, error: FormulaError.NUM };
    }
    return { num: val };
  }
  if (typeof val === 'boolean') {
    return { num: val ? 1 : 0 };
  }
  if (typeof val === 'string' || val instanceof String) {
    const trimmed = String(val).trim();
    if (
      trimmed.toLowerCase() === 'infinity' ||
      trimmed.toLowerCase() === '-infinity' ||
      trimmed.toLowerCase() === '+infinity'
    ) {
      return { num: 0, error: FormulaError.VALUE };
    }
    const num = Number(trimmed);
    if (Number.isNaN(num) || !Number.isFinite(num)) {
      return { num: 0, error: FormulaError.VALUE };
    }
    return { num };
  }
  return { num: 0, error: FormulaError.VALUE };
}

/**
 * Evaluates whether a cell value satisfies an Excel-style criteria expression.
 * Handles comparison prefixes (>=, <=, <>, >, <, =), wildcards (*, ?, ~), and literal equality.
 */
export function matchesCriteria(val: CellValue, criteria: CellValue): boolean {
  if (criteria === null || criteria === undefined) {
    return val === null || val === undefined || val === '';
  }

  if (typeof criteria === 'boolean') {
    return val === criteria;
  }

  if (typeof criteria === 'number') {
    return val === criteria;
  }

  const critStr = String(criteria).trim();

  // Check comparison operator prefix: >=, <=, <>, >, <, =
  const match = critStr.match(/^(>=|<=|<>|>|<|=)(.*)$/);
  if (match) {
    const op = match[1]!;
    const targetRaw = match[2]!.trim();
    const targetNum = Number(targetRaw);
    const targetIsNum = targetRaw !== '' && !Number.isNaN(targetNum) && Number.isFinite(targetNum);

    if (targetIsNum && typeof val === 'number') {
      switch (op) {
        case '=': return val === targetNum;
        case '<>': return val !== targetNum;
        case '>': return val > targetNum;
        case '>=': return val >= targetNum;
        case '<': return val < targetNum;
        case '<=': return val <= targetNum;
      }
    }

    const valStr = coerceString(val);
    switch (op) {
      case '=': return valStr.toUpperCase() === targetRaw.toUpperCase();
      case '<>': return valStr.toUpperCase() !== targetRaw.toUpperCase();
      case '>': return valStr.toUpperCase() > targetRaw.toUpperCase();
      case '>=': return valStr.toUpperCase() >= targetRaw.toUpperCase();
      case '<': return valStr.toUpperCase() < targetRaw.toUpperCase();
      case '<=': return valStr.toUpperCase() <= targetRaw.toUpperCase();
    }
  }

  // Numeric equality
  const numCrit = Number(critStr);
  if (typeof val === 'number' && !Number.isNaN(numCrit) && Number.isFinite(numCrit)) {
    return val === numCrit;
  }

  // Wildcard string matching
  const valStr = coerceString(val);
  if (critStr.includes('*') || critStr.includes('?') || critStr.includes('~')) {
    return matchWildcard(valStr, critStr);
  }

  return valStr.toUpperCase() === critStr.toUpperCase();
}

/**
 * Coerces an evaluated spreadsheet value to a string.
 */
export function coerceString(val: CellValue): string {
  if (val === null || val === undefined) return '';
  if (isFormulaError(val)) return val;
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  return String(val);
}

/**
 * Coerces an evaluated value to a boolean following spreadsheet semantics.
 */
export function coerceBoolean(val: CellValue): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val !== 0;
  if (typeof val === 'string') {
    const upper = val.trim().toUpperCase();
    if (upper === 'TRUE') return true;
    if (upper === 'FALSE') return false;
    const num = Number(upper);
    if (!Number.isNaN(num)) return num !== 0;
    return val.length > 0;
  }
  return false;
}

/**
 * Resolves an ASTNode into a 2D array of values.
 * If the node is a RangeRef, queries context.getRangeValues.
 * If a single cell or scalar, returns a 1x1 array [[val]].
 */
export function resolveTo2DArray(
  node: ASTNode,
  context: EvaluationContext,
  evaluate: (node: ASTNode, context: EvaluationContext) => CellValue
): CellValue[][] | string {
  if (node.type === 'RangeRef') {
    return context.getRangeValues(node.range, node.sheetName);
  }

  if (node.type === 'CellRef') {
    const val = context.getCellValue(node.coord, node.sheetName);
    return [[val ?? null]];
  }

  if (node.type === 'NamedRangeRef') {
    if (!context.resolveNamedRange) {
      return FormulaError.NAME;
    }
    const resolved = context.resolveNamedRange(node.name);
    if (!resolved) {
      return FormulaError.NAME;
    }
    return context.getRangeValues(resolved.range);
  }

  const val = evaluate(node, context);
  if (isFormulaError(val)) return val;
  return [[val]];
}

/**
 * Resolves an ASTNode into a 1D flat array of values.
 */
export function resolveTo1DArray(
  node: ASTNode,
  context: EvaluationContext,
  evaluate: (node: ASTNode, context: EvaluationContext) => CellValue
): CellValue[] | string {
  const grid = resolveTo2DArray(node, context, evaluate);
  if (typeof grid === 'string') return grid;

  const flat: CellValue[] = [];
  for (const row of grid) {
    for (const val of row) {
      flat.push(val);
    }
  }
  return flat;
}

/**
 * Tests if target matches pattern with Excel wildcard semantics (*, ?, ~*, ~?).
 */
export function matchWildcard(target: string, pattern: string): boolean {
  let pIdx = 0;
  let tIdx = 0;
  let starIdx = -1;
  let match = 0;

  const p = pattern.toUpperCase();
  const t = target.toUpperCase();

  while (tIdx < t.length) {
    if (pIdx < p.length && p[pIdx] === '~' && pIdx + 1 < p.length) {
      // Escaped wildcard
      if (p[pIdx + 1] === t[tIdx]) {
        pIdx += 2;
        tIdx++;
      } else {
        return false;
      }
    } else if (pIdx < p.length && (p[pIdx] === '?' || p[pIdx] === t[tIdx])) {
      pIdx++;
      tIdx++;
    } else if (pIdx < p.length && p[pIdx] === '*') {
      starIdx = pIdx;
      match = tIdx;
      pIdx++;
    } else if (starIdx !== -1) {
      pIdx = starIdx + 1;
      match++;
      tIdx = match;
    } else {
      return false;
    }
  }

  while (pIdx < p.length && p[pIdx] === '*') {
    pIdx++;
  }

  return pIdx === p.length;
}
