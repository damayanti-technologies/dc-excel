import { Cell, CellCoordinates, CellRange } from './cell';
import { Sheet } from './sheet';

/**
 * Result of a formula evaluation.
 */
export interface EvaluationResult {
  value: Cell['value'];
  error?: string;
}

/**
 * Calculation dependency graph node.
 */
export interface CellDependencyNode {
  address: string; // e.g., "Sheet1!A1"
  dependents: string[];
  precedents: string[];
}

/**
 * Generic calculation and formula engine adapter interface.
 * Decouples the application state and React presentation layer
 * from any concrete spreadsheet computation engine.
 */
export interface ICalculationEngine {
  initializeSheet(sheet: Sheet): void;
  removeSheet(sheetId: string): void;
  setCellValue(sheetId: string, coord: CellCoordinates, value: Cell['value']): void;
  setCellFormula(sheetId: string, coord: CellCoordinates, formula: string): void;
  evaluateCell(sheetId: string, coord: CellCoordinates): EvaluationResult;
  evaluateFormula(sheetId: string, formula: string): EvaluationResult;
  recalculateAll(): void;
  recalculateSheet(sheetId: string): void;
  getDependencies(sheetId: string, coord: CellCoordinates): CellDependencyNode | null;
  clear(): void;
}

/**
 * Generic spreadsheet engine adapter interface.
 * Abstracts the grid rendering, viewport scrolling, selection, and calculation.
 */
export interface ISpreadsheetEngineAdapter {
  id: string;
  name: string;
  version: string;
  initialize(container: HTMLElement, options: Record<string, unknown>): Promise<void>;
  loadSheet(sheet: Sheet): void;
  destroy(): void;
  onCellChange(callback: (coord: CellCoordinates, cell: Cell) => void): () => void;
  onSelectionChange(callback: (range: CellRange) => void): () => void;
}
