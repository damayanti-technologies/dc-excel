import { describe, it, expect } from 'vitest';
import { SparseCellMap } from '@/types/sheet';
import { coordToKey } from '@/utils/coordinates';
import { cleanString, trimWhitespace } from '@/engine/data-tools/trim';

describe('Data Tools: Trim Whitespace Engine', () => {
  describe('cleanString', () => {
    it('trims leading and trailing spaces', () => {
      const res = cleanString('   Hello World   ', {
        leading: true,
        trailing: true,
        repeatedSpaces: false
      });
      expect(res).toBe('Hello World');
    });

    it('collapses repeated internal whitespace into a single space', () => {
      const res = cleanString('Hello     Big     World', {
        leading: false,
        trailing: false,
        repeatedSpaces: true
      });
      expect(res).toBe('Hello Big World');
    });

    it('performs comprehensive cleaning with all options enabled', () => {
      const res = cleanString('   OmniSheet    Data    Toolkit   ', {
        leading: true,
        trailing: true,
        repeatedSpaces: true
      });
      expect(res).toBe('OmniSheet Data Toolkit');
    });
  });

  describe('trimWhitespace across range', () => {
    it('trims cells and ignores formulas or non-string cells', () => {
      const cells: SparseCellMap = {
        [coordToKey(0, 0)]: { value: '   Spaced Text   ', dataType: 'string' },
        [coordToKey(0, 1)]: { value: 12345, dataType: 'number' },
        [coordToKey(1, 0)]: { value: '   Leading Space', dataType: 'string' },
        [coordToKey(1, 1)]: { value: 'Clean', dataType: 'string' },
        [coordToKey(2, 0)]: { value: ' Result ', formula: '="  test  "', dataType: 'string' }, // Formula protected
      };

      const result = trimWhitespace(cells, { startRow: 0, startCol: 0, endRow: 2, endCol: 1 });
      expect(result.modifiedCount).toBe(2);
      expect(result.updatedCells[coordToKey(0, 0)]?.value).toBe('Spaced Text');
      expect(result.updatedCells[coordToKey(1, 0)]?.value).toBe('Leading Space');
      expect(result.updatedCells[coordToKey(2, 0)]).toBeUndefined(); // Formula not touched
    });
  });
});
