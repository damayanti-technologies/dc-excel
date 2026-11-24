import { FunctionDefinition } from '../types';
import { FormulaError, isFormulaError } from '../errors';
import { coerceBoolean, resolveTo1DArray } from './helpers';

export const logicalFunctions: FunctionDefinition[] = [
  // 1. IF
  {
    name: 'IF',
    category: 'Logical',
    description: 'Specifies a logical test to perform, returning one value if TRUE and another if FALSE.',
    minArgs: 2,
    maxArgs: 3,
    returnType: 'any',
    args: [
      { name: 'logical_test', description: 'Any value or expression that can be evaluated to TRUE or FALSE.', type: 'boolean' },
      { name: 'value_if_true', description: 'The value that is returned if logical_test is TRUE.', type: 'any' },
      { name: 'value_if_false', description: 'The value that is returned if logical_test is FALSE.', type: 'any', optional: true, defaultValue: 'FALSE' }
    ],
    examples: ['=IF(A1>10, "High", "Low")', '=IF(A1=B1, "Match", "Diff")'],
    handler: (args, context, evaluate) => {
      const condition = evaluate(args[0]!, context);
      if (isFormulaError(condition)) return condition;

      const isTruthy = coerceBoolean(condition);
      if (isTruthy) {
        return evaluate(args[1]!, context);
      }

      if (args.length === 3 && args[2]!.type !== 'Empty') {
        return evaluate(args[2]!, context);
      }

      return false;
    }
  },

  // 2. AND
  {
    name: 'AND',
    category: 'Logical',
    description: 'Returns TRUE if all of its arguments evaluate to TRUE; returns FALSE if one or more arguments evaluate to FALSE.',
    minArgs: 1,
    maxArgs: 255,
    returnType: 'boolean',
    args: [
      { name: 'logical1', description: 'The first condition that you want to test.', type: 'boolean' },
      { name: 'logical2', description: 'Additional conditions that you want to test.', type: 'boolean', optional: true, repeating: true }
    ],
    examples: ['=AND(A1>1, A1<100)', '=AND(TRUE, FALSE)'],
    handler: (args, context, evaluate) => {
      for (const arg of args) {
        const flat = resolveTo1DArray(arg, context, evaluate);
        if (typeof flat === 'string') return flat;
        for (const item of flat) {
          if (isFormulaError(item)) return item;
          if (!coerceBoolean(item)) {
            return false;
          }
        }
      }
      return true;
    }
  },

  // 3. OR
  {
    name: 'OR',
    category: 'Logical',
    description: 'Returns TRUE if any argument is TRUE; returns FALSE if all arguments are FALSE.',
    minArgs: 1,
    maxArgs: 255,
    returnType: 'boolean',
    args: [
      { name: 'logical1', description: 'The first condition that you want to test.', type: 'boolean' },
      { name: 'logical2', description: 'Additional conditions that you want to test.', type: 'boolean', optional: true, repeating: true }
    ],
    examples: ['=OR(A1>10, B1>10)', '=OR(TRUE, FALSE)'],
    handler: (args, context, evaluate) => {
      let hasItem = false;
      for (const arg of args) {
        const flat = resolveTo1DArray(arg, context, evaluate);
        if (typeof flat === 'string') return flat;
        for (const item of flat) {
          if (isFormulaError(item)) return item;
          hasItem = true;
          if (coerceBoolean(item)) {
            return true;
          }
        }
      }
      return hasItem ? false : false;
    }
  },

  // 4. NOT
  {
    name: 'NOT',
    category: 'Logical',
    description: 'Reverses the value of its argument. Returns TRUE for FALSE, and FALSE for TRUE.',
    minArgs: 1,
    maxArgs: 1,
    returnType: 'boolean',
    args: [{ name: 'logical', description: 'A value or expression that can be evaluated to TRUE or FALSE.', type: 'boolean' }],
    examples: ['=NOT(A1>10)', '=NOT(TRUE)'],
    handler: (args, context, evaluate) => {
      const val = evaluate(args[0]!, context);
      if (isFormulaError(val)) return val;
      return !coerceBoolean(val);
    }
  },

  // 5. IFERROR
  {
    name: 'IFERROR',
    category: 'Logical',
    description: 'Returns a value you specify if a formula evaluates to an error; otherwise, returns the result of the formula.',
    minArgs: 2,
    maxArgs: 2,
    returnType: 'any',
    args: [
      { name: 'value', description: 'The argument that is checked for an error.', type: 'any' },
      { name: 'value_if_error', description: 'The value to return if the formula evaluates to an error.', type: 'any' }
    ],
    examples: ['=IFERROR(A1/B1, 0)', '=IFERROR(VLOOKUP(A1, D1:E10, 2, FALSE), "Not Found")'],
    handler: (args, context, evaluate) => {
      const result = evaluate(args[0]!, context);
      if (isFormulaError(result)) {
        return evaluate(args[1]!, context);
      }
      return result;
    }
  },

  // 6. IFNA
  {
    name: 'IFNA',
    category: 'Logical',
    description: 'Returns the value you specify if the formula evaluates to the #N/A error; otherwise, returns the result of the formula.',
    minArgs: 2,
    maxArgs: 2,
    returnType: 'any',
    args: [
      { name: 'value', description: 'The argument that is checked for the #N/A error value.', type: 'any' },
      { name: 'value_if_na', description: 'The value to return if the formula evaluates to the #N/A error.', type: 'any' }
    ],
    examples: ['=IFNA(VLOOKUP(A1, D1:E10, 2, FALSE), "Missing Item")'],
    handler: (args, context, evaluate) => {
      const result = evaluate(args[0]!, context);
      if (result === FormulaError.NA) {
        return evaluate(args[1]!, context);
      }
      return result;
    }
  },

  // 7. TRUE
  {
    name: 'TRUE',
    category: 'Logical',
    description: 'Returns the logical value TRUE.',
    minArgs: 0,
    maxArgs: 0,
    returnType: 'boolean',
    args: [],
    examples: ['=TRUE()'],
    handler: () => true
  },

  // 8. FALSE
  {
    name: 'FALSE',
    category: 'Logical',
    description: 'Returns the logical value FALSE.',
    minArgs: 0,
    maxArgs: 0,
    returnType: 'boolean',
    args: [],
    examples: ['=FALSE()'],
    handler: () => false
  },

  // 9. XOR
  {
    name: 'XOR',
    category: 'Logical',
    description: 'Returns a logical exclusive OR of all arguments (TRUE if an odd number of arguments evaluate to TRUE).',
    minArgs: 1,
    maxArgs: 255,
    returnType: 'boolean',
    args: [
      { name: 'logical1', description: 'The first condition that you want to test.', type: 'boolean' },
      { name: 'logical2', description: 'Additional conditions that you want to test.', type: 'boolean', optional: true, repeating: true }
    ],
    examples: ['=XOR(TRUE, FALSE)', '=XOR(3>0, 2>9)'],
    handler: (args, context, evaluate) => {
      let trueCount = 0;
      for (const arg of args) {
        const flat = resolveTo1DArray(arg, context, evaluate);
        if (typeof flat === 'string') return flat;
        for (const item of flat) {
          if (isFormulaError(item)) return item;
          if (coerceBoolean(item)) {
            trueCount++;
          }
        }
      }
      return trueCount % 2 === 1;
    }
  }
];
