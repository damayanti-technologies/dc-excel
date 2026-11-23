import { ASTNode, EvaluationContext, FormulaFunctionHandler } from './types';
import { FormulaError, isFormulaError } from './errors';
import { CellValue } from '@/types/cell';

/**
 * Extracts all numeric values from arguments or ranges for aggregation functions (SUM, AVERAGE, COUNT, MIN, MAX).
 * Propagates any encountered formula error immediately.
 */
function extractNumbers(
  args: ASTNode[],
  context: EvaluationContext,
  evaluate: (node: ASTNode, context: EvaluationContext) => CellValue
): { numbers: number[]; error?: string } {
  const numbers: number[] = [];

  for (const arg of args) {
    if (arg.type === 'RangeRef') {
      const grid = context.getRangeValues(arg.range);
      for (const row of grid) {
        for (const val of row) {
          if (isFormulaError(val)) {
            return { numbers: [], error: val };
          }
          if (typeof val === 'number') {
            numbers.push(val);
          } else if (typeof val === 'string' && val.trim() !== '') {
            // In standard Excel, text cells within a range are IGNORED by SUM/AVERAGE/COUNT
            // Only explicit string arguments or numbers are coerced
          }
        }
      }
    } else {
      const evaluated = evaluate(arg, context);
      if (isFormulaError(evaluated)) {
        return { numbers: [], error: evaluated };
      }
      if (typeof evaluated === 'number') {
        numbers.push(evaluated);
      } else if (typeof evaluated === 'boolean') {
        // Direct boolean argument counts as 1 or 0
        numbers.push(evaluated ? 1 : 0);
      } else if (typeof evaluated === 'string' && evaluated.trim() !== '') {
        const num = Number(evaluated);
        if (!Number.isNaN(num)) {
          numbers.push(num);
        } else {
          return { numbers: [], error: FormulaError.VALUE };
        }
      }
    }
  }

  return { numbers };
}

/**
 * Built-in spreadsheet function implementations.
 */
export const builtinFunctions: Record<string, FormulaFunctionHandler> = {
  SUM: (args, context, evaluate) => {
    const { numbers, error } = extractNumbers(args, context, evaluate);
    if (error) return error;
    return numbers.reduce((acc, curr) => acc + curr, 0);
  },

  AVERAGE: (args, context, evaluate) => {
    const { numbers, error } = extractNumbers(args, context, evaluate);
    if (error) return error;
    if (numbers.length === 0) {
      return FormulaError.DIV_ZERO;
    }
    const sum = numbers.reduce((acc, curr) => acc + curr, 0);
    return sum / numbers.length;
  },

  COUNT: (args, context, evaluate) => {
    const { numbers, error } = extractNumbers(args, context, evaluate);
    if (error) return error;
    return numbers.length;
  },

  MIN: (args, context, evaluate) => {
    const { numbers, error } = extractNumbers(args, context, evaluate);
    if (error) return error;
    if (numbers.length === 0) return 0;
    return Math.min(...numbers);
  },

  MAX: (args, context, evaluate) => {
    const { numbers, error } = extractNumbers(args, context, evaluate);
    if (error) return error;
    if (numbers.length === 0) return 0;
    return Math.max(...numbers);
  },

  IF: (args, context, evaluate) => {
    if (args.length < 2 || args.length > 3) {
      return FormulaError.VALUE;
    }

    const condition = evaluate(args[0]!, context);
    if (isFormulaError(condition)) return condition;

    let isTruthy = false;
    if (typeof condition === 'boolean') {
      isTruthy = condition;
    } else if (typeof condition === 'number') {
      isTruthy = condition !== 0;
    } else if (typeof condition === 'string') {
      isTruthy = condition.length > 0 && condition.toUpperCase() !== 'FALSE';
    }

    if (isTruthy) {
      return evaluate(args[1]!, context);
    }

    if (args.length === 3) {
      return evaluate(args[2]!, context);
    }

    return false;
  }
};

/**
 * Registry of available spreadsheet functions.
 */
export class FunctionRegistry {
  private functions = new Map<string, FormulaFunctionHandler>();

  constructor() {
    for (const [name, handler] of Object.entries(builtinFunctions)) {
      this.functions.set(name.toUpperCase(), handler);
    }
  }

  public register(name: string, handler: FormulaFunctionHandler): void {
    this.functions.set(name.toUpperCase(), handler);
  }

  public get(name: string): FormulaFunctionHandler | undefined {
    return this.functions.get(name.toUpperCase());
  }

  public has(name: string): boolean {
    return this.functions.has(name.toUpperCase());
  }

  public getRegisteredNames(): string[] {
    return Array.from(this.functions.keys());
  }
}

export const functionRegistry = new FunctionRegistry();
