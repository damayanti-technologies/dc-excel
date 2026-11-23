import { CellCoordinates, CellRange } from '@/types/cell';

/**
 * Viewport metrics for virtualized canvas/DOM grid rendering.
 */
export interface GridViewport {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
  scrollTop: number;
  scrollLeft: number;
  viewportWidth: number;
  viewportHeight: number;
}

export interface IGridVirtualizer {
  computeVisibleRange(scrollTop: number, scrollLeft: number, width: number, height: number): GridViewport;
  getRowOffset(row: number): number;
  getColOffset(col: number): number;
  getCellAtPixel(x: number, y: number): CellCoordinates | null;
  getSelectionPixelBounds(range: CellRange): { x: number; y: number; width: number; height: number };
}
