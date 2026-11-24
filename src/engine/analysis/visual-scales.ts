import {
  DataBarConfig,
  ColorScaleConfig,
  IconSetConfig,
  IconSetType
} from '@/types/analysis';

export interface NumericRangeStats {
  min: number;
  max: number;
  avg: number;
  count: number;
  hasNegative: boolean;
}

/**
 * Computes min, max, average and sign distribution for numbers in a range.
 */
export function computeNumericStats(values: (number | null | undefined)[]): NumericRangeStats {
  const nums = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (nums.length === 0 || nums[0] === undefined) {
    return { min: 0, max: 0, avg: 0, count: 0, hasNegative: false };
  }

  let min = nums[0];
  let max = nums[0];
  let sum = 0;
  let hasNegative = false;

  for (const n of nums) {
    if (n < min) min = n;
    if (n > max) max = n;
    if (n < 0) hasNegative = true;
    sum += n;
  }

  return {
    min,
    max,
    avg: sum / nums.length,
    count: nums.length,
    hasNegative
  };
}

/**
 * Computes data bar rendering parameters for a cell value.
 */
export function computeDataBar(
  val: number,
  config: DataBarConfig,
  stats: NumericRangeStats
): {
  widthPercent: number;
  color: string;
  isNegative: boolean;
  showBarOnly: boolean;
} {
  const isNegative = val < 0;
  const barColor = isNegative && config.negativeBarColor ? config.negativeBarColor : config.barColor;
  const showBarOnly = Boolean(config.showBarOnly);

  const min = config.minType === 'num' && config.minVal !== undefined ? config.minVal : stats.min;
  const max = config.maxType === 'num' && config.maxVal !== undefined ? config.maxVal : stats.max;

  if (max === min) {
    return { widthPercent: 50, color: barColor, isNegative, showBarOnly };
  }

  if (stats.hasNegative) {
    // Zero-axis scale
    const absMax = Math.max(Math.abs(min), Math.abs(max));
    if (absMax === 0) {
      return { widthPercent: 0, color: barColor, isNegative, showBarOnly };
    }
    const widthPercent = Math.min(100, Math.max(0, (Math.abs(val) / absMax) * 50));
    return { widthPercent, color: barColor, isNegative, showBarOnly };
  }

  // Pure positive scale (0% to 100%)
  const clampedVal = Math.max(min, Math.min(max, val));
  const widthPercent = Math.min(100, Math.max(0, ((clampedVal - min) / (max - min)) * 100));
  return { widthPercent, color: barColor, isNegative, showBarOnly };
}

/**
 * Parses a hex string (#RRGGBB or #RGB) into RGB components.
 */
function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace(/^#/, '');
  if (cleanHex.length === 3) {
    const c0 = cleanHex[0] || '0';
    const c1 = cleanHex[1] || '0';
    const c2 = cleanHex[2] || '0';
    const r = parseInt(c0 + c0, 16);
    const g = parseInt(c1 + c1, 16);
    const b = parseInt(c2 + c2, 16);
    return { r, g, b };
  }
  const num = parseInt(cleanHex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

/**
 * Formats RGB components into a 6-digit hex string (#RRGGBB).
 */
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(c)));
    return clamped.toString(16).padStart(2, '0');
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Linearly interpolates between two hex colors by factor t (0 <= t <= 1).
 */
export function interpolateColor(hex1: string, hex2: string, t: number): string {
  const c1 = parseHexColor(hex1);
  const c2 = parseHexColor(hex2);
  const clampedT = Math.max(0, Math.min(1, t));

  const r = c1.r + (c2.r - c1.r) * clampedT;
  const g = c1.g + (c2.g - c1.g) * clampedT;
  const b = c1.b + (c2.b - c1.b) * clampedT;

  return rgbToHex(r, g, b);
}

/**
 * Computes color scale background color for a cell value.
 */
export function computeColorScale(
  val: number,
  config: ColorScaleConfig,
  stats: NumericRangeStats
): string {
  const min = config.minVal !== undefined ? config.minVal : stats.min;
  const max = config.maxVal !== undefined ? config.maxVal : stats.max;

  if (max <= min) {
    return config.minColor;
  }

  const clamped = Math.max(min, Math.min(max, val));

  if (config.type === '3-color' && config.midColor) {
    const mid = config.midVal !== undefined ? config.midVal : (min + max) / 2;
    if (clamped <= mid) {
      const t = mid === min ? 0 : (clamped - min) / (mid - min);
      return interpolateColor(config.minColor, config.midColor, t);
    } else {
      const t = max === mid ? 1 : (clamped - mid) / (max - mid);
      return interpolateColor(config.midColor, config.maxColor, t);
    }
  }

  // 2-color scale
  const t = (clamped - min) / (max - min);
  return interpolateColor(config.minColor, config.maxColor, t);
}

/**
 * Evaluates which icon from an IconSet applies to a numeric value.
 */
export function computeIcon(
  val: number,
  config: IconSetConfig,
  stats: NumericRangeStats
): {
  iconSet: IconSetType;
  iconIndex: number;
  label: string;
  showIconOnly: boolean;
} {
  const showIconOnly = Boolean(config.showIconOnly);
  const iconCount = config.iconSet === 'arrows_5' ? 5 : 3;

  // Compute resolved threshold cutoff values
  const range = stats.max - stats.min;
  const cutoffs = config.thresholds.map((t) => {
    if (t.type === 'percent') {
      return stats.min + (t.value / 100) * (range === 0 ? 1 : range);
    }
    return t.value;
  });

  // Evaluate index based on thresholds (top threshold down)
  let index = iconCount - 1; // default to lowest icon
  for (let i = 0; i < cutoffs.length; i++) {
    const thresholdVal = cutoffs[i] ?? 0;
    const op = config.thresholds[i]?.operator || '>=';
    const matches = op === '>' ? val > thresholdVal : val >= thresholdVal;
    if (matches) {
      index = i;
      break;
    }
  }

  if (config.reverseOrder) {
    index = iconCount - 1 - index;
  }

  const label = `${config.iconSet} tier ${index + 1}`;
  return {
    iconSet: config.iconSet,
    iconIndex: index,
    label,
    showIconOnly
  };
}
