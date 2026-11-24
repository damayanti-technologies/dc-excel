import { CellCoordinates, CellRange, CellValue, CellBorders } from './cell';

/**
 * Supported Conditional Formatting Rule Types
 */
export type HighlightRuleType =
  | 'greater_than'
  | 'less_than'
  | 'between'
  | 'equal_to'
  | 'not_equal_to'
  | 'text_contains'
  | 'text_begins_with'
  | 'text_ends_with'
  | 'date_occurring'
  | 'blank'
  | 'not_blank'
  | 'duplicate'
  | 'unique';

export type TopBottomRuleType =
  | 'top_items'
  | 'bottom_items'
  | 'top_percent'
  | 'bottom_percent'
  | 'above_average'
  | 'below_average';

export type ConditionalFormatRuleType =
  | HighlightRuleType
  | TopBottomRuleType
  | 'custom_formula'
  | 'data_bar'
  | 'color_scale'
  | 'icon_set';

/**
 * Styling applied when a conditional formatting rule matches.
 */
export interface ConditionalFormattingStyle {
  textColor?: string;
  backgroundColor?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  borders?: CellBorders;
}

/**
 * Configuration for Data Bars
 */
export interface DataBarConfig {
  barColor: string;
  negativeBarColor?: string;
  isGradient?: boolean;
  minType: 'auto' | 'num' | 'percent';
  minVal?: number;
  maxType: 'auto' | 'num' | 'percent';
  maxVal?: number;
  showValueOnly?: boolean;
  showBarOnly?: boolean;
}

/**
 * Configuration for Color Scales (2-color or 3-color heatmap)
 */
export interface ColorScaleConfig {
  type: '2-color' | '3-color';
  minColor: string;
  midColor?: string;
  maxColor: string;
  minVal?: number;
  midVal?: number;
  maxVal?: number;
}

/**
 * Supported Icon Sets
 */
export type IconSetType =
  | 'arrows_3'
  | 'arrows_5'
  | 'traffic_lights_3'
  | 'ratings_3'
  | 'flags_3'
  | 'indicators_3'
  | 'shapes_3';

export interface IconSetThreshold {
  type: 'percent' | 'num';
  value: number;
  operator: '>=' | '>';
}

export interface IconSetConfig {
  iconSet: IconSetType;
  reverseOrder?: boolean;
  showIconOnly?: boolean;
  thresholds: IconSetThreshold[];
}

/**
 * Full Conditional Formatting Rule definition
 */
export interface ConditionalFormatRule {
  id: string;
  range: CellRange;
  type: ConditionalFormatRuleType;
  enabled: boolean;
  stopIfTrue?: boolean;
  style?: ConditionalFormattingStyle;
  dataBar?: DataBarConfig;
  colorScale?: ColorScaleConfig;
  iconSet?: IconSetConfig;
  val1?: string | number;
  val2?: string | number;
  customFormula?: string;
  topBottomRank?: number; // e.g. 10 for Top 10 items or 10%
  dateOption?:
    | 'today'
    | 'yesterday'
    | 'tomorrow'
    | 'last_7_days'
    | 'this_month'
    | 'last_month';
}

/**
 * Evaluated visual formatting result for an individual cell
 */
export interface EvaluatedCellFormatting {
  style?: ConditionalFormattingStyle;
  dataBar?: {
    widthPercent: number;
    color: string;
    isNegative: boolean;
    showBarOnly: boolean;
  };
  colorScaleColor?: string;
  icon?: {
    iconSet: IconSetType;
    iconIndex: number;
    label: string;
    showIconOnly: boolean;
  };
}

/**
 * Scope for Named Ranges
 */
export type NamedRangeScope = 'workbook' | string; // 'workbook' or sheetId

/**
 * Named Range definition
 */
export interface NamedRange {
  id: string;
  name: string; // Alphanumeric + underscore, e.g. "Sales", "Q4_Revenue"
  scope: NamedRangeScope;
  sheetId: string;
  range: CellRange;
  comment?: string;
}

/**
 * Pivot Table Aggregation Function
 */
export type PivotAggregationFunction =
  | 'sum'
  | 'count'
  | 'average'
  | 'min'
  | 'max'
  | 'count_numbers';

/**
 * Pivot Value Field configuration
 */
export interface PivotValueField {
  fieldIndex: number; // Source column index
  fieldName: string;
  agg: PivotAggregationFunction;
  displayName?: string;
  numberFormat?: string;
}

/**
 * Filter applied to a pivot table field
 */
export interface PivotFilterField {
  col: number;
  fieldName: string;
  selectedValues?: string[];
}

/**
 * Pivot Table definition
 */
export interface PivotTableConfig {
  id: string;
  name: string;
  sourceSheetId: string;
  sourceRange: CellRange;
  hasHeaders: boolean;
  rowFields: number[]; // Column indices from source
  columnFields: number[];
  valueFields: PivotValueField[];
  filterFields: PivotFilterField[];
  destinationSheetId: string;
  destinationCoord: CellCoordinates;
  showGrandTotalsRow: boolean;
  showGrandTotalsCol: boolean;
  showSubtotals: boolean;
  isStale?: boolean;
  lastRefreshedAt?: number;
}

/**
 * Row Grouping / Outline definition
 */
export interface RowGroup {
  startRow: number;
  endRow: number;
  level: number; // 1, 2, 3
  isCollapsed: boolean;
}

/**
 * Subtotal operation configuration
 */
export interface SubtotalConfig {
  range: CellRange;
  groupByCol: number;
  agg: 'sum' | 'count' | 'average' | 'min' | 'max';
  targetCols: number[];
  addGrandTotal: boolean;
  replaceExisting: boolean;
}

/**
 * Goal Seek Configuration
 */
export interface GoalSeekConfig {
  targetCoord: CellCoordinates;
  targetValue: number;
  variableCoord: CellCoordinates;
  maxIterations?: number;
  tolerance?: number;
}

export interface GoalSeekResult {
  converged: boolean;
  variableValue: number;
  finalTargetValue: number;
  iterations: number;
  error?: string;
}

/**
 * Scenario variable assignment
 */
export interface ScenarioVariable {
  coord: CellCoordinates;
  value: CellValue;
  displayValue?: string;
}

/**
 * What-If Scenario definition
 */
export interface Scenario {
  id: string;
  name: string;
  comment?: string;
  variables: ScenarioVariable[];
}
