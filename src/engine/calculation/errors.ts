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

export function isFormulaError(val: unknown): val is FormulaErrorType {
  if (val instanceof String || (val && typeof val === 'object' && (val as any).__isLiteralText)) {
    return false;
  }
  return (
    typeof val === 'string' &&
    Object.values(FormulaError).includes(val as FormulaErrorType)
  );
}
