import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Replace, ChevronDown, ChevronUp, X, Settings2 } from 'lucide-react';
import { Sheet } from '@/types/sheet';
import { FindOptions, FindMatch } from '@/types/data-tools';
import { findMatches, replaceMatchInSheet, replaceAllMatches } from '@/engine/data-tools/find-replace';
import { colIndexToName } from '@/utils/coordinates';
import { toast } from '@/stores/toast-store';

interface FindReplaceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  activeSheet: Sheet;
  sheets: Sheet[];
  initialMode?: 'find' | 'replace';
  onNavigateToCell: (sheetId: string, row: number, col: number) => void;
  onUpdateSheet: (sheet: Sheet) => void;
  onUpdateSheets: (sheets: Sheet[]) => void;
}

export const FindReplaceDialog: React.FC<FindReplaceDialogProps> = ({
  isOpen,
  onClose,
  activeSheet,
  sheets,
  initialMode = 'find',
  onNavigateToCell,
  onUpdateSheet,
  onUpdateSheets
}) => {
  const [mode, setMode] = useState<'find' | 'replace'>(initialMode);
  const [query, setQuery] = useState('');
  const [replaceWith, setReplaceWith] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [matchEntireCell, setMatchEntireCell] = useState(false);
  const [searchFormulas, setSearchFormulas] = useState(false);
  const [scope, setScope] = useState<'sheet' | 'workbook'>('sheet');
  const [showOptions, setShowOptions] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);

  // Sync mode with initialMode prop when reopened
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);

  const findOptions: FindOptions = useMemo(
    () => ({
      query,
      replaceWith,
      matchCase,
      matchEntireCell,
      searchFormulas,
      scope
    }),
    [query, replaceWith, matchCase, matchEntireCell, searchFormulas, scope]
  );

  // Find all matches
  const matches: FindMatch[] = useMemo(() => {
    if (!isOpen || !query) return [];
    return findMatches(sheets, activeSheet.id, findOptions);
  }, [isOpen, query, sheets, activeSheet.id, findOptions]);

  // Reset index when matches change
  useEffect(() => {
    setCurrentIndex(0);
    if (matches.length > 0 && matches[0]) {
      const first = matches[0];
      onNavigateToCell(first.sheetId, first.row, first.col);
    }
  }, [matches, onNavigateToCell]);

  const handleNext = useCallback(() => {
    if (matches.length === 0) return;
    const nextIdx = (currentIndex + 1) % matches.length;
    setCurrentIndex(nextIdx);
    const m = matches[nextIdx];
    if (m) {
      onNavigateToCell(m.sheetId, m.row, m.col);
    }
  }, [matches, currentIndex, onNavigateToCell]);

  const handlePrev = useCallback(() => {
    if (matches.length === 0) return;
    const prevIdx = (currentIndex - 1 + matches.length) % matches.length;
    setCurrentIndex(prevIdx);
    const m = matches[prevIdx];
    if (m) {
      onNavigateToCell(m.sheetId, m.row, m.col);
    }
  }, [matches, currentIndex, onNavigateToCell]);

  const handleReplaceCurrent = useCallback(() => {
    if (matches.length === 0 || !matches[currentIndex]) return;
    const current = matches[currentIndex]!;
    const targetSheet = sheets.find((s) => s.id === current.sheetId) || activeSheet;

    const { updatedSheet, replaced } = replaceMatchInSheet(targetSheet, current, findOptions);
    if (replaced) {
      onUpdateSheet(updatedSheet);
      toast.success('Replaced', `Replaced match at ${colIndexToName(current.col)}${current.row + 1}`);
    }

    // Advance to next
    handleNext();
  }, [matches, currentIndex, sheets, activeSheet, findOptions, onUpdateSheet, handleNext]);

  const handleReplaceAll = useCallback(() => {
    if (!query) return;
    const { updatedSheets, replacementCount } = replaceAllMatches(sheets, activeSheet.id, findOptions);

    if (replacementCount > 0) {
      onUpdateSheets(updatedSheets);
      toast.success(
        'Replace All Complete',
        `Replaced ${replacementCount} occurrence${replacementCount === 1 ? '' : 's'}.`
      );
    } else {
      toast.info('No Matches', `No matches found for "${query}".`);
    }
  }, [query, sheets, activeSheet.id, findOptions, onUpdateSheets]);

  if (!isOpen) return null;

  const currentMatch = matches[currentIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-surface border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden text-xs text-foreground"
        role="dialog"
        aria-modal="true"
        aria-labelledby="find-replace-title"
      >
        {/* Header with Mode Tabs */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface-secondary/40">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMode('find')}
              className={`px-3 py-1 rounded-md font-medium text-xs transition-colors ${
                mode === 'find'
                  ? 'bg-surface text-primary shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Find
            </button>
            <button
              type="button"
              onClick={() => setMode('replace')}
              className={`px-3 py-1 rounded-md font-medium text-xs transition-colors ${
                mode === 'replace'
                  ? 'bg-surface text-primary shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Replace
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Inputs */}
        <div className="p-4 flex flex-col gap-3">
          {/* Find Input */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-muted-foreground">Find what:</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (e.shiftKey) handlePrev();
                    else handleNext();
                  }
                }}
                placeholder="Search text or number..."
                autoFocus
                className="w-full h-8 pl-8 pr-20 rounded-md border border-border bg-background text-foreground text-xs focus:ring-1 focus:ring-primary outline-hidden"
              />
              {query && (
                <span className="absolute right-2.5 top-2 text-[10px] text-muted-foreground font-mono">
                  {matches.length > 0
                    ? `${currentIndex + 1} of ${matches.length}`
                    : '0 results'}
                </span>
              )}
            </div>
          </div>

          {/* Replace Input (only in replace mode) */}
          {mode === 'replace' && (
            <div className="flex flex-col gap-1 animate-in fade-in duration-100">
              <label className="text-[11px] font-semibold text-muted-foreground">Replace with:</label>
              <div className="relative">
                <Replace className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <input
                  type="text"
                  value={replaceWith}
                  onChange={(e) => setReplaceWith(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleReplaceCurrent();
                  }}
                  placeholder="Replacement string..."
                  className="w-full h-8 pl-8 pr-3 rounded-md border border-border bg-background text-foreground text-xs focus:ring-1 focus:ring-primary outline-hidden"
                />
              </div>
            </div>
          )}

          {/* Collapsible Options Button */}
          <button
            type="button"
            onClick={() => setShowOptions(!showOptions)}
            className="flex items-center gap-1.5 text-[11px] text-primary hover:underline font-medium self-start"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>{showOptions ? 'Hide Search Options' : 'More Search Options'}</span>
          </button>

          {/* Search Options Panel */}
          {showOptions && (
            <div className="p-3 bg-surface-secondary/40 border border-border rounded-lg flex flex-col gap-2.5 text-xs animate-in fade-in duration-150">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                    Scope
                  </label>
                  <select
                    value={scope}
                    onChange={(e) => setScope(e.target.value as 'sheet' | 'workbook')}
                    className="w-full h-7 px-2 rounded border border-border bg-surface text-foreground text-xs focus:ring-1 focus:ring-primary outline-hidden"
                  >
                    <option value="sheet">Active Sheet</option>
                    <option value="workbook">Entire Workbook</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                    Look in
                  </label>
                  <select
                    value={searchFormulas ? 'formulas' : 'values'}
                    onChange={(e) => setSearchFormulas(e.target.value === 'formulas')}
                    className="w-full h-7 px-2 rounded border border-border bg-surface text-foreground text-xs focus:ring-1 focus:ring-primary outline-hidden"
                  >
                    <option value="values">Values</option>
                    <option value="formulas">Formulas</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 pt-1 border-t border-border/50">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={matchCase}
                    onChange={(e) => setMatchCase(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
                  />
                  <span>Match case</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={matchEntireCell}
                    onChange={(e) => setMatchEntireCell(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
                  />
                  <span>Match entire cell contents</span>
                </label>
              </div>
            </div>
          )}

          {/* Match Location Preview */}
          {currentMatch && (
            <div className="p-2 bg-primary/10 border border-primary/20 rounded-md text-[11px] text-primary flex items-center justify-between">
              <span>
                Found in <strong>{currentMatch.sheetName}</strong> at cell{' '}
                <strong>
                  {colIndexToName(currentMatch.col)}
                  {currentMatch.row + 1}
                </strong>
              </span>
              <span className="truncate max-w-[120px] font-mono text-[10px]">
                "{currentMatch.cellValue}"
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-border bg-surface-secondary/30 flex items-center justify-between gap-2">
          {/* Navigation Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={matches.length === 0}
              onClick={handlePrev}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-border bg-surface text-xs font-medium text-foreground hover:bg-surface-secondary disabled:opacity-40 disabled:pointer-events-none transition-colors"
              title="Find Previous (Shift+Enter)"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>
            <button
              type="button"
              disabled={matches.length === 0}
              onClick={handleNext}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-border bg-surface text-xs font-medium text-foreground hover:bg-surface-secondary disabled:opacity-40 disabled:pointer-events-none transition-colors"
              title="Find Next (Enter)"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Next</span>
            </button>
          </div>

          {/* Replace Controls */}
          <div className="flex items-center gap-1.5">
            {mode === 'replace' ? (
              <>
                <button
                  type="button"
                  disabled={matches.length === 0}
                  onClick={handleReplaceCurrent}
                  className="px-3 py-1.5 rounded border border-border bg-surface text-xs font-medium text-foreground hover:bg-surface-secondary disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  Replace
                </button>
                <button
                  type="button"
                  disabled={matches.length === 0}
                  onClick={handleReplaceAll}
                  className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-40 disabled:pointer-events-none transition-colors shadow-2xs"
                >
                  Replace All
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded border border-border bg-surface text-xs font-medium text-foreground hover:bg-surface-secondary transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
