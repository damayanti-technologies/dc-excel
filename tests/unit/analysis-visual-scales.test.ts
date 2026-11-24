import { describe, it, expect } from 'vitest';
import {
  computeNumericStats,
  computeDataBar,
  interpolateColor,
  computeColorScale,
  computeIcon,
} from '../../src/engine/analysis/visual-scales';

describe('Analysis Visual Scales', () => {
  describe('computeNumericStats', () => {
    it('computes min, max, avg, count and negative detection', () => {
      const stats = computeNumericStats([10, 20, 30, -5, 45]);
      expect(stats.min).toBe(-5);
      expect(stats.max).toBe(45);
      expect(stats.avg).toBe(20);
      expect(stats.count).toBe(5);
      expect(stats.hasNegative).toBe(true);
    });

    it('handles empty arrays gracefully', () => {
      const stats = computeNumericStats([]);
      expect(stats.count).toBe(0);
      expect(stats.min).toBe(0);
      expect(stats.max).toBe(0);
    });
  });

  describe('computeDataBar', () => {
    const positiveStats = computeNumericStats([10, 50, 100]);

    it('calculates width percent for positive values', () => {
      const bar = computeDataBar(55, { barColor: '#3b82f6', minType: 'auto', maxType: 'auto' }, positiveStats);
      expect(bar.widthPercent).toBe(50);
      expect(bar.isNegative).toBe(false);
      expect(bar.color).toBe('#3b82f6');
    });

    it('splits zero axis symmetrically when negative values exist', () => {
      const splitStats = computeNumericStats([-100, 0, 100]);
      const positiveBar = computeDataBar(50, {
        barColor: '#3b82f6',
        negativeBarColor: '#ef4444',
        minType: 'auto',
        maxType: 'auto',
      }, splitStats);

      expect(positiveBar.isNegative).toBe(false);
      expect(positiveBar.widthPercent).toBe(25);
      expect(positiveBar.color).toBe('#3b82f6');

      const negativeBar = computeDataBar(-50, {
        barColor: '#3b82f6',
        negativeBarColor: '#ef4444',
        minType: 'auto',
        maxType: 'auto',
      }, splitStats);

      expect(negativeBar.isNegative).toBe(true);
      expect(negativeBar.widthPercent).toBe(25);
      expect(negativeBar.color).toBe('#ef4444');
    });
  });

  describe('interpolateColor and computeColorScale', () => {
    it('interpolates between two hex colors linearly', () => {
      const mid = interpolateColor('#000000', '#ffffff', 0.5);
      expect(mid.toLowerCase()).toBe('#808080');
    });

    it('computes 2-color scale', () => {
      const stats = computeNumericStats([0, 100]);
      const color = computeColorScale(50, {
        type: '2-color',
        minColor: '#ffffff',
        maxColor: '#000000',
      }, stats);
      expect(color.toLowerCase()).toBe('#808080');
    });

    it('computes 3-color scale with midpoint', () => {
      const stats = computeNumericStats([0, 50, 100]);
      const lowColor = computeColorScale(0, {
        type: '3-color',
        minColor: '#ff0000',
        midColor: '#ffff00',
        maxColor: '#00ff00',
      }, stats);
      expect(lowColor.toLowerCase()).toBe('#ff0000');

      const midColor = computeColorScale(50, {
        type: '3-color',
        minColor: '#ff0000',
        midColor: '#ffff00',
        maxColor: '#00ff00',
      }, stats);
      expect(midColor.toLowerCase()).toBe('#ffff00');

      const highColor = computeColorScale(100, {
        type: '3-color',
        minColor: '#ff0000',
        midColor: '#ffff00',
        maxColor: '#00ff00',
      }, stats);
      expect(highColor.toLowerCase()).toBe('#00ff00');
    });
  });

  describe('computeIcon', () => {
    it('assigns top tier, middle tier, and bottom tier icons based on percent cutoffs', () => {
      const stats = computeNumericStats([0, 50, 100]);
      const iconConfig = {
        iconSet: 'arrows_3' as const,
        thresholds: [
          { type: 'percent' as const, value: 67, operator: '>=' as const },
          { type: 'percent' as const, value: 33, operator: '>=' as const },
        ],
      };

      const highIcon = computeIcon(80, iconConfig, stats);
      expect(highIcon.iconIndex).toBe(0);

      const midIcon = computeIcon(50, iconConfig, stats);
      expect(midIcon.iconIndex).toBe(1);

      const lowIcon = computeIcon(20, iconConfig, stats);
      expect(lowIcon.iconIndex).toBe(2);
    });

    it('reverses icon order when reverseOrder is true', () => {
      const stats = computeNumericStats([0, 50, 100]);
      const iconConfig = {
        iconSet: 'arrows_3' as const,
        reverseOrder: true,
        thresholds: [
          { type: 'percent' as const, value: 67, operator: '>=' as const },
          { type: 'percent' as const, value: 33, operator: '>=' as const },
        ],
      };

      const highIcon = computeIcon(80, iconConfig, stats);
      expect(highIcon.iconIndex).toBe(2);
    });
  });
});
