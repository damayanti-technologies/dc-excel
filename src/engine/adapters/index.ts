import { ISpreadsheetEngineAdapter } from '@/types/engine';
import { Sheet } from '@/types/sheet';
import { Cell, CellCoordinates, CellRange } from '@/types/cell';
import { Logger } from '@/utils/logger';

export * from '@/types/engine';

/**
 * Baseline Reference Adapter Stub.
 * Proves that engine interface contracts are decoupled from React components.
 */
export class StubSpreadsheetEngineAdapter implements ISpreadsheetEngineAdapter {
  public readonly id = 'stub-engine-adapter';
  public readonly name = 'Stub Spreadsheet Engine';
  public readonly version = '0.1.0';

  private cellChangeListeners: Array<(coord: CellCoordinates, cell: Cell) => void> = [];
  private selectionListeners: Array<(range: CellRange) => void> = [];

  public async initialize(container: HTMLElement): Promise<void> {
    Logger.info('EngineAdapter', `Initialized stub engine in container (${container.clientWidth}x${container.clientHeight})`);
  }

  public loadSheet(sheet: Sheet): void {
    Logger.info('EngineAdapter', `Loaded sheet ${sheet.name} (${sheet.id}) with ${Object.keys(sheet.cells).length} cells`);
  }

  public destroy(): void {
    this.cellChangeListeners = [];
    this.selectionListeners = [];
    Logger.info('EngineAdapter', 'Destroyed stub engine adapter');
  }

  public onCellChange(callback: (coord: CellCoordinates, cell: Cell) => void): () => void {
    this.cellChangeListeners.push(callback);
    return () => {
      this.cellChangeListeners = this.cellChangeListeners.filter(cb => cb !== callback);
    };
  }

  public onSelectionChange(callback: (range: CellRange) => void): () => void {
    this.selectionListeners.push(callback);
    return () => {
      this.selectionListeners = this.selectionListeners.filter(cb => cb !== callback);
    };
  }
}
