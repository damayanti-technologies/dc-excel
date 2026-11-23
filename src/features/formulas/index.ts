/**
 * Formula Function Definition and Category Contracts.
 * Prepares the architectural interface for Stage 3 formula engine integration.
 */
export type FormulaCategory =
  | 'Math & Trigonometry'
  | 'Logical'
  | 'Text'
  | 'Lookup & Reference'
  | 'Statistical'
  | 'Date & Time'
  | 'Financial'
  | 'Information';

export interface FunctionParameter {
  name: string;
  type: 'any' | 'number' | 'string' | 'boolean' | 'range' | 'array';
  description: string;
  isOptional?: boolean;
  defaultValue?: unknown;
}

export interface FunctionDefinition {
  name: string;
  category: FormulaCategory;
  description: string;
  parameters: FunctionParameter[];
  returnType: 'number' | 'string' | 'boolean' | 'range' | 'array';
  example: string;
}
