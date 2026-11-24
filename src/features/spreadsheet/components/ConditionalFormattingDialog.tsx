import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Palette,
  BarChart2,
  TrendingUp,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import {
  ConditionalFormatRule,
  ConditionalFormatRuleType,
  HighlightRuleType,
  TopBottomRuleType,
  ConditionalFormattingStyle,
  DataBarConfig,
  ColorScaleConfig,
  IconSetConfig,
  IconSetType,
} from '@/types/analysis';
import { CellRange } from '@/types/cell';
import { formatRangeReference, parseRangeReference } from '@/engine/analysis/named-ranges';

interface ConditionalFormattingDialogProps {
  isOpen: boolean;
  initialRange?: CellRange;
  existingRule?: ConditionalFormatRule;
  onSaveRule: (rule: ConditionalFormatRule) => void;
  onClose: () => void;
}

const PRESET_STYLES: { label: string; style: ConditionalFormattingStyle }[] = [
  {
    label: 'Light Red Fill with Dark Red Text',
    style: { backgroundColor: '#fee2e2', textColor: '#991b1b', bold: false },
  },
  {
    label: 'Yellow Fill with Dark Yellow Text',
    style: { backgroundColor: '#fef9c3', textColor: '#854d0e', bold: false },
  },
  {
    label: 'Green Fill with Dark Green Text',
    style: { backgroundColor: '#dcfce7', textColor: '#166534', bold: false },
  },
  {
    label: 'Light Red Fill',
    style: { backgroundColor: '#fee2e2' },
  },
  {
    label: 'Red Text',
    style: { textColor: '#dc2626', bold: true },
  },
  {
    label: 'Bold Green Accent',
    style: { backgroundColor: '#bbf7d0', textColor: '#14532d', bold: true },
  },
];

export const ConditionalFormattingDialog: React.FC<ConditionalFormattingDialogProps> = ({
  isOpen,
  initialRange,
  existingRule,
  onSaveRule,
  onClose,
}) => {
  const defaultRange: CellRange = initialRange || {
    startRow: 0,
    startCol: 0,
    endRow: 9,
    endCol: 0,
  };

  const [rangeInput, setRangeInput] = useState(
    existingRule
      ? formatRangeReference(existingRule.range)
      : formatRangeReference(defaultRange)
  );

  const [category, setCategory] = useState<'highlight' | 'top_bottom' | 'data_bar' | 'color_scale' | 'icon_set' | 'formula'>(
    existingRule
      ? existingRule.type === 'data_bar'
        ? 'data_bar'
        : existingRule.type === 'color_scale'
        ? 'color_scale'
        : existingRule.type === 'icon_set'
        ? 'icon_set'
        : existingRule.type === 'custom_formula'
        ? 'formula'
        : ['top_items', 'bottom_items', 'top_percent', 'bottom_percent', 'above_average', 'below_average'].includes(existingRule.type)
        ? 'top_bottom'
        : 'highlight'
      : 'highlight'
  );

  // Highlight Rule State
  const [highlightType, setHighlightType] = useState<HighlightRuleType>(
    (existingRule?.type as HighlightRuleType) || 'greater_than'
  );
  const [val1, setVal1] = useState<string>(existingRule?.val1 !== undefined ? String(existingRule.val1) : '100');
  const [val2, setVal2] = useState<string>(existingRule?.val2 !== undefined ? String(existingRule.val2) : '200');

  // Top/Bottom Rule State
  const [topBottomType, setTopBottomType] = useState<TopBottomRuleType>(
    (existingRule?.type as TopBottomRuleType) || 'top_items'
  );
  const [topBottomRank, setTopBottomRank] = useState<number>(existingRule?.topBottomRank || 10);

  // Data Bar State
  const [dataBarColor, setDataBarColor] = useState<string>(existingRule?.dataBar?.barColor || '#3b82f6');
  const [dataBarNegativeColor, setDataBarNegativeColor] = useState<string>(existingRule?.dataBar?.negativeBarColor || '#ef4444');
  const [dataBarShowOnly, setDataBarShowOnly] = useState<boolean>(Boolean(existingRule?.dataBar?.showBarOnly));

  // Color Scale State
  const [scaleType, setScaleType] = useState<'2-color' | '3-color'>(existingRule?.colorScale?.type || '3-color');
  const [scaleMinColor, setScaleMinColor] = useState<string>(existingRule?.colorScale?.minColor || '#f87171');
  const [scaleMidColor, setScaleMidColor] = useState<string>(existingRule?.colorScale?.midColor || '#fde047');
  const [scaleMaxColor, setScaleMaxColor] = useState<string>(existingRule?.colorScale?.maxColor || '#4ade80');

  // Icon Set State
  const [iconSetType, setIconSetType] = useState<IconSetType>(existingRule?.iconSet?.iconSet || 'arrows_3');
  const [iconReverse, setIconReverse] = useState<boolean>(Boolean(existingRule?.iconSet?.reverseOrder));
  const [iconOnly, setIconOnly] = useState<boolean>(Boolean(existingRule?.iconSet?.showIconOnly));

  // Custom Formula State
  const [customFormula, setCustomFormula] = useState<string>(existingRule?.customFormula || '=$A1>100');

  // Formatting Style State
  const [customStyle, setCustomStyle] = useState<ConditionalFormattingStyle>(
    existingRule?.style || PRESET_STYLES[0]!.style
  );
  const [stopIfTrue, setStopIfTrue] = useState<boolean>(Boolean(existingRule?.stopIfTrue));
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    const parsedRange = parseRangeReference(rangeInput);
    if (!parsedRange) {
      setErrorMsg('Invalid range reference. Please use format like A1:B10 or C5.');
      return;
    }

    let ruleType: ConditionalFormatRuleType = 'greater_than';
    let dataBar: DataBarConfig | undefined = undefined;
    let colorScale: ColorScaleConfig | undefined = undefined;
    let iconSet: IconSetConfig | undefined = undefined;

    if (category === 'highlight') {
      ruleType = highlightType;
    } else if (category === 'top_bottom') {
      ruleType = topBottomType;
    } else if (category === 'data_bar') {
      ruleType = 'data_bar';
      dataBar = {
        barColor: dataBarColor,
        negativeBarColor: dataBarNegativeColor,
        minType: 'auto',
        maxType: 'auto',
        showBarOnly: dataBarShowOnly,
      };
    } else if (category === 'color_scale') {
      ruleType = 'color_scale';
      colorScale = {
        type: scaleType,
        minColor: scaleMinColor,
        midColor: scaleType === '3-color' ? scaleMidColor : undefined,
        maxColor: scaleMaxColor,
      };
    } else if (category === 'icon_set') {
      ruleType = 'icon_set';
      iconSet = {
        iconSet: iconSetType,
        reverseOrder: iconReverse,
        showIconOnly: iconOnly,
        thresholds: iconSetType === 'arrows_5'
          ? [
              { type: 'percent', value: 80, operator: '>=' },
              { type: 'percent', value: 60, operator: '>=' },
              { type: 'percent', value: 40, operator: '>=' },
              { type: 'percent', value: 20, operator: '>=' },
            ]
          : [
              { type: 'percent', value: 67, operator: '>=' },
              { type: 'percent', value: 33, operator: '>=' },
            ],
      };
    } else if (category === 'formula') {
      ruleType = 'custom_formula';
    }

    const newRule: ConditionalFormatRule = {
      id: existingRule?.id || `cf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      range: parsedRange,
      type: ruleType,
      enabled: true,
      stopIfTrue,
      style: ['data_bar', 'color_scale', 'icon_set'].includes(ruleType) ? undefined : customStyle,
      dataBar,
      colorScale,
      iconSet,
      val1: !isNaN(Number(val1)) ? Number(val1) : val1,
      val2: !isNaN(Number(val2)) ? Number(val2) : val2,
      customFormula: category === 'formula' ? customFormula : undefined,
      topBottomRank: category === 'top_bottom' ? topBottomRank : undefined,
    };

    onSaveRule(newRule);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-surface rounded-xl border border-border shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-secondary/40">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {existingRule ? 'Edit Conditional Formatting Rule' : 'New Formatting Rule'}
              </h2>
              <p className="text-xs text-foreground-muted">
                Automatically style cells based on values, formulas, or gradients
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Range Selection */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Applies to Range
            </label>
            <input
              type="text"
              value={rangeInput}
              onChange={(e) => {
                setRangeInput(e.target.value);
                setErrorMsg(null);
              }}
              placeholder="e.g. A1:D10"
              className="w-full px-3 py-2 text-sm bg-surface-secondary border border-border rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Rule Type Category Selector */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Select Rule Category
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[
                { id: 'highlight', label: 'Highlight', icon: Palette },
                { id: 'top_bottom', label: 'Top/Bottom', icon: TrendingUp },
                { id: 'data_bar', label: 'Data Bars', icon: BarChart2 },
                { id: 'color_scale', label: 'Color Scale', icon: Palette },
                { id: 'icon_set', label: 'Icon Set', icon: Sparkles },
                { id: 'formula', label: 'Formula', icon: HelpCircle },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = category === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCategory(item.id as typeof category)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-accent/15 border-accent text-accent shadow-xs'
                        : 'bg-surface border-border text-foreground-muted hover:bg-surface-secondary'
                    }`}
                  >
                    <Icon className="w-4 h-4 mb-1" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category-Specific Settings */}
          {category === 'highlight' && (
            <div className="p-4 rounded-xl bg-surface-secondary/40 border border-border space-y-3">
              <label className="block text-xs font-semibold text-foreground">
                Format cells where:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select
                  value={highlightType}
                  onChange={(e) => setHighlightType(e.target.value as HighlightRuleType)}
                  className="px-3 py-2 text-xs bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="greater_than">Greater than</option>
                  <option value="less_than">Less than</option>
                  <option value="between">Between</option>
                  <option value="equal_to">Equal to</option>
                  <option value="not_equal_to">Not equal to</option>
                  <option value="text_contains">Text contains</option>
                  <option value="text_begins_with">Text begins with</option>
                  <option value="text_ends_with">Text ends with</option>
                  <option value="duplicate">Duplicate values</option>
                  <option value="unique">Unique values</option>
                  <option value="blank">Blanks</option>
                  <option value="not_blank">No blanks</option>
                </select>

                {!['duplicate', 'unique', 'blank', 'not_blank'].includes(highlightType) && (
                  <input
                    type="text"
                    value={val1}
                    onChange={(e) => setVal1(e.target.value)}
                    placeholder="Value or text"
                    className="px-3 py-2 text-xs bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                )}

                {highlightType === 'between' && (
                  <input
                    type="text"
                    value={val2}
                    onChange={(e) => setVal2(e.target.value)}
                    placeholder="Maximum value"
                    className="px-3 py-2 text-xs bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                )}
              </div>
            </div>
          )}

          {category === 'top_bottom' && (
            <div className="p-4 rounded-xl bg-surface-secondary/40 border border-border space-y-3">
              <label className="block text-xs font-semibold text-foreground">
                Format items rank:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={topBottomType}
                  onChange={(e) => setTopBottomType(e.target.value as TopBottomRuleType)}
                  className="px-3 py-2 text-xs bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="top_items">Top Items</option>
                  <option value="bottom_items">Bottom Items</option>
                  <option value="top_percent">Top %</option>
                  <option value="bottom_percent">Bottom %</option>
                  <option value="above_average">Above Average</option>
                  <option value="below_average">Below Average</option>
                </select>

                {!['above_average', 'below_average'].includes(topBottomType) && (
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={topBottomRank}
                    onChange={(e) => setTopBottomRank(parseInt(e.target.value, 10) || 10)}
                    placeholder="Rank or percentage (e.g. 10)"
                    className="px-3 py-2 text-xs bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                )}
              </div>
            </div>
          )}

          {category === 'data_bar' && (
            <div className="p-4 rounded-xl bg-surface-secondary/40 border border-border space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground-muted mb-1">
                    Positive Bar Color
                  </label>
                  <input
                    type="color"
                    value={dataBarColor}
                    onChange={(e) => setDataBarColor(e.target.value)}
                    className="w-full h-8 rounded cursor-pointer border border-border"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-muted mb-1">
                    Negative Bar Color
                  </label>
                  <input
                    type="color"
                    value={dataBarNegativeColor}
                    onChange={(e) => setDataBarNegativeColor(e.target.value)}
                    className="w-full h-8 rounded cursor-pointer border border-border"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground">
                <input
                  type="checkbox"
                  checked={dataBarShowOnly}
                  onChange={(e) => setDataBarShowOnly(e.target.checked)}
                  className="rounded text-accent focus:ring-accent"
                />
                <span>Show Data Bar Only (hide numeric cell text)</span>
              </label>
            </div>
          )}

          {category === 'color_scale' && (
            <div className="p-4 rounded-xl bg-surface-secondary/40 border border-border space-y-3">
              <div className="flex gap-4 mb-2">
                <label className="flex items-center gap-1.5 text-xs font-medium text-foreground cursor-pointer">
                  <input
                    type="radio"
                    name="scaleType"
                    checked={scaleType === '2-color'}
                    onChange={() => setScaleType('2-color')}
                  />
                  <span>2-Color Heatmap</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs font-medium text-foreground cursor-pointer">
                  <input
                    type="radio"
                    name="scaleType"
                    checked={scaleType === '3-color'}
                    onChange={() => setScaleType('3-color')}
                  />
                  <span>3-Color Heatmap</span>
                </label>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <span className="block text-[11px] text-foreground-muted mb-1">Minimum</span>
                  <input
                    type="color"
                    value={scaleMinColor}
                    onChange={(e) => setScaleMinColor(e.target.value)}
                    className="w-full h-8 rounded cursor-pointer border border-border"
                  />
                </div>
                {scaleType === '3-color' && (
                  <div>
                    <span className="block text-[11px] text-foreground-muted mb-1">Midpoint</span>
                    <input
                      type="color"
                      value={scaleMidColor}
                      onChange={(e) => setScaleMidColor(e.target.value)}
                      className="w-full h-8 rounded cursor-pointer border border-border"
                    />
                  </div>
                )}
                <div>
                  <span className="block text-[11px] text-foreground-muted mb-1">Maximum</span>
                  <input
                    type="color"
                    value={scaleMaxColor}
                    onChange={(e) => setScaleMaxColor(e.target.value)}
                    className="w-full h-8 rounded cursor-pointer border border-border"
                  />
                </div>
              </div>
            </div>
          )}

          {category === 'icon_set' && (
            <div className="p-4 rounded-xl bg-surface-secondary/40 border border-border space-y-3">
              <div>
                <label className="block text-xs font-medium text-foreground-muted mb-1.5">
                  Icon Style
                </label>
                <select
                  value={iconSetType}
                  onChange={(e) => setIconSetType(e.target.value as IconSetType)}
                  className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="arrows_3">3 Directional Arrows (Green, Yellow, Red)</option>
                  <option value="arrows_5">5 Directional Arrows</option>
                  <option value="traffic_lights_3">3 Traffic Lights</option>
                  <option value="ratings_3">3 Stars / Ratings</option>
                  <option value="flags_3">3 Flags</option>
                  <option value="shapes_3">3 Shapes</option>
                </select>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground">
                  <input
                    type="checkbox"
                    checked={iconReverse}
                    onChange={(e) => setIconReverse(e.target.checked)}
                    className="rounded text-accent focus:ring-accent"
                  />
                  <span>Reverse Icon Order</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground">
                  <input
                    type="checkbox"
                    checked={iconOnly}
                    onChange={(e) => setIconOnly(e.target.checked)}
                    className="rounded text-accent focus:ring-accent"
                  />
                  <span>Show Icon Only</span>
                </label>
              </div>
            </div>
          )}

          {category === 'formula' && (
            <div className="p-4 rounded-xl bg-surface-secondary/40 border border-border space-y-2">
              <label className="block text-xs font-semibold text-foreground">
                Format values where this formula is true:
              </label>
              <input
                type="text"
                value={customFormula}
                onChange={(e) => setCustomFormula(e.target.value)}
                placeholder="=A1>100"
                className="w-full px-3 py-2 text-xs font-mono bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <p className="text-[11px] text-foreground-muted">
                Formula is evaluated relative to the top-left cell of the range. Use $ for absolute locks (e.g. $A$1).
              </p>
            </div>
          )}

          {/* Style Formatting & Presets (for highlight, top/bottom, formula) */}
          {!['data_bar', 'color_scale', 'icon_set'].includes(category) && (
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-semibold text-foreground">
                Formatting Style
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PRESET_STYLES.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCustomStyle(preset.style)}
                    style={{
                      backgroundColor: preset.style.backgroundColor,
                      color: preset.style.textColor,
                      fontWeight: preset.style.bold ? 700 : 400,
                    }}
                    className="px-3 py-2 rounded-lg text-xs border border-border/80 truncate hover:opacity-90 transition-opacity"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Custom color pickers */}
              <div className="flex items-center gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-foreground-muted">Fill:</span>
                  <input
                    type="color"
                    value={customStyle.backgroundColor || '#ffffff'}
                    onChange={(e) =>
                      setCustomStyle({ ...customStyle, backgroundColor: e.target.value })
                    }
                    className="w-7 h-7 rounded border border-border cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-foreground-muted">Text:</span>
                  <input
                    type="color"
                    value={customStyle.textColor || '#000000'}
                    onChange={(e) =>
                      setCustomStyle({ ...customStyle, textColor: e.target.value })
                    }
                    className="w-7 h-7 rounded border border-border cursor-pointer"
                  />
                </div>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer text-foreground">
                  <input
                    type="checkbox"
                    checked={Boolean(customStyle.bold)}
                    onChange={(e) =>
                      setCustomStyle({ ...customStyle, bold: e.target.checked })
                    }
                  />
                  <span>Bold</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer text-foreground">
                  <input
                    type="checkbox"
                    checked={Boolean(customStyle.italic)}
                    onChange={(e) =>
                      setCustomStyle({ ...customStyle, italic: e.target.checked })
                    }
                  />
                  <span>Italic</span>
                </label>
              </div>
            </div>
          )}

          {/* Options */}
          <div className="pt-2 border-t border-border">
            <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={stopIfTrue}
                onChange={(e) => setStopIfTrue(e.target.checked)}
                className="rounded text-accent focus:ring-accent"
              />
              <span>Stop If True (subsequent rules won't evaluate if this rule matches)</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-surface-secondary/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-foreground hover:bg-surface-secondary border border-border rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-xs font-semibold bg-accent text-accent-foreground hover:bg-accent/90 rounded-lg shadow-xs transition-colors"
          >
            {existingRule ? 'Update Rule' : 'Add Rule'}
          </button>
        </div>
      </div>
    </div>
  );
};
