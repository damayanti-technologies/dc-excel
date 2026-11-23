import { GridConfig } from './types';

export const DEFAULT_GRID_CONFIG: GridConfig = {
  defaultRowHeight: 28,
  defaultColWidth: 100,
  rowHeaderWidth: 48,
  colHeaderHeight: 28,
  minRowHeight: 18,
  minColWidth: 32,
  maxRowHeight: 400,
  maxColWidth: 800,
  defaultRowCount: 1000,
  defaultColumnCount: 100,
  rowOverscan: 6,
  colOverscan: 4
};

export const ZOOM_LEVELS: number[] = [0.5, 0.6, 0.75, 0.8, 0.9, 1.0, 1.1, 1.25, 1.5, 2.0];
export const DEFAULT_ZOOM = 1.0;
