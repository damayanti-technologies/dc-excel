import { FunctionDefinition } from '../types';
import { FormulaError, isFormulaError } from '../errors';
import {
  dateToSerial,
  serialToDate,
  parseDateOrSerial,
  getCurrentClock,
  datedif,
  edate,
  eomonth,
  weekday,
  weeknum,
  networkdays,
  workday
} from '../date-utils';
import { coerceNumber, coerceString, resolveTo1DArray } from './helpers';

export const datetimeFunctions: FunctionDefinition[] = [
  // 1. TODAY
  {
    name: 'TODAY',
    category: 'Date & Time',
    description: 'Returns the serial number of the current date.',
    minArgs: 0,
    maxArgs: 0,
    returnType: 'number',
    args: [],
    examples: ['=TODAY()'],
    handler: () => {
      const d = getCurrentClock();
      return Math.floor(dateToSerial(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()));
    }
  },

  // 2. NOW
  {
    name: 'NOW',
    category: 'Date & Time',
    description: 'Returns the serial number of the current date and time.',
    minArgs: 0,
    maxArgs: 0,
    returnType: 'number',
    args: [],
    examples: ['=NOW()'],
    handler: () => {
      const d = getCurrentClock();
      return dateToSerial(
        d.getUTCFullYear(),
        d.getUTCMonth() + 1,
        d.getUTCDate(),
        d.getUTCHours(),
        d.getUTCMinutes(),
        d.getUTCSeconds()
      );
    }
  },

  // 3. DATE
  {
    name: 'DATE',
    category: 'Date & Time',
    description: 'Returns the sequential serial number that represents a particular date.',
    minArgs: 3,
    maxArgs: 3,
    returnType: 'number',
    args: [
      { name: 'year', description: 'The year of the date (e.g. 2026).', type: 'number' },
      { name: 'month', description: 'The month of the date (1 to 12).', type: 'number' },
      { name: 'day', description: 'The day of the date (1 to 31).', type: 'number' }
    ],
    examples: ['=DATE(2026, 11, 24)', '=DATE(2026, 1, 1)'],
    handler: (args, context, evaluate) => {
      const yEval = evaluate(args[0]!, context);
      if (isFormulaError(yEval)) return yEval;
      const { num: year, error: yErr } = coerceNumber(yEval);
      if (yErr) return FormulaError.VALUE;

      const mEval = evaluate(args[1]!, context);
      if (isFormulaError(mEval)) return mEval;
      const { num: month, error: mErr } = coerceNumber(mEval);
      if (mErr) return FormulaError.VALUE;

      const dEval = evaluate(args[2]!, context);
      if (isFormulaError(dEval)) return dEval;
      const { num: day, error: dErr } = coerceNumber(dEval);
      if (dErr) return FormulaError.VALUE;

      return Math.floor(dateToSerial(Math.trunc(year), Math.trunc(month), Math.trunc(day)));
    }
  },

  // 4. YEAR
  {
    name: 'YEAR',
    category: 'Date & Time',
    description: 'Returns the year corresponding to a date. The year is given as an integer in the range 1900-9999.',
    minArgs: 1,
    maxArgs: 1,
    returnType: 'number',
    args: [{ name: 'serial_number', description: 'The date from which you want to return the year.', type: 'any' }],
    examples: ['=YEAR(A1)', '=YEAR(TODAY())'],
    handler: (args, context, evaluate) => {
      const val = evaluate(args[0]!, context);
      if (isFormulaError(val)) return val;
      const serial = parseDateOrSerial(val);
      if (serial === null) return FormulaError.VALUE;
      return serialToDate(serial).year;
    }
  },

  // 5. MONTH
  {
    name: 'MONTH',
    category: 'Date & Time',
    description: 'Returns the month of a date represented by a serial number (1 to 12).',
    minArgs: 1,
    maxArgs: 1,
    returnType: 'number',
    args: [{ name: 'serial_number', description: 'The date of the month you want to find.', type: 'any' }],
    examples: ['=MONTH(TODAY())', '=MONTH("2026-11-24")'],
    handler: (args, context, evaluate) => {
      const val = evaluate(args[0]!, context);
      if (isFormulaError(val)) return val;
      const serial = parseDateOrSerial(val);
      if (serial === null) return FormulaError.VALUE;
      return serialToDate(serial).month;
    }
  },

  // 6. DAY
  {
    name: 'DAY',
    category: 'Date & Time',
    description: 'Returns the day of the month, a number from 1 to 31.',
    minArgs: 1,
    maxArgs: 1,
    returnType: 'number',
    args: [{ name: 'serial_number', description: 'The date of the day you want to find.', type: 'any' }],
    examples: ['=DAY(TODAY())', '=DAY(DATE(2026, 11, 24))'],
    handler: (args, context, evaluate) => {
      const val = evaluate(args[0]!, context);
      if (isFormulaError(val)) return val;
      const serial = parseDateOrSerial(val);
      if (serial === null) return FormulaError.VALUE;
      return serialToDate(serial).day;
    }
  },

  // 7. HOUR
  {
    name: 'HOUR',
    category: 'Date & Time',
    description: 'Returns the hour as an integer from 0 (12:00 A.M.) to 23 (11:00 P.M.).',
    minArgs: 1,
    maxArgs: 1,
    returnType: 'number',
    args: [{ name: 'serial_number', description: 'The time that contains the hour you want to find.', type: 'any' }],
    examples: ['=HOUR(NOW())'],
    handler: (args, context, evaluate) => {
      const val = evaluate(args[0]!, context);
      if (isFormulaError(val)) return val;
      const serial = parseDateOrSerial(val);
      if (serial === null) return FormulaError.VALUE;
      return serialToDate(serial).hour;
    }
  },

  // 8. MINUTE
  {
    name: 'MINUTE',
    category: 'Date & Time',
    description: 'Returns the minute as an integer from 0 to 59.',
    minArgs: 1,
    maxArgs: 1,
    returnType: 'number',
    args: [{ name: 'serial_number', description: 'The time that contains the minute you want to find.', type: 'any' }],
    examples: ['=MINUTE(NOW())'],
    handler: (args, context, evaluate) => {
      const val = evaluate(args[0]!, context);
      if (isFormulaError(val)) return val;
      const serial = parseDateOrSerial(val);
      if (serial === null) return FormulaError.VALUE;
      return serialToDate(serial).minute;
    }
  },

  // 9. SECOND
  {
    name: 'SECOND',
    category: 'Date & Time',
    description: 'Returns the second as an integer from 0 to 59.',
    minArgs: 1,
    maxArgs: 1,
    returnType: 'number',
    args: [{ name: 'serial_number', description: 'The time that contains the second you want to find.', type: 'any' }],
    examples: ['=SECOND(NOW())'],
    handler: (args, context, evaluate) => {
      const val = evaluate(args[0]!, context);
      if (isFormulaError(val)) return val;
      const serial = parseDateOrSerial(val);
      if (serial === null) return FormulaError.VALUE;
      return serialToDate(serial).second;
    }
  },

  // 10. DATEDIF
  {
    name: 'DATEDIF',
    category: 'Date & Time',
    description: 'Calculates the number of days, months, or years between two dates.',
    minArgs: 3,
    maxArgs: 3,
    returnType: 'number',
    args: [
      { name: 'start_date', description: 'A date that represents the first, or starting, date.', type: 'any' },
      { name: 'end_date', description: 'A date that represents the second, or ending, date.', type: 'any' },
      { name: 'unit', description: 'The type of information to return ("Y", "M", "D", "YM", "YD", "MD").', type: 'string' }
    ],
    examples: ['=DATEDIF(DATE(2020, 1, 1), DATE(2026, 1, 1), "Y")', '=DATEDIF(A1, B1, "M")'],
    handler: (args, context, evaluate) => {
      const sVal = evaluate(args[0]!, context);
      if (isFormulaError(sVal)) return sVal;
      const sSerial = parseDateOrSerial(sVal);
      if (sSerial === null) return FormulaError.VALUE;

      const eVal = evaluate(args[1]!, context);
      if (isFormulaError(eVal)) return eVal;
      const eSerial = parseDateOrSerial(eVal);
      if (eSerial === null) return FormulaError.VALUE;

      const uVal = evaluate(args[2]!, context);
      if (isFormulaError(uVal)) return uVal;
      const unit = coerceString(uVal);

      return datedif(sSerial, eSerial, unit);
    }
  },

  // 11. EDATE
  {
    name: 'EDATE',
    category: 'Date & Time',
    description: 'Returns the serial number of the date that is the indicated number of months before or after start_date.',
    minArgs: 2,
    maxArgs: 2,
    returnType: 'number',
    args: [
      { name: 'start_date', description: 'A date that represents the start date.', type: 'any' },
      { name: 'months', description: 'The number of months before (negative) or after (positive) start_date.', type: 'number' }
    ],
    examples: ['=EDATE(DATE(2026, 1, 15), 3)', '=EDATE(A1, -1)'],
    handler: (args, context, evaluate) => {
      const sVal = evaluate(args[0]!, context);
      if (isFormulaError(sVal)) return sVal;
      const sSerial = parseDateOrSerial(sVal);
      if (sSerial === null) return FormulaError.VALUE;

      const mVal = evaluate(args[1]!, context);
      if (isFormulaError(mVal)) return mVal;
      const { num: months, error } = coerceNumber(mVal);
      if (error) return FormulaError.VALUE;

      return edate(sSerial, months);
    }
  },

  // 12. EOMONTH
  {
    name: 'EOMONTH',
    category: 'Date & Time',
    description: 'Returns the serial number of the last day of the month before or after a specified number of months.',
    minArgs: 2,
    maxArgs: 2,
    returnType: 'number',
    args: [
      { name: 'start_date', description: 'A date that represents the start date.', type: 'any' },
      { name: 'months', description: 'The number of months before or after start_date.', type: 'number' }
    ],
    examples: ['=EOMONTH(DATE(2026, 1, 1), 1)', '=EOMONTH(A1, 0)'],
    handler: (args, context, evaluate) => {
      const sVal = evaluate(args[0]!, context);
      if (isFormulaError(sVal)) return sVal;
      const sSerial = parseDateOrSerial(sVal);
      if (sSerial === null) return FormulaError.VALUE;

      const mVal = evaluate(args[1]!, context);
      if (isFormulaError(mVal)) return mVal;
      const { num: months, error } = coerceNumber(mVal);
      if (error) return FormulaError.VALUE;

      return eomonth(sSerial, months);
    }
  },

  // 13. WEEKDAY
  {
    name: 'WEEKDAY',
    category: 'Date & Time',
    description: 'Returns the day of the week corresponding to a date (1 to 7 by default).',
    minArgs: 1,
    maxArgs: 2,
    returnType: 'number',
    args: [
      { name: 'serial_number', description: 'A sequential number that represents the date.', type: 'any' },
      { name: 'return_type', description: '1 = Sun-Sat (1-7), 2 = Mon-Sun (1-7), 3 = Mon-Sun (0-6). Defaults to 1.', type: 'number', optional: true, defaultValue: '1' }
    ],
    examples: ['=WEEKDAY(TODAY())', '=WEEKDAY(DATE(2026, 11, 24), 2)'],
    handler: (args, context, evaluate) => {
      const val = evaluate(args[0]!, context);
      if (isFormulaError(val)) return val;
      const serial = parseDateOrSerial(val);
      if (serial === null) return FormulaError.VALUE;

      let returnType = 1;
      if (args.length >= 2 && args[1]!.type !== 'Empty') {
        const rtVal = evaluate(args[1]!, context);
        if (isFormulaError(rtVal)) return rtVal;
        const { num, error } = coerceNumber(rtVal);
        if (error) return FormulaError.VALUE;
        returnType = Math.trunc(num);
      }

      return weekday(serial, returnType);
    }
  },

  // 14. WEEKNUM
  {
    name: 'WEEKNUM',
    category: 'Date & Time',
    description: 'Returns the week number of a specific date in the year (1 to 54).',
    minArgs: 1,
    maxArgs: 2,
    returnType: 'number',
    args: [
      { name: 'serial_number', description: 'A sequential number that represents the date.', type: 'any' },
      { name: 'return_type', description: '1 = Week starts Sunday, 2 = Week starts Monday. Defaults to 1.', type: 'number', optional: true, defaultValue: '1' }
    ],
    examples: ['=WEEKNUM(DATE(2026, 11, 24))', '=WEEKNUM(A1, 2)'],
    handler: (args, context, evaluate) => {
      const val = evaluate(args[0]!, context);
      if (isFormulaError(val)) return val;
      const serial = parseDateOrSerial(val);
      if (serial === null) return FormulaError.VALUE;

      let returnType = 1;
      if (args.length >= 2 && args[1]!.type !== 'Empty') {
        const rtVal = evaluate(args[1]!, context);
        if (isFormulaError(rtVal)) return rtVal;
        const { num, error } = coerceNumber(rtVal);
        if (error) return FormulaError.VALUE;
        returnType = Math.trunc(num);
      }

      return weeknum(serial, returnType);
    }
  },

  // 15. DAYS
  {
    name: 'DAYS',
    category: 'Date & Time',
    description: 'Returns the number of days between two dates.',
    minArgs: 2,
    maxArgs: 2,
    returnType: 'number',
    args: [
      { name: 'end_date', description: 'The end date of the period.', type: 'any' },
      { name: 'start_date', description: 'The start date of the period.', type: 'any' }
    ],
    examples: ['=DAYS(DATE(2026, 12, 31), DATE(2026, 1, 1))', '=DAYS(A2, A1)'],
    handler: (args, context, evaluate) => {
      const eVal = evaluate(args[0]!, context);
      if (isFormulaError(eVal)) return eVal;
      const eSerial = parseDateOrSerial(eVal);
      if (eSerial === null) return FormulaError.VALUE;

      const sVal = evaluate(args[1]!, context);
      if (isFormulaError(sVal)) return sVal;
      const sSerial = parseDateOrSerial(sVal);
      if (sSerial === null) return FormulaError.VALUE;

      return Math.floor(eSerial) - Math.floor(sSerial);
    }
  },

  // 16. NETWORKDAYS
  {
    name: 'NETWORKDAYS',
    category: 'Date & Time',
    description: 'Returns the number of whole working days between start_date and end_date (inclusive), excluding weekends and holidays.',
    minArgs: 2,
    maxArgs: 3,
    returnType: 'number',
    args: [
      { name: 'start_date', description: 'The start date.', type: 'any' },
      { name: 'end_date', description: 'The end date.', type: 'any' },
      { name: 'holidays', description: 'An optional range or array of one or more dates to exclude.', type: 'array', optional: true }
    ],
    examples: ['=NETWORKDAYS(DATE(2026, 11, 1), DATE(2026, 11, 30))', '=NETWORKDAYS(A1, B1, C1:C5)'],
    handler: (args, context, evaluate) => {
      const sVal = evaluate(args[0]!, context);
      if (isFormulaError(sVal)) return sVal;
      const sSerial = parseDateOrSerial(sVal);
      if (sSerial === null) return FormulaError.VALUE;

      const eVal = evaluate(args[1]!, context);
      if (isFormulaError(eVal)) return eVal;
      const eSerial = parseDateOrSerial(eVal);
      if (eSerial === null) return FormulaError.VALUE;

      const holidaySerials: number[] = [];
      if (args.length >= 3 && args[2]!.type !== 'Empty') {
        const flat = resolveTo1DArray(args[2]!, context, evaluate);
        if (typeof flat === 'string') return flat;
        for (const h of flat) {
          const parsed = parseDateOrSerial(h);
          if (parsed !== null) holidaySerials.push(parsed);
        }
      }

      return networkdays(sSerial, eSerial, holidaySerials);
    }
  },

  // 17. WORKDAY
  {
    name: 'WORKDAY',
    category: 'Date & Time',
    description: 'Returns a date that is the indicated number of working days before or after start_date, skipping weekends and holidays.',
    minArgs: 2,
    maxArgs: 3,
    returnType: 'number',
    args: [
      { name: 'start_date', description: 'The start date.', type: 'any' },
      { name: 'days', description: 'The number of nonweekend and nonholiday days before or after start_date.', type: 'number' },
      { name: 'holidays', description: 'An optional range or array of dates to exclude.', type: 'array', optional: true }
    ],
    examples: ['=WORKDAY(DATE(2026, 11, 24), 5)', '=WORKDAY(A1, 10, B1:B3)'],
    handler: (args, context, evaluate) => {
      const sVal = evaluate(args[0]!, context);
      if (isFormulaError(sVal)) return sVal;
      const sSerial = parseDateOrSerial(sVal);
      if (sSerial === null) return FormulaError.VALUE;

      const dVal = evaluate(args[1]!, context);
      if (isFormulaError(dVal)) return dVal;
      const { num: days, error } = coerceNumber(dVal);
      if (error) return FormulaError.VALUE;

      const holidaySerials: number[] = [];
      if (args.length >= 3 && args[2]!.type !== 'Empty') {
        const flat = resolveTo1DArray(args[2]!, context, evaluate);
        if (typeof flat === 'string') return flat;
        for (const h of flat) {
          const parsed = parseDateOrSerial(h);
          if (parsed !== null) holidaySerials.push(parsed);
        }
      }

      return workday(sSerial, days, holidaySerials);
    }
  }
];
