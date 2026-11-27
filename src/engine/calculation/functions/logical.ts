import { FunctionDefinition, EvaluationContext } from '../types';
import { FormulaError, isFormulaError } from '../errors';
import { CellValue } from '@/types/cell';
import { coerceBoolean, coerceNumber, resolveTo1DArray } from './helpers';

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
  },

  // 10. IFS
  {
    name: 'IFS',
    category: 'Logical',
    description: 'Checks whether one or more conditions are met and returns a value that corresponds to the first TRUE condition.',
    minArgs: 2,
    maxArgs: 254,
    returnType: 'any',
    args: [
      { name: 'logical_test1', description: 'The first condition to test.', type: 'boolean' },
      { name: 'value_if_true1', description: 'Result if logical_test1 is TRUE.', type: 'any' }
    ],
    examples: ['=IFS(A1>89, "A", A1>79, "B", A1>69, "C", TRUE, "F")'],
    handler: (args, context, evaluate) => {
      if (args.length % 2 !== 0) {
        return FormulaError.VALUE;
      }

      for (let i = 0; i < args.length; i += 2) {
        const testVal = evaluate(args[i]!, context);
        if (isFormulaError(testVal)) return testVal;
        if (coerceBoolean(testVal)) {
          return evaluate(args[i + 1]!, context);
        }
      }

      return FormulaError.NA;
    }
  },

  // 11. SWITCH
  {
    name: 'SWITCH',
    category: 'Logical',
    description: 'Evaluates an expression against a list of values and returns the result corresponding to the first matching value, with optional default.',
    minArgs: 3,
    maxArgs: 255,
    returnType: 'any',
    args: [
      { name: 'expression', description: 'The expression or value to evaluate.', type: 'any' },
      { name: 'val1', description: 'The first value to compare against expression.', type: 'any' },
      { name: 'result1', description: 'Result if expression equals val1.', type: 'any' }
    ],
    examples: ['=SWITCH(A1, 1, "Sunday", 2, "Monday", "Other")'],
    handler: (args, context, evaluate) => {
      const exprVal = evaluate(args[0]!, context);
      if (isFormulaError(exprVal)) return exprVal;

      const remaining = args.length - 1;
      const hasDefault = remaining % 2 === 1;
      const numPairs = Math.floor(remaining / 2);

      for (let i = 0; i < numPairs; i++) {
        const valArg = args[1 + i * 2]!;
        const resArg = args[2 + i * 2]!;

        const v = evaluate(valArg, context);
        if (isFormulaError(v)) return v;

        // Compare values
        let matches = false;
        if (typeof exprVal === 'number' && typeof v === 'number') {
          matches = exprVal === v;
        } else if (typeof exprVal === 'string' && typeof v === 'string') {
          matches = exprVal.toUpperCase() === v.toUpperCase();
        } else {
          matches = exprVal === v;
        }

        if (matches) {
          return evaluate(resArg, context);
        }
      }

      if (hasDefault) {
        return evaluate(args[args.length - 1]!, context);
      }

      return FormulaError.NA;
    }
  },

  // 12. CHOOSE
  {
    name: 'CHOOSE',
    category: 'Logical',
    description: 'Uses index_num to return a value from the list of value arguments.',
    minArgs: 2,
    maxArgs: 255,
    returnType: 'any',
    args: [
      { name: 'index_num', description: 'Specifies which value argument is selected (1-based integer).', type: 'number' },
      { name: 'value1', description: 'The first value from which to choose.', type: 'any' },
      { name: 'value2', description: 'Additional values to choose from.', type: 'any', optional: true, repeating: true }
    ],
    examples: ['=CHOOSE(2, "First", "Second", "Third")', '=CHOOSE(A1, 10, 20, 30)'],
    handler: (args, context, evaluate) => {
      const idxVal = evaluate(args[0]!, context);
      if (isFormulaError(idxVal)) return idxVal;

      const { num, error } = coerceNumber(idxVal);
      if (error) return error;

      const index = Math.trunc(num);
      if (index < 1 || index > args.length - 1) {
        return FormulaError.VALUE;
      }

      return evaluate(args[index]!, context);
    }
  },

  // 12. LET
  {
    name: 'LET',
    category: 'Logical',
    description: 'Assigns names to calculation results, enabling intermediate calculations or values inside a formula.',
    minArgs: 3,
    maxArgs: 255,
    returnType: 'any',
    args: [
      { name: 'name1', description: 'The first variable name.', type: 'any' },
      { name: 'name_value1', description: 'The value assigned to name1.', type: 'any' },
      { name: 'calculation_or_name2', description: 'The calculation to run or another variable name.', type: 'any' }
    ],
    examples: ['=LET(x, 5, x * 2)', '=LET(width, 10, height, 20, width * height)'],
    handler: (args, context, evaluate) => {
      if (args.length < 3 || args.length % 2 === 0) {
        return FormulaError.VALUE;
      }

      const scopedVariables: Record<string, CellValue> = { ...(context.scopedVariables || {}) };
      const currentContext: EvaluationContext = {
        ...context,
        scopedVariables
      };

      for (let i = 0; i < args.length - 1; i += 2) {
        const nameNode = args[i]!;
        let varName = '';
        if (nameNode.type === 'NamedRangeRef') {
          varName = nameNode.name.toUpperCase();
        } else if (nameNode.type === 'StringLiteral') {
          varName = nameNode.value.toUpperCase();
        } else {
          const evalName = evaluate(nameNode, currentContext);
          if (isFormulaError(evalName)) return evalName;
          varName = String(evalName).toUpperCase();
        }

        if (!varName || /^[A-Z]+\d+$/.test(varName)) {
          return FormulaError.NAME;
        }

        const valNode = args[i + 1]!;
        const val = evaluate(valNode, currentContext);
        if (isFormulaError(val)) return val;
        scopedVariables[varName] = val;
      }

      const calcNode = args[args.length - 1]!;
      return evaluate(calcNode, currentContext);
    }
  }
];
