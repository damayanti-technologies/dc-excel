import { describe, it, expect } from 'vitest';
import { DataValidationRule } from '@/types/data-tools';
import { validateCellValue, getValidationRuleForCell } from '@/engine/data-tools/validation';

describe('Data Tools: Validation Engine', () => {
  it('validates whole number between bounds', () => {
    const rule: DataValidationRule = {
      id: 'v1',
      range: { startRow: 0, startCol: 0, endRow: 10, endCol: 0 },
      type: 'whole_number',
      operator: 'between',
      val1: '1',
      val2: '10'
    };

    expect(validateCellValue(5, rule).isValid).toBe(true);
    expect(validateCellValue(1, rule).isValid).toBe(true);
    expect(validateCellValue(10, rule).isValid).toBe(true);
    expect(validateCellValue(15, rule).isValid).toBe(false);
    expect(validateCellValue(4.5, rule).isValid).toBe(false); // Decimal is invalid for whole_number
    expect(validateCellValue('text', rule).isValid).toBe(false);
  });

  it('validates list options (dropdown list)', () => {
    const rule: DataValidationRule = {
      id: 'v2',
      range: { startRow: 0, startCol: 0, endRow: 10, endCol: 0 },
      type: 'list',
      listValues: ['Red', 'Green', 'Blue']
    };

    expect(validateCellValue('Red', rule).isValid).toBe(true);
    expect(validateCellValue('green', rule).isValid).toBe(true); // Case-insensitive
    expect(validateCellValue('Yellow', rule).isValid).toBe(false);
  });

  it('validates text length', () => {
    const rule: DataValidationRule = {
      id: 'v3',
      range: { startRow: 0, startCol: 0, endRow: 10, endCol: 0 },
      type: 'text_length',
      operator: 'less_or_equal',
      val1: '5'
    };

    expect(validateCellValue('Hello', rule).isValid).toBe(true);
    expect(validateCellValue('Hi', rule).isValid).toBe(true);
    expect(validateCellValue('TooLongText', rule).isValid).toBe(false);
  });

  it('allows blanks when allowBlank is true', () => {
    const rule: DataValidationRule = {
      id: 'v4',
      range: { startRow: 0, startCol: 0, endRow: 10, endCol: 0 },
      type: 'whole_number',
      operator: 'greater_than',
      val1: '0',
      allowBlank: true
    };

    expect(validateCellValue(null, rule).isValid).toBe(true);
    expect(validateCellValue('', rule).isValid).toBe(true);
  });

  it('matches correct validation rule for cell coordinate', () => {
    const rules: DataValidationRule[] = [
      {
        id: 'r1',
        range: { startRow: 1, startCol: 1, endRow: 5, endCol: 2 },
        type: 'whole_number'
      },
      {
        id: 'r2',
        range: { startRow: 6, startCol: 1, endRow: 10, endCol: 2 },
        type: 'list'
      }
    ];

    expect(getValidationRuleForCell(rules, 3, 2)?.id).toBe('r1');
    expect(getValidationRuleForCell(rules, 8, 1)?.id).toBe('r2');
    expect(getValidationRuleForCell(rules, 0, 0)).toBeNull();
  });
});
