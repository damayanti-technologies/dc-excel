import { DataValidationRule, ValidationOperator } from '@/types/data-tools';
import { CellValue } from '@/types/cell';

/**
 * Checks numerical comparison conditions for data validation.
 */
function evaluateNumericOperator(
  val: number,
  op: ValidationOperator = 'between',
  val1Str = '0',
  val2Str = '0'
): boolean {
  const v1 = Number(val1Str);
  const v2 = Number(val2Str);

  switch (op) {
    case 'between':
      return val >= Math.min(v1, v2) && val <= Math.max(v1, v2);
    case 'not_between':
      return val < Math.min(v1, v2) || val > Math.max(v1, v2);
    case 'equal':
      return val === v1;
    case 'not_equal':
      return val !== v1;
    case 'greater_than':
      return val > v1;
    case 'less_than':
      return val < v1;
    case 'greater_or_equal':
      return val >= v1;
    case 'less_or_equal':
      return val <= v1;
    default:
      return true;
  }
}

/**
 * Validates a cell value against a configured DataValidationRule.
 */
export function validateCellValue(
  value: CellValue,
  rule: DataValidationRule
): { isValid: boolean; error?: string } {
  const isBlank = value === null || value === undefined || value === '';
  if (isBlank) {
    if (rule.allowBlank !== false) {
      return { isValid: true };
    }
    return {
      isValid: false,
      error: rule.errorMessage || 'This cell cannot be blank.'
    };
  }

  const strVal = String(value).trim();
  const numVal = Number(value);
  const isNumeric = !Number.isNaN(numVal);

  switch (rule.type) {
    case 'whole_number': {
      if (!isNumeric || !Number.isInteger(numVal)) {
        return {
          isValid: false,
          error: rule.errorMessage || 'Value must be a whole integer.'
        };
      }
      const ok = evaluateNumericOperator(numVal, rule.operator, rule.val1, rule.val2);
      return {
        isValid: ok,
        error: ok ? undefined : rule.errorMessage || `Value must satisfy condition (${rule.operator}).`
      };
    }

    case 'decimal': {
      if (!isNumeric) {
        return {
          isValid: false,
          error: rule.errorMessage || 'Value must be a valid number.'
        };
      }
      const ok = evaluateNumericOperator(numVal, rule.operator, rule.val1, rule.val2);
      return {
        isValid: ok,
        error: ok ? undefined : rule.errorMessage || `Value must satisfy condition (${rule.operator}).`
      };
    }

    case 'list': {
      // Items can come from listValues array or comma-separated val1 string
      let items: string[] = rule.listValues || [];
      if (items.length === 0 && rule.val1) {
        items = rule.val1.split(',').map((s) => s.trim());
      }
      const matches = items.some((item) => item.toLowerCase() === strVal.toLowerCase());
      return {
        isValid: matches,
        error: matches
          ? undefined
          : rule.errorMessage || `Value must be chosen from the dropdown list (${items.join(', ')}).`
      };
    }

    case 'date': {
      const parsedTime = Date.parse(strVal);
      if (Number.isNaN(parsedTime) && !(value instanceof Date)) {
        return {
          isValid: false,
          error: rule.errorMessage || 'Value must be a valid date.'
        };
      }
      const actualTime = value instanceof Date ? value.getTime() : parsedTime;
      const targetTime1 = rule.val1 ? Date.parse(rule.val1) : NaN;
      const targetTime2 = rule.val2 ? Date.parse(rule.val2) : NaN;

      if (!Number.isNaN(targetTime1)) {
        const ok = evaluateNumericOperator(
          actualTime,
          rule.operator,
          String(targetTime1),
          String(targetTime2)
        );
        return {
          isValid: ok,
          error: ok ? undefined : rule.errorMessage || 'Date does not satisfy range condition.'
        };
      }
      return { isValid: true };
    }

    case 'text_length': {
      const len = strVal.length;
      const ok = evaluateNumericOperator(len, rule.operator, rule.val1, rule.val2);
      return {
        isValid: ok,
        error: ok ? undefined : rule.errorMessage || `Text length (${len}) violates rule.`
      };
    }

    case 'custom':
    default:
      return { isValid: true };
  }
}

/**
 * Finds the first applicable DataValidationRule for a given cell coordinate.
 */
export function getValidationRuleForCell(
  rules: DataValidationRule[] | undefined,
  row: number,
  col: number
): DataValidationRule | null {
  if (!rules || rules.length === 0) return null;

  for (const rule of rules) {
    const { range } = rule;
    if (
      row >= range.startRow &&
      row <= range.endRow &&
      col >= range.startCol &&
      col <= range.endCol
    ) {
      return rule;
    }
  }

  return null;
}
