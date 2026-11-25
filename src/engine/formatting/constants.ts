import { CellStylePreset, NumberFormatPreset } from '@/types/formatting';

export const FONT_FAMILIES = [
  { label: 'Calibri', value: 'Calibri, sans-serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Segoe UI', value: '"Segoe UI", sans-serif' },
  { label: 'Roboto', value: 'Roboto, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
  { label: 'Consolas', value: 'Consolas, monospace' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Comic Sans MS', value: '"Comic Sans MS", cursive' }
];

export const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36, 48, 72];

export const DEFAULT_CELL_STYLE = {
  fontFamily: 'Calibri, sans-serif',
  fontSize: 11,
  bold: false,
  italic: false,
  underline: false,
  strikethrough: false,
  textColor: undefined,
  backgroundColor: undefined,
  horizontalAlignment: undefined,
  verticalAlignment: 'middle' as const,
  wrapText: false,
  textOverflow: 'clip' as const,
  indentation: 0,
  numberFormat: 'General'
};

/**
 * Standard palette matrix for text & fill colors.
 */
export const COLOR_PALETTE = [
  // Grayscale & neutrals
  '#000000', '#262626', '#525252', '#737373', '#a3a3a3', '#d4d4d4', '#e5e5e5', '#f5f5f5', '#fafafa', '#ffffff',
  // Row 1 - Light tints
  '#fee2e2', '#ffedd5', '#fef3c7', '#fef9c3', '#ecfdf5', '#ccfbf1', '#d1fae5', '#e0e7ff', '#ede9fe', '#fce7f3',
  // Row 2 - Medium pastels
  '#fca5a5', '#fdba74', '#fcd34d', '#fde047', '#6ee7b7', '#5eead4', '#a7f3d0', '#a5b4fc', '#c4b5fd', '#f9a8d4',
  // Row 3 - Vibrant primary tones
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#10b981', '#14b8a6', '#059669', '#6366f1', '#8b5cf6', '#ec4899',
  // Row 4 - Professional saturated deep shades
  '#b91c1c', '#c2410c', '#b45309', '#a16207', '#047857', '#0f766e', '#047857', '#4338ca', '#6d28d9', '#be185d',
  // Row 5 - Dark shades
  '#7f1d1d', '#7c2d12', '#78350f', '#713f12', '#064e3b', '#134e4a', '#022c22', '#312e81', '#4c1d95', '#831843'
];

export const NUMBER_FORMAT_PRESETS: NumberFormatPreset[] = [
  { id: 'general', label: 'General', pattern: 'General', category: 'General', example: '1234.56' },
  { id: 'number-2dec', label: 'Number (1,234.56)', pattern: '#,##0.00', category: 'Number', example: '1,234.56' },
  { id: 'number-0dec', label: 'Integer (1,235)', pattern: '#,##0', category: 'Number', example: '1,235' },
  { id: 'currency-usd', label: 'Currency USD ($)', pattern: '$#,##0.00', category: 'Currency', example: '$1,234.56' },
  { id: 'currency-eur', label: 'Currency EUR (€)', pattern: '€#,##0.00', category: 'Currency', example: '€1,234.56' },
  { id: 'currency-gbp', label: 'Currency GBP (£)', pattern: '£#,##0.00', category: 'Currency', example: '£1,234.56' },
  { id: 'currency-inr', label: 'Currency INR (₹)', pattern: '₹#,##0.00', category: 'Currency', example: '₹1,234.56' },
  { id: 'currency-jpy', label: 'Currency JPY (¥)', pattern: '¥#,##0', category: 'Currency', example: '¥1,235' },
  { id: 'percent-0', label: 'Percentage (12%)', pattern: '0%', category: 'Percentage', example: '12%' },
  { id: 'percent-2', label: 'Percentage (12.35%)', pattern: '0.00%', category: 'Percentage', example: '12.35%' },
  { id: 'date-iso', label: 'Date (YYYY-MM-DD)', pattern: 'YYYY-MM-DD', category: 'Date', example: '2026-11-24' },
  { id: 'date-uk', label: 'Date (DD/MM/YYYY)', pattern: 'DD/MM/YYYY', category: 'Date', example: '24/11/2026' },
  { id: 'date-us', label: 'Date (MM/DD/YYYY)', pattern: 'MM/DD/YYYY', category: 'Date', example: '11/24/2026' },
  { id: 'date-med', label: 'Date (DD-MMM-YYYY)', pattern: 'DD-MMM-YYYY', category: 'Date', example: '24-Nov-2026' },
  { id: 'date-long', label: 'Date (MMM DD, YYYY)', pattern: 'MMM DD, YYYY', category: 'Date', example: 'Nov 24, 2026' },
  { id: 'time-24', label: 'Time (HH:MM:SS)', pattern: 'HH:MM:SS', category: 'Time', example: '14:30:00' },
  { id: 'time-12', label: 'Time 12h (hh:mm A)', pattern: 'hh:mm A', category: 'Time', example: '02:30 PM' },
  { id: 'scientific', label: 'Scientific (1.23E+03)', pattern: '0.00E+00', category: 'Scientific', example: '1.23E+03' },
  { id: 'text', label: 'Plain Text', pattern: '@', category: 'Text', example: '1234' }
];

export const BUILT_IN_CELL_STYLES: CellStylePreset[] = [
  {
    id: 'normal',
    name: 'Normal',
    category: 'data',
    style: {
      bold: false,
      italic: false,
      underline: false,
      strikethrough: false,
      textColor: undefined,
      backgroundColor: undefined,
      fontSize: 11
    }
  },
  {
    id: 'title',
    name: 'Title',
    category: 'heading',
    style: {
      fontSize: 18,
      bold: true,
      textColor: '#0f172a',
      borders: {
        bottom: { style: 'thick', color: '#10b981' }
      }
    }
  },
  {
    id: 'heading-1',
    name: 'Heading 1',
    category: 'heading',
    style: {
      fontSize: 15,
      bold: true,
      textColor: '#065f46',
      borders: {
        bottom: { style: 'medium', color: '#10b981' }
      }
    }
  },
  {
    id: 'heading-2',
    name: 'Heading 2',
    category: 'heading',
    style: {
      fontSize: 13,
      bold: true,
      textColor: '#047857',
      borders: {
        bottom: { style: 'thin', color: '#6ee7b7' }
      }
    }
  },
  {
    id: 'total',
    name: 'Total',
    category: 'data',
    style: {
      bold: true,
      borders: {
        top: { style: 'thin', color: '#000000' },
        bottom: { style: 'double', color: '#000000' }
      }
    }
  },
  {
    id: 'good',
    name: 'Good',
    category: 'status',
    style: {
      backgroundColor: '#dcfce7',
      textColor: '#166534',
      bold: true
    }
  },
  {
    id: 'bad',
    name: 'Bad',
    category: 'status',
    style: {
      backgroundColor: '#fee2e2',
      textColor: '#991b1b',
      bold: true
    }
  },
  {
    id: 'warning',
    name: 'Warning',
    category: 'status',
    style: {
      backgroundColor: '#fef3c7',
      textColor: '#92400e',
      bold: true
    }
  },
  {
    id: 'accent-header',
    name: 'Accent Header',
    category: 'themed',
    style: {
      backgroundColor: '#10b981',
      textColor: '#ffffff',
      bold: true,
      horizontalAlignment: 'center'
    }
  }
];
