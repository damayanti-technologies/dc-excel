import { FunctionDefinition } from '../types';
import { FormulaError, isFormulaError } from '../errors';
import { coerceNumber, resolveTo1DArray, resolveTo2DArray } from './helpers';

function roundWithDigits(num: number, digits: number, mode: 'round' | 'up' | 'down'): number {
  const factor = Math.pow(10, digits);
  if (mode === 'round') {
    return Math.round(num * factor) / factor;
  } else if (mode === 'up') {
    return (num >= 0 ? Math.ceil(num * factor) : Math.floor(num * factor)) / factor;
  } else {
    // down (towards zero)
    return (num >= 0 ? Math.floor(num * factor) : Math.ceil(num * factor)) / factor;
  }
}

export const mathFunctions: FunctionDefinition[] = [
  // 1. SUM
  {
    name: 'SUM',
    category: 'Mathematical',
    description: 'Adds all the numbers in a range of cells.',
    minArgs: 1,
    maxArgs: 255,
    returnType: 'number',
    args: [
      { name: 'number1', description: 'The first number, cell reference, or range you want to sum.', type: 'any' },
      { name: 'number2', description: 'Additional numbers, cell references, or ranges to sum.', type: 'any', optional: true, repeating: true }
    ],
    examples: ['=SUM(A1:A10)', '=SUM(1, 2, 3, A1)'],
    handler: (args, context, evaluate) => {
      let total = 0;
      for (const arg of args) {
        if (arg.type === 'RangeRef' || arg.type === 'NamedRangeRef') {
          const grid = resolveTo2DArray(arg, context, evaluate);
          if (typeof grid === 'string') return grid;
          for (const row of grid) {
            for (const val of row) {
              if (isFormulaError(val)) return val;
              if (typeof val === 'number') total += val;
            }
          }
        } else {
          const evaluated = evaluate(arg, context);
          if (isFormulaError(evaluated)) return evaluated;
          const { num, error } = coerceNumber(evaluated);
          if (error) return error;
          total += num;
        }
      }
      return total;
    }
  },

  // 2. ROUND
  {
    name: 'ROUND',
    category: 'Mathematical',
    description: 'Rounds a number to a specified number of digits.',
    minArgs: 2,
    maxArgs: 2,
    returnType: 'number',
    args: [
      { name: 'number', description: 'The number that you want to round.', type: 'number' },
      { name: 'num_digits', description: 'The number of digits to which you want to round the number.', type: 'number' }
    ],
    examples: ['=ROUND(2.149, 1)', '=ROUND(21.5, -1)'],
    handler: (args, context, evaluate) => {
      const nEval = evaluate(args[0]!, context);
      if (isFormulaError(nEval)) return nEval;
      const { num, error: nErr } = coerceNumber(nEval);
      if (nErr) return FormulaError.VALUE;

      const dEval = evaluate(args[1]!, context);
      if (isFormulaError(dEval)) return dEval;
      const { num: digits, error: dErr } = coerceNumber(dEval);
      if (dErr) return FormulaError.VALUE;

      return roundWithDigits(num, Math.trunc(digits), 'round');
    }
  },

  // 3. ROUNDUP
  {
    name: 'ROUNDUP',
    category: 'Mathematical',
    description: 'Rounds a number up, away from 0 (zero).',
    minArgs: 2,
    maxArgs: 2,
    returnType: 'number',
    args: [
      { name: 'number', description: 'Any real number that you want rounded up.', type: 'number' },
      { name: 'num_digits', description: 'The number of digits to which you want to round the number.', type: 'number' }
    ],
    examples: ['=ROUNDUP(3.2, 0)', '=ROUNDUP(76.9, 0)'],
    handler: (args, context, evaluate) => {
      const nEval = evaluate(args[0]!, context);
      if (isFormulaError(nEval)) return nEval;
      const { num, error: nErr } = coerceNumber(nEval);
      if (nErr) return FormulaError.VALUE;

      const dEval = evaluate(args[1]!, context);
      if (isFormulaError(dEval)) return dEval;
      const { num: digits, error: dErr } = coerceNumber(dEval);
      if (dErr) return FormulaError.VALUE;

      return roundWithDigits(num, Math.trunc(digits), 'up');
    }
  },

  // 4. ROUNDDOWN
  {
    name: 'ROUNDDOWN',
    category: 'Mathematical',
    description: 'Rounds a number down, toward zero.',
    minArgs: 2,
    maxArgs: 2,
    returnType: 'number',
    args: [
      { name: 'number', description: 'Any real number that you want rounded down.', type: 'number' },
      { name: 'num_digits', description: 'The number of digits to which you want to round the number.', type: 'number' }
    ],
    examples: ['=ROUNDDOWN(3.2, 0)', '=ROUNDDOWN(3.14159, 3)'],
    handler: (args, context, evaluate) => {
      const nEval = evaluate(args[0]!, context);
      if (isFormulaError(nEval)) return nEval;
      const { num, error: nErr } = coerceNumber(nEval);
      if (nErr) return FormulaError.VALUE;

      const dEval = evaluate(args[1]!, context);
      if (isFormulaError(dEval)) return dEval;
      const { num: digits, error: dErr } = coerceNumber(dEval);
      if (dErr) return FormulaError.VALUE;

      return roundWithDigits(num, Math.trunc(digits), 'down');
    }
  },

  // 5. ABS
  {
    name: 'ABS',
    category: 'Mathematical',
    description: 'Returns the absolute value of a number (a number without its sign).',
    minArgs: 1,
    maxArgs: 1,
    returnType: 'number',
    args: [{ name: 'number', description: 'The real number of which you want the absolute value.', type: 'number' }],
    examples: ['=ABS(-4)', '=ABS(A1)'],
    handler: (args, context, evaluate) => {
      const nEval = evaluate(args[0]!, context);
      if (isFormulaError(nEval)) return nEval;
      const { num, error } = coerceNumber(nEval);
      if (error) return FormulaError.VALUE;
      return Math.abs(num);
    }
  },

  // 6. MOD
  {
    name: 'MOD',
    category: 'Mathematical',
    description: 'Returns the remainder after number is divided by divisor. Has the same sign as divisor.',
    minArgs: 2,
    maxArgs: 2,
    returnType: 'number',
    args: [
      { name: 'number', description: 'The number for which you want to find the remainder.', type: 'number' },
      { name: 'divisor', description: 'The number by which you want to divide number.', type: 'number' }
    ],
    examples: ['=MOD(3, 2)', '=MOD(-3, 2)'],
    handler: (args, context, evaluate) => {
      const nEval = evaluate(args[0]!, context);
      if (isFormulaError(nEval)) return nEval;
      const { num: n, error: nErr } = coerceNumber(nEval);
      if (nErr) return FormulaError.VALUE;

      const dEval = evaluate(args[1]!, context);
      if (isFormulaError(dEval)) return dEval;
      const { num: d, error: dErr } = coerceNumber(dEval);
      if (dErr) return FormulaError.VALUE;

      if (d === 0) return FormulaError.DIV_ZERO;
      // Excel definition: MOD(n, d) = n - d * INT(n / d)
      return n - d * Math.floor(n / d);
    }
  },

  // 7. POWER
  {
    name: 'POWER',
    category: 'Mathematical',
    description: 'Returns the result of a number raised to a power.',
    minArgs: 2,
    maxArgs: 2,
    returnType: 'number',
    args: [
      { name: 'number', description: 'The base number. Can be any real number.', type: 'number' },
      { name: 'power', description: 'The exponent to which the base number is raised.', type: 'number' }
    ],
    examples: ['=POWER(5, 2)', '=POWER(9, 3)'],
    handler: (args, context, evaluate) => {
      const nEval = evaluate(args[0]!, context);
      if (isFormulaError(nEval)) return nEval;
      const { num: base, error: nErr } = coerceNumber(nEval);
      if (nErr) return FormulaError.VALUE;

      const pEval = evaluate(args[1]!, context);
      if (isFormulaError(pEval)) return pEval;
      const { num: exp, error: pErr } = coerceNumber(pEval);
      if (pErr) return FormulaError.VALUE;

      const res = Math.pow(base, exp);
      if (!Number.isFinite(res) || Number.isNaN(res)) return FormulaError.NUM;
      return res;
    }
  },

  // 8. SQRT
  {
    name: 'SQRT',
    category: 'Mathematical',
    description: 'Returns a positive square root.',
    minArgs: 1,
    maxArgs: 1,
    returnType: 'number',
    args: [{ name: 'number', description: 'The number for which you want the square root.', type: 'number' }],
    examples: ['=SQRT(16)', '=SQRT(A1)'],
    handler: (args, context, evaluate) => {
      const nEval = evaluate(args[0]!, context);
      if (isFormulaError(nEval)) return nEval;
      const { num, error } = coerceNumber(nEval);
      if (error) return FormulaError.VALUE;
      if (num < 0) return FormulaError.NUM;
      return Math.sqrt(num);
    }
  },

  // 9. INT
  {
    name: 'INT',
    category: 'Mathematical',
    description: 'Rounds a number down to the nearest integer.',
    minArgs: 1,
    maxArgs: 1,
    returnType: 'number',
    args: [{ name: 'number', description: 'The real number you want to round down to an integer.', type: 'number' }],
    examples: ['=INT(8.9)', '=INT(-8.9)'],
    handler: (args, context, evaluate) => {
      const nEval = evaluate(args[0]!, context);
      if (isFormulaError(nEval)) return nEval;
      const { num, error } = coerceNumber(nEval);
      if (error) return FormulaError.VALUE;
      return Math.floor(num);
    }
  },

  // 10. TRUNC
  {
    name: 'TRUNC',
    category: 'Mathematical',
    description: 'Truncates a number to an integer by removing the fractional part of the number.',
    minArgs: 1,
    maxArgs: 2,
    returnType: 'number',
    args: [
      { name: 'number', description: 'The number you want to truncate.', type: 'number' },
      { name: 'num_digits', description: 'A number specifying the precision of the truncation (default 0).', type: 'number', optional: true, defaultValue: '0' }
    ],
    examples: ['=TRUNC(8.9)', '=TRUNC(-8.9)', '=TRUNC(3.14159, 2)'],
    handler: (args, context, evaluate) => {
      const nEval = evaluate(args[0]!, context);
      if (isFormulaError(nEval)) return nEval;
      const { num, error: nErr } = coerceNumber(nEval);
      if (nErr) return FormulaError.VALUE;

      let digits = 0;
      if (args.length >= 2 && args[1]!.type !== 'Empty') {
        const dEval = evaluate(args[1]!, context);
        if (isFormulaError(dEval)) return dEval;
        const { num: d, error: dErr } = coerceNumber(dEval);
        if (dErr) return FormulaError.VALUE;
        digits = Math.trunc(d);
      }

      return roundWithDigits(num, digits, 'down');
    }
  },

  // 11. SIGN
  {
    name: 'SIGN',
    category: 'Mathematical',
    description: 'Determines the sign of a number: 1 if positive, 0 if zero, -1 if negative.',
    minArgs: 1,
    maxArgs: 1,
    returnType: 'number',
    args: [{ name: 'number', description: 'Any real number.', type: 'number' }],
    examples: ['=SIGN(10)', '=SIGN(-10)', '=SIGN(0)'],
    handler: (args, context, evaluate) => {
      const nEval = evaluate(args[0]!, context);
      if (isFormulaError(nEval)) return nEval;
      const { num, error } = coerceNumber(nEval);
      if (error) return FormulaError.VALUE;
      return Math.sign(num);
    }
  },

  // 12. PI
  {
    name: 'PI',
    category: 'Mathematical',
    description: 'Returns the value of pi: 3.14159265358979, accurate to 15 digits.',
    minArgs: 0,
    maxArgs: 0,
    returnType: 'number',
    args: [],
    examples: ['=PI()', '=PI()*2'],
    handler: () => Math.PI
  },

  // 13. EXP
  {
    name: 'EXP',
    category: 'Mathematical',
    description: 'Returns e raised to the power of number.',
    minArgs: 1,
    maxArgs: 1,
    returnType: 'number',
    args: [{ name: 'number', description: 'The exponent applied to the base e.', type: 'number' }],
    examples: ['=EXP(1)', '=EXP(2)'],
    handler: (args, context, evaluate) => {
      const nEval = evaluate(args[0]!, context);
      if (isFormulaError(nEval)) return nEval;
      const { num, error } = coerceNumber(nEval);
      if (error) return FormulaError.VALUE;
      const res = Math.exp(num);
      if (!Number.isFinite(res)) return FormulaError.NUM;
      return res;
    }
  },

  // 14. LN
  {
    name: 'LN',
    category: 'Mathematical',
    description: 'Returns the natural logarithm of a number.',
    minArgs: 1,
    maxArgs: 1,
    returnType: 'number',
    args: [{ name: 'number', description: 'The positive real number for which you want the natural logarithm.', type: 'number' }],
    examples: ['=LN(86)', '=LN(EXP(3))'],
    handler: (args, context, evaluate) => {
      const nEval = evaluate(args[0]!, context);
      if (isFormulaError(nEval)) return nEval;
      const { num, error } = coerceNumber(nEval);
      if (error) return FormulaError.VALUE;
      if (num <= 0) return FormulaError.NUM;
      return Math.log(num);
    }
  },

  // 15. LOG
  {
    name: 'LOG',
    category: 'Mathematical',
    description: 'Returns the logarithm of a number to the base you specify (default 10).',
    minArgs: 1,
    maxArgs: 2,
    returnType: 'number',
    args: [
      { name: 'number', description: 'The positive real number for which you want the logarithm.', type: 'number' },
      { name: 'base', description: 'The base of the logarithm (default 10).', type: 'number', optional: true, defaultValue: '10' }
    ],
    examples: ['=LOG(10)', '=LOG(8, 2)'],
    handler: (args, context, evaluate) => {
      const nEval = evaluate(args[0]!, context);
      if (isFormulaError(nEval)) return nEval;
      const { num, error: nErr } = coerceNumber(nEval);
      if (nErr) return FormulaError.VALUE;
      if (num <= 0) return FormulaError.NUM;

      let base = 10;
      if (args.length >= 2 && args[1]!.type !== 'Empty') {
        const bEval = evaluate(args[1]!, context);
        if (isFormulaError(bEval)) return bEval;
        const { num: b, error: bErr } = coerceNumber(bEval);
        if (bErr) return FormulaError.VALUE;
        base = b;
      }

      if (base <= 0 || base === 1) return FormulaError.NUM;
      return Math.log(num) / Math.log(base);
    }
  },

  // 16. LOG10
  {
    name: 'LOG10',
    category: 'Mathematical',
    description: 'Returns the base-10 logarithm of a number.',
    minArgs: 1,
    maxArgs: 1,
    returnType: 'number',
    args: [{ name: 'number', description: 'The positive real number for which you want the base-10 logarithm.', type: 'number' }],
    examples: ['=LOG10(100)', '=LOG10(1000)'],
    handler: (args, context, evaluate) => {
      const nEval = evaluate(args[0]!, context);
      if (isFormulaError(nEval)) return nEval;
      const { num, error } = coerceNumber(nEval);
      if (error) return FormulaError.VALUE;
      if (num <= 0) return FormulaError.NUM;
      return Math.log10(num);
    }
  },

  // 17. FACT
  {
    name: 'FACT',
    category: 'Mathematical',
    description: 'Returns the factorial of a number.',
    minArgs: 1,
    maxArgs: 1,
    returnType: 'number',
    args: [{ name: 'number', description: 'The nonnegative number you want the factorial of.', type: 'number' }],
    examples: ['=FACT(5)', '=FACT(1)'],
    handler: (args, context, evaluate) => {
      const nEval = evaluate(args[0]!, context);
      if (isFormulaError(nEval)) return nEval;
      const { num, error } = coerceNumber(nEval);
      if (error) return FormulaError.VALUE;
      if (num < 0 || num > 170) return FormulaError.NUM;

      const n = Math.trunc(num);
      let f = 1;
      for (let i = 2; i <= n; i++) {
        f *= i;
      }
      return f;
    }
  },

  // 18. PRODUCT
  {
    name: 'PRODUCT',
    category: 'Mathematical',
    description: 'Multiplies all the numbers given as arguments.',
    minArgs: 1,
    maxArgs: 255,
    returnType: 'number',
    args: [
      { name: 'number1', description: 'The first number or range you want to multiply.', type: 'any' },
      { name: 'number2', description: 'Additional numbers or ranges to multiply.', type: 'any', optional: true, repeating: true }
    ],
    examples: ['=PRODUCT(A1:A5)', '=PRODUCT(5, 10, 2)'],
    handler: (args, context, evaluate) => {
      let prod = 1;
      let count = 0;

      for (const arg of args) {
        if (arg.type === 'RangeRef' || arg.type === 'NamedRangeRef') {
          const grid = resolveTo2DArray(arg, context, evaluate);
          if (typeof grid === 'string') return grid;
          for (const row of grid) {
            for (const val of row) {
              if (isFormulaError(val)) return val;
              if (typeof val === 'number') {
                prod *= val;
                count++;
              }
            }
          }
        } else {
          const val = evaluate(arg, context);
          if (isFormulaError(val)) return val;
          const { num, error } = coerceNumber(val);
          if (error) return error;
          prod *= num;
          count++;
        }
      }

      return count > 0 ? prod : 0;
    }
  },

  // 19. SUMPRODUCT
  {
    name: 'SUMPRODUCT',
    category: 'Mathematical',
    description: 'Multiplies corresponding components in the given arrays, and returns the sum of those products.',
    minArgs: 1,
    maxArgs: 30,
    returnType: 'number',
    args: [
      { name: 'array1', description: 'The first array argument whose components you want to multiply and then add.', type: 'array' },
      { name: 'array2', description: 'Additional array arguments of the same dimensions.', type: 'array', optional: true, repeating: true }
    ],
    examples: ['=SUMPRODUCT(A1:A5, B1:B5)', '=SUMPRODUCT(A1:B3, C1:D3)'],
    handler: (args, context, evaluate) => {
      // Resolve all array arguments to 1D flattened number arrays
      const arrays: number[][] = [];
      let expectedLen = -1;

      for (const arg of args) {
        const flat = resolveTo1DArray(arg, context, evaluate);
        if (typeof flat === 'string') return flat;

        if (expectedLen === -1) {
          expectedLen = flat.length;
        } else if (flat.length !== expectedLen) {
          return FormulaError.VALUE;
        }

        const nums: number[] = flat.map((v) => {
          if (typeof v === 'number') return v;
          if (typeof v === 'boolean') return v ? 1 : 0;
          return 0; // Text/blanks in SUMPRODUCT arrays are treated as 0
        });

        arrays.push(nums);
      }

      if (expectedLen <= 0 || arrays.length === 0) return 0;

      let sum = 0;
      for (let i = 0; i < expectedLen; i++) {
        let product = 1;
        for (let a = 0; a < arrays.length; a++) {
          product *= arrays[a]![i]!;
        }
        sum += product;
      }

      return sum;
    }
  }
];
