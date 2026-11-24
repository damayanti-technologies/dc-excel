import { describe, it, expect } from 'vitest';
import {
  getAutocompleteContext,
  getArgumentHelpContext
} from '@/engine/calculation/formula-assist';
import { functionRegistry } from '@/engine/calculation/functions';

describe('Formula Autocomplete & Argument Assistance', () => {
  describe('getAutocompleteContext', () => {
    it('detects formula autocomplete when typing function prefix after =', () => {
      const text = '=VLO';
      const ctx = getAutocompleteContext(text, 4);

      expect(ctx).not.toBeNull();
      expect(ctx?.prefix).toBe('VLO');
      expect(ctx?.replaceStart).toBe(1);
      expect(ctx?.replaceEnd).toBe(4);
    });

    it('detects formula autocomplete inside nested expressions', () => {
      const text = '=IF(A1 > 0, VLO';
      const ctx = getAutocompleteContext(text, text.length);

      expect(ctx).not.toBeNull();
      expect(ctx?.prefix).toBe('VLO');
      expect(ctx?.replaceStart).toBe(12);
      expect(ctx?.replaceEnd).toBe(15);
    });

    it('returns null if input does not begin with =', () => {
      const text = 'VLOOKUP';
      const ctx = getAutocompleteContext(text, 7);
      expect(ctx).toBeNull();
    });

    it('returns null if cursor is right after an open parenthesis or comma with no prefix', () => {
      expect(getAutocompleteContext('=SUM(', 5)).toBeNull();
      expect(getAutocompleteContext('=SUM(A1, ', 9)).toBeNull();
    });
  });

  describe('getArgumentHelpContext', () => {
    it('detects function and first argument when opening parenthesis', () => {
      const text = '=VLOOKUP(';
      const ctx = getArgumentHelpContext(text, text.length);

      expect(ctx).not.toBeNull();
      expect(ctx?.functionDef.name).toBe('VLOOKUP');
      expect(ctx?.activeArgIndex).toBe(0);
    });

    it('increments activeArgumentIndex when comma is typed', () => {
      const text = '=VLOOKUP(A1, B1:D10, ';
      const ctx = getArgumentHelpContext(text, text.length);

      expect(ctx).not.toBeNull();
      expect(ctx?.functionDef.name).toBe('VLOOKUP');
      expect(ctx?.activeArgIndex).toBe(2);
      expect(ctx?.functionDef.args[2]?.name).toBe('col_index_num');
    });

    it('correctly tracks nested function calls without corrupting outer arguments', () => {
      // In the middle of nested MATCH inside INDEX
      const text = '=INDEX(A1:D10, MATCH(B1, ';
      const ctx = getArgumentHelpContext(text, text.length);

      expect(ctx).not.toBeNull();
      expect(ctx?.functionDef.name).toBe('MATCH');
      expect(ctx?.activeArgIndex).toBe(1);
      expect(ctx?.functionDef.args[1]?.name).toBe('lookup_array');

      // Once MATCH closes:
      const textOuter = '=INDEX(A1:D10, MATCH(B1, C1:C10, 0), ';
      const ctxOuter = getArgumentHelpContext(textOuter, textOuter.length);

      expect(ctxOuter).not.toBeNull();
      expect(ctxOuter?.functionDef.name).toBe('INDEX');
      expect(ctxOuter?.activeArgIndex).toBe(2);
      expect(ctxOuter?.functionDef.args[2]?.name).toBe('column_num');
    });

    it('returns null if cursor is outside all function parentheses', () => {
      const text = '=SUM(1, 2) + 3';
      const ctx = getArgumentHelpContext(text, text.length);
      expect(ctx).toBeNull();
    });
  });

  describe('functionRegistry', () => {
    it('registers all 92 required functions across 7 categories', () => {
      const all = functionRegistry.getAll();
      expect(all.length).toBeGreaterThanOrEqual(90);

      const categories = functionRegistry.getCategories();
      expect(categories).toContain('Lookup & Reference');
      expect(categories).toContain('Text');
      expect(categories).toContain('Date & Time');
      expect(categories).toContain('Mathematical');
      expect(categories).toContain('Statistical');
      expect(categories).toContain('Logical');
      expect(categories).toContain('Information');
    });

    it('returns matching suggestions sorted by relevance and name', () => {
      const suggestions = functionRegistry.getSuggestions('VLO');
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]?.name).toBe('VLOOKUP');

      const xSuggestions = functionRegistry.getSuggestions('XLO');
      expect(xSuggestions[0]?.name).toBe('XLOOKUP');
    });

    it('searches functions by keyword across name, description, and category', () => {
      const lookupMatches = functionRegistry.search('lookup');
      expect(lookupMatches.some((f) => f.name === 'VLOOKUP')).toBe(true);
      expect(lookupMatches.some((f) => f.name === 'HLOOKUP')).toBe(true);
      expect(lookupMatches.some((f) => f.name === 'XLOOKUP')).toBe(true);

      const dateMatches = functionRegistry.search('serial');
      expect(dateMatches.length).toBeGreaterThan(0);
    });
  });
});
