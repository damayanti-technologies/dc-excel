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

export interface EmptyNode {
  type: 'Empty';
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
  | ErrorNode
  | EmptyNode;

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

/**
 * Categories of spreadsheet functions.
 */
export type FunctionCategory =
  | 'Logical'
  | 'Lookup & Reference'
  | 'Text'
  | 'Date & Time'
  | 'Mathematical'
  | 'Statistical'
  | 'Information';

/**
 * Parameter definition for formula function argument assistance.
 */
export interface FunctionArgumentDef {
  name: string;
  description: string;
  type?: 'any' | 'number' | 'string' | 'boolean' | 'range' | 'array';
  optional?: boolean;
  defaultValue?: string;
  repeating?: boolean;
}

/**
 * Full metadata for a registered function in the Function Registry.
 */
export interface FunctionDefinition {
  name: string;
  category: FunctionCategory;
  description: string;
  minArgs: number;
  maxArgs: number;
  args: FunctionArgumentDef[];
  returnType: string;
  examples: string[];
  handler: FormulaFunctionHandler;
}
