import { ASTNode, EvaluationContext } from './types';
import { FormulaError, isFormulaError } from './errors';
import { functionRegistry } from './functions';
import { CellValue } from '@/types/cell';

/**
 * Coerces an evaluated spreadsheet value to a JavaScript number.
 */
function coerceToNumber(val: CellValue): { num: number; error?: string } {
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
  if (typeof val === 'string') {
    const parsed = Number(val);
    if (Number.isNaN(parsed)) {
      return { num: 0, error: FormulaError.VALUE };
    }
    return { num: parsed };
  }
  return { num: 0, error: FormulaError.VALUE };
}

/**
 * Coerces an evaluated spreadsheet value to a string for concatenation.
 */
function coerceToString(val: CellValue): string {
  if (val === null || val === undefined) return '';
  if (isFormulaError(val)) return val;
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  return String(val);
}

/**
 * Evaluates an Abstract Syntax Tree (AST) node against an EvaluationContext.
 */
export function evaluateAST(node: ASTNode, context: EvaluationContext): CellValue {
  switch (node.type) {
    case 'NumberLiteral':
      return node.value;

    case 'StringLiteral':
      return node.value;

    case 'BooleanLiteral':
      return node.value;

    case 'Error':
      return node.error;

    case 'Empty':
      return null;

    case 'CellRef': {
      const val = context.getCellValue(node.coord, node.sheetName);
      return val ?? null;
    }

    case 'RangeRef': {
      // Standalone range reference returns top-left cell value or range grid
      const grid = context.getRangeValues(node.range, node.sheetName);
      return grid[0]?.[0] ?? null;
    }

    case 'NamedRangeRef': {
      if (!context.resolveNamedRange) {
        return FormulaError.NAME;
      }
      const resolved = context.resolveNamedRange(node.name);
      if (!resolved) {
        return FormulaError.NAME;
      }
      const grid = context.getRangeValues(resolved.range);
      return grid[0]?.[0] ?? null;
    }

    case 'Percent': {
      const operandVal = evaluateAST(node.operand, context);
      if (isFormulaError(operandVal)) return operandVal;
      const { num, error } = coerceToNumber(operandVal);
      if (error) return error;
      return num / 100;
    }

    case 'UnaryOp': {
      const operandVal = evaluateAST(node.operand, context);
      if (isFormulaError(operandVal)) return operandVal;
      const { num, error } = coerceToNumber(operandVal);
      if (error) return error;
      return node.operator === '-' ? -num : num;
    }

    case 'BinaryOp': {
      // 1. Text Concatenation (&)
      if (node.operator === '&') {
        const leftVal = evaluateAST(node.left, context);
        if (isFormulaError(leftVal)) return leftVal;
        const rightVal = evaluateAST(node.right, context);
        if (isFormulaError(rightVal)) return rightVal;
        return `${coerceToString(leftVal)}${coerceToString(rightVal)}`;
      }

      // 2. Comparison Operators (=, <>, <, <=, >, >=)
      if (
        node.operator === '=' ||
        node.operator === '<>' ||
        node.operator === '<' ||
        node.operator === '<=' ||
        node.operator === '>' ||
        node.operator === '>='
      ) {
        const leftVal = evaluateAST(node.left, context);
        if (isFormulaError(leftVal)) return leftVal;
        const rightVal = evaluateAST(node.right, context);
        if (isFormulaError(rightVal)) return rightVal;

        // Numeric or mixed comparisons
        const leftIsNum = typeof leftVal === 'number' || (typeof leftVal === 'string' && leftVal.trim() !== '' && !Number.isNaN(Number(leftVal)));
        const rightIsNum = typeof rightVal === 'number' || (typeof rightVal === 'string' && rightVal.trim() !== '' && !Number.isNaN(Number(rightVal)));

        if (leftIsNum && rightIsNum) {
          const lNum = Number(leftVal);
          const rNum = Number(rightVal);
          switch (node.operator) {
            case '=': return lNum === rNum;
            case '<>': return lNum !== rNum;
            case '<': return lNum < rNum;
            case '<=': return lNum <= rNum;
            case '>': return lNum > rNum;
            case '>=': return lNum >= rNum;
          }
        }

        // Case-insensitive string comparison
        const lStr = coerceToString(leftVal).toUpperCase();
        const rStr = coerceToString(rightVal).toUpperCase();
        switch (node.operator) {
          case '=': return lStr === rStr;
          case '<>': return lStr !== rStr;
          case '<': return lStr < rStr;
          case '<=': return lStr <= rStr;
          case '>': return lStr > rStr;
          case '>=': return lStr >= rStr;
        }
      }

      // 3. Arithmetic Operators (+, -, *, /, ^)
      const leftVal = evaluateAST(node.left, context);
      if (isFormulaError(leftVal)) return leftVal;
      const rightVal = evaluateAST(node.right, context);
      if (isFormulaError(rightVal)) return rightVal;

      const leftCoerced = coerceToNumber(leftVal);
      if (leftCoerced.error) return leftCoerced.error;
      const rightCoerced = coerceToNumber(rightVal);
      if (rightCoerced.error) return rightCoerced.error;

      const l = leftCoerced.num;
      const r = rightCoerced.num;

      switch (node.operator) {
        case '+':
          return l + r;
        case '-':
          return l - r;
        case '*':
          return l * r;
        case '/':
          if (r === 0) {
            return FormulaError.DIV_ZERO;
          }
          return l / r;
        case '^': {
          const result = Math.pow(l, r);
          if (Number.isNaN(result) || !Number.isFinite(result)) {
            return FormulaError.NUM;
          }
          return result;
        }
        default:
          return FormulaError.VALUE;
      }
    }

    case 'FunctionCall': {
      const handler = functionRegistry.get(node.name);
      if (!handler) {
        return FormulaError.NAME;
      }
      return handler(node.args, context, evaluateAST);
    }

    default:
      return FormulaError.VALUE;
  }
}
