import { describe, it, expect } from 'vitest';
import { SparseCellMap } from '@/types/sheet';
import { RemoveDuplicatesConfig } from '@/types/data-tools';
import { coordToKey } from '@/utils/coordinates';
import {
  previewRemoveDuplicates,
  executeRemoveDuplicates
} from '@/engine/data-tools/remove-duplicates';

describe('Data Tools: Remove Duplicates Engine', () => {
  const cells: SparseCellMap = {
    // Header
    [coordToKey(0, 0)]: { value: 'ID', dataType: 'number' },
    [coordToKey(0, 1)]: { value: 'Name', dataType: 'string' },
    // Row 1: 101, Alice
    [coordToKey(1, 0)]: { value: 101, dataType: 'number' },
    [coordToKey(1, 1)]: { value: 'Alice', dataType: 'string' },
    // Row 2: 102, Bob
    [coordToKey(2, 0)]: { value: 102, dataType: 'number' },
    [coordToKey(2, 1)]: { value: 'Bob', dataType: 'string' },
    // Row 3: 101, Alice (DUPLICATE)
    [coordToKey(3, 0)]: { value: 101, dataType: 'number' },
    [coordToKey(3, 1)]: { value: 'Alice', dataType: 'string' },
    // Row 4: 103, Charlie
    [coordToKey(4, 0)]: { value: 103, dataType: 'number' },
    [coordToKey(4, 1)]: { value: 'Charlie', dataType: 'string' },
    // Row 5: 102, Bob (DUPLICATE)
    [coordToKey(5, 0)]: { value: 102, dataType: 'number' },
    [coordToKey(5, 1)]: { value: 'Bob', dataType: 'string' },
  };

  it('previews duplicate vs unique rows correctly', () => {
    const config: RemoveDuplicatesConfig = {
      range: { startRow: 0, startCol: 0, endRow: 5, endCol: 1 },
      compareCols: [0, 1],
      hasHeaders: true
    };

    const preview = previewRemoveDuplicates(cells, config);
    expect(preview.totalRows).toBe(5);
    expect(preview.duplicateRowCount).toBe(2);
    expect(preview.uniqueRowCount).toBe(3);
    expect(preview.duplicateRowIndices).toEqual([3, 5]);
  });

  it('executes remove duplicates, removes duplicate rows and shifts remaining upward', () => {
    const config: RemoveDuplicatesConfig = {
      range: { startRow: 0, startCol: 0, endRow: 5, endCol: 1 },
      compareCols: [0, 1],
      hasHeaders: true
    };

    const result = executeRemoveDuplicates(cells, config);
    expect(result.removedCount).toBe(2);

    // Header preserved
    expect(result.updatedCells[coordToKey(0, 0)]?.value).toBe('ID');

    // Row 1: 101, Alice
    expect(result.updatedCells[coordToKey(1, 0)]?.value).toBe(101);
    expect(result.updatedCells[coordToKey(1, 1)]?.value).toBe('Alice');

    // Row 2: 102, Bob
    expect(result.updatedCells[coordToKey(2, 0)]?.value).toBe(102);
    expect(result.updatedCells[coordToKey(2, 1)]?.value).toBe('Bob');

    // Row 3: 103, Charlie (shifted up from row 4!)
    expect(result.updatedCells[coordToKey(3, 0)]?.value).toBe(103);
    expect(result.updatedCells[coordToKey(3, 1)]?.value).toBe('Charlie');

    // Rows 4 and 5 should now be cleared
    expect(result.updatedCells[coordToKey(4, 0)]).toBeUndefined();
    expect(result.updatedCells[coordToKey(5, 0)]).toBeUndefined();
  });
});
