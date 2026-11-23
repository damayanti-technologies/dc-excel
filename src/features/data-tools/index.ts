import { CellRange } from '@/types/cell';

export type SortOrder = 'asc' | 'desc';

export interface SortCriterion {
  columnIndex: number;
  order: SortOrder;
  caseSensitive?: boolean;
}

export interface FilterCondition {
  columnIndex: number;
  operator: 'equals' | 'notEquals' | 'contains' | 'startsWith' | 'greaterThan' | 'lessThan' | 'empty';
  value?: string | number;
}

export interface SheetFilter {
  range: CellRange;
  conditions: FilterCondition[];
}

export interface DataValidationRule {
  id: string;
  type: 'list' | 'wholeNumber' | 'decimal' | 'date' | 'textLength' | 'custom';
  allowBlank?: boolean;
  operator?: 'between' | 'notBetween' | 'equal' | 'notEqual' | 'greaterThan' | 'lessThan';
  formula1?: string;
  formula2?: string;
  errorMessage?: string;
}
