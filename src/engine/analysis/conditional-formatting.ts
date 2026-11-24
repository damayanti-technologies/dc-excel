import { Cell, CellCoordinates, CellRange, CellValue } from '@/types/cell';
import {
  ConditionalFormatRule,
  EvaluatedCellFormatting,
  HighlightRuleType,
  TopBottomRuleType
} from '@/types/analysis';
import { coordToKey } from '@/utils/coordinates';
import { computeNumericStats, computeDataBar, computeColorScale, computeIcon, NumericRangeStats } from './visual-scales';
import { CalculationEngine } from '../calculation/engine';

export interface RangeAnalysisStats extends NumericRangeStats {
  valueCounts: Map<string, number>;
  sortedValuesAsc: number[];
  sortedValuesDesc: number[];
  totalNonBlankCount: number;
}

/**
 * Computes frequency counts and sorted numbers for top/bottom and duplicate/unique evaluations.
 */
export function computeRangeAnalysisStats(
  cells: Record<string, Cell>,
  range: CellRange
): RangeAnalysisStats {
  const numericValues: number[] = [];
  const valueCounts = new Map<string, number>();
  let nonBlankCount = 0;

  for (let r = range.startRow; r <= range.endRow; r++) {
    for (let c = range.startCol; c <= range.endCol; c++) {
      const key = coordToKey(r, c);
      const val = cells[key]?.value;

      if (val !== null && val !== undefined && val !== '') {
        nonBlankCount++;
        const strVal = String(val).trim().toUpperCase();
        valueCounts.set(strVal, (valueCounts.get(strVal) || 0) + 1);

        if (typeof val === 'number' && Number.isFinite(val)) {
          numericValues.push(val);
        } else if (typeof val === 'string' && val.trim() !== '' && !Number.isNaN(Number(val))) {
          numericValues.push(Number(val));
        }
      }
    }
  }

  const baseStats = computeNumericStats(numericValues);
  const sortedAsc = [...numericValues].sort((a, b) => a - b);
  const sortedDesc = [...numericValues].sort((a, b) => b - a);

  return {
    ...baseStats,
    valueCounts,
    sortedValuesAsc: sortedAsc,
    sortedValuesDesc: sortedDesc,
    totalNonBlankCount: nonBlankCount
  };
}

/**
 * Checks if a cell value satisfies a highlight cell rule.
 */
export function evaluateHighlightRule(
  val: CellValue,
  type: HighlightRuleType,
  val1?: string | number,
  val2?: string | number,
  stats?: RangeAnalysisStats,
  dateOption?: string
): boolean {
  const isBlank = val === null || val === undefined || val === '';

  if (type === 'blank') return isBlank;
  if (type === 'not_blank') return !isBlank;

  if (isBlank) return false;

  const strVal = String(val);
  const numVal = typeof val === 'number' ? val : Number(val);
  const isNumeric = !Number.isNaN(numVal) && Number.isFinite(numVal);

  const num1 = val1 !== undefined && val1 !== '' ? Number(val1) : NaN;
  const num2 = val2 !== undefined && val2 !== '' ? Number(val2) : NaN;

  switch (type) {
    case 'greater_than':
      if (isNumeric && !Number.isNaN(num1)) return numVal > num1;
      return strVal > String(val1 ?? '');

    case 'less_than':
      if (isNumeric && !Number.isNaN(num1)) return numVal < num1;
      return strVal < String(val1 ?? '');

    case 'equal_to':
      if (isNumeric && !Number.isNaN(num1)) return numVal === num1;
      return strVal.toUpperCase() === String(val1 ?? '').toUpperCase();

    case 'not_equal_to':
      if (isNumeric && !Number.isNaN(num1)) return numVal !== num1;
      return strVal.toUpperCase() !== String(val1 ?? '').toUpperCase();

    case 'between': {
      if (!isNumeric || Number.isNaN(num1) || Number.isNaN(num2)) return false;
      const min = Math.min(num1, num2);
      const max = Math.max(num1, num2);
      return numVal >= min && numVal <= max;
    }

    case 'text_contains':
      return strVal.toLowerCase().includes(String(val1 ?? '').toLowerCase());

    case 'text_begins_with':
      return strVal.toLowerCase().startsWith(String(val1 ?? '').toLowerCase());

    case 'text_ends_with':
      return strVal.toLowerCase().endsWith(String(val1 ?? '').toLowerCase());

    case 'duplicate': {
      if (!stats) return false;
      const count = stats.valueCounts.get(strVal.trim().toUpperCase()) || 0;
      return count > 1;
    }

    case 'unique': {
      if (!stats) return false;
      const count = stats.valueCounts.get(strVal.trim().toUpperCase()) || 0;
      return count === 1;
    }

    case 'date_occurring': {
      const d = new Date(strVal);
      if (Number.isNaN(d.getTime())) return false;
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const cellDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const diffDays = Math.round((cellDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      switch (dateOption) {
        case 'today':
          return diffDays === 0;
        case 'yesterday':
          return diffDays === -1;
        case 'tomorrow':
          return diffDays === 1;
        case 'last_7_days':
          return diffDays >= -7 && diffDays <= 0;
        case 'this_month':
          return cellDate.getFullYear() === today.getFullYear() && cellDate.getMonth() === today.getMonth();
        case 'last_month': {
          const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          return cellDate.getFullYear() === lastMonth.getFullYear() && cellDate.getMonth() === lastMonth.getMonth();
        }
        default:
          return false;
      }
    }

    default:
      return false;
  }
}

/**
 * Checks if a numeric cell value satisfies a top/bottom rule.
 */
export function evaluateTopBottomRule(
  val: CellValue,
  type: TopBottomRuleType,
  rank: number = 10,
  stats: RangeAnalysisStats
): boolean {
  const num = typeof val === 'number' ? val : Number(val);
  if (Number.isNaN(num) || !Number.isFinite(num)) return false;

  const total = stats.count;
  if (total === 0) return false;

  switch (type) {
    case 'top_items': {
      const cutoffIndex = Math.min(rank, total) - 1;
      const cutoffVal = stats.sortedValuesDesc[cutoffIndex];
      return cutoffVal !== undefined && num >= cutoffVal;
    }

    case 'bottom_items': {
      const cutoffIndex = Math.min(rank, total) - 1;
      const cutoffVal = stats.sortedValuesAsc[cutoffIndex];
      return cutoffVal !== undefined && num <= cutoffVal;
    }

    case 'top_percent': {
      const count = Math.max(1, Math.round((rank / 100) * total));
      const cutoffVal = stats.sortedValuesDesc[count - 1];
      return cutoffVal !== undefined && num >= cutoffVal;
    }

    case 'bottom_percent': {
      const count = Math.max(1, Math.round((rank / 100) * total));
      const cutoffVal = stats.sortedValuesAsc[count - 1];
      return cutoffVal !== undefined && num <= cutoffVal;
    }

    case 'above_average':
      return num > stats.avg;

    case 'below_average':
      return num < stats.avg;

    default:
      return false;
  }
}

/**
 * Adapts relative cell coordinates inside a custom formula.
 * e.g. for rule applied to A1:C10 with formula `=A1>100`, at B2 converts to `=B2>100`.
 */
export function adaptFormulaForCell(
  formula: string,
  baseRow: number,
  baseCol: number,
  targetRow: number,
  targetCol: number
): string {
  const rowOffset = targetRow - baseRow;
  const colOffset = targetCol - baseCol;

  if (rowOffset === 0 && colOffset === 0) {
    return formula;
  }

  // Regex matching cell references like $A$1, A$1, $A1, A1
  return formula.replace(/(\$?)([A-Z]+)(\$?)([0-9]+)/g, (_match, colLock, colLetters, rowLock, rowNum) => {
    let colIndex = 0;
    for (let i = 0; i < colLetters.length; i++) {
      colIndex = colIndex * 26 + (colLetters.charCodeAt(i) - 64);
    }
    colIndex -= 1; // 0-based
    let rowIndex = Number(rowNum) - 1; // 0-based

    if (!colLock) {
      colIndex += colOffset;
    }
    if (!rowLock) {
      rowIndex += rowOffset;
    }

    if (colIndex < 0 || rowIndex < 0) {
      return '#REF!';
    }

    // Reconstruct column letter
    let colStr = '';
    let temp = colIndex + 1;
    while (temp > 0) {
      const rem = (temp - 1) % 26;
      colStr = String.fromCharCode(65 + rem) + colStr;
      temp = Math.floor((temp - 1) / 26);
    }

    return `${colLock}${colStr}${rowLock}${rowIndex + 1}`;
  });
}

/**
 * Checks if a cell coordinate is within a range.
 */
export function isCellInRange(coord: CellCoordinates, range: CellRange): boolean {
  return (
    coord.row >= range.startRow &&
    coord.row <= range.endRow &&
    coord.col >= range.startCol &&
    coord.col <= range.endCol
  );
}

/**
 * Evaluates all enabled conditional formatting rules for a sheet,
 * returning a map of cellKey -> EvaluatedCellFormatting.
 */
export function evaluateConditionalFormatting(
  cells: Record<string, Cell>,
  rules: ConditionalFormatRule[],
  calcEngine?: CalculationEngine
): Map<string, EvaluatedCellFormatting> {
  const result = new Map<string, EvaluatedCellFormatting>();
  const enabledRules = rules.filter((r) => r.enabled);

  if (enabledRules.length === 0) {
    return result;
  }

  // Cache range stats per rule id
  const statsCache = new Map<string, RangeAnalysisStats>();
  const getStats = (rule: ConditionalFormatRule) => {
    if (!statsCache.has(rule.id)) {
      statsCache.set(rule.id, computeRangeAnalysisStats(cells, rule.range));
    }
    return statsCache.get(rule.id)!;
  };

  // Track cells that encountered stopIfTrue
  const stoppedCells = new Set<string>();

  for (const rule of enabledRules) {
    const stats = getStats(rule);

    for (let r = rule.range.startRow; r <= rule.range.endRow; r++) {
      for (let c = rule.range.startCol; c <= rule.range.endCol; c++) {
        const key = coordToKey(r, c);
        if (stoppedCells.has(key)) continue;

        const cell = cells[key];
        const val = cell?.value ?? null;
        let isMatch = false;

        // 1. Data Bars, Color Scales, Icon Sets
        if (rule.type === 'data_bar' && rule.dataBar) {
          const num = typeof val === 'number' ? val : Number(val);
          if (!Number.isNaN(num) && Number.isFinite(num)) {
            const bar = computeDataBar(num, rule.dataBar, stats);
            const current = result.get(key) || {};
            result.set(key, { ...current, dataBar: bar });
            if (rule.stopIfTrue) stoppedCells.add(key);
          }
          continue;
        }

        if (rule.type === 'color_scale' && rule.colorScale) {
          const num = typeof val === 'number' ? val : Number(val);
          if (!Number.isNaN(num) && Number.isFinite(num)) {
            const scaleColor = computeColorScale(num, rule.colorScale, stats);
            const current = result.get(key) || {};
            result.set(key, { ...current, colorScaleColor: scaleColor });
            if (rule.stopIfTrue) stoppedCells.add(key);
          }
          continue;
        }

        if (rule.type === 'icon_set' && rule.iconSet) {
          const num = typeof val === 'number' ? val : Number(val);
          if (!Number.isNaN(num) && Number.isFinite(num)) {
            const icon = computeIcon(num, rule.iconSet, stats);
            const current = result.get(key) || {};
            result.set(key, { ...current, icon });
            if (rule.stopIfTrue) stoppedCells.add(key);
          }
          continue;
        }

        // 2. Custom Formula
        if (rule.type === 'custom_formula' && rule.customFormula && calcEngine) {
          try {
            const adaptedFormula = adaptFormulaForCell(
              rule.customFormula,
              rule.range.startRow,
              rule.range.startCol,
              r,
              c
            );
            const formulaResult = calcEngine.evaluateFormula(adaptedFormula, cells);
            isMatch = formulaResult === true || formulaResult === 1 || String(formulaResult).toUpperCase() === 'TRUE';
          } catch {
            isMatch = false;
          }
        }
        // 3. Top/Bottom Rules
        else if (
          rule.type === 'top_items' ||
          rule.type === 'bottom_items' ||
          rule.type === 'top_percent' ||
          rule.type === 'bottom_percent' ||
          rule.type === 'above_average' ||
          rule.type === 'below_average'
        ) {
          isMatch = evaluateTopBottomRule(val, rule.type, rule.topBottomRank, stats);
        }
        // 4. Highlight Cell Rules
        else {
          isMatch = evaluateHighlightRule(
            val,
            rule.type as HighlightRuleType,
            rule.val1,
            rule.val2,
            stats,
            rule.dateOption
          );
        }

        if (isMatch && rule.style) {
          const current = result.get(key) || {};
          const mergedStyle = {
            ...rule.style,
            ...current.style,
            borders: {
              ...rule.style.borders,
              ...current.style?.borders
            }
          };

          result.set(key, {
            ...current,
            style: mergedStyle
          });

          if (rule.stopIfTrue) {
            stoppedCells.add(key);
          }
        }
      }
    }
  }

  return result;
}
