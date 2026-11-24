import { CellRange } from './cell';

/**
 * Sorting Direction
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Multi-level sorting criteria specification
 */
export interface SortLevel {
  col: number;
  direction: SortDirection;
}

/**
 * Configuration for a sort operation
 */
export interface SortConfig {
  range: CellRange;
  levels: SortLevel[];
  hasHeaders: boolean;
}

/**
 * Filter condition rule types
 */
export type FilterConditionType =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'begins_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'greater_or_equal'
  | 'less_or_equal'
  | 'between'
  | 'before'
  | 'after'
  | 'is_blank'
  | 'is_not_blank';

/**
 * Condition filter definition for a single column
 */
export interface FilterCondition {
  type: FilterConditionType;
  val1: string;
  val2?: string;
}

/**
 * Filter configuration applied to a single column
 */
export interface ColumnFilter {
  col: number;
  selectedValues?: string[]; // null or undefined means all values selected
  condition?: FilterCondition;
}

/**
 * Worksheet filter state attached to a range
 */
export interface FilterConfig {
  range: CellRange;
  columnFilters: Record<number, ColumnFilter>;
}

/**
 * Freeze panes configuration
 */
export interface FreezePaneConfig {
  frozenRows: number; // Number of rows pinned at top (0 to N)
  frozenCols: number; // Number of columns pinned at left (0 to N)
}

/**
 * Supported data validation types
 */
export type ValidationType =
  | 'whole_number'
  | 'decimal'
  | 'list'
  | 'date'
  | 'text_length'
  | 'custom';

/**
 * Numerical / string comparison operators for data validation
 */
export type ValidationOperator =
  | 'between'
  | 'not_between'
  | 'equal'
  | 'not_equal'
  | 'greater_than'
  | 'less_than'
  | 'greater_or_equal'
  | 'less_or_equal';

/**
 * Data validation rule definition
 */
export interface DataValidationRule {
  id: string;
  range: CellRange;
  type: ValidationType;
  operator?: ValidationOperator;
  val1?: string;
  val2?: string;
  listValues?: string[]; // For 'list' validation
  allowBlank?: boolean;
  showDropdown?: boolean;
  errorTitle?: string;
  errorMessage?: string;
  errorStyle?: 'stop' | 'warning' | 'info';
  promptTitle?: string;
  promptMessage?: string;
}

/**
 * Options for Find & Replace operations
 */
export interface FindOptions {
  query: string;
  replaceWith?: string;
  matchCase: boolean;
  matchEntireCell: boolean;
  searchFormulas: boolean;
  scope: 'sheet' | 'workbook';
}

/**
 * Search result location and matched data
 */
export interface FindMatch {
  sheetId: string;
  sheetName: string;
  row: number;
  col: number;
  cellKey: string;
  cellValue: string;
  formula?: string;
}

/**
 * Text to Columns delimiters
 */
export interface TextDelimiters {
  comma: boolean;
  semicolon: boolean;
  tab: boolean;
  space: boolean;
  custom?: string;
  treatConsecutiveAsOne: boolean;
}

/**
 * Text to Columns operation options
 */
export interface TextToColumnsOptions {
  range: CellRange;
  mode: 'delimited' | 'fixed_width';
  delimiters?: TextDelimiters;
  fixedWidths?: number[]; // Character offsets, e.g. [5, 10, 20]
  destinationStartCol: number;
}

/**
 * Remove Duplicates configuration
 */
export interface RemoveDuplicatesConfig {
  range: CellRange;
  compareCols: number[]; // Column indices to evaluate for duplicates
  hasHeaders: boolean;
}

/**
 * Trim Whitespace configuration
 */
export interface TrimOptions {
  leading: boolean;
  trailing: boolean;
  repeatedSpaces: boolean;
}
