import { FormulaErrorType } from './errors';
import { CellCoordinates, CellRange, CellValue } from '@/types/cell';

/**
 * Token types emitted by the Formula Tokenizer.
 */
export type TokenType =
  | 'NUMBER'
  | 'STRING'
  | 'BOOLEAN'
  | 'IDENTIFIER' // Function names or unknown words
  | 'CELL_REF'   // e.g. A1, B12, AA100
  | 'OPERATOR'   // +, -, *, /, ^, &, =, <>, <, <=, >, >=
  | 'PERCENT'    // %
  | 'PAREN_OPEN' // (
  | 'PAREN_CLOSE'// )
  | 'COMMA'      // ,
  | 'COLON'      // : (for range A1:B10)
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  start: number;
  end: number;
}

/**
 * Abstract Syntax Tree (AST) node representations for formulas.
 */
export interface NumberLiteralNode {
  type: 'NumberLiteral';
  value: number;
}

export interface StringLiteralNode {
  type: 'StringLiteral';
  value: string;
}

export interface BooleanLiteralNode {
  type: 'BooleanLiteral';
  value: boolean;
}

export interface CellRefNode {
  type: 'CellRef';
  coord: CellCoordinates;
  raw: string; // e.g. "A1"
}

export interface RangeRefNode {
  type: 'RangeRef';
  range: CellRange;
  startRef: CellCoordinates;
  endRef: CellCoordinates;
  raw: string; // e.g. "A1:B10"
}

export interface UnaryOpNode {
  type: 'UnaryOp';
  operator: '+' | '-';
  operand: ASTNode;
}

export interface BinaryOpNode {
  type: 'BinaryOp';
  operator:
    | '+'
    | '-'
    | '*'
    | '/'
    | '^'
    | '&'
    | '='
    | '<>'
    | '<'
    | '<='
    | '>'
    | '>=';
  left: ASTNode;
  right: ASTNode;
}

export interface PercentNode {
  type: 'Percent';
  operand: ASTNode;
}

export interface FunctionCallNode {
  type: 'FunctionCall';
  name: string; // Uppercase, e.g. "SUM"
  args: ASTNode[];
}

export interface ErrorNode {
  type: 'Error';
  error: FormulaErrorType;
}

export type ASTNode =
  | NumberLiteralNode
  | StringLiteralNode
  | BooleanLiteralNode
  | CellRefNode
  | RangeRefNode
  | UnaryOpNode
  | BinaryOpNode
  | PercentNode
  | FunctionCallNode
  | ErrorNode;

/**
 * Interface supplied to the evaluator to resolve cell values and ranges dynamically.
 */
export interface EvaluationContext {
  getCellValue: (coord: CellCoordinates) => CellValue;
  getCellRawOrFormula?: (coord: CellCoordinates) => string | undefined;
  getRangeValues: (range: CellRange) => CellValue[][];
}

/**
 * Function handler signature for spreadsheet functions.
 */
export type FormulaFunctionHandler = (
  args: ASTNode[],
  context: EvaluationContext,
  evaluate: (node: ASTNode, context: EvaluationContext) => CellValue
) => CellValue;
