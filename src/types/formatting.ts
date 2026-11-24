import { CellStyle } from './cell';

export type BorderPosition =
  | 'all'
  | 'outside'
  | 'thick-outside'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'inside'
  | 'horizontal'
  | 'vertical'
  | 'none';

export type BorderStyleType = 'thin' | 'medium' | 'thick' | 'double' | 'dashed' | 'none';

export type NumberFormatCategory =
  | 'General'
  | 'Number'
  | 'Currency'
  | 'Percentage'
  | 'Date'
  | 'Time'
  | 'Scientific'
  | 'Text'
  | 'Custom';

export type CurrencySymbol = '$' | '€' | '£' | '₹' | '¥';

export interface NumberFormatPreset {
  id: string;
  label: string;
  pattern: string;
  category: NumberFormatCategory;
  example: string;
}

export interface CellStylePreset {
  id: string;
  name: string;
  category: 'data' | 'heading' | 'status' | 'themed';
  style: CellStyle;
}

export interface FormatPainterState {
  isActive: boolean;
  isLocked: boolean; // Double-clicked for persistent application
  sourceStyle: CellStyle | null;
}
