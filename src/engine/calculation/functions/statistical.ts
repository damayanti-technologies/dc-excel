import { FunctionDefinition, ASTNode, EvaluationContext } from '../types';
import { FormulaError, isFormulaError } from '../errors';
import { coerceNumber, resolveTo1DArray, resolveTo2DArray, matchesCriteria } from './helpers';
import { CellValue } from '@/types/cell';

function extractNumericValues(
  args: ASTNode[],
  context: EvaluationContext,
  evaluate: (node: ASTNode, context: EvaluationContext) => CellValue
): { numbers: number[]; error?: string } {
  const numbers: number[] = [];

  for (const arg of args) {
    if (arg.type === 'RangeRef' || arg.type === 'NamedRangeRef' || arg.type === 'ArrayLiteral') {
      const grid = resolveTo2DArray(arg, context, evaluate);
      if (typeof grid === 'string') return { numbers: [], error: grid };
      for (const row of grid) {
        for (const val of row) {
          if (isFormulaError(val)) return { numbers: [], error: val };
          if (typeof val === 'number') {
            numbers.push(val);
          }
        }
      }
    } else {
      const val = evaluate(arg, context);
      if (isFormulaError(val)) return { numbers: [], error: val };
      const { num, error } = coerceNumber(val);
      if (error) return { numbers: [], error };
      numbers.push(num);
    }
  }

  return { numbers };
}

export const statisticalFunctions: FunctionDefinition[] = [
  // 1. AVERAGE
  {
    name: 'AVERAGE',
    category: 'Statistical',
    description: 'Returns the average (arithmetic mean) of the arguments.',
    minArgs: 1,
    maxArgs: 255,
    returnType: 'number',
    args: [
      { name: 'number1', description: 'The first number, cell reference, or range for which you want the average.', type: 'any' },
      { name: 'number2', description: 'Additional numbers, cell references, or ranges to average.', type: 'any', optional: true, repeating: true }
    ],
    examples: ['=AVERAGE(A1:A20)', '=AVERAGE(10, 20, 30)'],
    handler: (args, context, evaluate) => {
      const { numbers, error } = extractNumericValues(args, context, evaluate);
      if (error) return error;
      if (numbers.length === 0) return FormulaError.DIV_ZERO;
      const sum = numbers.reduce((a, b) => a + b, 0);
      return sum / numbers.length;
    }
  },

  // 2. COUNT
  {
    name: 'COUNT',
    category: 'Statistical',
    description: 'Counts the number of cells that contain numbers.',
    minArgs: 1,
    maxArgs: 255,
    returnType: 'number',
    args: [
      { name: 'value1', description: 'The first item, cell reference, or range within which you want to count numbers.', type: 'any' },
      { name: 'value2', description: 'Additional items, cell references, or ranges to count.', type: 'any', optional: true, repeating: true }
    ],
    examples: ['=COUNT(A1:A20)', '=COUNT(A1:E5)'],
    handler: (args, context, evaluate) => {
      let count = 0;
      for (const arg of args) {
        if (arg.type === 'RangeRef' || arg.type === 'NamedRangeRef' || arg.type === 'ArrayLiteral') {
          const grid = resolveTo2DArray(arg, context, evaluate);
          if (typeof grid === 'string') return grid;
          for (const row of grid) {
            for (const val of row) {
              if (isFormulaError(val)) return val;
              if (typeof val === 'number') count++;
            }
          }
        } else {
          const val = evaluate(arg, context);
          if (isFormulaError(val)) return val;
          const { error } = coerceNumber(val);
          if (!error) count++;
        }
      }
      return count;
    }
  },

  // 3. MIN
  {
    name: 'MIN',
    category: 'Statistical',
    description: 'Returns the smallest number in a set of values.',
    minArgs: 1,
    maxArgs: 255,
    returnType: 'number',
    args: [
      { name: 'number1', description: 'The first number, cell reference, or range.', type: 'any' },
      { name: 'number2', description: 'Additional numbers, cell references, or ranges.', type: 'any', optional: true, repeating: true }
    ],
    examples: ['=MIN(A1:A20)', '=MIN(5, 10, 2)'],
    handler: (args, context, evaluate) => {
      const { numbers, error } = extractNumericValues(args, context, evaluate);
      if (error) return error;
      if (numbers.length === 0) return 0;
      return Math.min(...numbers);
    }
  },

  // 4. MAX
  {
    name: 'MAX',
    category: 'Statistical',
    description: 'Returns the largest number in a set of values.',
    minArgs: 1,
    maxArgs: 255,
    returnType: 'number',
    args: [
      { name: 'number1', description: 'The first number, cell reference, or range.', type: 'any' },
      { name: 'number2', description: 'Additional numbers, cell references, or ranges.', type: 'any', optional: true, repeating: true }
    ],
    examples: ['=MAX(A1:A20)', '=MAX(5, 10, 2)'],
    handler: (args, context, evaluate) => {
      const { numbers, error } = extractNumericValues(args, context, evaluate);
      if (error) return error;
      if (numbers.length === 0) return 0;
      return Math.max(...numbers);
    }
  },

  // 5. MEDIAN
  {
    name: 'MEDIAN',
    category: 'Statistical',
    description: 'Returns the median of the given numbers (the number in the middle of a set of numbers).',
    minArgs: 1,
    maxArgs: 255,
    returnType: 'number',
    args: [
      { name: 'number1', description: 'The first number, cell reference, or range.', type: 'any' },
      { name: 'number2', description: 'Additional numbers, cell references, or ranges.', type: 'any', optional: true, repeating: true }
    ],
    examples: ['=MEDIAN(1, 2, 3, 4, 5)', '=MEDIAN(A1:A10)'],
    handler: (args, context, evaluate) => {
      const { numbers, error } = extractNumericValues(args, context, evaluate);
      if (error) return error;
      if (numbers.length === 0) return FormulaError.NUM;

      numbers.sort((a, b) => a - b);
      const mid = Math.floor(numbers.length / 2);
      if (numbers.length % 2 !== 0) {
        return numbers[mid]!;
      }
      return (numbers[mid - 1]! + numbers[mid]!) / 2;
    }
  },

  // 6. MODE
  {
    name: 'MODE',
    category: 'Statistical',
    description: 'Returns the most frequently occurring, or repetitive, value in an array or range of data.',
    minArgs: 1,
    maxArgs: 255,
    returnType: 'number',
    args: [
      { name: 'number1', description: 'The first number, cell reference, or range.', type: 'any' },
      { name: 'number2', description: 'Additional numbers, cell references, or ranges.', type: 'any', optional: true, repeating: true }
    ],
    examples: ['=MODE(A1:A20)', '=MODE(1, 2, 2, 3)'],
    handler: (args, context, evaluate) => {
      const { numbers, error } = extractNumericValues(args, context, evaluate);
      if (error) return error;
      if (numbers.length === 0) return FormulaError.NA;

      const counts = new Map<number, number>();
      for (const n of numbers) {
        counts.set(n, (counts.get(n) ?? 0) + 1);
      }

      let maxCount = 1;
      let modeVal: number | null = null;
      for (const [val, count] of counts.entries()) {
        if (count > maxCount) {
          maxCount = count;
          modeVal = val;
        }
      }

      if (maxCount <= 1 || modeVal === null) {
        return FormulaError.NA; // No duplicate values found
      }
      return modeVal;
    }
  },

  // 7. STDEV
  {
    name: 'STDEV',
    category: 'Statistical',
    description: 'Estimates standard deviation based on a sample (ignores logical values and text).',
    minArgs: 1,
    maxArgs: 255,
    returnType: 'number',
    args: [
      { name: 'number1', description: 'The first number or range of the sample.', type: 'any' },
      { name: 'number2', description: 'Additional numbers or ranges of the sample.', type: 'any', optional: true, repeating: true }
    ],
    examples: ['=STDEV(A1:A20)', '=STDEV(1345, 1301, 1368, 1322)'],
    handler: (args, context, evaluate) => {
      const { numbers, error } = extractNumericValues(args, context, evaluate);
      if (error) return error;
      const n = numbers.length;
      if (n < 2) return FormulaError.DIV_ZERO;

      const mean = numbers.reduce((a, b) => a + b, 0) / n;
      const sumSq = numbers.reduce((acc, x) => acc + Math.pow(x - mean, 2), 0);
      return Math.sqrt(sumSq / (n - 1));
    }
  },

  // 8. STDEVP
  {
    name: 'STDEVP',
    category: 'Statistical',
    description: 'Calculates standard deviation based on the entire population given as arguments.',
    minArgs: 1,
    maxArgs: 255,
    returnType: 'number',
    args: [
      { name: 'number1', description: 'The first number or range representing the population.', type: 'any' },
      { name: 'number2', description: 'Additional numbers or ranges representing the population.', type: 'any', optional: true, repeating: true }
    ],
    examples: ['=STDEVP(A1:A20)'],
    handler: (args, context, evaluate) => {
      const { numbers, error } = extractNumericValues(args, context, evaluate);
      if (error) return error;
      const n = numbers.length;
      if (n < 1) return FormulaError.DIV_ZERO;

      const mean = numbers.reduce((a, b) => a + b, 0) / n;
      const sumSq = numbers.reduce((acc, x) => acc + Math.pow(x - mean, 2), 0);
      return Math.sqrt(sumSq / n);
    }
  },

  // 9. VAR
  {
    name: 'VAR',
    category: 'Statistical',
    description: 'Estimates variance based on a sample (sample variance).',
    minArgs: 1,
    maxArgs: 255,
    returnType: 'number',
    args: [
      { name: 'number1', description: 'The first number or range corresponding to a sample of a population.', type: 'any' },
      { name: 'number2', description: 'Additional numbers or ranges of the sample.', type: 'any', optional: true, repeating: true }
    ],
    examples: ['=VAR(A1:A20)'],
    handler: (args, context, evaluate) => {
      const { numbers, error } = extractNumericValues(args, context, evaluate);
      if (error) return error;
      const n = numbers.length;
      if (n < 2) return FormulaError.DIV_ZERO;

      const mean = numbers.reduce((a, b) => a + b, 0) / n;
      const sumSq = numbers.reduce((acc, x) => acc + Math.pow(x - mean, 2), 0);
      return sumSq / (n - 1);
    }
  },

  // 10. VARP
  {
    name: 'VARP',
    category: 'Statistical',
    description: 'Calculates variance based on the entire population.',
    minArgs: 1,
    maxArgs: 255,
    returnType: 'number',
    args: [
      { name: 'number1', description: 'The first number or range of the population.', type: 'any' },
      { name: 'number2', description: 'Additional numbers or ranges of the population.', type: 'any', optional: true, repeating: true }
    ],
    examples: ['=VARP(A1:A20)'],
    handler: (args, context, evaluate) => {
      const { numbers, error } = extractNumericValues(args, context, evaluate);
      if (error) return error;
      const n = numbers.length;
      if (n < 1) return FormulaError.DIV_ZERO;

      const mean = numbers.reduce((a, b) => a + b, 0) / n;
      const sumSq = numbers.reduce((acc, x) => acc + Math.pow(x - mean, 2), 0);
      return sumSq / n;
    }
  },

  // 11. COUNTA
  {
    name: 'COUNTA',
    category: 'Statistical',
    description: 'Counts the number of cells that are not empty in a range.',
    minArgs: 1,
    maxArgs: 255,
    returnType: 'number',
    args: [
      { name: 'value1', description: 'The first argument representing the values you want to count.', type: 'any' },
      { name: 'value2', description: 'Additional arguments representing values to count.', type: 'any', optional: true, repeating: true }
    ],
    examples: ['=COUNTA(A1:A20)', '=COUNTA("Item 1", "", 42)'],
    handler: (args, context, evaluate) => {
      let count = 0;
      for (const arg of args) {
        if (arg.type === 'RangeRef' || arg.type === 'NamedRangeRef' || arg.type === 'ArrayLiteral') {
          const grid = resolveTo2DArray(arg, context, evaluate);
          if (typeof grid === 'string') return grid;
          for (const row of grid) {
            for (const val of row) {
              if (val !== null && val !== undefined && val !== '') {
                count++;
              }
            }
          }
        } else {
          const val = evaluate(arg, context);
          if (val !== null && val !== undefined && val !== '') {
            count++;
          }
        }
      }
      return count;
    }
  },

  // 12. LARGE
  {
    name: 'LARGE',
    category: 'Statistical',
    description: 'Returns the k-th largest value in a data set.',
    minArgs: 2,
    maxArgs: 2,
    returnType: 'number',
    args: [
      { name: 'array', description: 'The array or range of data for which you want to determine the k-th largest value.', type: 'array' },
      { name: 'k', description: 'The position (from the largest) in the array or cell range of data to return.', type: 'number' }
    ],
    examples: ['=LARGE(A1:A10, 1)', '=LARGE(A1:A10, 3)'],
    handler: (args, context, evaluate) => {
      const flat = resolveTo1DArray(args[0]!, context, evaluate);
      if (typeof flat === 'string') return flat;

      const nums = flat.filter((v): v is number => typeof v === 'number');

      const kEval = evaluate(args[1]!, context);
      if (isFormulaError(kEval)) return kEval;
      const { num: k, error } = coerceNumber(kEval);
      if (error || k < 1 || k > nums.length) return FormulaError.NUM;

      nums.sort((a, b) => b - a); // descending
      return nums[Math.trunc(k) - 1]!;
    }
  },

  // 13. SMALL
  {
    name: 'SMALL',
    category: 'Statistical',
    description: 'Returns the k-th smallest value in a data set.',
    minArgs: 2,
    maxArgs: 2,
    returnType: 'number',
    args: [
      { name: 'array', description: 'An array or range of numerical data for which you want to determine the k-th smallest value.', type: 'array' },
      { name: 'k', description: 'The position (from the smallest) in the array or range of data to return.', type: 'number' }
    ],
    examples: ['=SMALL(A1:A10, 1)', '=SMALL(A1:A10, 2)'],
    handler: (args, context, evaluate) => {
      const flat = resolveTo1DArray(args[0]!, context, evaluate);
      if (typeof flat === 'string') return flat;

      const nums = flat.filter((v): v is number => typeof v === 'number');

      const kEval = evaluate(args[1]!, context);
      if (isFormulaError(kEval)) return kEval;
      const { num: k, error } = coerceNumber(kEval);
      if (error || k < 1 || k > nums.length) return FormulaError.NUM;

      nums.sort((a, b) => a - b); // ascending
      return nums[Math.trunc(k) - 1]!;
    }
  },

  // 14. RANK
  {
    name: 'RANK',
    category: 'Statistical',
    description: 'Returns the rank of a number in a list of numbers.',
    minArgs: 2,
    maxArgs: 3,
    returnType: 'number',
    args: [
      { name: 'number', description: 'The number whose rank you want to find.', type: 'number' },
      { name: 'ref', description: 'A range of, or a reference to, a list of numbers.', type: 'array' },
      { name: 'order', description: '0 or omitted for descending rank, any nonzero number for ascending rank.', type: 'number', optional: true, defaultValue: '0' }
    ],
    examples: ['=RANK(A1, A1:A20)', '=RANK(A1, A1:A20, 1)'],
    handler: (args, context, evaluate) => {
      const nEval = evaluate(args[0]!, context);
      if (isFormulaError(nEval)) return nEval;
      const { num: targetNum, error: nErr } = coerceNumber(nEval);
      if (nErr) return FormulaError.VALUE;

      const flat = resolveTo1DArray(args[1]!, context, evaluate);
      if (typeof flat === 'string') return flat;

      const nums = flat.filter((v): v is number => typeof v === 'number');
      if (!nums.includes(targetNum)) return FormulaError.NA;

      let ascending = false;
      if (args.length >= 3 && args[2]!.type !== 'Empty') {
        const oEval = evaluate(args[2]!, context);
        if (isFormulaError(oEval)) return oEval;
        const { num } = coerceNumber(oEval);
        ascending = num !== 0;
      }

      if (ascending) {
        nums.sort((a, b) => a - b);
      } else {
        nums.sort((a, b) => b - a);
      }

      return nums.indexOf(targetNum) + 1;
    }
  },

  // 15. PERCENTILE
  {
    name: 'PERCENTILE',
    category: 'Statistical',
    description: 'Returns the k-th percentile of values in a range (where k is in the range 0..1, inclusive).',
    minArgs: 2,
    maxArgs: 2,
    returnType: 'number',
    args: [
      { name: 'array', description: 'The array or range of data that defines relative standing.', type: 'array' },
      { name: 'k', description: 'The percentile value in the range 0..1, inclusive.', type: 'number' }
    ],
    examples: ['=PERCENTILE(A1:A20, 0.9)', '=PERCENTILE(A1:A20, 0.5)'],
    handler: (args, context, evaluate) => {
      const flat = resolveTo1DArray(args[0]!, context, evaluate);
      if (typeof flat === 'string') return flat;

      const nums = flat.filter((v): v is number => typeof v === 'number');
      if (nums.length === 0) return FormulaError.NUM;

      const kEval = evaluate(args[1]!, context);
      if (isFormulaError(kEval)) return kEval;
      const { num: k, error } = coerceNumber(kEval);
      if (error || k < 0 || k > 1) return FormulaError.NUM;

      nums.sort((a, b) => a - b);
      const rank = k * (nums.length - 1);
      const low = Math.floor(rank);
      const high = Math.ceil(rank);
      const weight = rank - low;

      return nums[low]! + weight * (nums[high]! - nums[low]!);
    }
  },

  // 16. QUARTILE
  {
    name: 'QUARTILE',
    category: 'Statistical',
    description: 'Returns the quartile of a data set (0 = Min, 1 = 25th percentile, 2 = Median, 3 = 75th percentile, 4 = Max).',
    minArgs: 2,
    maxArgs: 2,
    returnType: 'number',
    args: [
      { name: 'array', description: 'The array or cell range of numeric values for which you want the quartile value.', type: 'array' },
      { name: 'quart', description: 'The quartile value to return (0, 1, 2, 3, or 4).', type: 'number' }
    ],
    examples: ['=QUARTILE(A1:A20, 1)', '=QUARTILE(A1:A20, 2)'],
    handler: (args, context, evaluate) => {
      const qEval = evaluate(args[1]!, context);
      if (isFormulaError(qEval)) return qEval;
      const { num: quart, error } = coerceNumber(qEval);
      if (error || quart < 0 || quart > 4) return FormulaError.NUM;

      const k = Math.trunc(quart) * 0.25;

      const flat = resolveTo1DArray(args[0]!, context, evaluate);
      if (typeof flat === 'string') return flat;

      const nums = flat.filter((v): v is number => typeof v === 'number');
      if (nums.length === 0) return FormulaError.NUM;

      nums.sort((a, b) => a - b);
      const rank = k * (nums.length - 1);
      const low = Math.floor(rank);
      const high = Math.ceil(rank);
      const weight = rank - low;

      return nums[low]! + weight * (nums[high]! - nums[low]!);
    }
  },

  // 13. COUNTIF
  {
    name: 'COUNTIF',
    category: 'Statistical',
    description: 'Counts the number of cells within a range that meet the given condition.',
    minArgs: 2,
    maxArgs: 2,
    returnType: 'number',
    args: [
      { name: 'range', description: 'The range of cells from which you want to count.', type: 'range' },
      { name: 'criteria', description: 'The condition that defines which cells will be counted.', type: 'any' }
    ],
    examples: ['=COUNTIF(A1:A10, ">0")', '=COUNTIF(A1:A10, "apples")'],
    handler: (args, context, evaluate) => {
      const criteriaVal = evaluate(args[1]!, context);
      if (isFormulaError(criteriaVal)) return criteriaVal;

      const flat = resolveTo1DArray(args[0]!, context, evaluate);
      if (typeof flat === 'string') return flat;

      let count = 0;
      for (const val of flat) {
        if (isFormulaError(val)) return val;
        if (matchesCriteria(val, criteriaVal)) {
          count++;
        }
      }
      return count;
    }
  },

  // 14. COUNTIFS
  {
    name: 'COUNTIFS',
    category: 'Statistical',
    description: 'Counts the number of cells specified that meet a given set of conditions.',
    minArgs: 2,
    maxArgs: 255,
    returnType: 'number',
    args: [
      { name: 'criteria_range1', description: 'The first range to evaluate.', type: 'range' },
      { name: 'criteria1', description: 'The condition that defines which cells to count in the first range.', type: 'any' }
    ],
    examples: ['=COUNTIFS(A1:A10, ">0", B1:B10, "<100")'],
    handler: (args, context, evaluate) => {
      if (args.length < 2 || args.length % 2 !== 0) {
        return FormulaError.VALUE;
      }

      const pairs: { grid: CellValue[][]; crit: CellValue }[] = [];
      for (let i = 0; i < args.length; i += 2) {
        const grid = resolveTo2DArray(args[i]!, context, evaluate);
        if (typeof grid === 'string') return grid;
        const crit = evaluate(args[i + 1]!, context);
        if (isFormulaError(crit)) return crit;
        pairs.push({ grid, crit });
      }

      const baseGrid = pairs[0]!.grid;
      let count = 0;

      for (let r = 0; r < baseGrid.length; r++) {
        const baseRow = baseGrid[r] || [];
        for (let c = 0; c < baseRow.length; c++) {
          let matchesAll = true;
          for (const pair of pairs) {
            const val = pair.grid[r]?.[c] ?? null;
            if (isFormulaError(val)) return val;
            if (!matchesCriteria(val, pair.crit)) {
              matchesAll = false;
              break;
            }
          }
          if (matchesAll) {
            count++;
          }
        }
      }

      return count;
    }
  },

  // 15. COUNTBLANK
  {
    name: 'COUNTBLANK',
    category: 'Statistical',
    description: 'Counts empty cells in a specified range of cells.',
    minArgs: 1,
    maxArgs: 1,
    returnType: 'number',
    args: [
      { name: 'range', description: 'The range from which you want to count blank cells.', type: 'range' }
    ],
    examples: ['=COUNTBLANK(A1:B10)'],
    handler: (args, context, evaluate) => {
      const flat = resolveTo1DArray(args[0]!, context, evaluate);
      if (typeof flat === 'string') return flat;

      let count = 0;
      for (const val of flat) {
        if (val === null || val === undefined || val === '') {
          count++;
        }
      }
      return count;
    }
  },

  // 16. AVERAGEIF
  {
    name: 'AVERAGEIF',
    category: 'Statistical',
    description: 'Returns the average (arithmetic mean) of all the cells in a range that meet a given criteria.',
    minArgs: 2,
    maxArgs: 3,
    returnType: 'number',
    args: [
      { name: 'range', description: 'The range of cells you want evaluated by the criteria.', type: 'range' },
      { name: 'criteria', description: 'The condition that determines which cells will be averaged.', type: 'any' },
      { name: 'average_range', description: 'The actual cells to average if different from range.', type: 'range', optional: true }
    ],
    examples: ['=AVERAGEIF(A1:A10, ">0")', '=AVERAGEIF(A1:A10, "West", B1:B10)'],
    handler: (args, context, evaluate) => {
      const criteriaVal = evaluate(args[1]!, context);
      if (isFormulaError(criteriaVal)) return criteriaVal;

      const critGrid = resolveTo2DArray(args[0]!, context, evaluate);
      if (typeof critGrid === 'string') return critGrid;

      const avgGrid = args[2] ? resolveTo2DArray(args[2], context, evaluate) : critGrid;
      if (typeof avgGrid === 'string') return avgGrid;

      let total = 0;
      let count = 0;

      for (let r = 0; r < critGrid.length; r++) {
        const critRow = critGrid[r] || [];
        const avgRow = avgGrid[r] || [];
        for (let c = 0; c < critRow.length; c++) {
          const cVal = critRow[c] ?? null;
          if (isFormulaError(cVal)) return cVal;
          if (matchesCriteria(cVal, criteriaVal)) {
            const aVal = avgRow[c] ?? null;
            if (isFormulaError(aVal)) return aVal;
            if (typeof aVal === 'number') {
              total += aVal;
              count++;
            } else if (aVal !== null && aVal !== undefined && aVal !== '') {
              const { num, error } = coerceNumber(aVal);
              if (!error) {
                total += num;
                count++;
              }
            }
          }
        }
      }

      if (count === 0) return FormulaError.DIV_ZERO;
      return total / count;
    }
  },

  // 17. AVERAGEIFS
  {
    name: 'AVERAGEIFS',
    category: 'Statistical',
    description: 'Returns the average (arithmetic mean) of all cells that meet multiple conditions.',
    minArgs: 3,
    maxArgs: 255,
    returnType: 'number',
    args: [
      { name: 'average_range', description: 'The range of cells to average.', type: 'range' },
      { name: 'criteria_range1', description: 'The first range to evaluate.', type: 'range' },
      { name: 'criteria1', description: 'The first condition.', type: 'any' }
    ],
    examples: ['=AVERAGEIFS(B1:B10, A1:A10, ">0", C1:C10, "Yes")'],
    handler: (args, context, evaluate) => {
      if (args.length < 3 || (args.length - 1) % 2 !== 0) {
        return FormulaError.VALUE;
      }

      const avgGrid = resolveTo2DArray(args[0]!, context, evaluate);
      if (typeof avgGrid === 'string') return avgGrid;

      const criteriaPairs: { grid: CellValue[][]; crit: CellValue }[] = [];
      for (let i = 1; i < args.length; i += 2) {
        const grid = resolveTo2DArray(args[i]!, context, evaluate);
        if (typeof grid === 'string') return grid;
        const crit = evaluate(args[i + 1]!, context);
        if (isFormulaError(crit)) return crit;
        criteriaPairs.push({ grid, crit });
      }

      let total = 0;
      let count = 0;

      for (let r = 0; r < avgGrid.length; r++) {
        const avgRow = avgGrid[r] || [];
        for (let c = 0; c < avgRow.length; c++) {
          let matchesAll = true;
          for (const pair of criteriaPairs) {
            const val = pair.grid[r]?.[c] ?? null;
            if (isFormulaError(val)) return val;
            if (!matchesCriteria(val, pair.crit)) {
              matchesAll = false;
              break;
            }
          }
          if (matchesAll) {
            const aVal = avgRow[c];
            if (isFormulaError(aVal)) return aVal;
            if (typeof aVal === 'number') {
              total += aVal;
              count++;
            } else if (aVal !== null && aVal !== undefined && aVal !== '') {
              const { num, error } = coerceNumber(aVal);
              if (!error) {
                total += num;
                count++;
              }
            }
          }
        }
      }

      if (count === 0) return FormulaError.DIV_ZERO;
      return total / count;
    }
  }
];
