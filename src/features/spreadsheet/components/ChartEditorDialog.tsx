import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Sliders,
  Download,
  Sparkles,
} from 'lucide-react';
import { Sheet } from '@/types/sheet';
import {
  ChartConfig,
  ChartType,
  ChartPaletteId,
  ChartDataOrientation,
  ChartSeriesConfig,
} from '@/types/chart';
import { NamedRange, PivotTableConfig } from '@/types/analysis';
import { extractChartData } from '@/engine/chart/chart-data-adapter';
import { CHART_PALETTES } from '@/engine/chart/echarts-builder';
import { CHART_TEMPLATES } from '@/engine/chart/chart-templates';
import { ChartView, ChartViewRef } from './ChartView';
import { a1ToRange } from '@/utils/coordinates';
import { useUIPreferencesStore } from '@/stores/ui-preferences-store';

interface ChartEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  chart: ChartConfig | null;
  onUpdateChart: (chartId: string, updates: Partial<ChartConfig>) => void;
  activeSheet: Sheet;
  namedRangeResolver?: (name: string) => NamedRange | null;
  pivotTables?: PivotTableConfig[];
}

type EditorTab = 'setup' | 'customize' | 'export';

export const ChartEditorDialog: React.FC<ChartEditorDialogProps> = ({
  isOpen,
  onClose,
  chart,
  onUpdateChart,
  activeSheet,
  namedRangeResolver,
  pivotTables,
}) => {
  const theme = useUIPreferencesStore((s) => s.theme);
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const chartViewRef = useRef<ChartViewRef>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<EditorTab>('setup');

  // Working state copy
  const [chartType, setChartType] = useState<ChartType>('column-clustered');
  const [titleText, setTitleText] = useState('');
  const [showTitle, setShowTitle] = useState(true);
  const [titleAlign, setTitleAlign] = useState<'left' | 'center' | 'right'>('center');
  const [titleFontSize, setTitleFontSize] = useState(14);
  const [titleBold, setTitleBold] = useState(true);

  const [rangeStr, setRangeStr] = useState('A1:C5');
  const [orientation, setOrientation] = useState<ChartDataOrientation>('columns');
  const [firstRowHeaders, setFirstRowHeaders] = useState(true);
  const [firstColLabels, setFirstColLabels] = useState(true);

  const [showLegend, setShowLegend] = useState(true);
  const [legendPos, setLegendPos] = useState<'top' | 'bottom' | 'left' | 'right'>('top');

  const [showXAxis, setShowXAxis] = useState(true);
  const [showYAxis, setShowYAxis] = useState(true);
  const [showSecondaryYAxis, setShowSecondaryYAxis] = useState(false);
  const [xAxisTitle, setXAxisTitle] = useState('');
  const [yAxisTitle, setYAxisTitle] = useState('');
  const [secondaryYAxisTitle, setSecondaryYAxisTitle] = useState('');
  const [minBound, setMinBound] = useState<string>('');
  const [maxBound, setMaxBound] = useState<string>('');
  const [showGridX, setShowGridX] = useState(false);
  const [showGridY, setShowGridY] = useState(true);
  const [labelRotation, setLabelRotation] = useState<number>(0);
  const [enableZoom, setEnableZoom] = useState(false);

  const [paletteId, setPaletteId] = useState<ChartPaletteId>('professional');
  const [borderRadius, setBorderRadius] = useState(8);

  const [seriesConfigs, setSeriesConfigs] = useState<ChartSeriesConfig[]>([]);

  // Export State
  const [exportFormat, setExportFormat] = useState<'png' | 'svg'>('png');
  const [exportScale, setExportScale] = useState<number>(2);
  const [transparentBg, setTransparentBg] = useState(false);

  // Sync state when chart opens
  useEffect(() => {
    if (chart && isOpen) {
      setChartType(chart.chartType);
      setTitleText(chart.title.text || '');
      setShowTitle(chart.title.show);
      setTitleAlign(chart.title.align || 'center');
      setTitleFontSize(chart.title.fontSize || 14);
      setTitleBold(chart.title.fontWeight === 'bold');

      setRangeStr(chart.source.rangeStr || '');
      setOrientation(chart.source.orientation || 'columns');
      setFirstRowHeaders(chart.source.firstRowAsHeaders);
      setFirstColLabels(chart.source.firstColAsLabels);

      setShowLegend(chart.legend.show);
      setLegendPos(chart.legend.position || 'top');

      setShowXAxis(chart.axes.showXAxis);
      setShowYAxis(chart.axes.showYAxis);
      setShowSecondaryYAxis(Boolean(chart.axes.showSecondaryYAxis));
      setXAxisTitle(chart.axes.xAxisTitle || '');
      setYAxisTitle(chart.axes.yAxisTitle || '');
      setSecondaryYAxisTitle(chart.axes.secondaryYAxisTitle || '');
      setMinBound(chart.axes.min != null ? String(chart.axes.min) : '');
      setMaxBound(chart.axes.max != null ? String(chart.axes.max) : '');
      setShowGridX(Boolean(chart.axes.showGridLinesX));
      setShowGridY(chart.axes.showGridLinesY ?? true);
      setLabelRotation(chart.axes.labelRotation || 0);
      setEnableZoom(Boolean(chart.axes.enableZoom));

      setPaletteId(chart.style.paletteId || 'professional');
      setBorderRadius(chart.style.borderRadius ?? 8);

      setSeriesConfigs(chart.series || []);
    }
  }, [chart, isOpen]);

  // Parse Range
  const parsedRange = useMemo(() => {
    return a1ToRange(rangeStr) || chart?.source.range || { startRow: 0, startCol: 0, endRow: 4, endCol: 2 };
  }, [rangeStr, chart]);

  // Construct updated Chart Config
  const currentChartConfig = useMemo<ChartConfig | null>(() => {
    if (!chart) return null;

    const minNum = minBound !== '' && !isNaN(Number(minBound)) ? Number(minBound) : null;
    const maxNum = maxBound !== '' && !isNaN(Number(maxBound)) ? Number(maxBound) : null;

    return {
      ...chart,
      chartType,
      title: {
        show: showTitle,
        text: titleText,
        fontSize: titleFontSize,
        fontWeight: titleBold ? 'bold' : 'normal',
        align: titleAlign,
      },
      source: {
        ...chart.source,
        range: parsedRange,
        rangeStr,
        orientation,
        firstRowAsHeaders: firstRowHeaders,
        firstColAsLabels: firstColLabels,
      },
      series: seriesConfigs,
      axes: {
        showXAxis,
        showYAxis,
        showSecondaryYAxis,
        xAxisTitle,
        yAxisTitle,
        secondaryYAxisTitle,
        min: minNum,
        max: maxNum,
        showGridLinesX: showGridX,
        showGridLinesY: showGridY,
        labelRotation,
        enableZoom,
      },
      legend: {
        show: showLegend,
        position: legendPos,
      },
      style: {
        ...chart.style,
        paletteId,
        borderRadius,
      },
      updatedAt: Date.now(),
    };
  }, [
    chart,
    chartType,
    showTitle,
    titleText,
    titleFontSize,
    titleBold,
    titleAlign,
    parsedRange,
    rangeStr,
    orientation,
    firstRowHeaders,
    firstColLabels,
    seriesConfigs,
    showXAxis,
    showYAxis,
    showSecondaryYAxis,
    xAxisTitle,
    yAxisTitle,
    secondaryYAxisTitle,
    minBound,
    maxBound,
    showGridX,
    showGridY,
    labelRotation,
    enableZoom,
    paletteId,
    borderRadius,
    showLegend,
    legendPos,
  ]);

  // Live Extracted Data
  const chartData = useMemo(() => {
    if (!currentChartConfig) return { categories: [], series: [] };
    return extractChartData(
      activeSheet.cells,
      currentChartConfig.source,
      namedRangeResolver,
      pivotTables,
      currentChartConfig.series
    );
  }, [activeSheet.cells, currentChartConfig, namedRangeResolver, pivotTables]);

  // Update Series Configs when extracted series changes
  useEffect(() => {
    if (chartData.series.length > 0 && seriesConfigs.length === 0) {
      setSeriesConfigs(
        chartData.series.map((s) => ({
          id: s.id,
          name: s.name,
          color: s.color,
          type: (s.type as ChartSeriesConfig['type']) || undefined,
          yAxisIndex: s.yAxisIndex,
          lineWidth: s.lineWidth,
          showMarkers: s.showMarkers,
          showDataLabels: s.showDataLabels,
        }))
      );
    }
  }, [chartData.series, seriesConfigs.length]);

  // Apply Template
  const handleApplyTemplate = (tplId: string) => {
    const tpl = CHART_TEMPLATES.find((t) => t.id === tplId);
    if (!tpl) return;
    if (tpl.style.paletteId) setPaletteId(tpl.style.paletteId);
    if (tpl.style.borderRadius !== undefined) setBorderRadius(tpl.style.borderRadius);
    if (tpl.legend.show !== undefined) setShowLegend(tpl.legend.show);
    if (tpl.legend.position) setLegendPos(tpl.legend.position);
    if (tpl.axes.showGridLinesX !== undefined) setShowGridX(tpl.axes.showGridLinesX);
    if (tpl.axes.showGridLinesY !== undefined) setShowGridY(tpl.axes.showGridLinesY);
  };

  // Save changes
  const handleSave = () => {
    if (!chart || !currentChartConfig) return;
    onUpdateChart(chart.id, currentChartConfig);
    onClose();
  };

  // Handle Export Image
  const handleDownload = () => {
    if (!chartViewRef.current) return;
    const dataUrl = chartViewRef.current.exportImage(exportFormat, {
      pixelRatio: exportScale,
      transparent: transparentBg,
    });

    if (!dataUrl) return;

    const link = document.createElement('a');
    link.download = `${titleText || 'chart'}.${exportFormat}`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen || !chart || !currentChartConfig) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-surface rounded-xl border border-border shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-secondary/40">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-accent" />
            <h2 className="text-base font-semibold text-foreground">
              Chart Editor & Customization
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab Switcher */}
            <div className="flex items-center bg-surface border border-border rounded-lg p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('setup')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  activeTab === 'setup'
                    ? 'bg-accent text-accent-foreground font-semibold shadow-xs'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                Setup
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('customize')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  activeTab === 'customize'
                    ? 'bg-accent text-accent-foreground font-semibold shadow-xs'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                Customize
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('export')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  activeTab === 'export'
                    ? 'bg-accent text-accent-foreground font-semibold shadow-xs'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                Export
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded text-foreground-muted hover:text-foreground ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body: Left Editor Pane & Right Live Canvas */}
        <div className="flex flex-1 min-h-0 overflow-hidden divide-x divide-border">
          {/* Left Editor Settings Pane */}
          <div className="w-1/2 p-5 overflow-y-auto space-y-5">
            {/* TAB 1: SETUP */}
            {activeTab === 'setup' && (
              <div className="space-y-4">
                {/* Chart Type Selector */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Chart Type
                  </label>
                  <select
                    value={chartType}
                    onChange={(e) => setChartType(e.target.value as ChartType)}
                    className="w-full px-3 py-2 text-xs bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <optgroup label="Column">
                      <option value="column-clustered">Clustered Column</option>
                      <option value="column-stacked">Stacked Column</option>
                      <option value="column-stacked-100">100% Stacked Column</option>
                    </optgroup>
                    <optgroup label="Bar">
                      <option value="bar-clustered">Clustered Bar</option>
                      <option value="bar-stacked">Stacked Bar</option>
                      <option value="bar-stacked-100">100% Stacked Bar</option>
                    </optgroup>
                    <optgroup label="Line">
                      <option value="line-standard">Line</option>
                      <option value="line-markers">Line with Markers</option>
                      <option value="line-smooth">Smooth Line</option>
                    </optgroup>
                    <optgroup label="Area">
                      <option value="area-standard">Area</option>
                      <option value="area-stacked">Stacked Area</option>
                      <option value="area-stacked-100">100% Stacked Area</option>
                    </optgroup>
                    <optgroup label="Pie & Doughnut">
                      <option value="pie-standard">Pie</option>
                      <option value="pie-doughnut">Doughnut</option>
                    </optgroup>
                    <optgroup label="Scatter">
                      <option value="scatter-standard">Scatter</option>
                      <option value="scatter-lines">Scatter with Lines</option>
                    </optgroup>
                    <optgroup label="Specialized">
                      <option value="radar">Radar</option>
                      <option value="combination">Combination (Bar + Line)</option>
                      <option value="waterfall">Waterfall</option>
                      <option value="histogram">Histogram</option>
                      <option value="funnel">Funnel</option>
                      <option value="treemap">Treemap</option>
                    </optgroup>
                  </select>
                </div>

                {/* Data Range */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Data Range
                  </label>
                  <input
                    type="text"
                    value={rangeStr}
                    onChange={(e) => setRangeStr(e.target.value)}
                    placeholder="e.g. A1:D10"
                    className="w-full px-3 py-1.5 font-mono text-xs bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>

                {/* Orientation & Headers */}
                <div className="bg-surface-secondary/40 p-3 rounded-lg border border-border/60 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">Data Orientation</span>
                    <div className="flex items-center gap-1 bg-surface border border-border rounded-md p-0.5">
                      <button
                        type="button"
                        onClick={() => setOrientation('columns')}
                        className={`px-2 py-0.5 rounded text-[11px] ${
                          orientation === 'columns'
                            ? 'bg-accent text-accent-foreground font-semibold'
                            : 'text-foreground-muted hover:text-foreground'
                        }`}
                      >
                        Columns
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrientation('rows')}
                        className={`px-2 py-0.5 rounded text-[11px] ${
                          orientation === 'rows'
                            ? 'bg-accent text-accent-foreground font-semibold'
                            : 'text-foreground-muted hover:text-foreground'
                        }`}
                      >
                        Rows
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={firstRowHeaders}
                        onChange={(e) => setFirstRowHeaders(e.target.checked)}
                        className="rounded border-border text-accent focus:ring-accent"
                      />
                      <span>First row as headers</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={firstColLabels}
                        onChange={(e) => setFirstColLabels(e.target.checked)}
                        className="rounded border-border text-accent focus:ring-accent"
                      />
                      <span>First column as labels</span>
                    </label>
                  </div>
                </div>

                {/* Series List & Type Overrides */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-foreground">
                      Data Series ({chartData.series.length})
                    </label>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {chartData.series.map((s, idx) => {
                      const cfg = seriesConfigs[idx] || { id: s.id, name: s.name };
                      return (
                        <div
                          key={s.id || idx}
                          className="p-2.5 bg-surface-secondary/40 border border-border/60 rounded-lg text-xs space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="text"
                              value={cfg.name || s.name}
                              onChange={(e) => {
                                const updated = [...seriesConfigs];
                                updated[idx] = { ...cfg, name: e.target.value };
                                setSeriesConfigs(updated);
                              }}
                              className="px-2 py-1 text-xs bg-surface border border-border rounded font-medium flex-1"
                            />

                            {/* Color Picker */}
                            <input
                              type="color"
                              value={cfg.color || CHART_PALETTES[paletteId][idx % 6] || '#1b5e20'}
                              onChange={(e) => {
                                const updated = [...seriesConfigs];
                                updated[idx] = { ...cfg, color: e.target.value };
                                setSeriesConfigs(updated);
                              }}
                              className="w-6 h-6 rounded cursor-pointer border border-border p-0 bg-transparent"
                            />
                          </div>

                          {/* Combination Chart: series visual type & axis selection */}
                          {chartType === 'combination' && (
                            <div className="flex items-center gap-2 pt-1 text-[11px]">
                              <span className="text-foreground-muted">Type:</span>
                              <select
                                value={cfg.type || 'bar'}
                                onChange={(e) => {
                                  const updated = [...seriesConfigs];
                                  updated[idx] = { ...cfg, type: e.target.value as ChartSeriesConfig['type'] };
                                  setSeriesConfigs(updated);
                                }}
                                className="px-2 py-0.5 bg-surface border border-border rounded text-[11px]"
                              >
                                <option value="bar">Bar</option>
                                <option value="line">Line</option>
                              </select>

                              <span className="text-foreground-muted ml-2">Axis:</span>
                              <select
                                value={cfg.yAxisIndex || 0}
                                onChange={(e) => {
                                  const updated = [...seriesConfigs];
                                  updated[idx] = { ...cfg, yAxisIndex: Number(e.target.value) };
                                  setSeriesConfigs(updated);
                                }}
                                className="px-2 py-0.5 bg-surface border border-border rounded text-[11px]"
                              >
                                <option value={0}>Primary Y</option>
                                <option value={1}>Secondary Y</option>
                              </select>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: CUSTOMIZE */}
            {activeTab === 'customize' && (
              <div className="space-y-4">
                {/* Template Preset Styles */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Sparkles className="w-3.5 h-3.5 text-accent" />
                    <span>Preset Chart Styles</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {CHART_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => handleApplyTemplate(tpl.id)}
                        className={`p-2 rounded-lg border text-left text-xs transition-colors ${
                          paletteId === tpl.style.paletteId
                            ? 'border-accent bg-accent/10 ring-1 ring-accent'
                            : 'border-border bg-surface-secondary/40 hover:bg-surface-secondary'
                        }`}
                      >
                        <div className="font-semibold text-foreground">{tpl.name}</div>
                        <div className="text-[10px] text-foreground-muted truncate">
                          {tpl.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Palette */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Color Palette
                  </label>
                  <select
                    value={paletteId}
                    onChange={(e) => setPaletteId(e.target.value as ChartPaletteId)}
                    className="w-full px-3 py-1.5 text-xs bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="professional">Professional (OmniSheet Green / Navy)</option>
                    <option value="corporate">Corporate (Teal / Emerald)</option>
                    <option value="modern">Modern SaaS (Indigo / Emerald / Amber)</option>
                    <option value="minimal">Minimal (Grayscale / Slate)</option>
                    <option value="monochrome">Monochrome (Single-hue Slate)</option>
                    <option value="presentation">Presentation (High-contrast Vivid)</option>
                  </select>

                  <div className="flex items-center gap-1 mt-2">
                    {CHART_PALETTES[paletteId]?.slice(0, 8).map((color, idx) => (
                      <div
                        key={idx}
                        className="w-5 h-5 rounded-full border border-border/80 shadow-xs"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Chart Title Customization */}
                <div className="bg-surface-secondary/40 p-3 rounded-lg border border-border/60 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">Chart Title</span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showTitle}
                        onChange={(e) => setShowTitle(e.target.checked)}
                        className="rounded border-border text-accent focus:ring-accent"
                      />
                      <span>Show Title</span>
                    </label>
                  </div>

                  {showTitle && (
                    <>
                      <input
                        type="text"
                        value={titleText}
                        onChange={(e) => setTitleText(e.target.value)}
                        placeholder="Chart Title"
                        className="w-full px-3 py-1.5 text-xs bg-surface border border-border rounded-lg"
                      />

                      <div className="flex items-center justify-between text-xs pt-1">
                        <div className="flex items-center gap-1">
                          <span className="text-foreground-muted">Align:</span>
                          {(['left', 'center', 'right'] as const).map((align) => (
                            <button
                              key={align}
                              type="button"
                              onClick={() => setTitleAlign(align)}
                              className={`px-2 py-0.5 rounded text-[11px] capitalize ${
                                titleAlign === align
                                  ? 'bg-accent text-accent-foreground font-semibold'
                                  : 'text-foreground-muted hover:text-foreground'
                              }`}
                            >
                              {align}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={titleBold}
                              onChange={(e) => setTitleBold(e.target.checked)}
                              className="rounded border-border text-accent focus:ring-accent"
                            />
                            <span>Bold</span>
                          </label>

                          <select
                            value={titleFontSize}
                            onChange={(e) => setTitleFontSize(Number(e.target.value))}
                            className="px-2 py-0.5 bg-surface border border-border rounded text-[11px]"
                          >
                            <option value={12}>12px</option>
                            <option value={14}>14px</option>
                            <option value={16}>16px</option>
                            <option value={18}>18px</option>
                          </select>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Legend Customization */}
                <div className="bg-surface-secondary/40 p-3 rounded-lg border border-border/60 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">Legend</span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showLegend}
                        onChange={(e) => setShowLegend(e.target.checked)}
                        className="rounded border-border text-accent focus:ring-accent"
                      />
                      <span>Show Legend</span>
                    </label>
                  </div>

                  {showLegend && (
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-foreground-muted mr-1">Position:</span>
                      {(['top', 'bottom', 'left', 'right'] as const).map((pos) => (
                        <button
                          key={pos}
                          type="button"
                          onClick={() => setLegendPos(pos)}
                          className={`px-2.5 py-1 rounded text-xs capitalize ${
                            legendPos === pos
                              ? 'bg-accent text-accent-foreground font-semibold'
                              : 'text-foreground-muted hover:text-foreground bg-surface border border-border'
                          }`}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Axes Customization */}
                <div className="bg-surface-secondary/40 p-3 rounded-lg border border-border/60 space-y-3">
                  <span className="block text-xs font-semibold text-foreground">
                    Axes & Gridlines
                  </span>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-foreground-muted mb-1">X-Axis Title</label>
                      <input
                        type="text"
                        value={xAxisTitle}
                        onChange={(e) => setXAxisTitle(e.target.value)}
                        placeholder="e.g. Month"
                        className="w-full px-2 py-1 bg-surface border border-border rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-foreground-muted mb-1">Y-Axis Title</label>
                      <input
                        type="text"
                        value={yAxisTitle}
                        onChange={(e) => setYAxisTitle(e.target.value)}
                        placeholder="e.g. Revenue ($)"
                        className="w-full px-2 py-1 bg-surface border border-border rounded text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-foreground-muted mb-1">Min Value</label>
                      <input
                        type="number"
                        value={minBound}
                        onChange={(e) => setMinBound(e.target.value)}
                        placeholder="Auto"
                        className="w-full px-2 py-1 bg-surface border border-border rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-foreground-muted mb-1">Max Value</label>
                      <input
                        type="number"
                        value={maxBound}
                        onChange={(e) => setMaxBound(e.target.value)}
                        placeholder="Auto"
                        className="w-full px-2 py-1 bg-surface border border-border rounded text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showGridY}
                        onChange={(e) => setShowGridY(e.target.checked)}
                        className="rounded border-border text-accent focus:ring-accent"
                      />
                      <span>Horizontal Gridlines</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showGridX}
                        onChange={(e) => setShowGridX(e.target.checked)}
                        className="rounded border-border text-accent focus:ring-accent"
                      />
                      <span>Vertical Gridlines</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableZoom}
                        onChange={(e) => setEnableZoom(e.target.checked)}
                        className="rounded border-border text-accent focus:ring-accent"
                      />
                      <span>Zoom / Pan Slider</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: EXPORT */}
            {activeTab === 'export' && (
              <div className="space-y-4">
                <div className="p-4 bg-surface-secondary/40 border border-border/60 rounded-xl space-y-4">
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-accent" />
                    <span className="text-xs font-semibold text-foreground">
                      Export High-Resolution Image
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-foreground-muted mb-1">Image Format</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setExportFormat('png')}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                            exportFormat === 'png'
                              ? 'bg-accent/15 border-accent text-accent font-semibold'
                              : 'border-border bg-surface text-foreground-muted'
                          }`}
                        >
                          PNG (Raster / High DPI)
                        </button>
                        <button
                          type="button"
                          onClick={() => setExportFormat('svg')}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                            exportFormat === 'svg'
                              ? 'bg-accent/15 border-accent text-accent font-semibold'
                              : 'border-border bg-surface text-foreground-muted'
                          }`}
                        >
                          SVG (Vector / Scalable)
                        </button>
                      </div>
                    </div>

                    {exportFormat === 'png' && (
                      <div>
                        <label className="block text-foreground-muted mb-1">Resolution Scale</label>
                        <div className="flex items-center gap-2">
                          {[1, 2, 3].map((scale) => (
                            <button
                              key={scale}
                              type="button"
                              onClick={() => setExportScale(scale)}
                              className={`px-3 py-1 rounded-md border text-xs ${
                                exportScale === scale
                                  ? 'bg-accent text-accent-foreground font-semibold'
                                  : 'border-border bg-surface text-foreground-muted'
                              }`}
                            >
                              {scale}x ({scale === 1 ? 'Standard' : scale === 2 ? 'Retina' : 'Print 300 DPI'})
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={transparentBg}
                          onChange={(e) => setTransparentBg(e.target.checked)}
                          className="rounded border-border text-accent focus:ring-accent"
                        />
                        <span>Transparent Background</span>
                      </label>
                    </div>

                    <div className="pt-3">
                      <button
                        type="button"
                        onClick={handleDownload}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold bg-accent text-accent-foreground hover:bg-accent/90 rounded-lg shadow-xs transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Download {exportFormat.toUpperCase()} Image
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Live Preview Canvas */}
          <div className="w-1/2 p-5 flex flex-col bg-surface-secondary/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                Live Preview
              </span>
              <span className="text-[11px] text-foreground-muted">
                {currentChartConfig.position.width} × {currentChartConfig.position.height} px
              </span>
            </div>

            <div className="flex-1 w-full bg-surface border border-border rounded-xl p-3 flex flex-col justify-center items-center shadow-xs overflow-hidden relative">
              <div className="w-full h-full min-h-[300px]">
                <ChartView
                  ref={chartViewRef}
                  config={currentChartConfig}
                  data={chartData}
                  isDark={isDark}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-border bg-surface-secondary/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-foreground-muted hover:text-foreground rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-xs font-semibold bg-accent text-accent-foreground hover:bg-accent/90 rounded-lg shadow-xs transition-colors"
          >
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
};
