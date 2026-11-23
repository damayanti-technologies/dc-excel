import { CellStyle } from '@/types/cell';

/**
 * Conditional formatting operator types.
 */
export type ConditionalFormatRuleType =
  | 'cellValue'
  | 'colorScale'
  | 'dataBar'
  | 'iconSet'
  | 'formula';

export interface ConditionalFormattingRule {
  id: string;
  type: ConditionalFormatRuleType;
  operator?: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'between' | 'containsText';
  values?: (string | number)[];
  style: Partial<CellStyle>;
  stopIfTrue?: boolean;
}

export interface NumberFormatPreset {
  id: string;
  label: string;
  formatString: string;
  sample: string;
}
