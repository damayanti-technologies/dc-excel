import { describe, it, expect } from 'vitest';
import { SparseCellMap } from '@/types/sheet';
import { TextToColumnsOptions } from '@/types/data-tools';
import { coordToKey } from '@/utils/coordinates';
import {
  splitByDelimiters,
  splitByFixedWidth,
  previewTextToColumns,
  executeTextToColumns
} from '@/engine/data-tools/text-to-columns';

describe('Data Tools: Text to Columns Engine', () => {
  describe('splitByDelimiters', () => {
    it('splits by commas', () => {
      const parts = splitByDelimiters('John,Doe,35,NYC', {
        comma: true,
        semicolon: false,
        tab: false,
        space: false,
        treatConsecutiveAsOne: false
      });
      expect(parts).toEqual(['John', 'Doe', '35', 'NYC']);
    });

    it('treats consecutive delimiters as one when configured', () => {
      const parts = splitByDelimiters('A   B   C', {
        comma: false,
        semicolon: false,
        tab: false,
        space: true,
        treatConsecutiveAsOne: true
      });
      expect(parts).toEqual(['A', 'B', 'C']);
    });
  });

  describe('splitByFixedWidth', () => {
    it('splits at specified character offsets', () => {
      // "ABCDEFGHIJ" at [3, 7] -> "ABC", "DEFG", "HIJ"
      const parts = splitByFixedWidth('ABCDEFGHIJ', [3, 7]);
      expect(parts).toEqual(['ABC', 'DEFG', 'HIJ']);
    });
  });

  describe('preview and execute', () => {
    const cells: SparseCellMap = {
      [coordToKey(0, 0)]: { value: 'Product,Price,Quantity', dataType: 'string' },
      [coordToKey(1, 0)]: { value: 'Laptop,1200,5', dataType: 'string' },
      [coordToKey(2, 0)]: { value: 'Phone,800,12', dataType: 'string' },
      [coordToKey(1, 1)]: { value: 'ExistingData', dataType: 'string' }, // Overwrite conflict!
    };

    const options: TextToColumnsOptions = {
      range: { startRow: 0, startCol: 0, endRow: 2, endCol: 0 },
      mode: 'delimited',
      delimiters: {
        comma: true,
        semicolon: false,
        tab: false,
        space: false,
        treatConsecutiveAsOne: false
      },
      destinationStartCol: 0
    };

    it('detects overwrite risk in preview', () => {
      const preview = previewTextToColumns(cells, options);
      expect(preview.maxCols).toBe(3);
      expect(preview.hasOverwriteRisk).toBe(true);
      expect(preview.overwrittenCellKeys).toContain(coordToKey(1, 1));
    });

    it('executes text to columns conversion and parses numeric tokens', () => {
      const result = executeTextToColumns(cells, options);
      expect(result.maxColsCreated).toBe(3);

      // Row 1: Laptop, 1200, 5
      expect(result.updatedCells[coordToKey(1, 0)]?.value).toBe('Laptop');
      expect(result.updatedCells[coordToKey(1, 1)]?.value).toBe(1200);
      expect(result.updatedCells[coordToKey(1, 1)]?.dataType).toBe('number');
      expect(result.updatedCells[coordToKey(1, 2)]?.value).toBe(5);
      expect(result.updatedCells[coordToKey(1, 2)]?.dataType).toBe('number');
    });
  });
});
