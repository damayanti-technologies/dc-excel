export * from '@/types/engine';

/**
 * Formula token types for formula tokenizer/lexer.
 */
export type FormulaTokenType =
  | 'FUNCTION'
  | 'REFERENCE'
  | 'NUMBER'
  | 'STRING'
  | 'BOOLEAN'
  | 'OPERATOR'
  | 'PARENTHESIS_OPEN'
  | 'PARENTHESIS_CLOSE'
  | 'COMMA'
  | 'COLON'
  | 'ERROR';

export interface FormulaToken {
  type: FormulaTokenType;
  value: string;
  startIndex: number;
  endIndex: number;
}
