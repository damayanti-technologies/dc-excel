import { describe, it, expect } from 'vitest';
import { SparseCellMap, CellRange } from '@/types/cell';
import { ChartSourceConfig } from '@/types/chart';
import {
  detectChartDataRange,
  parseCellValue,
  extractChartData,
  buildHistogramData,
  buildWaterfallData,
  buildRadarData,
  buildHierarchicalData,
} from '@/engine/chart/chart-data-adapter';
import { coordToKey } from '@/utils/coordinates';

describe('Chart Data Adapter', () => {
  describe('detectChartDataRange', () => {
    it('uses selected multi-cell range if provided', () => {
      const cells: SparseCellMap = {};
      const selectedRange: CellRange = {
        startRow: 1,
        startCol: 1,
        endRow: 5,
        endCol: 3,
      };

      const result = detectChartDataRange(cells, null, selectedRange);
      expect(result).toEqual({
        startRow: 1,
        startCol: 1,
        endRow: 5,
        endCol: 3,
      });
    });

    it('detects table boundaries around active cell', () => {
      const cells: SparseCellMap = {
        [coordToKey(2, 2)]: { value: 'Month', dataType: 'string' },
        [coordToKey(2, 3)]: { value: 'Sales', dataType: 'string' },
        [coordToKey(3, 2)]: { value: 'Jan', dataType: 'string' },
        [coordToKey(3, 3)]: { value: 100, dataType: 'number' },
        [coordToKey(4, 2)]: { value: 'Feb', dataType: 'string' },
        [coordToKey(4, 3)]: { value: 200, dataType: 'number' },
      };

      const result = detectChartDataRange(cells, { row: 3, col: 2 });
      expect(result.startRow).toBe(2);
      expect(result.startCol).toBe(2);
      expect(result.endRow).toBe(4);
      expect(result.endCol).toBe(3);
    });

    it('falls back to default A1:B5 when sheet is empty', () => {
      const cells: SparseCellMap = {};
      const result = detectChartDataRange(cells, null, null);
      expect(result).toEqual({
        startRow: 0,
        startCol: 0,
        endRow: 4,
        endCol: 1,
      });
    });
  });

  describe('parseCellValue', () => {
    it('handles numeric and currency string parsing', () => {
      expect(parseCellValue({ value: 1500, dataType: 'number' })).toEqual({
        numericValue: 1500,
        textValue: '1500',
      });

      expect(parseCellValue({ value: '$2,500.50', dataType: 'string' })).toEqual({
        numericValue: 2500.5,
        textValue: '$2,500.50',
      });

      expect(parseCellValue({ value: 'Non-numeric text', dataType: 'string' })).toEqual({
        numericValue: null,
        textValue: 'Non-numeric text',
      });

      expect(parseCellValue(null)).toEqual({
        numericValue: null,
        textValue: '',
      });
    });

    it('handles boolean values as 1 and 0', () => {
      expect(parseCellValue({ value: true, dataType: 'boolean' })).toEqual({
        numericValue: 1,
        textValue: 'TRUE',
      });

      expect(parseCellValue({ value: false, dataType: 'boolean' })).toEqual({
        numericValue: 0,
        textValue: 'FALSE',
      });
    });
  });

  describe('extractChartData with Row and Column Orientation', () => {
    const sampleCells: SparseCellMap = {
      // Row 0: Headers
      [coordToKey(0, 0)]: { value: 'Product', dataType: 'string' },
      [coordToKey(0, 1)]: { value: 'Q1', dataType: 'string' },
      [coordToKey(0, 2)]: { value: 'Q2', dataType: 'string' },
      // Row 1: Apples
      [coordToKey(1, 0)]: { value: 'Apples', dataType: 'string' },
      [coordToKey(1, 1)]: { value: 50, dataType: 'number' },
      [coordToKey(1, 2)]: { value: 75, dataType: 'number' },
      // Row 2: Oranges
      [coordToKey(2, 0)]: { value: 'Oranges', dataType: 'string' },
      [coordToKey(2, 1)]: { value: 30, dataType: 'number' },
      [coordToKey(2, 2)]: { value: 45, dataType: 'number' },
      // Row 3: Bananas
      [coordToKey(3, 0)]: { value: 'Bananas', dataType: 'string' },
      [coordToKey(3, 1)]: { value: 90, dataType: 'number' },
      [coordToKey(3, 2)]: { value: 110, dataType: 'number' },
    };

    it('extracts column-oriented series with headers and labels', () => {
      const source: ChartSourceConfig = {
        sheetId: 'sheet1',
        range: { startRow: 0, startCol: 0, endRow: 3, endCol: 2 },
        rangeStr: 'A1:C4',
        orientation: 'columns',
        firstRowAsHeaders: true,
        firstColAsLabels: true,
      };

      const result = extractChartData(sampleCells, source);

      expect(result.categories).toEqual(['Apples', 'Oranges', 'Bananas']);
      expect(result.series.length).toBe(2);
      expect(result.series[0]?.name).toBe('Q1');
      expect(result.series[0]?.values).toEqual([50, 30, 90]);
      expect(result.series[1]?.name).toBe('Q2');
      expect(result.series[1]?.values).toEqual([75, 45, 110]);
      expect(result.sourceWarning).toBeUndefined();
    });

    it('extracts row-oriented series with headers and labels', () => {
      const source: ChartSourceConfig = {
        sheetId: 'sheet1',
        range: { startRow: 0, startCol: 0, endRow: 3, endCol: 2 },
        rangeStr: 'A1:C4',
        orientation: 'rows',
        firstRowAsHeaders: true,
        firstColAsLabels: true,
      };

      const result = extractChartData(sampleCells, source);

      expect(result.categories).toEqual(['Q1', 'Q2']);
      expect(result.series.length).toBe(3);
      expect(result.series[0]?.name).toBe('Apples');
      expect(result.series[0]?.values).toEqual([50, 75]);
      expect(result.series[1]?.name).toBe('Oranges');
      expect(result.series[1]?.values).toEqual([30, 45]);
      expect(result.series[2]?.name).toBe('Bananas');
      expect(result.series[2]?.values).toEqual([90, 110]);
    });

    it('handles missing values and empty cells gracefully', () => {
      const sparseWithBlanks: SparseCellMap = {
        [coordToKey(0, 0)]: { value: 'Metric', dataType: 'string' },
        [coordToKey(0, 1)]: { value: 'Score', dataType: 'string' },
        [coordToKey(1, 0)]: { value: 'A', dataType: 'string' },
        [coordToKey(1, 1)]: { value: 10, dataType: 'number' },
        [coordToKey(2, 0)]: { value: 'B', dataType: 'string' },
        // (2, 1) is empty/blank
        [coordToKey(3, 0)]: { value: 'C', dataType: 'string' },
        [coordToKey(3, 1)]: { value: 30, dataType: 'number' },
      };

      const source: ChartSourceConfig = {
        sheetId: 'sheet1',
        range: { startRow: 0, startCol: 0, endRow: 3, endCol: 1 },
        rangeStr: 'A1:B4',
        orientation: 'columns',
        firstRowAsHeaders: true,
        firstColAsLabels: true,
      };

      const result = extractChartData(sparseWithBlanks, source);
      expect(result.categories).toEqual(['A', 'B', 'C']);
      expect(result.series[0]?.values).toEqual([10, null, 30]);
    });

    it('returns warning when selected range contains no numeric data', () => {
      const textOnlyCells: SparseCellMap = {
        [coordToKey(0, 0)]: { value: 'Name', dataType: 'string' },
        [coordToKey(0, 1)]: { value: 'City', dataType: 'string' },
        [coordToKey(1, 0)]: { value: 'Alice', dataType: 'string' },
        [coordToKey(1, 1)]: { value: 'Paris', dataType: 'string' },
      };

      const source: ChartSourceConfig = {
        sheetId: 'sheet1',
        range: { startRow: 0, startCol: 0, endRow: 1, endCol: 1 },
        rangeStr: 'A1:B2',
        orientation: 'columns',
        firstRowAsHeaders: true,
        firstColAsLabels: true,
      };

      const result = extractChartData(textOnlyCells, source);
      expect(result.sourceWarning).toContain('contains no numeric data');
    });
  });

  describe('Specialized Chart Transformations', () => {
    it('builds histogram frequency bins correctly', () => {
      const raw = [12, 15, 18, 22, 25, 28, 32, 35, 42, 55];
      const hist = buildHistogramData(raw, 4);

      expect(hist.categories.length).toBe(4);
      expect(hist.counts.length).toBe(4);
      expect(hist.counts.reduce((a, b) => a + b, 0)).toBe(10);
    });

    it('builds waterfall floating balance and delta data', () => {
      const cats = ['Revenue', 'COGS', 'Gross Profit', 'OpEx', 'Net Income'];
      const vals = [1000, -400, 0, -200, 0];

      const wf = buildWaterfallData(cats, vals);
      expect(wf.categories).toEqual(cats);
      expect(wf.baseValues[0]).toBe(0);
      expect(wf.deltaValues[0]).toBe(1000);
      expect(wf.isPositive[0]).toBe(true);

      expect(wf.baseValues[1]).toBe(600); // 1000 - 400
      expect(wf.deltaValues[1]).toBe(400);
      expect(wf.isPositive[1]).toBe(false);
    });

    it('builds radar indicators with max bounds', () => {
      const categories = ['Speed', 'Power', 'Agility'];
      const series = [
        { id: 's1', name: 'Player A', values: [80, 95, 70] },
        { id: 's2', name: 'Player B', values: [90, 85, 88] },
      ];

      const radar = buildRadarData(categories, series);
      expect(radar.indicators.length).toBe(3);
      expect(radar.indicators[0]?.name).toBe('Speed');
      expect(radar.indicators[0]?.max).toBeGreaterThanOrEqual(90);
      expect(radar.seriesData.length).toBe(2);
      expect(radar.seriesData[0]?.value).toEqual([80, 95, 70]);
    });

    it('builds hierarchical data for treemap and funnel', () => {
      const categories = ['Prospect', 'Qualified', 'Proposal', 'Won'];
      const series = [{ id: 's1', name: 'Funnel', values: [100, 60, 30, 15] }];

      const tree = buildHierarchicalData(categories, series);
      expect(tree.length).toBe(4);
      expect(tree[0]).toEqual({ name: 'Prospect', value: 100 });
      expect(tree[3]).toEqual({ name: 'Won', value: 15 });
    });
  });
});
