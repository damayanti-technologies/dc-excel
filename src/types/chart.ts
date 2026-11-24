import { CellCoordinates, CellRange } from './cell';

/**
 * Supported chart types in OmniSheet.
 */
export type ChartType =
  // Column charts
  | 'column-clustered'
  | 'column-stacked'
  | 'column-stacked-100'
  // Bar charts
  | 'bar-clustered'
  | 'bar-stacked'
  | 'bar-stacked-100'
  // Line charts
  | 'line-standard'
  | 'line-markers'
  | 'line-smooth'
  // Area charts
  | 'area-standard'
  | 'area-stacked'
  | 'area-stacked-100'
  // Pie & Doughnut
  | 'pie-standard'
  | 'pie-doughnut'
  // Scatter
  | 'scatter-standard'
  | 'scatter-lines'
  // Additional specialized charts
  | 'radar'
  | 'combination'
  | 'histogram'
  | 'waterfall'
  | 'funnel'
  | 'treemap';

/**
 * Data orientation across rows or columns.
 */
export type ChartDataOrientation = 'rows' | 'columns';

/**
 * Configuration for chart data source.
 */
export interface ChartSourceConfig {
  /** Target worksheet ID where data resides */
  sheetId: string;
  /** Normalized cell range coordinates */
  range: CellRange;
  /** Formatted A1-style range label (e.g. 'A1:D10') */
  rangeStr: string;
  /** Data orientation */
  orientation: ChartDataOrientation;
  /** First row contains series or category headers */
  firstRowAsHeaders: boolean;
  /** First column contains category labels */
  firstColAsLabels: boolean;
  /** Optional reference to a named range */
  namedRangeName?: string;
  /** Optional reference to a pivot table */
  pivotTableId?: string;
}

/**
 * Configuration for an individual data series.
 */
export interface ChartSeriesConfig {
  id: string;
  name: string;
  color?: string;
  /** For combination charts (e.g. 'bar', 'line', 'scatter', 'area') */
  type?: 'bar' | 'line' | 'scatter' | 'area';
  /** 0 for primary Y axis, 1 for secondary Y axis */
  yAxisIndex?: number;
  lineWidth?: number;
  showMarkers?: boolean;
  fillOpacity?: number;
  showDataLabels?: boolean;
}

/**
 * Chart title configuration.
 */
export interface ChartTitleConfig {
  show: boolean;
  text: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  align?: 'left' | 'center' | 'right';
}

/**
 * Chart legend configuration.
 */
export interface ChartLegendConfig {
  show: boolean;
  position: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Chart axes configuration.
 */
export interface ChartAxesConfig {
  showXAxis: boolean;
  showYAxis: boolean;
  showSecondaryYAxis?: boolean;
  xAxisTitle?: string;
  yAxisTitle?: string;
  secondaryYAxisTitle?: string;
  min?: number | null;
  max?: number | null;
  showGridLinesX?: boolean;
  showGridLinesY?: boolean;
  labelRotation?: number;
  numberFormat?: string;
  enableZoom?: boolean;
}

/**
 * Built-in palette themes.
 */
export type ChartPaletteId =
  | 'professional'
  | 'corporate'
  | 'modern'
  | 'minimal'
  | 'monochrome'
  | 'presentation'
  | 'custom';

/**
 * Chart visual styling configuration.
 */
export interface ChartStyleConfig {
  paletteId: ChartPaletteId;
  customColors?: string[] | null;
  backgroundColor?: string;
  borderColor?: string;
  borderRadius?: number;
  theme?: 'auto' | 'light' | 'dark';
}

/**
 * Chart placement and coordinates on worksheet canvas.
 */
export interface ChartPositionConfig {
  /** Top-left anchor cell coordinate */
  anchorCell: CellCoordinates;
  /** Offset in pixels from top-left of anchor cell */
  offsetX: number;
  /** Offset in pixels from top-left of anchor cell */
  offsetY: number;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** Layer order */
  zIndex: number;
}

/**
 * Complete Chart Model stored in sheet metadata.
 */
export interface ChartConfig {
  id: string;
  sheetId: string;
  title: ChartTitleConfig;
  chartType: ChartType;
  source: ChartSourceConfig;
  series: ChartSeriesConfig[];
  axes: ChartAxesConfig;
  legend: ChartLegendConfig;
  style: ChartStyleConfig;
  position: ChartPositionConfig;
  createdAt: number;
  updatedAt: number;
}

/**
 * Extracted chart series payload ready for ECharts.
 */
export interface ExtractedSeries {
  id: string;
  name: string;
  values: (number | null)[];
  color?: string;
  type?: string;
  yAxisIndex?: number;
  lineWidth?: number;
  showMarkers?: boolean;
  fillOpacity?: number;
  showDataLabels?: boolean;
}

/**
 * Extracted chart data adapter result.
 */
export interface ExtractedChartData {
  categories: string[];
  series: ExtractedSeries[];
  sourceWarning?: string;
}

/**
 * Chart template preset.
 */
export interface ChartTemplate {
  id: string;
  name: string;
  description: string;
  style: Partial<ChartStyleConfig>;
  axes: Partial<ChartAxesConfig>;
  legend: Partial<ChartLegendConfig>;
}
