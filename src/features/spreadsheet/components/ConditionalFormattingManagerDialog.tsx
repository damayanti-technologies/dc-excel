import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  ChevronUp,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { ConditionalFormatRule } from '@/types/analysis';
import { CellRange } from '@/types/cell';
import { formatRangeReference, parseRangeReference } from '@/engine/analysis/named-ranges';
import { ConditionalFormattingDialog } from './ConditionalFormattingDialog';

interface ConditionalFormattingManagerDialogProps {
  isOpen: boolean;
  rules: ConditionalFormatRule[];
  currentSelection?: CellRange;
  onUpdateRules: (rules: ConditionalFormatRule[]) => void;
  onClose: () => void;
}

export const ConditionalFormattingManagerDialog: React.FC<ConditionalFormattingManagerDialogProps> = ({
  isOpen,
  rules,
  currentSelection,
  onUpdateRules,
  onClose,
}) => {
  const [localRules, setLocalRules] = useState<ConditionalFormatRule[]>(rules);
  const [filterScope, setFilterScope] = useState<'sheet' | 'selection'>('sheet');
  const [editingRule, setEditingRule] = useState<ConditionalFormatRule | null>(null);
  const [isNewRuleOpen, setIsNewRuleOpen] = useState(false);

  // Synchronize when rules prop changes
  React.useEffect(() => {
    setLocalRules(rules);
  }, [rules]);

  if (!isOpen) return null;

  const handleToggleEnable = (ruleId: string) => {
    setLocalRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const handleToggleStopIfTrue = (ruleId: string) => {
    setLocalRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, stopIfTrue: !r.stopIfTrue } : r))
    );
  };

  const handleChangeRange = (ruleId: string, rangeStr: string) => {
    const parsed = parseRangeReference(rangeStr);
    if (!parsed) return;
    setLocalRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, range: parsed } : r))
    );
  };

  const handleDeleteRule = (ruleId: string) => {
    setLocalRules((prev) => prev.filter((r) => r.id !== ruleId));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setLocalRules((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1]!;
      copy[index - 1] = copy[index]!;
      copy[index] = temp;
      return copy;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index >= localRules.length - 1) return;
    setLocalRules((prev) => {
      const copy = [...prev];
      const temp = copy[index + 1]!;
      copy[index + 1] = copy[index]!;
      copy[index] = temp;
      return copy;
    });
  };

  const handleSaveRule = (savedRule: ConditionalFormatRule) => {
    setLocalRules((prev) => {
      const idx = prev.findIndex((r) => r.id === savedRule.id);
      if (idx !== -1) {
        return prev.map((r) => (r.id === savedRule.id ? savedRule : r));
      }
      return [savedRule, ...prev];
    });
    setEditingRule(null);
    setIsNewRuleOpen(false);
  };

  const handleApply = () => {
    onUpdateRules(localRules);
  };

  const handleOk = () => {
    onUpdateRules(localRules);
    onClose();
  };

  const displayedRules = localRules.filter((rule) => {
    if (filterScope === 'sheet') return true;
    if (!currentSelection) return true;
    return (
      rule.range.startRow <= currentSelection.endRow &&
      rule.range.endRow >= currentSelection.startRow &&
      rule.range.startCol <= currentSelection.endCol &&
      rule.range.endCol >= currentSelection.startCol
    );
  });

  const getRuleSummary = (rule: ConditionalFormatRule): string => {
    switch (rule.type) {
      case 'greater_than':
        return `Cell Value > ${rule.val1}`;
      case 'less_than':
        return `Cell Value < ${rule.val1}`;
      case 'between':
        return `Cell Value between ${rule.val1} and ${rule.val2}`;
      case 'equal_to':
        return `Cell Value = ${rule.val1}`;
      case 'not_equal_to':
        return `Cell Value ≠ ${rule.val1}`;
      case 'text_contains':
        return `Text contains "${rule.val1}"`;
      case 'text_begins_with':
        return `Text begins with "${rule.val1}"`;
      case 'text_ends_with':
        return `Text ends with "${rule.val1}"`;
      case 'duplicate':
        return 'Duplicate values';
      case 'unique':
        return 'Unique values';
      case 'blank':
        return 'Blank cells';
      case 'not_blank':
        return 'Non-blank cells';
      case 'top_items':
        return `Top ${rule.topBottomRank || 10} items`;
      case 'bottom_items':
        return `Bottom ${rule.topBottomRank || 10} items`;
      case 'top_percent':
        return `Top ${rule.topBottomRank || 10}%`;
      case 'bottom_percent':
        return `Bottom ${rule.topBottomRank || 10}%`;
      case 'above_average':
        return 'Above Average';
      case 'below_average':
        return 'Below Average';
      case 'data_bar':
        return 'Data Bar';
      case 'color_scale':
        return `Color Scale (${rule.colorScale?.type || 'Heatmap'})`;
      case 'icon_set':
        return `Icon Set (${rule.iconSet?.iconSet || 'Icons'})`;
      case 'custom_formula':
        return `Formula: ${rule.customFormula}`;
      default:
        return 'Custom rule';
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
        <div className="bg-surface rounded-xl border border-border shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-secondary/40">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Conditional Formatting Rules Manager
                </h2>
                <p className="text-xs text-foreground-muted">
                  View, reorder, edit, and manage all rules in precedence order (top rules take priority)
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

          {/* Controls Bar */}
          <div className="px-6 py-3 border-b border-border bg-surface flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-foreground-muted">Show formatting rules for:</span>
              <select
                value={filterScope}
                onChange={(e) => setFilterScope(e.target.value as typeof filterScope)}
                className="px-2.5 py-1.5 text-xs bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="sheet">This Worksheet</option>
                <option value="selection">Current Selection</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setIsNewRuleOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent text-accent-foreground hover:bg-accent/90 rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Rule...</span>
            </button>
          </div>

          {/* Table of Rules */}
          <div className="p-6 overflow-y-auto flex-1">
            {displayedRules.length === 0 ? (
              <div className="text-center py-12 text-foreground-muted">
                <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">No conditional formatting rules found.</p>
                <p className="text-xs text-foreground-muted/80 mt-1">
                  Click "New Rule..." above to add your first rule.
                </p>
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-surface-secondary/70 border-b border-border text-foreground-muted font-semibold">
                    <tr>
                      <th className="p-2.5 w-8 text-center">Active</th>
                      <th className="p-2.5">Rule (Applied in order)</th>
                      <th className="p-2.5">Format Preview</th>
                      <th className="p-2.5">Applies to</th>
                      <th className="p-2.5 text-center">Stop if True</th>
                      <th className="p-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {displayedRules.map((rule, idx) => (
                      <tr
                        key={rule.id}
                        className={`hover:bg-surface-secondary/30 transition-colors ${
                          !rule.enabled ? 'opacity-50' : ''
                        }`}
                      >
                        <td className="p-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={rule.enabled}
                            onChange={() => handleToggleEnable(rule.id)}
                            className="rounded text-accent focus:ring-accent"
                          />
                        </td>
                        <td className="p-2.5 font-medium text-foreground">
                          {getRuleSummary(rule)}
                        </td>
                        <td className="p-2.5">
                          {rule.style ? (
                            <div
                              style={{
                                backgroundColor: rule.style.backgroundColor || '#f1f5f9',
                                color: rule.style.textColor || '#000000',
                                fontWeight: rule.style.bold ? 700 : 400,
                                fontStyle: rule.style.italic ? 'italic' : 'normal',
                              }}
                              className="px-2 py-1 rounded text-center border border-border/80 text-[11px] max-w-[120px] truncate"
                            >
                              AaBbCc
                            </div>
                          ) : rule.dataBar ? (
                            <div
                              style={{ backgroundColor: rule.dataBar.barColor }}
                              className="h-4 w-20 rounded shadow-xs"
                              title={`Data bar: ${rule.dataBar.barColor}`}
                            />
                          ) : rule.colorScale ? (
                            <div
                              style={{
                                background:
                                  rule.colorScale.type === '3-color'
                                    ? `linear-gradient(to right, ${rule.colorScale.minColor}, ${rule.colorScale.midColor}, ${rule.colorScale.maxColor})`
                                    : `linear-gradient(to right, ${rule.colorScale.minColor}, ${rule.colorScale.maxColor})`,
                              }}
                              className="h-4 w-20 rounded shadow-xs"
                              title="Color Scale Heatmap"
                            />
                          ) : rule.iconSet ? (
                            <span className="text-[11px] font-medium text-accent">
                              {rule.iconSet.iconSet}
                            </span>
                          ) : (
                            <span className="text-foreground-muted">-</span>
                          )}
                        </td>
                        <td className="p-2.5 font-mono">
                          <input
                            type="text"
                            defaultValue={formatRangeReference(rule.range)}
                            onBlur={(e) => handleChangeRange(rule.id, e.target.value)}
                            className="w-24 px-1.5 py-1 text-xs bg-surface border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={Boolean(rule.stopIfTrue)}
                            onChange={() => handleToggleStopIfTrue(rule.id)}
                            className="rounded text-accent focus:ring-accent"
                          />
                        </td>
                        <td className="p-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveUp(idx)}
                              disabled={idx === 0}
                              className="p-1 rounded text-foreground-muted hover:text-foreground disabled:opacity-30 transition-colors"
                              title="Move Up"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveDown(idx)}
                              disabled={idx === displayedRules.length - 1}
                              className="p-1 rounded text-foreground-muted hover:text-foreground disabled:opacity-30 transition-colors"
                              title="Move Down"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingRule(rule)}
                              className="p-1 rounded text-foreground-muted hover:text-foreground transition-colors ml-1"
                              title="Edit Rule"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRule(rule.id)}
                              className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 transition-colors"
                              title="Delete Rule"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-surface-secondary/40">
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-2 text-xs font-medium text-foreground hover:bg-surface-secondary border border-border rounded-lg transition-colors"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-foreground hover:bg-surface-secondary border border-border rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleOk}
              className="px-4 py-2 text-xs font-semibold bg-accent text-accent-foreground hover:bg-accent/90 rounded-lg shadow-xs transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      </div>

      {/* Nested Add / Edit Dialog */}
      {(isNewRuleOpen || editingRule) && (
        <ConditionalFormattingDialog
          isOpen={true}
          initialRange={currentSelection}
          existingRule={editingRule || undefined}
          onSaveRule={handleSaveRule}
          onClose={() => {
            setIsNewRuleOpen(false);
            setEditingRule(null);
          }}
        />
      )}
    </>
  );
};
