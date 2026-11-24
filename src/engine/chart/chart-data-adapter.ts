import { SparseCellMap, CellRange, CellCoordinates, Cell } from '@/types/cell';
import {
  ChartSourceConfig,
  ChartSeriesConfig,
  ExtractedChartData,
  ExtractedSeries,
} from '@/types/chart';
import { PivotTableConfig, NamedRange } from '@/types/analysis';
import { coordToKey, parseKey, colIndexToName } from '@/utils/coordinates';
import { detectTableRange } from '@/engine/data-tools/sorting';
import { generatePivotTable } from '@/engine/analysis/pivot-table';

/**
 * Automatically detects a candidate data range for chart creation
 * based on the user's active cell, current selection, or sheet contents.
 */
export function detectChartDataRange(
  cells: SparseCellMap,
  activeCell?: CellCoordinates | null,
  selectedRange?: CellRange | null
): CellRange {
  // 1. If explicit multi-cell range is selected, use it
  if (
    selectedRange &&
    (selectedRange.startRow !== selectedRange.endRow ||
      selectedRange.startCol !== selectedRange.endCol)
  ) {
    return {
      startRow: Math.min(selectedRange.startRow, selectedRange.endRow),
      startCol: Math.min(selectedRange.startCol, selectedRange.endCol),
      endRow: Math.max(selectedRange.startRow, selectedRange.endRow),
      endCol: Math.max(selectedRange.startCol, selectedRange.endCol),
    };
  }

  // 2. If active cell is inside or adjacent to a table of data, detect table boundaries
  if (activeCell) {
    const tableRange = detectTableRange(cells, activeCell);
    if (
      tableRange.startRow !== tableRange.endRow ||
      tableRange.startCol !== tableRange.endCol
    ) {
      return tableRange;
    }
  }

  // 3. Scan populated cells to find first contiguous or non-empty bounding block
  const keys = Object.keys(cells);
  if (keys.length > 0) {
    let minR = Infinity;
    let minC = Infinity;
    let maxR = -1;
    let maxC = -1;

    for (const key of keys) {
      const coord = parseKey(key);
      const cell = cells[key];
      if (coord && cell && (cell.value !== '' || cell.formula)) {
        if (coord.row < minR) minR = coord.row;
        if (coord.col < minC) minC = coord.col;
        if (coord.row > maxR) maxR = coord.row;
        if (coord.col > maxC) maxC = coord.col;
      }
    }

    if (maxR >= 0 && maxC >= 0) {
      // Bound the auto-detected range to a reasonable chart preview size (max 20 rows, 10 cols)
      return {
        startRow: minR,
        startCol: minC,
        endRow: Math.min(maxR, minR + 19),
        endCol: Math.min(maxC, minC + 9),
      };
    }
  }

  // 4. Default fallback: A1:B5
  return {
    startRow: 0,
    startCol: 0,
    endRow: 4,
    endCol: 1,
  };
}

/**
 * Extracts numeric value or text representation from a cell.
 */
export function parseCellValue(cell?: Cell | null): {
  numericValue: number | null;
  textValue: string;
} {
  if (!cell || cell.value == null || cell.value === '') {
    return { numericValue: null, textValue: '' };
  }

  const rawVal = cell.value;

  if (typeof rawVal === 'number') {
    return {
      numericValue: isNaN(rawVal) ? null : rawVal,
      textValue: String(rawVal),
    };
  }

  if (typeof rawVal === 'boolean') {
    return {
      numericValue: rawVal ? 1 : 0,
      textValue: rawVal ? 'TRUE' : 'FALSE',
    };
  }

  const str = String(rawVal).trim();
  // Strip currency symbols and commas for numeric parsing
  const cleanStr = str.replace(/[$€£¥,]/g, '');
  const parsed = Number(cleanStr);

  return {
    numericValue: !isNaN(parsed) && cleanStr !== '' ? parsed : null,
    textValue: str,
  };
}

/**
 * Converts a raw spreadsheet range into chart-ready categories and series.
 */
export function extractChartData(
  cells: SparseCellMap,
  source: ChartSourceConfig,
  namedRangeResolver?: (name: string) => NamedRange | null,
  pivotTables?: PivotTableConfig[],
  seriesCustomizations?: ChartSeriesConfig[]
): ExtractedChartData {
  let targetCells = cells;
  let range = source.range;

  // Case 1: Pivot Table Data Source
  if (source.pivotTableId && pivotTables) {
    const pivot = pivotTables.find((p) => p.id === source.pivotTableId);
    if (pivot) {
      const result = generatePivotTable(pivot, (r, c) => cells[coordToKey(r, c)]);
      const dest = pivot.destinationCoord;
      const pivotCells: SparseCellMap = {};
      for (const [k, pCell] of Object.entries(result.cells)) {
        pivotCells[k] = {
          value: pCell.value,
          dataType:
            typeof pCell.value === 'number'
              ? 'number'
              : typeof pCell.value === 'boolean'
              ? 'boolean'
              : 'string',
        };
      }
      targetCells = pivotCells;
      range = {
        startRow: dest.row,
        startCol: dest.col,
        endRow: dest.row + result.rowCount - 1,
        endCol: dest.col + result.colCount - 1,
      };
    }
  } else if (source.namedRangeName && namedRangeResolver) {
    // Case 2: Named Range resolution
    const named = namedRangeResolver(source.namedRangeName);
    if (named) {
      range = named.range;
    } else {
      return {
        categories: [],
        series: [],
        sourceWarning: `Named range "${source.namedRangeName}" could not be resolved.`,
      };
    }
  }

  if (!range) {
    return {
      categories: [],
      series: [],
      sourceWarning: 'No valid source range specified.',
    };
  }

  const startRow = Math.min(range.startRow, range.endRow);
  const endRow = Math.max(range.startRow, range.endRow);
  const startCol = Math.min(range.startCol, range.endCol);
  const endCol = Math.max(range.startCol, range.endCol);

  const orientation = source.orientation || 'columns';
  const firstRowHeaders = source.firstRowAsHeaders;
  const firstColLabels = source.firstColAsLabels;

  const categories: string[] = [];
  const series: ExtractedSeries[] = [];

  if (orientation === 'columns') {
    // Columns are data series, rows are categories
    const dataStartRow = firstRowHeaders ? startRow + 1 : startRow;
    const dataStartCol = firstColLabels ? startCol + 1 : startCol;

    // 1. Extract Categories from Row Labels
    for (let r = dataStartRow; r <= endRow; r++) {
      if (firstColLabels) {
        const cell = targetCells[coordToKey(r, startCol)];
        const parsed = parseCellValue(cell);
        categories.push(parsed.textValue || `Row ${r + 1}`);
      } else {
        categories.push(`Row ${r + 1}`);
      }
    }

    // 2. Extract Series from Columns
    let seriesIdx = 0;
    for (let c = dataStartCol; c <= endCol; c++) {
      let seriesName = `Series ${seriesIdx + 1}`;
      if (firstRowHeaders) {
        const headerCell = targetCells[coordToKey(startRow, c)];
        const parsed = parseCellValue(headerCell);
        if (parsed.textValue) {
          seriesName = parsed.textValue;
        } else {
          seriesName = `${colIndexToName(c)}`;
        }
      } else {
        seriesName = `Column ${colIndexToName(c)}`;
      }

      const values: (number | null)[] = [];
      for (let r = dataStartRow; r <= endRow; r++) {
        const cell = targetCells[coordToKey(r, c)];
        const parsed = parseCellValue(cell);
        values.push(parsed.numericValue);
      }

      const custom = seriesCustomizations?.[seriesIdx];
      series.push({
        id: custom?.id || `series-${c}`,
        name: custom?.name || seriesName,
        values,
        color: custom?.color,
        type: custom?.type,
        yAxisIndex: custom?.yAxisIndex,
        lineWidth: custom?.lineWidth,
        showMarkers: custom?.showMarkers,
        fillOpacity: custom?.fillOpacity,
        showDataLabels: custom?.showDataLabels,
      });

      seriesIdx++;
    }
  } else {
    // Rows are data series, columns are categories
    const seriesCol = startCol;
    const dataStartCol = firstRowHeaders ? startCol + 1 : startCol;
    const dataFirstRow = firstRowHeaders ? startRow + 1 : startRow;

    // 1. Extract Categories from Header Columns
    for (let c = dataStartCol; c <= endCol; c++) {
      if (firstRowHeaders) {
        const cell = targetCells[coordToKey(startRow, c)];
        const parsed = parseCellValue(cell);
        categories.push(parsed.textValue || `Col ${colIndexToName(c)}`);
      } else {
        categories.push(`Col ${colIndexToName(c)}`);
      }
    }

    // 2. Extract Series from Rows
    let seriesIdx = 0;
    for (let r = dataFirstRow; r <= endRow; r++) {
      let seriesName = `Series ${seriesIdx + 1}`;
      if (firstColLabels) {
        const labelCell = targetCells[coordToKey(r, seriesCol)];
        const parsed = parseCellValue(labelCell);
        if (parsed.textValue) {
          seriesName = parsed.textValue;
        } else {
          seriesName = `Row ${r + 1}`;
        }
      } else {
        seriesName = `Row ${r + 1}`;
      }

      const values: (number | null)[] = [];
      for (let c = dataStartCol; c <= endCol; c++) {
        const cell = targetCells[coordToKey(r, c)];
        const parsed = parseCellValue(cell);
        values.push(parsed.numericValue);
      }

      const custom = seriesCustomizations?.[seriesIdx];
      series.push({
        id: custom?.id || `series-${r}`,
        name: custom?.name || seriesName,
        values,
        color: custom?.color,
        type: custom?.type,
        yAxisIndex: custom?.yAxisIndex,
        lineWidth: custom?.lineWidth,
        showMarkers: custom?.showMarkers,
        fillOpacity: custom?.fillOpacity,
        showDataLabels: custom?.showDataLabels,
      });

      seriesIdx++;
    }
  }

  // Handle completely empty dataset warning
  const totalNumeric = series.reduce(
    (acc, s) => acc + s.values.filter((v) => v !== null).length,
    0
  );

  return {
    categories: categories.length > 0 ? categories : ['Data Point 1'],
    series,
    sourceWarning:
      totalNumeric === 0
        ? 'Selected range contains no numeric data points to chart.'
        : undefined,
  };
}

/**
 * Histogram data transformation: computes frequency bins for numeric distribution.
 */
export function buildHistogramData(
  rawValues: (number | null)[],
  customBinCount?: number
): { categories: string[]; counts: number[] } {
  const nums = rawValues.filter((v): v is number => v !== null && !isNaN(v));
  if (nums.length === 0) {
    return { categories: ['No Data'], counts: [0] };
  }

  const min = Math.min(...nums);
  const max = Math.max(...nums);

  if (min === max) {
    return { categories: [`${min}`], counts: [nums.length] };
  }

  // Sturges formula for bin count: k = ceil(log2(n) + 1)
  const binCount = customBinCount || Math.max(3, Math.min(10, Math.ceil(Math.log2(nums.length) + 1)));
  const binWidth = (max - min) / binCount;

  const categories: string[] = [];
  const counts: number[] = new Array(binCount).fill(0);

  for (let i = 0; i < binCount; i++) {
    const low = min + i * binWidth;
    const high = i === binCount - 1 ? max : low + binWidth;
    categories.push(`${low.toFixed(1)} - ${high.toFixed(1)}`);
  }

  for (const n of nums) {
    let index = Math.floor((n - min) / binWidth);
    if (index >= binCount) index = binCount - 1;
    if (index < 0) index = 0;
    counts[index] = (counts[index] ?? 0) + 1;
  }

  return { categories, counts };
}

/**
 * Waterfall data transformation: converts positive/negative variations into
 * floating delta bars and cumulative running balances.
 */
export function buildWaterfallData(
  categories: string[],
  values: (number | null)[]
): {
  categories: string[];
  baseValues: number[];
  deltaValues: number[];
  isPositive: boolean[];
} {
  const baseValues: number[] = [];
  const deltaValues: number[] = [];
  const isPositive: boolean[] = [];

  let runningTotal = 0;

  for (let i = 0; i < categories.length; i++) {
    const val = values[i] ?? 0;
    if (val >= 0) {
      baseValues.push(runningTotal);
      deltaValues.push(val);
      isPositive.push(true);
      runningTotal += val;
    } else {
      runningTotal += val;
      baseValues.push(runningTotal);
      deltaValues.push(Math.abs(val));
      isPositive.push(false);
    }
  }

  return {
    categories,
    baseValues,
    deltaValues,
    isPositive,
  };
}

/**
 * Radar data transformation: creates indicator limits and series vectors.
 */
export function buildRadarData(
  categories: string[],
  series: ExtractedSeries[]
): {
  indicators: { name: string; max: number }[];
  seriesData: { name: string; value: number[] }[];
} {
  const indicators = categories.map((cat, catIdx) => {
    let max = 0;
    for (const s of series) {
      const val = s.values[catIdx] ?? 0;
      if (val > max) max = val;
    }
    return {
      name: cat,
      max: max > 0 ? Math.ceil(max * 1.2) : 100,
    };
  });

  const seriesData = series.map((s) => ({
    name: s.name,
    value: categories.map((_, idx) => s.values[idx] ?? 0),
  }));

  return { indicators, seriesData };
}

/**
 * Treemap & Funnel data transformation.
 */
export function buildHierarchicalData(
  categories: string[],
  series: ExtractedSeries[]
): { name: string; value: number }[] {
  const items: { name: string; value: number }[] = [];

  if (series.length >= 1) {
    const s = series[0];
    if (s) {
      for (let i = 0; i < categories.length; i++) {
        const cat = categories[i];
        const val = s.values[i];
        if (cat && val !== null && val !== undefined && !isNaN(val)) {
          items.push({
            name: cat,
            value: Math.abs(val),
          });
        }
      }
    }
  }

  return items;
}
