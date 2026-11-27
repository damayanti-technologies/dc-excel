import { describe, it, expect } from 'vitest';
import {
  FONT_FAMILIES,
  FONT_SIZES,
  DEFAULT_CELL_STYLE,
  matchFontFamily
} from '@/engine/formatting/constants';
import { applyStyleToRange } from '@/engine/formatting/range-formatting';
import { SparseCellMap, CellRange } from '@/types/cell';

describe('Font Catalog & Formatting Precision', () => {
  it('provides a rich, categorized font catalog with modern and classic fonts', () => {
    expect(FONT_FAMILIES.length).toBeGreaterThanOrEqual(20);

    const categories = new Set(FONT_FAMILIES.map((f) => f.category));
    expect(categories.has('sans-serif')).toBe(true);
    expect(categories.has('serif')).toBe(true);
    expect(categories.has('monospace')).toBe(true);
    expect(categories.has('display')).toBe(true);

    const labels = FONT_FAMILIES.map((f) => f.label);
    // Distinctive web fonts
    expect(labels).toContain('Playfair Display');
    expect(labels).toContain('Cinzel');
    expect(labels).toContain('Merriweather');
    expect(labels).toContain('JetBrains Mono');
    expect(labels).toContain('Oswald');
    expect(labels).toContain('Montserrat');
    expect(labels).toContain('Poppins');
    expect(labels).toContain('Inter');
    expect(labels).toContain('Roboto');

    // Traditional spreadsheet fonts
    expect(labels).toContain('Calibri');
    expect(labels).toContain('Arial');
    expect(labels).toContain('Times New Roman');
    expect(labels).toContain('Georgia');
    expect(labels).toContain('Consolas');
  });

  describe('matchFontFamily helper', () => {
    it('matches exact font labels', () => {
      const match = matchFontFamily('Playfair Display');
      expect(match).toBeDefined();
      expect(match?.label).toBe('Playfair Display');
      expect(match?.category).toBe('serif');
    });

    it('matches case-insensitively', () => {
      expect(matchFontFamily('cinzel')?.label).toBe('Cinzel');
      expect(matchFontFamily('JETBRAINS MONO')?.label).toBe('JetBrains Mono');
      expect(matchFontFamily('poppins')?.label).toBe('Poppins');
    });

    it('matches font family values with fallback stacks and quotes', () => {
      expect(matchFontFamily('"Times New Roman", Times, serif')?.label).toBe('Times New Roman');
      expect(matchFontFamily('Calibri, "Segoe UI", sans-serif')?.label).toBe('Calibri');
      expect(matchFontFamily('"JetBrains Mono", Consolas, monospace')?.label).toBe('JetBrains Mono');
    });

    it('gracefully handles undefined or unknown fonts', () => {
      expect(matchFontFamily(undefined)).toBeUndefined();
      expect(matchFontFamily('')).toBeUndefined();
      expect(matchFontFamily('UnknownCustomFont123')).toBeUndefined();
    });
  });

  describe('Applying font families and sizes to cells', () => {
    it('applies every font family in the catalog accurately via applyStyleToRange', () => {
      for (const font of FONT_FAMILIES) {
        const initialCells: SparseCellMap = {
          '0:0': { value: 'DC Excel Typography Test', dataType: 'string' }
        };
        const range: CellRange = { startRow: 0, startCol: 0, endRow: 0, endCol: 0 };
        const updated = applyStyleToRange(initialCells, range, { fontFamily: font.value });

        expect(updated['0:0']?.style?.fontFamily).toBe(font.value);
        expect(updated['0:0']?.value).toBe('DC Excel Typography Test');
      }
    });

    it('applies font sizes across all standard increments', () => {
      for (const size of FONT_SIZES) {
        const initialCells: SparseCellMap = {
          '1:1': { value: 42, dataType: 'number' }
        };
        const range: CellRange = { startRow: 1, startCol: 1, endRow: 1, endCol: 1 };
        const updated = applyStyleToRange(initialCells, range, { fontSize: size });

        expect(updated['1:1']?.style?.fontSize).toBe(size);
        expect(updated['1:1']?.value).toBe(42);
      }
    });

    it('composes font family, font size, and styling properties without collision', () => {
      const initialCells: SparseCellMap = {
        '2:3': { value: 'Financial Statement', dataType: 'string' }
      };
      const range: CellRange = { startRow: 2, startCol: 3, endRow: 2, endCol: 3 };
      const updated = applyStyleToRange(initialCells, range, {
        fontFamily: '"Playfair Display", Georgia, serif',
        fontSize: 18,
        bold: true,
        italic: false,
        textColor: '#059669',
        backgroundColor: '#ecfdf5',
        horizontalAlignment: 'center',
        verticalAlignment: 'middle'
      });

      const cell = updated['2:3'];
      expect(cell).toBeDefined();
      expect(cell?.style?.fontFamily).toBe('"Playfair Display", Georgia, serif');
      expect(cell?.style?.fontSize).toBe(18);
      expect(cell?.style?.bold).toBe(true);
      expect(cell?.style?.textColor).toBe('#059669');
      expect(cell?.style?.backgroundColor).toBe('#ecfdf5');
      expect(cell?.style?.horizontalAlignment).toBe('center');
      expect(cell?.style?.verticalAlignment).toBe('middle');
    });

    it('defaults to a clean standard cell style', () => {
      expect(DEFAULT_CELL_STYLE.fontSize).toBe(11);
      expect(DEFAULT_CELL_STYLE.fontFamily).toContain('Calibri');
    });
  });
});
