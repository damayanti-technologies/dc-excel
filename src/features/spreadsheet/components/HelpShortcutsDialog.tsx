import React, { useState, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { DEFAULT_SHORTCUTS, ShortcutCategory } from '@/engine/shortcuts';
import { Search, Keyboard, Calculator, Sparkles, ShieldCheck } from 'lucide-react';
import { cn } from '@/utils/cn';

interface HelpShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'shortcuts' | 'formulas' | 'formatting' | 'privacy';
}

export const HelpShortcutsDialog: React.FC<HelpShortcutsDialogProps> = ({
  isOpen,
  onClose,
  initialTab = 'shortcuts'
}) => {
  const [activeTab, setActiveTab] = useState<'shortcuts' | 'formulas' | 'formatting' | 'privacy'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredShortcuts = useMemo(() => {
    if (!searchQuery.trim()) return DEFAULT_SHORTCUTS;
    const lower = searchQuery.toLowerCase().trim();
    return DEFAULT_SHORTCUTS.filter(
      (s) =>
        s.label.toLowerCase().includes(lower) ||
        s.display.toLowerCase().includes(lower) ||
        s.category.toLowerCase().includes(lower) ||
        s.description.toLowerCase().includes(lower)
    );
  }, [searchQuery]);

  const categories: { id: ShortcutCategory; label: string }[] = [
    { id: 'workbook', label: 'Workbook & File' },
    { id: 'editing', label: 'Cell Editing' },
    { id: 'navigation', label: 'Navigation' },
    { id: 'formatting', label: 'Formatting' }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="DC Excel Help & Shortcut Reference"
      className="max-w-2xl max-h-[85vh] flex flex-col"
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-border pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('shortcuts')}
            className={cn(
              'px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer',
              activeTab === 'shortcuts'
                ? 'bg-accent/10 text-accent border border-accent/20'
                : 'text-foreground-muted hover:text-foreground hover:bg-surface-secondary'
            )}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>Shortcuts</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('formulas')}
            className={cn(
              'px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer',
              activeTab === 'formulas'
                ? 'bg-accent/10 text-accent border border-accent/20'
                : 'text-foreground-muted hover:text-foreground hover:bg-surface-secondary'
            )}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Formula Guide</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('formatting')}
            className={cn(
              'px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer',
              activeTab === 'formatting'
                ? 'bg-accent/10 text-accent border border-accent/20'
                : 'text-foreground-muted hover:text-foreground hover:bg-surface-secondary'
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Formatting & Tools</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={cn(
              'px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer',
              activeTab === 'privacy'
                ? 'bg-accent/10 text-accent border border-accent/20'
                : 'text-foreground-muted hover:text-foreground hover:bg-surface-secondary'
            )}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Privacy & Storage</span>
          </button>
        </div>

        {/* Tab 1: Keyboard Shortcuts */}
        {activeTab === 'shortcuts' && (
          <div className="space-y-3">
            {/* Search filter input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-foreground-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search shortcuts (e.g. save, copy, navigation, F2)..."
                aria-label="Filter shortcuts"
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface-secondary border border-border rounded-lg text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            {/* Categorized shortcut list */}
            <div className="max-h-[50vh] overflow-y-auto space-y-4 pr-1">
              {categories.map((cat) => {
                const group = filteredShortcuts.filter((s) => s.category === cat.id);
                if (group.length === 0) return null;

                return (
                  <div key={cat.id} className="space-y-1.5">
                    <h4 className="text-[11px] font-semibold text-foreground-muted uppercase tracking-wider">
                      {cat.label}
                    </h4>
                    <div className="border border-border rounded-lg overflow-hidden divide-y divide-border bg-surface">
                      {group.map((item) => (
                        <div
                          key={item.id}
                          className="px-3 py-2 flex items-center justify-between gap-3 text-xs hover:bg-surface-secondary/40 transition-colors"
                        >
                          <div>
                            <span className="font-medium text-foreground block">{item.label}</span>
                            <span className="text-[11px] text-foreground-muted block">{item.description}</span>
                          </div>
                          <kbd className="px-2 py-0.5 text-[11px] font-mono font-medium text-foreground bg-surface-secondary border border-border rounded shadow-2xs shrink-0">
                            {item.display}
                          </kbd>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {filteredShortcuts.length === 0 && (
                <div className="py-8 text-center text-xs text-foreground-muted">
                  No shortcuts matched your search query.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Formula Guide */}
        {activeTab === 'formulas' && (
          <div className="max-h-[50vh] overflow-y-auto space-y-4 text-xs pr-1 leading-relaxed">
            <div className="bg-surface-secondary/60 border border-border rounded-xl p-3 space-y-1.5">
              <h4 className="font-semibold text-foreground">Formula Syntax Rules</h4>
              <p className="text-foreground-muted">
                Always begin a formula with an equal sign (<code className="text-accent font-mono font-bold">=</code>).
                Cell references use standard column letter and row number notation (e.g. <code className="font-mono">A1</code>, <code className="font-mono">B10:C25</code>).
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-foreground">Popular Functions</h4>
              <div className="border border-border rounded-lg divide-y divide-border bg-surface">
                <div className="p-2.5 space-y-0.5">
                  <div className="font-mono font-bold text-accent">=SUM(range1, [range2, ...])</div>
                  <div className="text-foreground-muted">Calculates the total mathematical sum of all numeric values in specified ranges.</div>
                </div>
                <div className="p-2.5 space-y-0.5">
                  <div className="font-mono font-bold text-accent">=AVERAGE(range)</div>
                  <div className="text-foreground-muted">Calculates the arithmetic mean of all numeric values.</div>
                </div>
                <div className="p-2.5 space-y-0.5">
                  <div className="font-mono font-bold text-accent">=VLOOKUP(lookup_value, table_array, col_index, [exact_match])</div>
                  <div className="text-foreground-muted">Searches the first column of a table and returns a value from the specified column.</div>
                </div>
                <div className="p-2.5 space-y-0.5">
                  <div className="font-mono font-bold text-accent">=XLOOKUP(lookup_value, lookup_array, return_array, [if_not_found])</div>
                  <div className="text-foreground-muted">Modern lookup function supporting bidirectional searches and default fallback values.</div>
                </div>
                <div className="p-2.5 space-y-0.5">
                  <div className="font-mono font-bold text-accent">=IF(logical_test, value_if_true, [value_if_false])</div>
                  <div className="text-foreground-muted">Evaluates a condition and returns different results based on true or false.</div>
                </div>
                <div className="p-2.5 space-y-0.5">
                  <div className="font-mono font-bold text-accent">=INDEX(array, row_num, [col_num]) &amp; MATCH(lookup_val, array, [type])</div>
                  <div className="text-foreground-muted">Powerful dynamic two-dimensional lookup combination for complex spreadsheets.</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Formatting & Data Tools */}
        {activeTab === 'formatting' && (
          <div className="max-h-[50vh] overflow-y-auto space-y-4 text-xs pr-1 leading-relaxed">
            <div className="border border-border rounded-xl p-3 bg-surface space-y-1.5">
              <h4 className="font-semibold text-foreground">Number Formatting</h4>
              <p className="text-foreground-muted">
                Select cells and choose formats from the Ribbon or context menu:
                <br />• <strong>Currency:</strong> <code className="font-mono">$#,##0.00</code>
                <br />• <strong>Percentage:</strong> <code className="font-mono">0.0%</code>
                <br />• <strong>Accounting:</strong> Aligned dollar signs and parentheses for negative numbers.
              </p>
            </div>

            <div className="border border-border rounded-xl p-3 bg-surface space-y-1.5">
              <h4 className="font-semibold text-foreground">Conditional Formatting</h4>
              <p className="text-foreground-muted">
                Highlight trends dynamically with Color Scales, Data Bars, and Rule Presets (Greater Than, Less Than, Duplicate Values, Top 10%).
              </p>
            </div>

            <div className="border border-border rounded-xl p-3 bg-surface space-y-1.5">
              <h4 className="font-semibold text-foreground">Charts & Data Visualization</h4>
              <p className="text-foreground-muted">
                Select your data range and click <strong>Insert &gt; Chart</strong> to embed Bar, Line, Pie, Area, or Scatter charts powered by Apache ECharts. Charts stay in sync as you update cell values.
              </p>
            </div>
          </div>
        )}

        {/* Tab 4: Privacy & Local Storage */}
        {activeTab === 'privacy' && (
          <div className="max-h-[50vh] overflow-y-auto space-y-4 text-xs pr-1 leading-relaxed">
            <div className="border border-emerald-500/30 bg-emerald-500/10 rounded-xl p-3 space-y-1">
              <h4 className="font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>100% Client-Side Privacy Guarantee</span>
              </h4>
              <p className="text-foreground-muted">
                DC Excel operates entirely inside your web browser. No workbook data, formulas, cell values, or personal identifiers are ever sent to remote servers or cloud databases.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-foreground">Storage Engine Architecture</h4>
              <div className="border border-border rounded-lg divide-y divide-border bg-surface">
                <div className="p-2.5 space-y-0.5">
                  <div className="font-medium text-foreground">IndexedDB Schema v3</div>
                  <div className="text-foreground-muted">Workbooks, sheets, version checkpoints, recovery logs, and user preferences are persisted in your browser's persistent storage.</div>
                </div>
                <div className="p-2.5 space-y-0.5">
                  <div className="font-medium text-foreground">Autosave Queue</div>
                  <div className="text-foreground-muted">Debounced serialized worker flushing edits every 600ms without race conditions or performance lag.</div>
                </div>
                <div className="p-2.5 space-y-0.5">
                  <div className="font-medium text-foreground">Portable .omni Archives</div>
                  <div className="text-foreground-muted">Download complete backups of your workbooks as standalone files and restore them anytime.</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
