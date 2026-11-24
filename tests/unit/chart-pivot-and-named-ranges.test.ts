import { describe, it, expect } from 'vitest';
import { SparseCellMap } from '@/types/cell';
import { ChartSourceConfig } from '@/types/chart';
import { NamedRange, PivotTableConfig } from '@/types/analysis';
import { extractChartData } from '@/engine/chart/chart-data-adapter';
import { coordToKey } from '@/utils/coordinates';

describe('Chart Pivot & Named Ranges Integration', () => {
  const sampleCells: SparseCellMap = {
    // Row 0: Headers
    [coordToKey(0, 0)]: { value: 'Region', dataType: 'string' },
    [coordToKey(0, 1)]: { value: 'Product', dataType: 'string' },
    [coordToKey(0, 2)]: { value: 'Sales', dataType: 'string' },
    // Row 1
    [coordToKey(1, 0)]: { value: 'North', dataType: 'string' },
    [coordToKey(1, 1)]: { value: 'Apples', dataType: 'string' },
    [coordToKey(1, 2)]: { value: 100, dataType: 'number' },
    // Row 2
    [coordToKey(2, 0)]: { value: 'South', dataType: 'string' },
    [coordToKey(2, 1)]: { value: 'Oranges', dataType: 'string' },
    [coordToKey(2, 2)]: { value: 200, dataType: 'number' },
    // Row 3
    [coordToKey(3, 0)]: { value: 'North', dataType: 'string' },
    [coordToKey(3, 1)]: { value: 'Oranges', dataType: 'string' },
    [coordToKey(3, 2)]: { value: 300, dataType: 'number' },
  };

  it('resolves named ranges to extract chart data', () => {
    const namedRanges: NamedRange[] = [
      {
        id: 'nr-1',
        name: 'FruitSales',
        scope: 'workbook',
        sheetId: 'sheet1',
        range: { startRow: 0, startCol: 1, endRow: 3, endCol: 2 },
      },
    ];

    const resolver = (name: string) => namedRanges.find((n) => n.name === name) || null;

    const source: ChartSourceConfig = {
      sheetId: 'sheet1',
      range: { startRow: 0, startCol: 0, endRow: 0, endCol: 0 },
      rangeStr: 'FruitSales',
      namedRangeName: 'FruitSales',
      orientation: 'columns',
      firstRowAsHeaders: true,
      firstColAsLabels: true,
    };

    const data = extractChartData(sampleCells, source, resolver);
    expect(data.categories).toEqual(['Apples', 'Oranges', 'Oranges']);
    expect(data.series.length).toBe(1);
    expect(data.series[0]?.name).toBe('Sales');
    expect(data.series[0]?.values).toEqual([100, 200, 300]);
  });

  it('warns when named range is missing or deleted', () => {
    const resolver = () => null;

    const source: ChartSourceConfig = {
      sheetId: 'sheet1',
      range: { startRow: 0, startCol: 0, endRow: 0, endCol: 0 },
      rangeStr: 'DeletedName',
      namedRangeName: 'DeletedName',
      orientation: 'columns',
      firstRowAsHeaders: true,
      firstColAsLabels: true,
    };

    const data = extractChartData(sampleCells, source, resolver);
    expect(data.sourceWarning).toContain('could not be resolved');
  });

  it('extracts chart data from pivot table results', () => {
    const pivotConfig: PivotTableConfig = {
      id: 'pivot-1',
      name: 'Sales By Region',
      sourceSheetId: 'sheet1',
      sourceRange: { startRow: 0, startCol: 0, endRow: 3, endCol: 2 },
      hasHeaders: true,
      rowFields: [0], // Region
      columnFields: [],
      valueFields: [{ fieldIndex: 2, fieldName: 'Sales', agg: 'sum' }],
      filterFields: [],
      destinationSheetId: 'sheet1',
      destinationCoord: { row: 10, col: 0 },
      showGrandTotalsRow: false,
      showGrandTotalsCol: false,
      showSubtotals: false,
    };

    const source: ChartSourceConfig = {
      sheetId: 'sheet1',
      range: { startRow: 0, startCol: 0, endRow: 0, endCol: 0 },
      rangeStr: 'PivotTable1',
      pivotTableId: 'pivot-1',
      orientation: 'columns',
      firstRowAsHeaders: true,
      firstColAsLabels: true,
    };

    const data = extractChartData(sampleCells, source, undefined, [pivotConfig]);

    expect(data.categories).toContain('North');
    expect(data.categories).toContain('South');
    expect(data.series.length).toBe(1);
    // North has 100 + 300 = 400, South has 200
    const northIdx = data.categories.indexOf('North');
    const southIdx = data.categories.indexOf('South');
    expect(data.series[0]?.values[northIdx]).toBe(400);
    expect(data.series[0]?.values[southIdx]).toBe(200);
  });
});
