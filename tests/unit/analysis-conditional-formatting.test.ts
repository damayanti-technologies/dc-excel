import { describe, it, expect } from 'vitest';
import {
  evaluateHighlightRule,
  evaluateTopBottomRule,
  adaptFormulaForCell,
  evaluateConditionalFormatting,
} from '../../src/engine/analysis/conditional-formatting';
import { Cell } from '../../src/types/cell';
import { ConditionalFormatRule } from '../../src/types/analysis';
import { coordToKey } from '../../src/utils/coordinates';

describe('Conditional Formatting Engine', () => {
  describe('evaluateHighlightRule', () => {
    it('evaluates numeric comparisons (greater_than, less_than, between, equal_to)', () => {
      expect(evaluateHighlightRule(150, 'greater_than', 100)).toBe(true);
      expect(evaluateHighlightRule(50, 'greater_than', 100)).toBe(false);

      expect(evaluateHighlightRule(50, 'less_than', 100)).toBe(true);
      expect(evaluateHighlightRule(150, 'less_than', 100)).toBe(false);

      expect(evaluateHighlightRule(50, 'between', 10, 100)).toBe(true);
      expect(evaluateHighlightRule(5, 'between', 10, 100)).toBe(false);

      expect(evaluateHighlightRule(42, 'equal_to', 42)).toBe(true);
      expect(evaluateHighlightRule(42, 'equal_to', 99)).toBe(false);
    });

    it('evaluates text pattern matching (contains, begins_with, ends_with)', () => {
      expect(evaluateHighlightRule('OmniSheet Enterprise', 'text_contains', 'sheet')).toBe(true);
      expect(evaluateHighlightRule('OmniSheet Enterprise', 'text_contains', 'Google')).toBe(false);

      expect(evaluateHighlightRule('Hello World', 'text_begins_with', 'Hell')).toBe(true);
      expect(evaluateHighlightRule('Hello World', 'text_ends_with', 'World')).toBe(true);
    });

    it('evaluates blank and not_blank', () => {
      expect(evaluateHighlightRule('', 'blank')).toBe(true);
      expect(evaluateHighlightRule(null, 'blank')).toBe(true);
      expect(evaluateHighlightRule('Omni', 'blank')).toBe(false);
      expect(evaluateHighlightRule('Omni', 'not_blank')).toBe(true);
    });

    it('evaluates duplicates and unique from stats frequency map', () => {
      const stats = {
        min: 0,
        max: 10,
        avg: 5,
        count: 4,
        hasNegative: false,
        totalNonBlankCount: 4,
        sortedValuesAsc: [1, 2, 2, 3],
        sortedValuesDesc: [3, 2, 2, 1],
        valueCounts: new Map([
          ['1', 1],
          ['2', 2],
          ['3', 1],
        ]),
      };

      expect(evaluateHighlightRule(2, 'duplicate', undefined, undefined, stats)).toBe(true);
      expect(evaluateHighlightRule(1, 'duplicate', undefined, undefined, stats)).toBe(false);
      expect(evaluateHighlightRule(1, 'unique', undefined, undefined, stats)).toBe(true);
      expect(evaluateHighlightRule(2, 'unique', undefined, undefined, stats)).toBe(false);
    });
  });

  describe('evaluateTopBottomRule', () => {
    const stats = {
      min: 10,
      max: 50,
      avg: 30,
      count: 5,
      hasNegative: false,
      totalNonBlankCount: 5,
      sortedValuesAsc: [10, 20, 30, 40, 50],
      sortedValuesDesc: [50, 40, 30, 20, 10],
      valueCounts: new Map(),
    };

    it('evaluates top 2 items and bottom 2 items', () => {
      expect(evaluateTopBottomRule(50, 'top_items', 2, stats)).toBe(true);
      expect(evaluateTopBottomRule(40, 'top_items', 2, stats)).toBe(true);
      expect(evaluateTopBottomRule(30, 'top_items', 2, stats)).toBe(false);

      expect(evaluateTopBottomRule(10, 'bottom_items', 2, stats)).toBe(true);
      expect(evaluateTopBottomRule(20, 'bottom_items', 2, stats)).toBe(true);
      expect(evaluateTopBottomRule(30, 'bottom_items', 2, stats)).toBe(false);
    });

    it('evaluates above average and below average', () => {
      expect(evaluateTopBottomRule(40, 'above_average', undefined, stats)).toBe(true);
      expect(evaluateTopBottomRule(30, 'above_average', undefined, stats)).toBe(false);
      expect(evaluateTopBottomRule(20, 'below_average', undefined, stats)).toBe(true);
    });
  });

  describe('adaptFormulaForCell', () => {
    it('shifts relative cell references based on row and col offset', () => {
      const adapted = adaptFormulaForCell('=A1>100', 0, 0, 2, 1);
      expect(adapted).toBe('=B3>100');
    });

    it('preserves absolute cell references ($A$1)', () => {
      const adapted = adaptFormulaForCell('=$A$1>100', 0, 0, 5, 5);
      expect(adapted).toBe('=$A$1>100');
    });

    it('preserves mixed column/row locks ($A1 and A$1)', () => {
      const adaptedColLock = adaptFormulaForCell('=$A1>100', 0, 0, 3, 2);
      expect(adaptedColLock).toBe('=$A4>100');

      const adaptedRowLock = adaptFormulaForCell('=A$1>100', 0, 0, 3, 2);
      expect(adaptedRowLock).toBe('=C$1>100');
    });
  });

  describe('evaluateConditionalFormatting integration', () => {
    it('evaluates rules and returns visual styling mapping', () => {
      const cells: Record<string, Cell> = {
        [coordToKey(0, 0)]: { value: 150, dataType: 'number' },
        [coordToKey(1, 0)]: { value: 50, dataType: 'number' },
      };

      const rules: ConditionalFormatRule[] = [
        {
          id: 'rule-1',
          range: { startRow: 0, startCol: 0, endRow: 1, endCol: 0 },
          type: 'greater_than',
          val1: 100,
          enabled: true,
          style: {
            backgroundColor: '#dcfce7',
            textColor: '#166534',
            bold: true,
          },
        },
      ];

      const evaluated = evaluateConditionalFormatting(cells, rules);
      const cell00 = evaluated.get(coordToKey(0, 0));
      expect(cell00?.style?.backgroundColor).toBe('#dcfce7');
      expect(cell00?.style?.bold).toBe(true);

      const cell10 = evaluated.get(coordToKey(1, 0));
      expect(cell10).toBeUndefined();
    });

    it('respects stopIfTrue flag', () => {
      const cells: Record<string, Cell> = {
        [coordToKey(0, 0)]: { value: 200, dataType: 'number' },
      };

      const rules: ConditionalFormatRule[] = [
        {
          id: 'rule-first',
          range: { startRow: 0, startCol: 0, endRow: 0, endCol: 0 },
          type: 'greater_than',
          val1: 100,
          enabled: true,
          stopIfTrue: true,
          style: { backgroundColor: '#first' },
        },
        {
          id: 'rule-second',
          range: { startRow: 0, startCol: 0, endRow: 0, endCol: 0 },
          type: 'greater_than',
          val1: 50,
          enabled: true,
          style: { backgroundColor: '#second' },
        },
      ];

      const evaluated = evaluateConditionalFormatting(cells, rules);
      const cell00 = evaluated.get(coordToKey(0, 0));
      expect(cell00?.style?.backgroundColor).toBe('#first');
    });
  });
});
