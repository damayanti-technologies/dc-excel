import { SparseCellMap } from '@/types/sheet';
import { CellRange } from '@/types/cell';
import { FilterConfig, ColumnFilter, FilterCondition } from '@/types/data-tools';
import { coordToKey } from '@/utils/coordinates';

/**
 * Checks if a single cell value matches a filter condition.
 */
export function matchesCondition(val: unknown, condition: FilterCondition): boolean {
  const isBlank = val === null || val === undefined || val === '';
  const strVal = isBlank ? '' : String(val).trim();
  const numVal = typeof val === 'number' ? val : Number(val);
  const isNum = !Number.isNaN(numVal) && !isBlank;

  const targetStr1 = condition.val1.trim();
  const targetStr2 = (condition.val2 || '').trim();
  const targetNum1 = Number(targetStr1);
  const targetNum2 = Number(targetStr2);

  switch (condition.type) {
    case 'is_blank':
      return isBlank;
    case 'is_not_blank':
      return !isBlank;
    case 'equals':
      if (isNum && !Number.isNaN(targetNum1)) {
        return numVal === targetNum1;
      }
      return strVal.toLowerCase() === targetStr1.toLowerCase();
    case 'not_equals':
      if (isNum && !Number.isNaN(targetNum1)) {
        return numVal !== targetNum1;
      }
      return strVal.toLowerCase() !== targetStr1.toLowerCase();
    case 'contains':
      return strVal.toLowerCase().includes(targetStr1.toLowerCase());
    case 'not_contains':
      return !strVal.toLowerCase().includes(targetStr1.toLowerCase());
    case 'begins_with':
      return strVal.toLowerCase().startsWith(targetStr1.toLowerCase());
    case 'ends_with':
      return strVal.toLowerCase().endsWith(targetStr1.toLowerCase());
    case 'greater_than':
      return isNum && numVal > targetNum1;
    case 'less_than':
      return isNum && numVal < targetNum1;
    case 'greater_or_equal':
      return isNum && numVal >= targetNum1;
    case 'less_or_equal':
      return isNum && numVal <= targetNum1;
    case 'between':
      return isNum && numVal >= targetNum1 && numVal <= targetNum2;
    case 'before': {
      const t1 = Date.parse(targetStr1);
      const tVal = val instanceof Date ? val.getTime() : Date.parse(strVal);
      return !Number.isNaN(tVal) && !Number.isNaN(t1) && tVal < t1;
    }
    case 'after': {
      const t1 = Date.parse(targetStr1);
      const tVal = val instanceof Date ? val.getTime() : Date.parse(strVal);
      return !Number.isNaN(tVal) && !Number.isNaN(t1) && tVal > t1;
    }
    default:
      return true;
  }
}

/**
 * Checks if a cell value matches a column filter (both checkbox list & condition).
 */
export function matchesColumnFilter(val: unknown, filter: ColumnFilter): boolean {
  const isBlank = val === null || val === undefined || String(val).trim() === '';
  const strVal = isBlank ? '' : String(val).trim();

  // 1. Checkbox selected values (if specified)
  if (filter.selectedValues && filter.selectedValues.length > 0) {
    const hasMatch = filter.selectedValues.some((v) => {
      if (isBlank && (v === '' || v === '(Blanks)')) return true;
      return v.toLowerCase() === strVal.toLowerCase();
    });
    if (!hasMatch) return false;
  }

  // 2. Condition filter (if specified)
  if (filter.condition) {
    if (!matchesCondition(val, filter.condition)) {
      return false;
    }
  }

  return true;
}

/**
 * Evaluates active filter configuration on cells and returns list of hidden row indices.
 */
export function evaluateFilters(cells: SparseCellMap, config: FilterConfig): number[] {
  const { range, columnFilters } = config;
  const activeFilters = Object.values(columnFilters).filter(
    (f) => Boolean(f.condition) || (f.selectedValues && f.selectedValues.length > 0)
  );

  if (activeFilters.length === 0) {
    return [];
  }

  const hiddenRows: number[] = [];
  const headerRow = range.startRow;
  const dataStartRow = headerRow + 1;
  const dataEndRow = range.endRow;

  for (let r = dataStartRow; r <= dataEndRow; r++) {
    let rowVisible = true;

    for (const filter of activeFilters) {
      const cellKey = coordToKey(r, filter.col);
      const cellVal = cells[cellKey]?.value;

      if (!matchesColumnFilter(cellVal, filter)) {
        rowVisible = false;
        break; // Combined using AND logic
      }
    }

    if (!rowVisible) {
      hiddenRows.push(r);
    }
  }

  return hiddenRows;
}

/**
 * Retrieves all distinct display values for a given column within the filter range.
 */
export function getDistinctColumnValues(
  cells: SparseCellMap,
  range: CellRange,
  col: number,
  hasHeader = true
): string[] {
  const start = hasHeader ? range.startRow + 1 : range.startRow;
  const valuesSet = new Set<string>();

  for (let r = start; r <= range.endRow; r++) {
    const cell = cells[coordToKey(r, col)];
    if (cell && cell.value !== null && cell.value !== undefined && cell.value !== '') {
      valuesSet.add(String(cell.value).trim());
    } else {
      valuesSet.add('(Blanks)');
    }
  }

  const result = Array.from(valuesSet);
  result.sort((a, b) => {
    if (a === '(Blanks)') return 1;
    if (b === '(Blanks)') return -1;
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  });

  return result;
}
