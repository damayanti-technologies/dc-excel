import { CellCoordinates, CellRange } from '@/types/cell';
import { GridConfig, GridViewport, PixelRect } from './types';
import { DEFAULT_GRID_CONFIG } from './constants';

export class GridVirtualizer {
  private readonly rowCount: number;
  private readonly colCount: number;
  private readonly rowHeights: Record<number, number>;
  private readonly columnWidths: Record<number, number>;
  private readonly config: GridConfig;

  // Cached prefix sums (unscaled by zoom)
  private rowOffsets: number[] = [];
  private colOffsets: number[] = [];
  private totalHeightUnscaled = 0;
  private totalWidthUnscaled = 0;

  constructor(
    rowCount: number,
    colCount: number,
    rowHeights: Record<number, number> = {},
    columnWidths: Record<number, number> = {},
    config?: Partial<GridConfig>
  ) {
    this.rowCount = Math.max(1, rowCount);
    this.colCount = Math.max(1, colCount);
    this.rowHeights = rowHeights;
    this.columnWidths = columnWidths;
    this.config = { ...DEFAULT_GRID_CONFIG, ...config };

    this.computeOffsets();
  }

  private computeOffsets(): void {
    const { defaultRowHeight, defaultColWidth } = this.config;

    // 1. Row offsets
    this.rowOffsets = new Array(this.rowCount + 1);
    let currentY = 0;
    this.rowOffsets[0] = 0;
    for (let r = 0; r < this.rowCount; r++) {
      const h = this.rowHeights[r] ?? defaultRowHeight;
      currentY += h;
      this.rowOffsets[r + 1] = currentY;
    }
    this.totalHeightUnscaled = currentY;

    // 2. Column offsets
    this.colOffsets = new Array(this.colCount + 1);
    let currentX = 0;
    this.colOffsets[0] = 0;
    for (let c = 0; c < this.colCount; c++) {
      const w = this.columnWidths[c] ?? defaultColWidth;
      currentX += w;
      this.colOffsets[c + 1] = currentX;
    }
    this.totalWidthUnscaled = currentX;
  }

  public getRowHeight(row: number, zoom = 1): number {
    const raw = this.rowHeights[row] ?? this.config.defaultRowHeight;
    return Math.round(raw * zoom);
  }

  public getColWidth(col: number, zoom = 1): number {
    const raw = this.columnWidths[col] ?? this.config.defaultColWidth;
    return Math.round(raw * zoom);
  }

  public getRowOffset(row: number, zoom = 1): number {
    const clamped = Math.max(0, Math.min(row, this.rowCount));
    return Math.round((this.rowOffsets[clamped] ?? 0) * zoom);
  }

  public getColOffset(col: number, zoom = 1): number {
    const clamped = Math.max(0, Math.min(col, this.colCount));
    return Math.round((this.colOffsets[clamped] ?? 0) * zoom);
  }

  public getTotalHeight(zoom = 1): number {
    return Math.round(this.totalHeightUnscaled * zoom);
  }

  public getTotalWidth(zoom = 1): number {
    return Math.round(this.totalWidthUnscaled * zoom);
  }

  /**
   * Binary search to find row index at given vertical pixel offset.
   */
  public getRowIndexAtY(y: number, zoom = 1): number {
    if (y <= 0) return 0;
    const unscaledY = y / zoom;
    if (unscaledY >= this.totalHeightUnscaled) return this.rowCount - 1;

    let low = 0;
    let high = this.rowCount - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const startY = this.rowOffsets[mid]!;
      const endY = this.rowOffsets[mid + 1]!;

      if (unscaledY >= startY && unscaledY < endY) {
        return mid;
      }
      if (unscaledY < startY) {
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }

    return Math.max(0, Math.min(low, this.rowCount - 1));
  }

  /**
   * Binary search to find column index at given horizontal pixel offset.
   */
  public getColIndexAtX(x: number, zoom = 1): number {
    if (x <= 0) return 0;
    const unscaledX = x / zoom;
    if (unscaledX >= this.totalWidthUnscaled) return this.colCount - 1;

    let low = 0;
    let high = this.colCount - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const startX = this.colOffsets[mid]!;
      const endX = this.colOffsets[mid + 1]!;

      if (unscaledX >= startX && unscaledX < endX) {
        return mid;
      }
      if (unscaledX < startX) {
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }

    return Math.max(0, Math.min(low, this.colCount - 1));
  }

  /**
   * Computes the visible 2D viewport range including overscan.
   */
  public computeVisibleRange(
    scrollTop: number,
    scrollLeft: number,
    viewportWidth: number,
    viewportHeight: number,
    zoom = 1
  ): GridViewport {
    const rawStartRow = this.getRowIndexAtY(scrollTop, zoom);
    const rawEndRow = this.getRowIndexAtY(scrollTop + viewportHeight, zoom);

    const rawStartCol = this.getColIndexAtX(scrollLeft, zoom);
    const rawEndCol = this.getColIndexAtX(scrollLeft + viewportWidth, zoom);

    // Apply overscan
    const startRow = Math.max(0, rawStartRow - this.config.rowOverscan);
    const endRow = Math.min(this.rowCount - 1, rawEndRow + this.config.rowOverscan);

    const startCol = Math.max(0, rawStartCol - this.config.colOverscan);
    const endCol = Math.min(this.colCount - 1, rawEndCol + this.config.colOverscan);

    return {
      startRow,
      endRow,
      startCol,
      endCol,
      scrollTop,
      scrollLeft,
      viewportWidth,
      viewportHeight,
      totalWidth: this.getTotalWidth(zoom),
      totalHeight: this.getTotalHeight(zoom)
    };
  }

  /**
   * Calculates pixel bounding box for a single cell.
   */
  public getCellRect(row: number, col: number, zoom = 1): PixelRect {
    const x = this.getColOffset(col, zoom);
    const y = this.getRowOffset(row, zoom);
    const width = this.getColWidth(col, zoom);
    const height = this.getRowHeight(row, zoom);

    return { x, y, width, height };
  }

  /**
   * Calculates pixel bounding box for a rectangular range of cells.
   */
  public getRangeRect(range: CellRange, zoom = 1): PixelRect {
    const startRow = Math.min(range.startRow, range.endRow);
    const endRow = Math.max(range.startRow, range.endRow);
    const startCol = Math.min(range.startCol, range.endCol);
    const endCol = Math.max(range.startCol, range.endCol);

    const x = this.getColOffset(startCol, zoom);
    const y = this.getRowOffset(startRow, zoom);
    const right = this.getColOffset(endCol + 1, zoom);
    const bottom = this.getRowOffset(endRow + 1, zoom);

    return {
      x,
      y,
      width: Math.max(0, right - x),
      height: Math.max(0, bottom - y)
    };
  }

  /**
   * Finds cell coordinate from pixel click relative to grid origin.
   */
  public getCellAtPixel(x: number, y: number, zoom = 1): CellCoordinates | null {
    if (x < 0 || y < 0 || x >= this.getTotalWidth(zoom) || y >= this.getTotalHeight(zoom)) {
      return null;
    }
    return {
      row: this.getRowIndexAtY(y, zoom),
      col: this.getColIndexAtX(x, zoom)
    };
  }
}
