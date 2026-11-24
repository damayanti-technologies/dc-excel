import { describe, it, expect } from 'vitest';
import {
  parseCsvString,
  csvMatrixToSparseCells,
  serializeToCsv,
} from '@/engine/io/csv-parser';
import { detectDelimiter } from '@/services/import-export-service';
import { coordToKey } from '@/utils/coordinates';
import { SparseCellMap } from '@/types/cell';

describe('CSV & TSV Engine (Stage 12)', () => {
  describe('RFC 4180 Compliance & Parsing', () => {
    it('parses simple comma-separated values correctly', () => {
      const csv = 'Name,Age,Active\nAlice,30,true\nBob,25,false';
      const matrix = parseCsvString(csv, { delimiter: ',' });

      expect(matrix).toHaveLength(3);
      expect(matrix[0]).toEqual(['Name', 'Age', 'Active']);
      expect(matrix[1]).toEqual(['Alice', 30, true]);
      expect(matrix[2]).toEqual(['Bob', 25, false]);
    });

    it('handles quoted fields containing delimiters', () => {
      const csv = 'Company,Location\n"Acme, Inc.",New York\n"Globex, LLC",Chicago';
      const matrix = parseCsvString(csv, { delimiter: ',' });

      expect(matrix).toHaveLength(3);
      expect(matrix[1]?.[0]).toBe('Acme, Inc.');
      expect(matrix[1]?.[1]).toBe('New York');
      expect(matrix[2]?.[0]).toBe('Globex, LLC');
      expect(matrix[2]?.[1]).toBe('Chicago');
    });

    it('handles escaped double quotes ("") inside quotes according to RFC 4180', () => {
      const csv = 'Title,Quote\nPhilosophy,"He said, ""To be or not to be."""';
      const matrix = parseCsvString(csv, { delimiter: ',' });

      expect(matrix).toHaveLength(2);
      expect(matrix[1]?.[1]).toBe('He said, "To be or not to be."');
    });

    it('handles multiline embedded newlines within quoted fields', () => {
      const csv = 'ID,Notes\n101,"Line one\nLine two\nLine three"\n102,Simple note';
      const matrix = parseCsvString(csv, { delimiter: ',' });

      expect(matrix).toHaveLength(3);
      expect(matrix[1]?.[0]).toBe(101);
      expect(matrix[1]?.[1]).toBe('Line one\nLine two\nLine three');
      expect(matrix[2]?.[0]).toBe(102);
      expect(matrix[2]?.[1]).toBe('Simple note');
    });

    it('preserves Unicode and Telugu text without distortion', () => {
      const teluguData = 'రాష్ట్రం,నగరం,జనాభా\nతెలంగాణ,హైదరాబాద్,10000000\nఆంధ్రప్రదేశ్,విశాఖపట్నం,2000000';
      const matrix = parseCsvString(teluguData, { delimiter: ',' });

      expect(matrix).toHaveLength(3);
      expect(matrix[0]?.[0]).toBe('రాష్ట్రం');
      expect(matrix[1]?.[0]).toBe('తెలంగాణ');
      expect(matrix[1]?.[1]).toBe('హైదరాబాద్');
      expect(matrix[1]?.[2]).toBe(10000000);
      expect(matrix[2]?.[1]).toBe('విశాఖపట్నం');
    });

    it('preserves leading zeros for numeric strings like ZIP codes or IDs', () => {
      const csv = 'Code,ZIP,Phone\n"00123","07030","0987654321"';
      const matrix = parseCsvString(csv, { delimiter: ',', autoTypeDetection: true });

      expect(matrix).toHaveLength(2);
      // Because "00123" has a leading zero and length > 1, it should remain a string
      expect(matrix[1]?.[0]).toBe('00123');
      expect(typeof matrix[1]?.[0]).toBe('string');
      expect(matrix[1]?.[1]).toBe('07030');
      expect(typeof matrix[1]?.[1]).toBe('string');
    });
  });

  describe('Delimiter Detection & Custom Delimiters', () => {
    it('detects tab delimiter in TSV files', () => {
      const tsv = 'ColA\tColB\tColC\n1\t2\t3\n4\t5\t6';
      const delim = detectDelimiter(tsv);
      expect(delim).toBe('\t');

      const matrix = parseCsvString(tsv, { delimiter: delim });
      expect(matrix[0]).toEqual(['ColA', 'ColB', 'ColC']);
      expect(matrix[1]).toEqual([1, 2, 3]);
    });

    it('detects semicolon and pipe delimiters', () => {
      const semi = 'A;B;C\n1;2;3';
      expect(detectDelimiter(semi)).toBe(';');

      const pipe = 'A|B|C\n1|2|3';
      expect(detectDelimiter(pipe)).toBe('|');
    });
  });

  describe('Sparse Cell Map Conversion', () => {
    it('converts 2D parsed matrix into SparseCellMap with correct types', () => {
      const matrix = [
        ['Product', 'Price', 'InStock'],
        ['Widget', 19.99, true],
        ['Gadget', 49.5, false],
      ];

      const { cells, rowCount, columnCount } = csvMatrixToSparseCells(matrix);

      expect(rowCount).toBeGreaterThanOrEqual(3);
      expect(columnCount).toBeGreaterThanOrEqual(3);

      expect(cells[coordToKey(0, 0)]?.value).toBe('Product');
      expect(cells[coordToKey(0, 0)]?.dataType).toBe('string');

      expect(cells[coordToKey(1, 1)]?.value).toBe(19.99);
      expect(cells[coordToKey(1, 1)]?.dataType).toBe('number');

      expect(cells[coordToKey(1, 2)]?.value).toBe(true);
      expect(cells[coordToKey(1, 2)]?.dataType).toBe('boolean');
    });
  });

  describe('CSV Serialization & Formula Injection Protection', () => {
    it('serializes sparse cell map to RFC 4180 compliant CSV', () => {
      const cells: SparseCellMap = {
        [coordToKey(0, 0)]: { value: 'Item', dataType: 'string' },
        [coordToKey(0, 1)]: { value: 'Description', dataType: 'string' },
        [coordToKey(1, 0)]: { value: 'Book', dataType: 'string' },
        [coordToKey(1, 1)]: { value: 'A "classic" novel, loved by all', dataType: 'string' },
      };

      const csv = serializeToCsv(cells, { delimiter: ',' });
      expect(csv).toContain('Item,Description');
      expect(csv).toContain('Book,"A ""classic"" novel, loved by all"');
    });

    it('neutralizes spreadsheet formula injection in text cells while preserving negative numbers', () => {
      const cells: SparseCellMap = {
        [coordToKey(0, 0)]: { value: '=cmd|\' /C calc\'!A0', dataType: 'string' },
        [coordToKey(0, 1)]: { value: '+2+5', dataType: 'string' },
        [coordToKey(0, 2)]: { value: '-42', dataType: 'number' }, // Valid negative number
        [coordToKey(0, 3)]: { value: '@SUM(A1:B1)', dataType: 'string' },
      };

      const csv = serializeToCsv(cells, {
        delimiter: ',',
        formulaInjectionProtection: true,
      });

      // Dangerous text formulas starting with =, +, @ should be prefixed with single quote '
      expect(csv).toContain("'=cmd|' /C calc'!A0");
      expect(csv).toContain("'+2+5");
      expect(csv).toContain("'@SUM(A1:B1)");

      // Legitimate negative number -42 should NOT be neutralized
      expect(csv).toContain('-42');
      expect(csv).not.toContain("'-42");
    });
  });
});
