import type { EChartsOption } from 'echarts';
import {
  ChartConfig,
  ChartPaletteId,
  ExtractedChartData,
} from '@/types/chart';
import {
  buildHistogramData,
  buildWaterfallData,
  buildRadarData,
  buildHierarchicalData,
} from './chart-data-adapter';

/**
 * Built-in Color Palettes for OmniSheet Charts.
 */
export const CHART_PALETTES: Record<ChartPaletteId, string[]> = {
  professional: [
    '#1b5e20',
    '#1565c0',
    '#e65100',
    '#6a1b9a',
    '#00838f',
    '#ad1457',
    '#2e7d32',
    '#283593',
  ],
  corporate: [
    '#004c6d',
    '#257d9d',
    '#4d9fb7',
    '#76c2d1',
    '#0284c7',
    '#0369a1',
    '#075985',
    '#0c4a6e',
  ],
  modern: [
    '#6366f1',
    '#ec4899',
    '#f59e0b',
    '#10b981',
    '#3b82f6',
    '#8b5cf6',
    '#14b8a6',
    '#f43f5e',
  ],
  minimal: [
    '#1f2937',
    '#4b5563',
    '#6b7280',
    '#9ca3af',
    '#374151',
    '#111827',
    '#475569',
    '#64748b',
  ],
  monochrome: [
    '#0f172a',
    '#334155',
    '#475569',
    '#64748b',
    '#94a3b8',
    '#1e293b',
    '#0284c7',
    '#38bdf8',
  ],
  presentation: [
    '#ef4444',
    '#f97316',
    '#eab308',
    '#22c55e',
    '#06b6d4',
    '#3b82f6',
    '#a855f7',
    '#ec4899',
  ],
  custom: [
    '#1b5e20',
    '#1565c0',
    '#e65100',
    '#6a1b9a',
    '#00838f',
    '#ad1457',
  ],
};

/**
 * Resolves color palette based on configuration and custom overrides.
 */
export function getChartPalette(config: ChartConfig): string[] {
  if (config.style.paletteId === 'custom' && config.style.customColors?.length) {
    return config.style.customColors;
  }
  return CHART_PALETTES[config.style.paletteId] || CHART_PALETTES.professional;
}

/**
 * Normalizes dataset across categories so that each category sums to 100%.
 */
function normalizeTo100Percent(
  categoriesCount: number,
  seriesList: { values: (number | null)[] }[]
): (number | null)[][] {
  const result: (number | null)[][] = seriesList.map(() => []);

  for (let c = 0; c < categoriesCount; c++) {
    let sum = 0;
    for (const s of seriesList) {
      const v = s.values[c];
      if (typeof v === 'number' && !isNaN(v) && v > 0) {
        sum += v;
      }
    }

    for (let sIdx = 0; sIdx < seriesList.length; sIdx++) {
      const target = result[sIdx];
      const seriesItem = seriesList[sIdx];
      if (target && seriesItem) {
        const v = seriesItem.values[c];
        if (sum > 0 && typeof v === 'number' && !isNaN(v)) {
          target.push(Number(((v / sum) * 100).toFixed(1)));
        } else {
          target.push(0);
        }
      }
    }
  }

  return result;
}

/**
 * Builds a complete EChartsOption matching OmniSheet specifications.
 */
export function buildEChartsOption(
  config: ChartConfig,
  data: ExtractedChartData,
  isDark: boolean
): EChartsOption {
  const palette = getChartPalette(config);
  const textColor = isDark ? '#e2e8f0' : '#334155';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const splitLineColor = isDark ? '#334155' : '#f1f5f9';
  const axisLineColor = isDark ? '#475569' : '#cbd5e1';
  const tooltipBg = isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)';
  const tooltipBorder = isDark ? '#475569' : '#e2e8f0';

  const chartType = config.chartType;

  // Base Option Structure
  const option: EChartsOption = {
    color: palette,
    backgroundColor: config.style.backgroundColor || 'transparent',
    animation: true,
    textStyle: {
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      color: textColor,
    },
    title: config.title.show
      ? {
          text: config.title.text || 'Chart Title',
          left: config.title.align || 'center',
          textStyle: {
            color: textColor,
            fontSize: config.title.fontSize || 14,
            fontWeight: config.title.fontWeight || 'bold',
          },
          padding: [8, 12],
        }
      : undefined,
    tooltip: {
      trigger: chartType.startsWith('pie') || chartType === 'funnel' || chartType === 'treemap'
        ? 'item'
        : 'axis',
      backgroundColor: tooltipBg,
      borderColor: tooltipBorder,
      borderWidth: 1,
      textStyle: {
        color: textColor,
        fontSize: 12,
      },
      axisPointer: {
        type: chartType.startsWith('column') || chartType.startsWith('bar') ? 'shadow' : 'line',
      },
    },
    legend: config.legend.show
      ? {
          show: true,
          orient:
            config.legend.position === 'left' || config.legend.position === 'right'
              ? 'vertical'
              : 'horizontal',
          top: config.legend.position === 'top' ? 30 : config.legend.position === 'bottom' ? 'bottom' : 'middle',
          left: config.legend.position === 'left' ? 'left' : config.legend.position === 'right' ? 'right' : 'center',
          textStyle: {
            color: textColor,
            fontSize: 11,
          },
          type: 'scroll',
        }
      : { show: false },
    grid: {
      left: config.legend.show && config.legend.position === 'left' ? 90 : 50,
      right:
        config.axes.showSecondaryYAxis ||
        (config.legend.show && config.legend.position === 'right')
          ? 70
          : 30,
      top: config.title.show ? 60 : 35,
      bottom:
        config.legend.show && config.legend.position === 'bottom'
          ? 55
          : config.axes.enableZoom
          ? 60
          : 35,
      containLabel: true,
    },
  };

  // Zoom slider if enabled
  if (config.axes.enableZoom) {
    option.dataZoom = [
      {
        type: 'inside',
      },
      {
        type: 'slider',
        height: 18,
        bottom: 5,
        borderColor: axisLineColor,
        textStyle: { color: textMuted, fontSize: 10 },
      },
    ];
  }

  // Specialized Chart Handlers: Pie / Doughnut
  if (chartType === 'pie-standard' || chartType === 'pie-doughnut') {
    const isDoughnut = chartType === 'pie-doughnut';
    const firstSeries = data.series[0];
    const pieData = data.categories.map((cat, idx) => ({
      name: cat,
      value: firstSeries?.values[idx] ?? 0,
    }));

    option.series = [
      {
        name: firstSeries?.name || config.title.text || 'Series',
        type: 'pie',
        radius: isDoughnut ? ['40%', '70%'] : '65%',
        center: ['50%', config.title.show ? '55%' : '50%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: isDoughnut ? 4 : 0,
          borderColor: isDark ? '#1e293b' : '#ffffff',
          borderWidth: 2,
        },
        label: {
          show: true,
          color: textColor,
          formatter: '{b}: {d}%',
        },
        data: pieData,
      },
    ];
    return option;
  }

  // Specialized Chart Handlers: Radar
  if (chartType === 'radar') {
    const radarData = buildRadarData(data.categories, data.series);
    option.radar = {
      indicator: radarData.indicators,
      shape: 'polygon',
      splitArea: {
        show: true,
        areaStyle: {
          color: isDark
            ? ['rgba(51, 65, 85, 0.4)', 'rgba(30, 41, 59, 0.4)']
            : ['rgba(241, 245, 249, 0.5)', 'rgba(255, 255, 255, 0.5)'],
        },
      },
      axisLine: { lineStyle: { color: axisLineColor } },
      splitLine: { lineStyle: { color: splitLineColor } },
      axisName: { color: textMuted },
    };

    option.series = [
      {
        type: 'radar',
        data: radarData.seriesData.map((s, idx) => ({
          name: s.name,
          value: s.value,
          areaStyle: {
            opacity: 0.25,
            color: palette[idx % palette.length],
          },
        })),
      },
    ];
    return option;
  }

  // Specialized Chart Handlers: Funnel
  if (chartType === 'funnel') {
    const funnelItems = buildHierarchicalData(data.categories, data.series);
    option.series = [
      {
        type: 'funnel',
        left: '10%',
        top: config.title.show ? 60 : 30,
        bottom: 30,
        width: '80%',
        minSize: '0%',
        maxSize: '100%',
        sort: 'descending',
        gap: 2,
        label: {
          show: true,
          position: 'inside',
          color: '#ffffff',
          formatter: '{b}: {c}',
        },
        itemStyle: {
          borderColor: isDark ? '#1e293b' : '#ffffff',
          borderWidth: 1,
        },
        data: funnelItems,
      },
    ];
    return option;
  }

  // Specialized Chart Handlers: Treemap
  if (chartType === 'treemap') {
    const treemapItems = buildHierarchicalData(data.categories, data.series);
    option.series = [
      {
        type: 'treemap',
        left: '5%',
        right: '5%',
        top: config.title.show ? 55 : 25,
        bottom: '5%',
        breadcrumb: { show: false },
        label: {
          show: true,
          formatter: '{b}\n{c}',
          color: '#ffffff',
        },
        data: treemapItems,
      },
    ];
    return option;
  }

  // Specialized Chart Handlers: Histogram
  if (chartType === 'histogram') {
    const allNums = data.series.flatMap((s) => s.values);
    const hist = buildHistogramData(allNums);

    option.xAxis = {
      type: 'category',
      data: hist.categories,
      axisLabel: { color: textMuted, rotate: 20 },
      axisLine: { lineStyle: { color: axisLineColor } },
    };
    option.yAxis = {
      type: 'value',
      name: 'Frequency',
      axisLabel: { color: textMuted },
      splitLine: { lineStyle: { color: splitLineColor } },
    };
    option.series = [
      {
        name: 'Frequency',
        type: 'bar',
        barWidth: '95%',
        data: hist.counts,
        itemStyle: { color: palette[0] },
        label: { show: true, position: 'top', color: textColor },
      },
    ];
    return option;
  }

  // Specialized Chart Handlers: Waterfall
  if (chartType === 'waterfall') {
    const firstSeries = data.series[0];
    const wf = buildWaterfallData(data.categories, firstSeries?.values || []);

    option.xAxis = {
      type: 'category',
      data: wf.categories,
      axisLabel: { color: textMuted },
      axisLine: { lineStyle: { color: axisLineColor } },
    };
    option.yAxis = {
      type: 'value',
      axisLabel: { color: textMuted },
      splitLine: { lineStyle: { color: splitLineColor } },
    };
    option.series = [
      // Base bar (transparent placeholder)
      {
        name: 'Base',
        type: 'bar',
        stack: 'all',
        silent: true,
        itemStyle: {
          borderColor: 'transparent',
          color: 'transparent',
        },
        data: wf.baseValues,
      },
      // Floating Delta bar
      {
        name: firstSeries?.name || 'Change',
        type: 'bar',
        stack: 'all',
        data: wf.deltaValues.map((val, idx) => ({
          value: val,
          itemStyle: {
            color: wf.isPositive[idx] ? '#22c55e' : '#ef4444',
          },
        })),
        label: { show: true, position: 'top', color: textColor },
      },
    ];
    return option;
  }

  // Scatter Charts
  if (chartType === 'scatter-standard' || chartType === 'scatter-lines') {
    const isLines = chartType === 'scatter-lines';

    // Pair series 0 with series 1, or use index as X
    const s0 = data.series[0];
    const s1 = data.series[1];

    const scatterPairs: [number, number][] = [];
    if (s0 && s1) {
      const len = Math.min(s0.values.length, s1.values.length);
      for (let i = 0; i < len; i++) {
        const x = s0.values[i];
        const y = s1.values[i];
        if (typeof x === 'number' && typeof y === 'number' && !isNaN(x) && !isNaN(y)) {
          scatterPairs.push([x, y]);
        }
      }
    } else if (s0) {
      for (let i = 0; i < s0.values.length; i++) {
        const y = s0.values[i];
        if (typeof y === 'number' && !isNaN(y)) {
          scatterPairs.push([i + 1, y]);
        }
      }
    }

    option.xAxis = {
      type: 'value',
      name: s0?.name || config.axes.xAxisTitle || 'X',
      axisLabel: { color: textMuted },
      axisLine: { lineStyle: { color: axisLineColor } },
      splitLine: { lineStyle: { color: splitLineColor } },
    };
    option.yAxis = {
      type: 'value',
      name: s1?.name || config.axes.yAxisTitle || 'Y',
      axisLabel: { color: textMuted },
      axisLine: { lineStyle: { color: axisLineColor } },
      splitLine: { lineStyle: { color: splitLineColor } },
    };
    option.series = [
      {
        name: config.title.text || 'Scatter',
        type: isLines ? 'line' : 'scatter',
        symbolSize: 8,
        data: scatterPairs,
        itemStyle: { color: palette[0] },
      },
    ];
    return option;
  }

  // Standard Cartesian Charts: Column, Bar, Line, Area, Combination
  const isHorizontalBar = chartType.startsWith('bar');
  const is100Percent = chartType.includes('stacked-100');
  const isStacked = chartType.includes('stacked');

  // Handle 100% stacked normalization if applicable
  const seriesValuesMatrix: (number | null)[][] = is100Percent
    ? normalizeTo100Percent(data.categories.length, data.series)
    : data.series.map((s) => s.values);

  // Common X/Y Axis Setup
  const categoryAxis = {
    type: 'category' as const,
    data: data.categories,
    axisLabel: {
      color: textMuted,
      rotate: config.axes.labelRotation || (data.categories.length > 8 ? 30 : 0),
    },
    axisLine: { lineStyle: { color: axisLineColor } },
    show: isHorizontalBar ? config.axes.showYAxis : config.axes.showXAxis,
    name: isHorizontalBar ? config.axes.yAxisTitle : config.axes.xAxisTitle,
  };

  const valueAxis = {
    type: 'value' as const,
    min: is100Percent ? 0 : config.axes.min !== null && config.axes.min !== undefined ? config.axes.min : undefined,
    max: is100Percent ? 100 : config.axes.max !== null && config.axes.max !== undefined ? config.axes.max : undefined,
    axisLabel: {
      color: textMuted,
      formatter: is100Percent ? '{value}%' : undefined,
    },
    axisLine: { lineStyle: { color: axisLineColor } },
    splitLine: {
      show: isHorizontalBar ? config.axes.showGridLinesX : config.axes.showGridLinesY,
      lineStyle: { color: splitLineColor },
    },
    show: isHorizontalBar ? config.axes.showXAxis : config.axes.showYAxis,
    name: isHorizontalBar ? config.axes.xAxisTitle : config.axes.yAxisTitle,
  };

  if (isHorizontalBar) {
    option.xAxis = valueAxis;
    option.yAxis = categoryAxis;
  } else {
    option.xAxis = categoryAxis;
    option.yAxis = config.axes.showSecondaryYAxis
      ? [
          valueAxis,
          {
            type: 'value',
            name: config.axes.secondaryYAxisTitle,
            axisLabel: { color: textMuted },
            splitLine: { show: false },
          },
        ]
      : valueAxis;
  }

  // Build Series definitions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const echartsSeries: any[] = [];

  for (let i = 0; i < data.series.length; i++) {
    const s = data.series[i];
    if (!s) continue;
    const values = seriesValuesMatrix[i] || [];

    const seriesConfig = config.series.find((cs) => cs.id === s.id) || config.series[i];
    const resolvedType = s.type || seriesConfig?.type;
    const resolvedYAxis = s.yAxisIndex !== undefined ? s.yAxisIndex : seriesConfig?.yAxisIndex || 0;
    const resolvedColor = s.color || seriesConfig?.color || palette[i % palette.length];
    const resolvedMarkers = s.showMarkers ?? seriesConfig?.showMarkers;
    const resolvedDataLabels = s.showDataLabels ?? seriesConfig?.showDataLabels;
    const resolvedLineWidth = s.lineWidth ?? seriesConfig?.lineWidth;

    let seriesType: 'bar' | 'line' = 'bar';
    let isSmooth = false;
    let showMarkers = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let areaStyle: any = undefined;

    if (chartType === 'combination') {
      seriesType = resolvedType === 'line' ? 'line' : 'bar';
      if (seriesType === 'line') {
        showMarkers = resolvedMarkers ?? true;
      }
    } else if (chartType.startsWith('column') || chartType.startsWith('bar')) {
      seriesType = 'bar';
    } else if (chartType.startsWith('line')) {
      seriesType = 'line';
      isSmooth = chartType === 'line-smooth';
      showMarkers = chartType === 'line-markers' || (resolvedMarkers ?? false);
    } else if (chartType.startsWith('area')) {
      seriesType = 'line';
      showMarkers = resolvedMarkers ?? false;
      areaStyle = {
        opacity: isStacked ? 0.4 : 0.25,
      };
    }

    echartsSeries.push({
      name: s.name,
      type: seriesType,
      stack: isStacked ? 'total' : undefined,
      yAxisIndex: resolvedYAxis,
      data: values,
      smooth: isSmooth,
      showSymbol: showMarkers,
      symbolSize: 6,
      lineStyle: resolvedLineWidth ? { width: resolvedLineWidth } : undefined,
      itemStyle: {
        color: resolvedColor,
        borderRadius: seriesType === 'bar' && !isStacked ? 2 : 0,
      },
      areaStyle,
      label: resolvedDataLabels
        ? {
            show: true,
            position: seriesType === 'bar' ? (isHorizontalBar ? 'right' : 'top') : 'top',
            color: textColor,
            fontSize: 10,
          }
        : undefined,
    });
  }

  option.series = echartsSeries;
  return option;
}
