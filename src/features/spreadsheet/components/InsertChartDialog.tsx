import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  BarChart3,
  Check,
} from 'lucide-react';
import { Sheet } from '@/types/sheet';
import { CellRange, CellCoordinates } from '@/types/cell';
import {
  ChartConfig,
  ChartType,
  ChartDataOrientation,
  ChartSourceConfig,
} from '@/types/chart';
import { NamedRange, PivotTableConfig } from '@/types/analysis';
import {
  detectChartDataRange,
  extractChartData,
} from '@/engine/chart/chart-data-adapter';
import { ChartView } from './ChartView';
import { formatRangeLabel } from '@/engine/grid/selection';
import { a1ToRange } from '@/utils/coordinates';
import { useUIPreferencesStore } from '@/stores/ui-preferences-store';

interface InsertChartDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (chart: ChartConfig) => void;
  activeSheet: Sheet;
  activeCell?: CellCoordinates | null;
  selectedRange?: CellRange | null;
  namedRanges?: NamedRange[];
  pivotTables?: PivotTableConfig[];
  namedRangeResolver?: (name: string) => NamedRange | null;
}

interface ChartTypeOption {
  type: ChartType;
  label: string;
  category: 'column' | 'bar' | 'line' | 'area' | 'pie' | 'scatter' | 'specialized';
  description: string;
}

const CHART_TYPES: ChartTypeOption[] = [
  // Column
  { type: 'column-clustered', label: 'Clustered Column', category: 'column', description: 'Compare values across categories with vertical bars.' },
  { type: 'column-stacked', label: 'Stacked Column', category: 'column', description: 'Show total and component proportions vertically.' },
  { type: 'column-stacked-100', label: '100% Stacked Column', category: 'column', description: 'Compare relative percentage contribution across categories.' },
  // Bar
  { type: 'bar-clustered', label: 'Clustered Bar', category: 'bar', description: 'Horizontal bars ideal for lengthy category labels.' },
  { type: 'bar-stacked', label: 'Stacked Bar', category: 'bar', description: 'Horizontal stacked proportions.' },
  { type: 'bar-stacked-100', label: '100% Stacked Bar', category: 'bar', description: 'Horizontal percentage distribution.' },
  // Line
  { type: 'line-standard', label: 'Line', category: 'line', description: 'Track continuous trends over time or sequence.' },
  { type: 'line-markers', label: 'Line with Markers', category: 'line', description: 'Emphasize individual discrete data points.' },
  { type: 'line-smooth', label: 'Smooth Line', category: 'line', description: 'Curved spline interpolation across series.' },
  // Area
  { type: 'area-standard', label: 'Area', category: 'area', description: 'Display magnitude of change under lines.' },
  { type: 'area-stacked', label: 'Stacked Area', category: 'area', description: 'Show cumulative progression and part-to-whole.' },
  { type: 'area-stacked-100', label: '100% Stacked Area', category: 'area', description: 'Proportional percentage volume over time.' },
  // Pie & Doughnut
  { type: 'pie-standard', label: 'Pie', category: 'pie', description: 'Classic circle proportion of single series.' },
  { type: 'pie-doughnut', label: 'Doughnut', category: 'pie', description: 'Hollow ring with clean modern aesthetic.' },
  // Scatter
  { type: 'scatter-standard', label: 'Scatter (XY)', category: 'scatter', description: 'Observe correlation between two numeric metrics.' },
  { type: 'scatter-lines', label: 'Scatter with Lines', category: 'scatter', description: 'Connected coordinate points.' },
  // Specialized
  { type: 'radar', label: 'Radar', category: 'specialized', description: 'Multi-variable spider chart comparing metrics.' },
  { type: 'combination', label: 'Combination (Bar + Line)', category: 'specialized', description: 'Dual visual types on shared or dual axes.' },
  { type: 'waterfall', label: 'Waterfall', category: 'specialized', description: 'Visualize cumulative impact of positive/negative entries.' },
  { type: 'histogram', label: 'Histogram', category: 'specialized', description: 'Binned frequency distribution of values.' },
  { type: 'funnel', label: 'Funnel', category: 'specialized', description: 'Pipeline stage conversion drop-off.' },
  { type: 'treemap', label: 'Treemap', category: 'specialized', description: 'Hierarchical nested colored rectangles.' },
];

export const InsertChartDialog: React.FC<InsertChartDialogProps> = ({
  isOpen,
  onClose,
  onInsert,
  activeSheet,
  activeCell,
  selectedRange,
  namedRanges = [],
  pivotTables = [],
  namedRangeResolver,
}) => {
  const theme = useUIPreferencesStore((s) => s.theme);
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Form State
  const [title, setTitle] = useState('Chart Title');
  const [chartType, setChartType] = useState<ChartType>('column-clustered');
  const [sourceType, setSourceType] = useState<'range' | 'namedRange' | 'pivot'>('range');
  const [rangeInput, setRangeInput] = useState('A1:C5');
  const [selectedNamedRange, setSelectedNamedRange] = useState('');
  const [selectedPivotTable, setSelectedPivotTable] = useState('');
  const [orientation, setOrientation] = useState<ChartDataOrientation>('columns');
  const [firstRowHeaders, setFirstRowHeaders] = useState(true);
  const [firstColLabels, setFirstColLabels] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [rangeError, setRangeError] = useState<string | null>(null);

  // Auto-detect candidate range on open
  useEffect(() => {
    if (isOpen) {
      const autoRange = detectChartDataRange(activeSheet.cells, activeCell, selectedRange);
      const label = formatRangeLabel(autoRange);
      setRangeInput(label);
      setTitle('Chart Title');
      setRangeError(null);
      if (namedRanges.length > 0 && selectedNamedRange === '') {
        setSelectedNamedRange(namedRanges[0]?.name || '');
      }
      if (pivotTables.length > 0 && selectedPivotTable === '') {
        setSelectedPivotTable(pivotTables[0]?.id || '');
      }
    }
  }, [isOpen, activeSheet, activeCell, selectedRange, namedRanges, pivotTables, selectedNamedRange, selectedPivotTable]);

  // Parse active cell range
  const parsedRange = useMemo<CellRange>(() => {
    if (sourceType === 'range') {
      const parsed = a1ToRange(rangeInput);
      if (parsed) {
        return parsed;
      }
    }
    return detectChartDataRange(activeSheet.cells, activeCell, selectedRange);
  }, [sourceType, rangeInput, activeSheet, activeCell, selectedRange]);

  // Validate range input
  useEffect(() => {
    if (sourceType === 'range') {
      const parsed = a1ToRange(rangeInput);
      if (!parsed) {
        setRangeError('Invalid range format (e.g. A1:D10)');
      } else {
        setRangeError(null);
      }
    } else {
      setRangeError(null);
    }
  }, [rangeInput, sourceType]);

  // Construct source config
  const sourceConfig = useMemo<ChartSourceConfig>(() => {
    return {
      sheetId: activeSheet.id,
      range: parsedRange,
      rangeStr: rangeInput,
      orientation,
      firstRowAsHeaders: firstRowHeaders,
      firstColAsLabels: firstColLabels,
      namedRangeName: sourceType === 'namedRange' ? selectedNamedRange : undefined,
      pivotTableId: sourceType === 'pivot' ? selectedPivotTable : undefined,
    };
  }, [
    activeSheet.id,
    parsedRange,
    rangeInput,
    orientation,
    firstRowHeaders,
    firstColLabels,
    sourceType,
    selectedNamedRange,
    selectedPivotTable,
  ]);

  // Preview Data extraction
  const previewData = useMemo(() => {
    return extractChartData(
      activeSheet.cells,
      sourceConfig,
      namedRangeResolver,
      pivotTables
    );
  }, [activeSheet.cells, sourceConfig, namedRangeResolver, pivotTables]);

  // Preview Chart Config
  const previewChartConfig = useMemo<ChartConfig>(() => {
    return {
      id: 'preview',
      sheetId: activeSheet.id,
      title: {
        show: Boolean(title.trim()),
        text: title.trim() || 'Chart Title',
        fontSize: 14,
        fontWeight: 'bold',
        align: 'center',
      },
      chartType,
      source: sourceConfig,
      series: [],
      axes: {
        showXAxis: true,
        showYAxis: true,
        showGridLinesX: false,
        showGridLinesY: true,
      },
      legend: {
        show: true,
        position: 'top',
      },
      style: {
        paletteId: 'professional',
        borderRadius: 8,
      },
      position: {
        anchorCell: activeCell || { row: 1, col: 1 },
        offsetX: 30,
        offsetY: 30,
        width: 480,
        height: 320,
        zIndex: 20,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }, [activeSheet.id, title, chartType, sourceConfig, activeCell]);

  // Filtered Chart Types
  const displayedTypes = useMemo(() => {
    if (activeCategory === 'all') return CHART_TYPES;
    return CHART_TYPES.filter((c) => c.category === activeCategory);
  }, [activeCategory]);

  const handleCreate = () => {
    if (rangeError) return;

    const newChart: ChartConfig = {
      ...previewChartConfig,
      id: `chart_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    onInsert(newChart);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-surface rounded-xl border border-border shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-secondary/40">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-accent" />
            <h2 className="text-base font-semibold text-foreground">Insert Chart</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-foreground-muted hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content: Left Setup Pane & Right Live Preview */}
        <div className="flex flex-1 min-h-0 overflow-hidden divide-x divide-border">
          {/* Left Form Settings */}
          <div className="w-1/2 p-5 overflow-y-auto space-y-4">
            {/* Chart Title */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Chart Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Monthly Revenue Breakdown"
                className="w-full px-3 py-1.5 text-xs bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            {/* Source Data Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-foreground">
                Data Source
              </label>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setSourceType('range')}
                  className={`px-3 py-1 rounded-md border text-xs font-medium transition-colors ${
                    sourceType === 'range'
                      ? 'bg-accent/15 border-accent text-accent font-semibold'
                      : 'border-border text-foreground-muted hover:bg-surface-secondary'
                  }`}
                >
                  Cell Range
                </button>
                {namedRanges.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSourceType('namedRange')}
                    className={`px-3 py-1 rounded-md border text-xs font-medium transition-colors ${
                      sourceType === 'namedRange'
                        ? 'bg-accent/15 border-accent text-accent font-semibold'
                        : 'border-border text-foreground-muted hover:bg-surface-secondary'
                    }`}
                  >
                    Named Range
                  </button>
                )}
                {pivotTables.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSourceType('pivot')}
                    className={`px-3 py-1 rounded-md border text-xs font-medium transition-colors ${
                      sourceType === 'pivot'
                        ? 'bg-accent/15 border-accent text-accent font-semibold'
                        : 'border-border text-foreground-muted hover:bg-surface-secondary'
                    }`}
                  >
                    Pivot Table
                  </button>
                )}
              </div>

              {sourceType === 'range' && (
                <div>
                  <input
                    type="text"
                    value={rangeInput}
                    onChange={(e) => setRangeInput(e.target.value)}
                    placeholder="e.g. A1:D10"
                    className="w-full px-3 py-1.5 font-mono text-xs bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  {rangeError && (
                    <p className="text-[11px] text-rose-500 mt-1">{rangeError}</p>
                  )}
                </div>
              )}

              {sourceType === 'namedRange' && (
                <select
                  value={selectedNamedRange}
                  onChange={(e) => setSelectedNamedRange(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  {namedRanges.map((nr) => (
                    <option key={nr.id} value={nr.name}>
                      {nr.name} ({nr.sheetId === activeSheet.id ? 'This Sheet' : 'Workbook'})
                    </option>
                  ))}
                </select>
              )}

              {sourceType === 'pivot' && (
                <select
                  value={selectedPivotTable}
                  onChange={(e) => setSelectedPivotTable(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  {pivotTables.map((pt) => (
                    <option key={pt.id} value={pt.id}>
                      {pt.name}
                    </option>
                  ))}
                </select>
              )}
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

            {/* Chart Type Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-foreground">
                Chart Type
              </label>

              {/* Category Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
                {['all', 'column', 'bar', 'line', 'area', 'pie', 'scatter', 'specialized'].map(
                  (cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      className={`px-2 py-0.5 rounded-full capitalize whitespace-nowrap transition-colors ${
                        activeCategory === cat
                          ? 'bg-accent text-accent-foreground font-semibold'
                          : 'bg-surface-secondary text-foreground-muted hover:text-foreground'
                      }`}
                    >
                      {cat}
                    </button>
                  )
                )}
              </div>

              {/* Grid of Chart Types */}
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {displayedTypes.map((t) => {
                  const isSelected = chartType === t.type;
                  return (
                    <button
                      key={t.type}
                      type="button"
                      onClick={() => setChartType(t.type)}
                      className={`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-accent bg-accent/10 ring-1 ring-accent'
                          : 'border-border bg-surface hover:bg-surface-secondary/60'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-xs font-semibold text-foreground">
                          {t.label}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-accent" />}
                      </div>
                      <p className="text-[10px] text-foreground-muted line-clamp-2">
                        {t.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Live Preview */}
          <div className="w-1/2 p-5 flex flex-col bg-surface-secondary/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                Live Preview
              </span>
              <span className="text-[11px] text-foreground-muted">
                {previewData.categories.length} Categories, {previewData.series.length} Series
              </span>
            </div>

            <div className="flex-1 w-full bg-surface border border-border rounded-xl p-3 flex flex-col justify-center items-center shadow-xs overflow-hidden relative">
              {previewData.sourceWarning ? (
                <div className="text-center p-4 text-xs text-amber-500 flex flex-col items-center gap-1.5">
                  <BarChart3 className="w-8 h-8 opacity-40 text-muted-foreground" />
                  <span>{previewData.sourceWarning}</span>
                  <span className="text-[10px] text-foreground-muted">
                    Check your source range and ensure headers/labels are marked correctly.
                  </span>
                </div>
              ) : (
                <div className="w-full h-full min-h-[260px]">
                  <ChartView
                    config={previewChartConfig}
                    data={previewData}
                    isDark={isDark}
                  />
                </div>
              )}
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
            onClick={handleCreate}
            disabled={Boolean(rangeError)}
            className="px-4 py-2 text-xs font-semibold bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50 rounded-lg shadow-xs transition-colors"
          >
            Insert Chart
          </button>
        </div>
      </div>
    </div>
  );
};
