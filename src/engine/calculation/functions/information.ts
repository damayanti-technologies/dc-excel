import { FunctionDefinition } from '../types';
import { FormulaError, isFormulaError } from '../errors';

export const informationFunctions: FunctionDefinition[] = [
  // 1. ISBLANK
  {
    name: 'ISBLANK',
    category: 'Information',
    description: 'Returns TRUE if the value refers to an empty cell; otherwise FALSE.',
    minArgs: 1,
    maxArgs: 1,
    returnType: 'boolean',
    args: [{ name: 'value', description: 'The cell you want to test.', type: 'any' }],
    examples: ['=ISBLANK(A1)'],
    handler: (args, context, evaluate) => {
      const firstArg = args[0]!;
      if (firstArg.type === 'CellRef') {
        const val = context.getCellValue(firstArg.coord);
        return val === null || val === undefined || val === '';
      }
      const val = evaluate(firstArg, context);
      return val === null || val === undefined || val === '';
    }
  },

  // 2. ISNUMBER
  {
    name: 'ISNUMBER',
    category: 'Information',
    description: 'Returns TRUE if the value is a number; otherwise FALSE.',
    minArgs: 1,
    maxArgs: 1,
    returnType: 'boolean',
    args: [{ name: 'value', description: 'The value you want to test.', type: 'any' }],
    examples: ['=ISNUMBER(123)', '=ISNUMBER("123")', '=ISNUMBER(A1)'],
    handler: (args, context, evaluate) => {
      const val = evaluate(args[0]!, context);
      if (isFormulaError(val)) return false;
      return typeof val === 'number' && Number.isFinite(val) && !Number.isNaN(val);
    }
  },

  // 3. ISTEXT
  {
    name: 'ISTEXT',
    category: 'Information',
    description: 'Returns TRUE if the value is text; otherwise FALSE.',
    minArgs: 1,
    maxArgs: 1,
    returnType: 'boolean',
    args: [{ name: 'value', description: 'The value you want to test.', type: 'any' }],
    examples: ['=ISTEXT("Price")', '=ISTEXT(A1)'],
    handler: (args, context, evaluate) => {
      const val = evaluate(args[0]!, context);
      if (isFormulaError(val)) return false;
      return typeof val === 'string';
    }
  },

  // 4. ISLOGICAL
  {
    name: 'ISLOGICAL',
    category: 'Information',
    description: 'Returns TRUE if the value is a logical value (TRUE or FALSE); otherwise FALSE.',
    minArgs: 1,
    maxArgs: 1,
    returnType: 'boolean',
    args: [{ name: 'value', description: 'The value you want to test.', type: 'any' }],
    examples: ['=ISLOGICAL(TRUE)', '=ISLOGICAL(A1)'],
    handler: (args, context, evaluate) => {
      const val = evaluate(args[0]!, context);
      if (isFormulaError(val)) return false;
      return typeof val === 'boolean';
    }
  },

  // 5. ISERROR
  {
    name: 'ISERROR',
    category: 'Information',
    description: 'Returns TRUE if the value is any error value (#N/A, #VALUE!, #REF!, #DIV/0!, #NUM!, #NAME?, or #CYCLE!).',
    minArgs: 1,
    maxArgs: 1,
    returnType: 'boolean',
    args: [{ name: 'value', description: 'The value you want to test.', type: 'any' }],
    examples: ['=ISERROR(A1/B1)', '=ISERROR(VLOOKUP(A1, D1:E10, 2, FALSE))'],
    handler: (args, context, evaluate) => {
      const val = evaluate(args[0]!, context);
      return isFormulaError(val);
    }
  },

  // 6. ISERR
  {
    name: 'ISERR',
    category: 'Information',
    description: 'Returns TRUE if the value is any error value except #N/A.',
    minArgs: 1,
    maxArgs: 1,
    returnType: 'boolean',
    args: [{ name: 'value', description: 'The value you want to test.', type: 'any' }],
    examples: ['=ISERR(A1/B1)', '=ISERR(#N/A)'],
    handler: (args, context, evaluate) => {
      const val = evaluate(args[0]!, context);
      return isFormulaError(val) && val !== FormulaError.NA;
    }
  },

  // 7. ISNA
  {
    name: 'ISNA',
    category: 'Information',
    description: 'Returns TRUE if the value is the #N/A error value.',
    minArgs: 1,
    maxArgs: 1,
    returnType: 'boolean',
    args: [{ name: 'value', description: 'The value you want to test.', type: 'any' }],
    examples: ['=ISNA(VLOOKUP(A1, D1:E10, 2, FALSE))'],
    handler: (args, context, evaluate) => {
      const val = evaluate(args[0]!, context);
      return val === FormulaError.NA;
    }
  },

  // 8. TYPE
  {
    name: 'TYPE',
    category: 'Information',
    description: 'Returns a number indicating the data type of a value: 1 = Number, 2 = Text, 4 = Logical, 16 = Error, 64 = Array.',
    minArgs: 1,
    maxArgs: 1,
    returnType: 'number',
    args: [{ name: 'value', description: 'Any worksheet value, such as a number, text, or error.', type: 'any' }],
    examples: ['=TYPE(123)', '=TYPE("Text")', '=TYPE(TRUE)', '=TYPE(10/0)'],
    handler: (args, context, evaluate) => {
      const val = evaluate(args[0]!, context);
      if (isFormulaError(val)) return 16;
      if (typeof val === 'number') return 1;
      if (typeof val === 'string') return 2;
      if (typeof val === 'boolean') return 4;
      if (Array.isArray(val)) return 64;
      return 1;
    }
  },

  // 9. ISEVEN
  {
    name: 'ISEVEN',
    category: 'Information',
    description: 'Returns TRUE if the number is even; otherwise FALSE.',
    minArgs: 1,
    maxArgs: 1,
    returnType: 'boolean',
    args: [{ name: 'value', description: 'The value to test.', type: 'number' }],
    examples: ['=ISEVEN(4)', '=ISEVEN(3)', '=ISEVEN(-2.5)'],
    handler: (args, context, evaluate) => {
      const val = evaluate(args[0]!, context);
      if (isFormulaError(val)) return val;
      if (typeof val === 'boolean') return FormulaError.VALUE;
      let num: number | null = null;
      if (typeof val === 'number') {
        num = val;
      } else if (typeof val === 'string' && val.trim() !== '') {
        const parsed = Number(val);
        if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
          num = parsed;
        }
      }
      if (num === null) return FormulaError.VALUE;
      const truncated = Math.trunc(num);
      return Math.abs(truncated % 2) === 0;
    }
  },

  // 10. ISODD
  {
    name: 'ISODD',
    category: 'Information',
    description: 'Returns TRUE if the number is odd; otherwise FALSE.',
    minArgs: 1,
    maxArgs: 1,
    returnType: 'boolean',
    args: [{ name: 'value', description: 'The value to test.', type: 'number' }],
    examples: ['=ISODD(3)', '=ISODD(4)', '=ISODD(-3.5)'],
    handler: (args, context, evaluate) => {
      const val = evaluate(args[0]!, context);
      if (isFormulaError(val)) return val;
      if (typeof val === 'boolean') return FormulaError.VALUE;
      let num: number | null = null;
      if (typeof val === 'number') {
        num = val;
      } else if (typeof val === 'string' && val.trim() !== '') {
        const parsed = Number(val);
        if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
          num = parsed;
        }
      }
      if (num === null) return FormulaError.VALUE;
      const truncated = Math.trunc(num);
      return Math.abs(truncated % 2) === 1;
    }
  }
];
