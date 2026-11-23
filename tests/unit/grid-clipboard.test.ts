import { describe, it, expect } from 'vitest';
import { Sheet } from '@/types/sheet';
import {
  serializeRangeToClipboard,
  parseTSV,
  applyPasteData
} from '@/engine/grid/clipboard';

describe('Grid Clipboard Engine', () => {
  const createMockSheet = (): Sheet => ({
    id: 's-clip',
    workbookId: 'wb-clip',
    name: 'Sheet1',
    index: 0,
    rowCount: 20,
    columnCount: 10,
    cells: {
      '0:0': { value: 'Name', dataType: 'string' },
      '0:1': { value: 'Age', dataType: 'string' },
      '0:2': { value: 'City', dataType: 'string' },
      '1:0': { value: 'Ravi', dataType: 'string' },
      '1:1': { value: 20, dataType: 'number' },
      '1:2': { value: 'Hyderabad', dataType: 'string' }
    }
  });

  it('serializes a selected range to TSV and preserves grid dimensions', () => {
    const sheet = createMockSheet();
    const range = { startRow: 0, startCol: 0, endRow: 1, endCol: 2 };

    const payload = serializeRangeToClipboard(range, sheet.cells);

    expect(payload.rowCount).toBe(2);
    expect(payload.colCount).toBe(3);
    expect(payload.rawText).toBe('Name\tAge\tCity\nRavi\t20\tHyderabad');
    expect(payload.matrix).toEqual([
      ['Name', 'Age', 'City'],
      ['Ravi', '20', 'Hyderabad']
    ]);
  });

  it('preserves empty cells in copied TSV', () => {
    const sheet = createMockSheet();
    // Delete Age cell (0:1) to make it empty
    delete sheet.cells['0:1'];

    const range = { startRow: 0, startCol: 0, endRow: 0, endCol: 2 };
    const payload = serializeRangeToClipboard(range, sheet.cells);

    expect(payload.rawText).toBe('Name\t\tCity');
  });

  it('parses TSV string into 2D string matrix', () => {
    const tsv = 'Item\tPrice\tQty\nApple\t1.5\t10\nBanana\t0.75\t20';
    const matrix = parseTSV(tsv);

    expect(matrix.length).toBe(3);
    expect(matrix[0]).toEqual(['Item', 'Price', 'Qty']);
    expect(matrix[1]).toEqual(['Apple', '1.5', '10']);
    expect(matrix[2]).toEqual(['Banana', '0.75', '20']);
  });

  it('pastes plain TSV text into target coordinates and infers types without formula execution', () => {
    const sheet = createMockSheet();
    const tsv = 'Alpha\t100\ttrue\n=SUM(1,2)\tFalse\tText';

    // Paste starting at B3 (row 2, col 1)
    const result = applyPasteData({ row: 2, col: 1 }, tsv, sheet);

    expect(result.pastedRange).toEqual({
      startRow: 2,
      startCol: 1,
      endRow: 3,
      endCol: 3
    });

    // Row 2, Col 1 (B3) -> 'Alpha' (string)
    expect(result.updatedCells['2:1']?.value).toBe('Alpha');
    expect(result.updatedCells['2:1']?.dataType).toBe('string');

    // Row 2, Col 2 (C3) -> 100 (number)
    expect(result.updatedCells['2:2']?.value).toBe(100);
    expect(result.updatedCells['2:2']?.dataType).toBe('number');

    // Row 2, Col 3 (D3) -> true (boolean)
    expect(result.updatedCells['2:3']?.value).toBe(true);
    expect(result.updatedCells['2:3']?.dataType).toBe('boolean');

    // Row 3, Col 1 (B4) -> '=SUM(1,2)' (stored as raw string with formula tag, NOT executed)
    expect(result.updatedCells['3:1']?.formula).toBe('=SUM(1,2)');
  });

  it('suggests expanded row and col counts when paste exceeds sheet bounds', () => {
    const sheet = createMockSheet(); // rowCount: 20, columnCount: 10
    const largeTsv = 'A\tB\tC\nD\tE\tF';

    // Paste at row 19, col 9 (exceeds 20 rows and 10 cols)
    const result = applyPasteData({ row: 19, col: 9 }, largeTsv, sheet);

    expect(result.newRowCount).toBe(21);
    expect(result.newColCount).toBe(12);
  });
});
