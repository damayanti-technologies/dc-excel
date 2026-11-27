import { ASTNode, FunctionDefinition } from '../types';
import { FormulaError, isFormulaError } from '../errors';
import { CellValue } from '@/types/cell';
import {
  coerceBoolean,
  coerceNumber,
  coerceString,
  matchWildcard,
  resolveTo1DArray
} from './helpers';
import { numberFormatter } from '@/engine/formatting/number-formatter';

export const textFunctions: FunctionDefinition[] = [
  // 1. LEFT
  {
    name: 'LEFT',
    category: 'Text',
    description: 'Returns the specified number of characters from the start of a text string.',
    minArgs: 1,
    maxArgs: 2,
    returnType: 'string',
    args: [
      { name: 'text', description: 'The text string containing the characters you want to extract.', type: 'string' },
      { name: 'num_chars', description: 'The number of characters you want to extract (default 1).', type: 'number', optional: true, defaultValue: '1' }
    ],
    examples: ['=LEFT("Sale price", 4)', '=LEFT(A1)'],
    handler: (args, context, evaluate) => {
      const textEval = evaluate(args[0]!, context);
      if (isFormulaError(textEval)) return textEval;
      const str = coerceString(textEval);

      let numChars = 1;
      if (args.length >= 2 && args[1]!.type !== 'Empty') {
        const numEval = evaluate(args[1]!, context);
        if (isFormulaError(numEval)) return numEval;
        const { num, error } = coerceNumber(numEval);
        if (error || num < 0) return FormulaError.VALUE;
        numChars = Math.trunc(num);
      }

      return str.slice(0, numChars);
    }
  },

  // 2. RIGHT
  {
    name: 'RIGHT',
    category: 'Text',
    description: 'Returns the specified number of characters from the end of a text string.',
    minArgs: 1,
    maxArgs: 2,
    returnType: 'string',
    args: [
      { name: 'text', description: 'The text string containing the characters you want to extract.', type: 'string' },
      { name: 'num_chars', description: 'The number of characters you want to extract (default 1).', type: 'number', optional: true, defaultValue: '1' }
    ],
    examples: ['=RIGHT("Stock Number", 6)', '=RIGHT(A1)'],
    handler: (args, context, evaluate) => {
      const textEval = evaluate(args[0]!, context);
      if (isFormulaError(textEval)) return textEval;
      const str = coerceString(textEval);

      let numChars = 1;
      if (args.length >= 2 && args[1]!.type !== 'Empty') {
        const numEval = evaluate(args[1]!, context);
        if (isFormulaError(numEval)) return numEval;
        const { num, error } = coerceNumber(numEval);
        if (error || num < 0) return FormulaError.VALUE;
        numChars = Math.trunc(num);
      }

      if (numChars >= str.length) return str;
      return str.slice(str.length - numChars);
    }
  },

  // 3. MID
  {
    name: 'MID',
    category: 'Text',
    description: 'Returns a specific number of characters from a text string, starting at the position you specify.',
    minArgs: 3,
    maxArgs: 3,
    returnType: 'string',
    args: [
      { name: 'text', description: 'The text string containing the characters you want to extract.', type: 'string' },
      { name: 'start_num', description: 'The 1-based position of the first character you want to extract.', type: 'number' },
      { name: 'num_chars', description: 'The number of characters you want to extract.', type: 'number' }
    ],
    examples: ['=MID("Fluid Flow", 1, 5)', '=MID(A1, 7, 20)'],
    handler: (args, context, evaluate) => {
      const textEval = evaluate(args[0]!, context);
      if (isFormulaError(textEval)) return textEval;
      const str = coerceString(textEval);

      const startEval = evaluate(args[1]!, context);
      if (isFormulaError(startEval)) return startEval;
      const { num: startNum, error: startErr } = coerceNumber(startEval);
      if (startErr || startNum < 1) return FormulaError.VALUE;

      const numEval = evaluate(args[2]!, context);
      if (isFormulaError(numEval)) return numEval;
      const { num: numChars, error: numErr } = coerceNumber(numEval);
      if (numErr || numChars < 0) return FormulaError.VALUE;

      const startIndex = Math.trunc(startNum) - 1;
      return str.slice(startIndex, startIndex + Math.trunc(numChars));
    }
  },

  // 4. LEN
  {
    name: 'LEN',
    category: 'Text',
    description: 'Returns the number of characters in a text string.',
    minArgs: 1,
    maxArgs: 1,
    returnType: 'number',
    args: [{ name: 'text', description: 'The text whose length you want to find.', type: 'string' }],
    examples: ['=LEN("Phoenix, AZ")', '=LEN(A1)'],
    handler: (args, context, evaluate) => {
      const textEval = evaluate(args[0]!, context);
      if (isFormulaError(textEval)) return textEval;
      return coerceString(textEval).length;
    }
  },

  // 5. TRIM
  {
    name: 'TRIM',
    category: 'Text',
    description: 'Removes all spaces from text except for single spaces between words.',
    minArgs: 1,
    maxArgs: 1,
    returnType: 'string',
    args: [{ name: 'text', description: 'The text from which you want spaces removed.', type: 'string' }],
    examples: ['=TRIM(" First Quarter Earnings ")'],
    handler: (args, context, evaluate) => {
      const textEval = evaluate(args[0]!, context);
      if (isFormulaError(textEval)) return textEval;
      const str = coerceString(textEval);
      return str.trim().replace(/\s+/g, ' ');
    }
  },

  // 6. UPPER
  {
    name: 'UPPER',
    category: 'Text',
    description: 'Converts text to uppercase.',
    minArgs: 1,
    maxArgs: 1,
    returnType: 'string',
    args: [{ name: 'text', description: 'The text you want converted to uppercase.', type: 'string' }],
    examples: ['=UPPER("total")', '=UPPER(A1)'],
    handler: (args, context, evaluate) => {
      const textEval = evaluate(args[0]!, context);
      if (isFormulaError(textEval)) return textEval;
      return coerceString(textEval).toUpperCase();
    }
  },

  // 7. LOWER
  {
    name: 'LOWER',
    category: 'Text',
    description: 'Converts text to lowercase.',
    minArgs: 1,
    maxArgs: 1,
    returnType: 'string',
    args: [{ name: 'text', description: 'The text you want converted to lowercase.', type: 'string' }],
    examples: ['=LOWER("E. E. Cummings")', '=LOWER(A1)'],
    handler: (args, context, evaluate) => {
      const textEval = evaluate(args[0]!, context);
      if (isFormulaError(textEval)) return textEval;
      return coerceString(textEval).toLowerCase();
    }
  },

  // 8. PROPER
  {
    name: 'PROPER',
    category: 'Text',
    description: 'Capitalizes the first letter in each word of a text value.',
    minArgs: 1,
    maxArgs: 1,
    returnType: 'string',
    args: [{ name: 'text', description: 'The text you want converted to proper case.', type: 'string' }],
    examples: ['=PROPER("this is a TITLE")', '=PROPER(A1)'],
    handler: (args, context, evaluate) => {
      const textEval = evaluate(args[0]!, context);
      if (isFormulaError(textEval)) return textEval;
      const str = coerceString(textEval).toLowerCase();
      return str.replace(/\b\w/g, (c) => c.toUpperCase());
    }
  },

  // 9. CONCATENATE
  {
    name: 'CONCATENATE',
    category: 'Text',
    description: 'Joins two or more text strings into one string.',
    minArgs: 1,
    maxArgs: 255,
    returnType: 'string',
    args: [
      { name: 'text1', description: 'The first text item to concatenate.', type: 'any' },
      { name: 'text2', description: 'Additional text items to concatenate.', type: 'any', optional: true, repeating: true }
    ],
    examples: ['=CONCATENATE("Stream", " ", "fleet")', '=CONCATENATE(A1, " ", B1)'],
    handler: (args, context, evaluate) => {
      let result = '';
      for (const arg of args) {
        const flat = resolveTo1DArray(arg, context, evaluate);
        if (typeof flat === 'string') return flat;
        for (const item of flat) {
          if (isFormulaError(item)) return item;
          result += coerceString(item);
        }
      }
      return result;
    }
  },

  // 10. CONCAT
  {
    name: 'CONCAT',
    category: 'Text',
    description: 'Combines the text from multiple ranges and/or strings.',
    minArgs: 1,
    maxArgs: 255,
    returnType: 'string',
    args: [
      { name: 'text1', description: 'Text entry or range to combine.', type: 'any' },
      { name: 'text2', description: 'Additional text entries or ranges to combine.', type: 'any', optional: true, repeating: true }
    ],
    examples: ['=CONCAT(A1:B2)', '=CONCAT("The", " ", "sun")'],
    handler: (args, context, evaluate) => {
      let result = '';
      for (const arg of args) {
        const flat = resolveTo1DArray(arg, context, evaluate);
        if (typeof flat === 'string') return flat;
        for (const item of flat) {
          if (isFormulaError(item)) return item;
          result += coerceString(item);
        }
      }
      return result;
    }
  },

  // 11. TEXTJOIN
  {
    name: 'TEXTJOIN',
    category: 'Text',
    description: 'Combines text from multiple ranges and/or strings with a specified delimiter.',
    minArgs: 3,
    maxArgs: 255,
    returnType: 'string',
    args: [
      { name: 'delimiter', description: 'A string to insert between each text item.', type: 'string' },
      { name: 'ignore_empty', description: 'TRUE to ignore empty cells, FALSE to include them.', type: 'boolean' },
      { name: 'text1', description: 'Text or range of values to join.', type: 'any' },
      { name: 'text2', description: 'Additional text or ranges to join.', type: 'any', optional: true, repeating: true }
    ],
    examples: ['=TEXTJOIN(", ", TRUE, A1:A5)', '=TEXTJOIN("-", FALSE, "2026", "11", "24")'],
    handler: (args, context, evaluate) => {
      const delimEval = evaluate(args[0]!, context);
      if (isFormulaError(delimEval)) return delimEval;
      const delimiter = coerceString(delimEval);

      const ignoreEval = evaluate(args[1]!, context);
      if (isFormulaError(ignoreEval)) return ignoreEval;
      const ignoreEmpty = coerceBoolean(ignoreEval);

      const pieces: string[] = [];
      for (let i = 2; i < args.length; i++) {
        const flat = resolveTo1DArray(args[i]!, context, evaluate);
        if (typeof flat === 'string') return flat;
        for (const item of flat) {
          if (isFormulaError(item)) return item;
          if (item === null || item === undefined || item === '') {
            if (!ignoreEmpty) {
              pieces.push('');
            }
          } else {
            pieces.push(coerceString(item));
          }
        }
      }

      return pieces.join(delimiter);
    }
  },

  // 12. SUBSTITUTE
  {
    name: 'SUBSTITUTE',
    category: 'Text',
    description: 'Substitutes new_text for old_text in a text string.',
    minArgs: 3,
    maxArgs: 4,
    returnType: 'string',
    args: [
      { name: 'text', description: 'The text in which you want to substitute characters.', type: 'string' },
      { name: 'old_text', description: 'The text you want to replace.', type: 'string' },
      { name: 'new_text', description: 'The text you want to replace old_text with.', type: 'string' },
      { name: 'instance_num', description: 'The occurrence of old_text to replace (1-based). If omitted, every occurrence is replaced.', type: 'number', optional: true }
    ],
    examples: ['=SUBSTITUTE("Sales Data", "Sales", "Cost")', '=SUBSTITUTE("Quarter 1, 2026", "1", "2", 1)'],
    handler: (args, context, evaluate) => {
      const textEval = evaluate(args[0]!, context);
      if (isFormulaError(textEval)) return textEval;
      const text = coerceString(textEval);

      const oldEval = evaluate(args[1]!, context);
      if (isFormulaError(oldEval)) return oldEval;
      const oldText = coerceString(oldEval);

      const newEval = evaluate(args[2]!, context);
      if (isFormulaError(newEval)) return newEval;
      const newText = coerceString(newEval);

      if (!oldText) return text;

      if (args.length >= 4 && args[3]!.type !== 'Empty') {
        const instEval = evaluate(args[3]!, context);
        if (isFormulaError(instEval)) return instEval;
        const { num: instNum, error } = coerceNumber(instEval);
        if (error || instNum < 1) return FormulaError.VALUE;

        let occurrence = 0;
        let pos = 0;
        while ((pos = text.indexOf(oldText, pos)) !== -1) {
          occurrence++;
          if (occurrence === instNum) {
            return text.slice(0, pos) + newText + text.slice(pos + oldText.length);
          }
          pos += oldText.length;
        }
        return text;
      }

      return text.split(oldText).join(newText);
    }
  },

  // 13. REPLACE
  {
    name: 'REPLACE',
    category: 'Text',
    description: 'Replaces part of a text string with a different text string based on character position.',
    minArgs: 4,
    maxArgs: 4,
    returnType: 'string',
    args: [
      { name: 'old_text', description: 'Text in which to replace characters.', type: 'string' },
      { name: 'start_num', description: 'The 1-based character position to start replacing.', type: 'number' },
      { name: 'num_chars', description: 'The number of characters to replace.', type: 'number' },
      { name: 'new_text', description: 'The text that will replace characters in old_text.', type: 'string' }
    ],
    examples: ['=REPLACE("abcdefghijk", 6, 5, "*")', '=REPLACE(A1, 1, 3, "2026")'],
    handler: (args, context, evaluate) => {
      const textEval = evaluate(args[0]!, context);
      if (isFormulaError(textEval)) return textEval;
      const text = coerceString(textEval);

      const startEval = evaluate(args[1]!, context);
      if (isFormulaError(startEval)) return startEval;
      const { num: startNum, error: startErr } = coerceNumber(startEval);
      if (startErr || startNum < 1) return FormulaError.VALUE;

      const numEval = evaluate(args[2]!, context);
      if (isFormulaError(numEval)) return numEval;
      const { num: numChars, error: numErr } = coerceNumber(numEval);
      if (numErr || numChars < 0) return FormulaError.VALUE;

      const newEval = evaluate(args[3]!, context);
      if (isFormulaError(newEval)) return newEval;
      const newText = coerceString(newEval);

      const s = Math.trunc(startNum) - 1;
      const count = Math.trunc(numChars);
      return text.slice(0, s) + newText + text.slice(s + count);
    }
  },

  // 14. FIND
  {
    name: 'FIND',
    category: 'Text',
    description: 'Finds one text value within another (case-sensitive). Returns 1-based starting position.',
    minArgs: 2,
    maxArgs: 3,
    returnType: 'number',
    args: [
      { name: 'find_text', description: 'The text you want to find.', type: 'string' },
      { name: 'within_text', description: 'The text containing the text you want to find.', type: 'string' },
      { name: 'start_num', description: 'The 1-based character position to start searching (default 1).', type: 'number', optional: true, defaultValue: '1' }
    ],
    examples: ['=FIND("M", "Miriam McGovern")', '=FIND("M", "Miriam McGovern", 3)'],
    handler: (args, context, evaluate) => {
      const findEval = evaluate(args[0]!, context);
      if (isFormulaError(findEval)) return findEval;
      const findText = coerceString(findEval);

      const withinEval = evaluate(args[1]!, context);
      if (isFormulaError(withinEval)) return withinEval;
      const withinText = coerceString(withinEval);

      let startPos = 1;
      if (args.length >= 3 && args[2]!.type !== 'Empty') {
        const startEval = evaluate(args[2]!, context);
        if (isFormulaError(startEval)) return startEval;
        const { num, error } = coerceNumber(startEval);
        if (error || num < 1) return FormulaError.VALUE;
        startPos = Math.trunc(num);
      }

      const idx = withinText.indexOf(findText, startPos - 1);
      if (idx === -1) return FormulaError.VALUE;
      return idx + 1;
    }
  },

  // 15. SEARCH
  {
    name: 'SEARCH',
    category: 'Text',
    description: 'Finds one text value within another (case-insensitive, supports wildcards). Returns 1-based starting position.',
    minArgs: 2,
    maxArgs: 3,
    returnType: 'number',
    args: [
      { name: 'find_text', description: 'The text you want to find (supports ? and * wildcards).', type: 'string' },
      { name: 'within_text', description: 'The text containing the text you want to find.', type: 'string' },
      { name: 'start_num', description: 'The 1-based character position to start searching (default 1).', type: 'number', optional: true, defaultValue: '1' }
    ],
    examples: ['=SEARCH("e", "Statements", 6)', '=SEARCH("?at", "The cat sat")'],
    handler: (args, context, evaluate) => {
      const findEval = evaluate(args[0]!, context);
      if (isFormulaError(findEval)) return findEval;
      const findText = coerceString(findEval);

      const withinEval = evaluate(args[1]!, context);
      if (isFormulaError(withinEval)) return withinEval;
      const withinText = coerceString(withinEval);

      let startPos = 1;
      if (args.length >= 3 && args[2]!.type !== 'Empty') {
        const startEval = evaluate(args[2]!, context);
        if (isFormulaError(startEval)) return startEval;
        const { num, error } = coerceNumber(startEval);
        if (error || num < 1) return FormulaError.VALUE;
        startPos = Math.trunc(num);
      }

      // Check for wildcards
      const hasWildcard = findText.includes('*') || findText.includes('?');
      const startIdx = startPos - 1;
      const haystack = withinText.slice(startIdx);

      if (!hasWildcard) {
        const idx = haystack.toUpperCase().indexOf(findText.toUpperCase());
        if (idx === -1) return FormulaError.VALUE;
        return startPos + idx;
      }

      // Search using sliding window matching
      for (let i = 0; i <= haystack.length; i++) {
        for (let j = i; j <= haystack.length; j++) {
          const sub = haystack.slice(i, j);
          if (matchWildcard(sub, findText)) {
            return startPos + i;
          }
        }
      }

      return FormulaError.VALUE;
    }
  },

  // 16. EXACT
  {
    name: 'EXACT',
    category: 'Text',
    description: 'Checks whether two text strings are exactly identical (case-sensitive). Returns TRUE or FALSE.',
    minArgs: 2,
    maxArgs: 2,
    returnType: 'boolean',
    args: [
      { name: 'text1', description: 'The first text string.', type: 'string' },
      { name: 'text2', description: 'The second text string.', type: 'string' }
    ],
    examples: ['=EXACT("word", "word")', '=EXACT("word", "Word")'],
    handler: (args, context, evaluate) => {
      const t1 = evaluate(args[0]!, context);
      if (isFormulaError(t1)) return t1;
      const t2 = evaluate(args[1]!, context);
      if (isFormulaError(t2)) return t2;

      return coerceString(t1) === coerceString(t2);
    }
  },

  // 17. REPT
  {
    name: 'REPT',
    category: 'Text',
    description: 'Repeats text a given number of times.',
    minArgs: 2,
    maxArgs: 2,
    returnType: 'string',
    args: [
      { name: 'text', description: 'The text you want to repeat.', type: 'string' },
      { name: 'number_times', description: 'A positive number specifying the number of times to repeat text.', type: 'number' }
    ],
    examples: ['=REPT("*-", 3)', '=REPT("Q", 5)'],
    handler: (args, context, evaluate) => {
      const textEval = evaluate(args[0]!, context);
      if (isFormulaError(textEval)) return textEval;
      const str = coerceString(textEval);

      const numEval = evaluate(args[1]!, context);
      if (isFormulaError(numEval)) return numEval;
      const { num, error } = coerceNumber(numEval);
      if (error || num < 0) return FormulaError.VALUE;

      const count = Math.trunc(num);
      if (count > 32767) return FormulaError.VALUE; // Excel max string length constraint
      return str.repeat(count);
    }
  },

  // 18. CLEAN
  {
    name: 'CLEAN',
    category: 'Text',
    description: 'Removes all non-printable ASCII control characters (values 0-31) from text.',
    minArgs: 1,
    maxArgs: 1,
    returnType: 'string',
    args: [{ name: 'text', description: 'Any worksheet information from which you want to remove nonprintable characters.', type: 'string' }],
    examples: ['=CLEAN(A1)'],
    handler: (args, context, evaluate) => {
      const textEval = evaluate(args[0]!, context);
      if (isFormulaError(textEval)) return textEval;
      const str = coerceString(textEval);
      // Remove characters in ASCII range 0-31
      // eslint-disable-next-line no-control-regex
      return str.replace(/[\x00-\x1F]/g, '');
    }
  },

  // 19. TEXT
  {
    name: 'TEXT',
    category: 'Text',
    description: 'Formats a number and converts it to text.',
    minArgs: 2,
    maxArgs: 2,
    returnType: 'string',
    args: [
      { name: 'value', description: 'A numeric value, a formula that evaluates to a numeric value, or a reference to a cell containing a numeric value.', type: 'any' },
      { name: 'format_text', description: 'A numeric format as a text string enclosed in quotation marks.', type: 'string' }
    ],
    examples: ['=TEXT(1234.567, "$#,##0.00")', '=TEXT(TODAY(), "YYYY-MM-DD")'],
    handler: (args, context, evaluate) => {
      const val = evaluate(args[0]!, context);
      if (isFormulaError(val)) return val;

      const fmtVal = evaluate(args[1]!, context);
      if (isFormulaError(fmtVal)) return fmtVal;
      const fmtStr = coerceString(fmtVal);

      return numberFormatter.format(val, fmtStr);
    }
  },

  // 20. VALUE
  {
    name: 'VALUE',
    category: 'Text',
    description: 'Converts a text string that represents a number to a number.',
    minArgs: 1,
    maxArgs: 1,
    returnType: 'number',
    args: [
      { name: 'text', description: 'The text enclosed in quotation marks or a reference to a cell containing the text you want to convert.', type: 'string' }
    ],
    examples: ['=VALUE("$1,000")', '=VALUE("16:00:00") - VALUE("12:00:00")'],
    handler: (args, context, evaluate) => {
      const textEval = evaluate(args[0]!, context);
      if (isFormulaError(textEval)) return textEval;
      if (typeof textEval === 'number') return textEval;

      const raw = coerceString(textEval).trim();
      if (raw === '') return 0;

      // Check percentage
      if (raw.endsWith('%')) {
        const withoutPct = raw.slice(0, -1).replace(/[$€£¥,]/g, '').trim();
        const num = Number(withoutPct);
        if (Number.isNaN(num) || !Number.isFinite(num)) return FormulaError.VALUE;
        return num / 100;
      }

      // Clean currency symbols and commas
      const clean = raw.replace(/[$€£¥]/g, '').replace(/,/g, '').trim();
      const num = Number(clean);
      if (Number.isNaN(num) || !Number.isFinite(num)) {
        return FormulaError.VALUE;
      }
      return num;
    }
  },

  // 21. TEXTSPLIT
  {
    name: 'TEXTSPLIT',
    category: 'Text',
    description: 'Splits text strings by using column and row delimiters.',
    minArgs: 1,
    maxArgs: 6,
    returnType: 'any',
    args: [
      { name: 'text', description: 'The text you want to split.', type: 'string' },
      { name: 'col_delimiter', description: 'The text that marks the point where to spill text across columns.', type: 'any', optional: true },
      { name: 'row_delimiter', description: 'The text that marks the point where to spill text down rows.', type: 'any', optional: true },
      { name: 'ignore_empty', description: 'Specify TRUE to ignore consecutive delimiters. Defaults to FALSE.', type: 'boolean', optional: true, defaultValue: 'FALSE' },
      { name: 'match_mode', description: 'Specify 1 to perform a case-insensitive match. Defaults to 0 for case-sensitive.', type: 'number', optional: true, defaultValue: '0' },
      { name: 'pad_with', description: 'The value with which to pad the result. Defaults to #N/A.', type: 'any', optional: true, defaultValue: '#N/A' }
    ],
    examples: ['=TEXTSPLIT("A,B,C", ",")', '=TEXTSPLIT(A1, " ", ";")'],
    handler: (args, context, evaluate) => {
      const textEval = evaluate(args[0]!, context);
      if (isFormulaError(textEval)) return textEval;
      const text = coerceString(textEval);

      function extractDelimiters(argNode?: ASTNode): string[] {
        if (!argNode || argNode.type === 'Empty') return [];
        const flat = resolveTo1DArray(argNode, context, evaluate);
        if (typeof flat === 'string') return [flat];
        return flat
          .filter((v): v is CellValue => v !== null && v !== undefined && !isFormulaError(v))
          .map((v) => coerceString(v))
          .filter((s) => s.length > 0);
      }

      const colDelims = args.length >= 2 ? extractDelimiters(args[1]) : [];
      const rowDelims = args.length >= 3 ? extractDelimiters(args[2]) : [];

      if (colDelims.length === 0 && rowDelims.length === 0) {
        return FormulaError.VALUE;
      }

      let ignoreEmpty = false;
      if (args.length >= 4 && args[3]!.type !== 'Empty') {
        const ignEval = evaluate(args[3]!, context);
        if (isFormulaError(ignEval)) return ignEval;
        ignoreEmpty = coerceBoolean(ignEval);
      }

      let matchMode = 0;
      if (args.length >= 5 && args[4]!.type !== 'Empty') {
        const mmEval = evaluate(args[4]!, context);
        if (isFormulaError(mmEval)) return mmEval;
        const { num } = coerceNumber(mmEval);
        matchMode = Math.trunc(num);
      }

      let padWith: CellValue = FormulaError.NA;
      if (args.length >= 6 && args[5]!.type !== 'Empty') {
        padWith = evaluate(args[5]!, context);
      }

      function buildSplitRegex(delims: string[]): RegExp {
        const escaped = delims
          .map((d) => d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
          .sort((a, b) => b.length - a.length);
        return new RegExp(escaped.join('|'), matchMode === 1 ? 'i' : '');
      }

      // 1. Split into rows
      let rows: string[] = [text];
      if (rowDelims.length > 0) {
        const rowRegex = buildSplitRegex(rowDelims);
        rows = text.split(rowRegex);
        if (ignoreEmpty) {
          rows = rows.filter((r) => r !== '');
        }
      }

      // 2. Split each row into columns
      const grid: string[][] = [];
      if (colDelims.length > 0) {
        const colRegex = buildSplitRegex(colDelims);
        for (const row of rows) {
          let cols = row.split(colRegex);
          if (ignoreEmpty) {
            cols = cols.filter((c) => c !== '');
          }
          grid.push(cols);
        }
      } else {
        for (const r of rows) {
          grid.push([r]);
        }
      }

      if (grid.length === 0 || grid.every((r) => r.length === 0)) {
        return FormulaError.NA;
      }

      // Pad jagged rows
      const maxCols = Math.max(...grid.map((r) => r.length));
      for (const row of grid) {
        while (row.length < maxCols) {
          row.push(String(padWith));
        }
      }

      return grid;
    }
  }
];
