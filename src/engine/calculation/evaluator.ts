import { ASTNode, EvaluationContext } from './types';
import { FormulaError, isFormulaError, BoxedLiteralString } from './errors';
import { functionRegistry } from './functions';
import { CellValue } from '@/types/cell';

/**
 * Coerces an evaluated spreadsheet value to a JavaScript number.
 */
function coerceToNumber(val: CellValue): { num: number; error?: string } {
  if (isFormulaError(val)) return { num: 0, error: val as string };
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
    const parsed = Number(trimmed);
    if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
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

    case 'StringLiteral': {
      if (isFormulaError(node.value)) {
        const boxed: BoxedLiteralString = new String(node.value);
        boxed.__isLiteralText = true;
        return boxed as unknown as CellValue;
      }
      return node.value;
    }

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
      const { range } = node;
      const isSingleCell = range.startRow === range.endRow && range.startCol === range.endCol;
      if (isSingleCell) {
        return context.getCellValue({ row: range.startRow, col: range.startCol }, node.sheetName) ?? null;
      }

      // Implicit intersection with current formula cell position
      if (context.currentCoord) {
        const { row, col } = context.currentCoord;
        const isSingleCol = range.startCol === range.endCol;
        const isSingleRow = range.startRow === range.endRow;

        if (isSingleCol) {
          if (row >= range.startRow && row <= range.endRow) {
            return context.getCellValue({ row, col: range.startCol }, node.sheetName) ?? null;
          }
          return FormulaError.VALUE;
        }

        if (isSingleRow) {
          if (col >= range.startCol && col <= range.endCol) {
            return context.getCellValue({ row: range.startRow, col }, node.sheetName) ?? null;
          }
          return FormulaError.VALUE;
        }

        if (row >= range.startRow && row <= range.endRow && col >= range.startCol && col <= range.endCol) {
          return context.getCellValue({ row, col }, node.sheetName) ?? null;
        }
        return FormulaError.VALUE;
      }

      // Fallback: top-left cell of range
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
      const { range } = resolved;
      const isSingleCell = range.startRow === range.endRow && range.startCol === range.endCol;
      if (isSingleCell) {
        return context.getCellValue({ row: range.startRow, col: range.startCol }) ?? null;
      }

      if (context.currentCoord) {
        const { row, col } = context.currentCoord;
        if (range.startCol === range.endCol) {
          if (row >= range.startRow && row <= range.endRow) {
            return context.getCellValue({ row, col: range.startCol }) ?? null;
          }
          return FormulaError.VALUE;
        }
        if (range.startRow === range.endRow) {
          if (col >= range.startCol && col <= range.endCol) {
            return context.getCellValue({ row: range.startRow, col }) ?? null;
          }
          return FormulaError.VALUE;
        }
        if (row >= range.startRow && row <= range.endRow && col >= range.startCol && col <= range.endCol) {
          return context.getCellValue({ row, col }) ?? null;
        }
        return FormulaError.VALUE;
      }

      const grid = context.getRangeValues(resolved.range);
      return grid[0]?.[0] ?? null;
    }

    case 'ArrayLiteral': {
      // Evaluate all elements of the array literal
      const evaluatedRows = node.elements.map((row) =>
        row.map((item) => evaluateAST(item, context))
      );
      if (evaluatedRows.length === 1 && evaluatedRows[0]?.length === 1) {
        return evaluatedRows[0][0] ?? null;
      }
      return evaluatedRows[0]?.[0] ?? null;
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

        // Excel comparison semantics
        let l = leftVal;
        let r = rightVal;
        if (l === null || l === undefined) {
          if (typeof r === 'number') l = 0;
          else if (typeof r === 'string' || r instanceof String) l = '';
          else if (typeof r === 'boolean') l = false;
        }
        if (r === null || r === undefined) {
          if (typeof l === 'number') r = 0;
          else if (typeof l === 'string' || l instanceof String) r = '';
          else if (typeof l === 'boolean') r = false;
        }

        if (l === null && r === null) {
          switch (node.operator) {
            case '=':
            case '<=':
            case '>=':
              return true;
            case '<>':
            case '<':
            case '>':
              return false;
          }
        }

        // 1. Both numbers
        if (typeof l === 'number' && typeof r === 'number') {
          switch (node.operator) {
            case '=': return l === r;
            case '<>': return l !== r;
            case '<': return l < r;
            case '<=': return l <= r;
            case '>': return l > r;
            case '>=': return l >= r;
          }
        }

        // 2. Both strings
        if ((typeof l === 'string' || l instanceof String) && (typeof r === 'string' || r instanceof String)) {
          const lStr = String(l).toUpperCase();
          const rStr = String(r).toUpperCase();
          switch (node.operator) {
            case '=': return lStr === rStr;
            case '<>': return lStr !== rStr;
            case '<': return lStr < rStr;
            case '<=': return lStr <= rStr;
            case '>': return lStr > rStr;
            case '>=': return lStr >= rStr;
          }
        }

        // 3. Both booleans
        if (typeof l === 'boolean' && typeof r === 'boolean') {
          switch (node.operator) {
            case '=': return l === r;
            case '<>': return l !== r;
            case '<': return !l && r;
            case '<=': return l === r || (!l && r);
            case '>': return l && !r;
            case '>=': return l === r || (l && !r);
          }
        }

        // 4. Mixed types (e.g. ="10"=10 or ="a">5):
        // In Excel, equality across different types is FALSE (inequality is TRUE),
        // and cross-type relational comparisons between string and number return FALSE.
        switch (node.operator) {
          case '=': return false;
          case '<>': return true;
          case '<':
          case '<=':
          case '>':
          case '>=':
            return false;
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
          if (l === 0 && r === 0) {
            return FormulaError.NUM;
          }
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
