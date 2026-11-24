import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { calculationEngine } from '@/engine/calculation/engine';
import { setMockClock } from '@/engine/calculation/date-utils';
import { Cell } from '@/types/cell';

describe('Date & Time Functions', () => {
  beforeEach(() => {
    // Set deterministic clock to 2026-06-15 14:30:45 UTC
    setMockClock(() => new Date(Date.UTC(2026, 5, 15, 14, 30, 45)));
  });

  afterEach(() => {
    setMockClock(null);
  });

  it('evaluates DATE, YEAR, MONTH, and DAY', () => {
    const emptyCells: Record<string, Cell> = {};
    // 2026-06-15
    const serialDate = calculationEngine.evaluateFormula('=DATE(2026, 6, 15)', emptyCells);
    expect(typeof serialDate).toBe('number');

    const cellWithDate: Record<string, Cell> = {
      '0:0': { value: serialDate, dataType: 'number' }
    };
    expect(calculationEngine.evaluateFormula('=YEAR(A1)', cellWithDate)).toBe(2026);
    expect(calculationEngine.evaluateFormula('=MONTH(A1)', cellWithDate)).toBe(6);
    expect(calculationEngine.evaluateFormula('=DAY(A1)', cellWithDate)).toBe(15);
  });

  it('evaluates HOUR, MINUTE, and SECOND', () => {
    // 14:30:45 is serial fraction (14*3600 + 30*60 + 45)/86400 = 52245 / 86400
    const emptyCells: Record<string, Cell> = {};
    const nowSerial = calculationEngine.evaluateFormula('=NOW()', emptyCells);

    const cellWithNow: Record<string, Cell> = {
      '0:0': { value: nowSerial, dataType: 'number' }
    };
    expect(calculationEngine.evaluateFormula('=HOUR(A1)', cellWithNow)).toBe(14);
    expect(calculationEngine.evaluateFormula('=MINUTE(A1)', cellWithNow)).toBe(30);
    expect(calculationEngine.evaluateFormula('=SECOND(A1)', cellWithNow)).toBe(45);
  });

  it('evaluates TODAY and NOW', () => {
    const emptyCells: Record<string, Cell> = {};
    const todaySerial = calculationEngine.evaluateFormula('=TODAY()', emptyCells);
    const nowSerial = calculationEngine.evaluateFormula('=NOW()', emptyCells);

    expect(typeof todaySerial).toBe('number');
    expect(typeof nowSerial).toBe('number');
    // TODAY has no fraction
    expect(Number.isInteger(todaySerial)).toBe(true);
    // NOW exceeds TODAY by the fractional time of day
    expect((nowSerial as number) - (todaySerial as number)).toBeGreaterThan(0);
  });

  it('evaluates DATEDIF across years, months, and days', () => {
    const cells: Record<string, Cell> = {
      '0:0': { value: '2020-01-15', dataType: 'string' },
      '1:0': { value: '2023-07-20', dataType: 'string' }
    };
    expect(calculationEngine.evaluateFormula('=DATEDIF(A1, A2, "Y")', cells)).toBe(3);
    expect(calculationEngine.evaluateFormula('=DATEDIF(A1, A2, "M")', cells)).toBe(42);
    expect(calculationEngine.evaluateFormula('=DATEDIF(A1, A2, "YM")', cells)).toBe(6);
  });

  it('evaluates EDATE and EOMONTH', () => {
    const cells: Record<string, Cell> = {
      '0:0': { value: '2024-01-31', dataType: 'string' }
    };
    // EDATE + 1 month from Jan 31 -> Feb 29 (leap year 2024)
    const edateSerial = calculationEngine.evaluateFormula('=EDATE(A1, 1)', cells);
    const edateCell: Record<string, Cell> = { '0:0': { value: edateSerial, dataType: 'number' } };
    expect(calculationEngine.evaluateFormula('=DAY(A1)', edateCell)).toBe(29);
    expect(calculationEngine.evaluateFormula('=MONTH(A1)', edateCell)).toBe(2);

    // EOMONTH + 1 month from Jan 31 -> Feb 29 2024
    const eomonthSerial = calculationEngine.evaluateFormula('=EOMONTH(A1, 1)', cells);
    const eomonthCell: Record<string, Cell> = { '0:0': { value: eomonthSerial, dataType: 'number' } };
    expect(calculationEngine.evaluateFormula('=DAY(A1)', eomonthCell)).toBe(29);
  });

  it('evaluates WEEKDAY, WEEKNUM, and DAYS', () => {
    // 2026-06-15 is a Monday
    const cells: Record<string, Cell> = {
      '0:0': { value: '2026-06-15', dataType: 'string' },
      '1:0': { value: '2026-06-20', dataType: 'string' }
    };
    // Default WEEKDAY returns 1 (Sun) to 7 (Sat), so Monday = 2
    expect(calculationEngine.evaluateFormula('=WEEKDAY(A1)', cells)).toBe(2);
    // WEEKDAY return_type 2 returns 1 (Mon) to 7 (Sun), so Monday = 1
    expect(calculationEngine.evaluateFormula('=WEEKDAY(A1, 2)', cells)).toBe(1);

    expect(calculationEngine.evaluateFormula('=DAYS(A2, A1)', cells)).toBe(5);
  });

  it('evaluates NETWORKDAYS and WORKDAY', () => {
    // Mon June 15 2026 to Fri June 19 2026 = 5 work days
    const cells: Record<string, Cell> = {
      '0:0': { value: '2026-06-15', dataType: 'string' },
      '1:0': { value: '2026-06-19', dataType: 'string' },
      '2:0': { value: '2026-06-17', dataType: 'string' } // Holiday on Wednesday
    };

    expect(calculationEngine.evaluateFormula('=NETWORKDAYS(A1, A2)', cells)).toBe(5);
    // With holiday
    expect(calculationEngine.evaluateFormula('=NETWORKDAYS(A1, A2, A3)', cells)).toBe(4);

    // WORKDAY 5 days from Monday June 15 -> Monday June 22
    const workdaySerial = calculationEngine.evaluateFormula('=WORKDAY(A1, 5)', cells);
    const workdayCell: Record<string, Cell> = { '0:0': { value: workdaySerial, dataType: 'number' } };
    expect(calculationEngine.evaluateFormula('=DAY(A1)', workdayCell)).toBe(22);
  });
});
