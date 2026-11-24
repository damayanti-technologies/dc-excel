import { describe, it, expect } from 'vitest';
import { ChartConfig, ExtractedChartData } from '@/types/chart';
import { buildEChartsOption, getChartPalette, CHART_PALETTES } from '@/engine/chart/echarts-builder';

describe('ECharts Option Builder', () => {
  const sampleData: ExtractedChartData = {
    categories: ['Jan', 'Feb', 'Mar'],
    series: [
      { id: 's1', name: 'Revenue', values: [100, 200, 300] },
      { id: 's2', name: 'Profit', values: [40, 70, 90] },
    ],
  };

  const createBaseConfig = (chartType: ChartConfig['chartType']): ChartConfig => ({
    id: 'test-chart',
    sheetId: 'sheet1',
    chartType,
    title: { show: true, text: 'Test Chart', fontSize: 16, align: 'center' },
    source: {
      sheetId: 'sheet1',
      range: { startRow: 0, startCol: 0, endRow: 3, endCol: 2 },
      rangeStr: 'A1:C4',
      orientation: 'columns',
      firstRowAsHeaders: true,
      firstColAsLabels: true,
    },
    series: [],
    axes: {
      showXAxis: true,
      showYAxis: true,
      xAxisTitle: 'Months',
      yAxisTitle: 'USD ($)',
      showGridLinesX: false,
      showGridLinesY: true,
    },
    legend: { show: true, position: 'top' },
    style: { paletteId: 'professional', borderRadius: 8 },
    position: {
      anchorCell: { row: 1, col: 1 },
      offsetX: 0,
      offsetY: 0,
      width: 500,
      height: 350,
      zIndex: 10,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  describe('Column and Bar Chart Builders', () => {
    it('builds standard clustered column chart', () => {
      const cfg = createBaseConfig('column-clustered');
      const opt = buildEChartsOption(cfg, sampleData, false);

      expect(opt.title).toBeDefined();
      expect((opt.xAxis as any).data).toEqual(['Jan', 'Feb', 'Mar']);
      expect((opt.series as any[]).length).toBe(2);
      expect((opt.series as any[])[0].type).toBe('bar');
      expect((opt.series as any[])[0].stack).toBeUndefined();
    });

    it('builds stacked column chart with total stack', () => {
      const cfg = createBaseConfig('column-stacked');
      const opt = buildEChartsOption(cfg, sampleData, false);

      expect((opt.series as any[])[0].stack).toBe('total');
      expect((opt.series as any[])[1].stack).toBe('total');
    });

    it('normalizes values to 100% for 100% stacked column', () => {
      const cfg = createBaseConfig('column-stacked-100');
      const opt = buildEChartsOption(cfg, sampleData, false);

      const s0Vals = (opt.series as any[])[0].data;
      const s1Vals = (opt.series as any[])[1].data;

      // 100 / (100+40) = ~71.4%, 40 / (100+40) = ~28.6%
      expect(s0Vals[0] + s1Vals[0]).toBeCloseTo(100, 0);
    });

    it('inverts axes for horizontal bar chart', () => {
      const cfg = createBaseConfig('bar-clustered');
      const opt = buildEChartsOption(cfg, sampleData, false);

      expect((opt.xAxis as any).type).toBe('value');
      expect((opt.yAxis as any).type).toBe('category');
    });
  });

  describe('Line and Area Chart Builders', () => {
    it('builds line chart with markers and smooth interpolation', () => {
      const cfgSmooth = createBaseConfig('line-smooth');
      const optSmooth = buildEChartsOption(cfgSmooth, sampleData, false);
      expect((optSmooth.series as any[])[0].type).toBe('line');
      expect((optSmooth.series as any[])[0].smooth).toBe(true);

      const cfgMarkers = createBaseConfig('line-markers');
      const optMarkers = buildEChartsOption(cfgMarkers, sampleData, false);
      expect((optMarkers.series as any[])[0].showSymbol).toBe(true);
    });

    it('builds area charts with translucent fill opacity', () => {
      const cfgArea = createBaseConfig('area-standard');
      const optArea = buildEChartsOption(cfgArea, sampleData, false);
      expect((optArea.series as any[])[0].type).toBe('line');
      expect((optArea.series as any[])[0].areaStyle).toBeDefined();
    });
  });

  describe('Pie and Doughnut Chart Builders', () => {
    it('builds standard pie chart with percentages', () => {
      const cfg = createBaseConfig('pie-standard');
      const opt = buildEChartsOption(cfg, sampleData, false);

      expect((opt.series as any[])[0].type).toBe('pie');
      expect((opt.series as any[])[0].radius).toBe('65%');
    });

    it('builds hollow ring doughnut chart', () => {
      const cfg = createBaseConfig('pie-doughnut');
      const opt = buildEChartsOption(cfg, sampleData, false);

      expect((opt.series as any[])[0].type).toBe('pie');
      expect((opt.series as any[])[0].radius).toEqual(['40%', '70%']);
    });
  });

  describe('Scatter and Specialized Chart Builders', () => {
    it('builds scatter coordinates pairs from series', () => {
      const cfg = createBaseConfig('scatter-standard');
      const opt = buildEChartsOption(cfg, sampleData, false);

      expect((opt.series as any[])[0].type).toBe('scatter');
      expect((opt.series as any[])[0].data).toEqual([
        [100, 40],
        [200, 70],
        [300, 90],
      ]);
    });

    it('builds radar coordinate system and polygon series', () => {
      const cfg = createBaseConfig('radar');
      const opt = buildEChartsOption(cfg, sampleData, false);

      expect(opt.radar).toBeDefined();
      expect((opt.series as any[])[0].type).toBe('radar');
    });

    it('builds combination chart with bar and line series', () => {
      const cfg = createBaseConfig('combination');
      cfg.series = [
        { id: 's1', name: 'Revenue', type: 'bar' },
        { id: 's2', name: 'Profit', type: 'line', yAxisIndex: 1 },
      ];
      cfg.axes.showSecondaryYAxis = true;

      const opt = buildEChartsOption(cfg, sampleData, false);
      expect(Array.isArray(opt.yAxis)).toBe(true);
      expect((opt.series as any[])[0].type).toBe('bar');
      expect((opt.series as any[])[1].type).toBe('line');
      expect((opt.series as any[])[1].yAxisIndex).toBe(1);
    });

    it('builds waterfall chart with base and delta bars', () => {
      const cfg = createBaseConfig('waterfall');
      const opt = buildEChartsOption(cfg, sampleData, false);

      expect((opt.series as any[]).length).toBe(2);
      expect((opt.series as any[])[0].name).toBe('Base');
      expect((opt.series as any[])[0].itemStyle.color).toBe('transparent');
    });

    it('builds histogram binned bar chart', () => {
      const cfg = createBaseConfig('histogram');
      const opt = buildEChartsOption(cfg, sampleData, false);

      expect((opt.series as any[])[0].name).toBe('Frequency');
      expect((opt.series as any[])[0].type).toBe('bar');
    });
  });

  describe('Color Palettes & Theme Adaptations', () => {
    it('resolves correct palette array', () => {
      const cfg = createBaseConfig('column-clustered');
      cfg.style.paletteId = 'corporate';
      expect(getChartPalette(cfg)).toEqual(CHART_PALETTES.corporate);

      cfg.style.paletteId = 'modern';
      expect(getChartPalette(cfg)).toEqual(CHART_PALETTES.modern);
    });

    it('adapts text and axis line colors for dark mode', () => {
      const cfg = createBaseConfig('column-clustered');
      const optLight = buildEChartsOption(cfg, sampleData, false);
      const optDark = buildEChartsOption(cfg, sampleData, true);

      expect(optLight.textStyle?.color).toBe('#334155');
      expect(optDark.textStyle?.color).toBe('#e2e8f0');
    });
  });

  describe('Interactive Features', () => {
    it('configures dataZoom slider when enableZoom is true', () => {
      const cfg = createBaseConfig('line-standard');
      cfg.axes.enableZoom = true;

      const opt = buildEChartsOption(cfg, sampleData, false);
      expect(opt.dataZoom).toBeDefined();
      expect(Array.isArray(opt.dataZoom)).toBe(true);
    });
  });
});
