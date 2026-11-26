/**
 * Standard spreadsheet formula error constants and helpers.
 */
export const FormulaError = {
  DIV_ZERO: '#DIV/0!',
  VALUE: '#VALUE!',
  REF: '#REF!',
  NAME: '#NAME?',
  NUM: '#NUM!',
  NA: '#N/A',
  CYCLE: '#CYCLE!'
} as const;

export type FormulaErrorType = (typeof FormulaError)[keyof typeof FormulaError];

// eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
export interface BoxedLiteralString extends String {
  __isLiteralText?: boolean;
}

export function isBoxedLiteral(val: unknown): val is BoxedLiteralString {
  return val instanceof String || (typeof val === 'object' && val !== null && '__isLiteralText' in val);
}

export function isFormulaError(val: unknown): val is FormulaErrorType {
  if (isBoxedLiteral(val)) {
    return false;
  }
  return (
    typeof val === 'string' &&
    Object.values(FormulaError).includes(val as FormulaErrorType)
  );
}
