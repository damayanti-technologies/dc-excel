import React, { useState, useMemo } from 'react';
import { functionRegistry } from '@/engine/calculation/functions';
import { FunctionCategory, FunctionDefinition } from '@/engine/calculation/types';
import { Search, BookOpen, X, Code, Check } from 'lucide-react';
import { cn } from '@/utils/cn';

interface FormulaReferencePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertFunction?: (funcSyntax: string) => void;
}

const CATEGORIES: ('All' | FunctionCategory)[] = [
  'All',
  'Lookup & Reference',
  'Text',
  'Date & Time',
  'Mathematical',
  'Statistical',
  'Logical',
  'Information'
];

export const FormulaReferencePanel: React.FC<FormulaReferencePanelProps> = ({
  isOpen,
  onClose,
  onInsertFunction
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | FunctionCategory>('All');
  const [selectedFunction, setSelectedFunction] = useState<FunctionDefinition | null>(null);
  const [copiedExample, setCopiedExample] = useState<string | null>(null);

  const allFunctions = useMemo(() => functionRegistry.getAllDefinitions(), []);

  const filteredFunctions = useMemo(() => {
    return allFunctions.filter((fn) => {
      const matchesCategory =
        selectedCategory === 'All' || fn.category === selectedCategory;

      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toUpperCase();
      return (
        fn.name.includes(q) ||
        fn.description.toUpperCase().includes(q) ||
        fn.category.toUpperCase().includes(q)
      );
    });
  }, [allFunctions, selectedCategory, searchQuery]);

  // Set default selected function if none selected or if filtered out
  const activeFunction = useMemo(() => {
    if (selectedFunction && filteredFunctions.some((f) => f.name === selectedFunction.name)) {
      return selectedFunction;
    }
    return filteredFunctions[0] ?? null;
  }, [selectedFunction, filteredFunctions]);

  if (!isOpen) return null;

  const handleCopyExample = (ex: string) => {
    navigator.clipboard?.writeText(ex);
    setCopiedExample(ex);
    setTimeout(() => setCopiedExample(null), 2000);
  };

  const handleInsert = (fn: FunctionDefinition) => {
    if (onInsertFunction) {
      onInsertFunction(`=${fn.name}(`);
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Formula Documentation Reference"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 sm:p-6"
    >
      <div className="flex flex-col w-full max-w-4xl h-[85vh] max-h-[700px] rounded-xl border border-border bg-surface shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-secondary/40">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10 text-accent">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Formula Function Reference</h2>
              <p className="text-xs text-foreground-muted">
                Explore {allFunctions.length} built-in spreadsheet functions with syntax and examples
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close reference panel"
            className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-tertiary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="px-6 py-3 border-b border-border bg-surface space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-foreground-muted pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search functions (e.g. VLOOKUP, SUM, DATE, IF)..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-border bg-surface-secondary/50 text-foreground placeholder:text-foreground-muted/60 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors',
                  selectedCategory === cat
                    ? 'bg-accent text-accent-foreground font-semibold shadow-xs'
                    : 'bg-surface-secondary text-foreground-muted hover:text-foreground hover:bg-surface-tertiary'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Content: List + Detail Split View */}
        <div className="flex-1 flex min-h-0 divide-x divide-border">
          {/* Left: Functions List */}
          <div className="w-2/5 overflow-y-auto divide-y divide-border/40">
            {filteredFunctions.length === 0 ? (
              <div className="p-8 text-center text-xs text-foreground-muted">
                No matching functions found for "{searchQuery}".
              </div>
            ) : (
              filteredFunctions.map((fn) => {
                const isSelected = activeFunction?.name === fn.name;

                return (
                  <div
                    key={fn.name}
                    onClick={() => setSelectedFunction(fn)}
                    className={cn(
                      'px-4 py-3 cursor-pointer transition-colors text-left flex flex-col gap-0.5',
                      isSelected
                        ? 'bg-accent/10 border-l-4 border-accent text-foreground'
                        : 'hover:bg-surface-secondary/60 text-foreground/80'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-accent">
                        {fn.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-tertiary text-foreground-muted">
                        {fn.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-foreground-muted line-clamp-1">
                      {fn.description}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {/* Right: Function Details */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col justify-between">
            {activeFunction ? (
              <div className="space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold font-mono text-accent">
                      {activeFunction.name}
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-accent/15 text-accent font-semibold">
                      {activeFunction.category}
                    </span>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed">
                    {activeFunction.description}
                  </p>
                </div>

                {/* Syntax Box */}
                <div>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-foreground-muted mb-1.5">
                    Syntax
                  </h4>
                  <div className="p-2.5 rounded-lg border border-border bg-surface-secondary font-mono text-xs text-foreground select-all flex items-center justify-between">
                    <span>
                      ={activeFunction.name}(
                      {activeFunction.args.map((a) => (a.optional ? `[${a.name}]` : a.name)).join(', ')}
                      )
                    </span>
                  </div>
                </div>

                {/* Arguments List */}
                {activeFunction.args.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-foreground-muted mb-2">
                      Arguments
                    </h4>
                    <div className="space-y-2">
                      {activeFunction.args.map((arg) => (
                        <div
                          key={arg.name}
                          className="p-2.5 rounded-lg border border-border/60 bg-surface-secondary/40 text-xs space-y-1"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-foreground">
                              {arg.name}
                            </span>
                            <span
                              className={cn(
                                'text-[9px] px-1.5 py-0.2 rounded font-semibold',
                                arg.optional
                                  ? 'bg-surface-tertiary text-foreground-muted'
                                  : 'bg-accent/15 text-accent'
                              )}
                            >
                              {arg.optional ? 'Optional' : 'Required'}
                            </span>
                            {arg.type && (
                              <span className="text-[10px] text-foreground-muted">
                                ({arg.type})
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-foreground-muted leading-relaxed">
                            {arg.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Examples */}
                {activeFunction.examples.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-foreground-muted mb-2">
                      Examples
                    </h4>
                    <div className="space-y-1.5">
                      {activeFunction.examples.map((ex) => (
                        <div
                          key={ex}
                          className="flex items-center justify-between p-2 rounded-lg border border-border/60 bg-surface-secondary/50 font-mono text-xs text-foreground"
                        >
                          <span>{ex}</span>
                          <button
                            onClick={() => handleCopyExample(ex)}
                            className="p-1 rounded text-foreground-muted hover:text-foreground hover:bg-surface-tertiary transition-colors flex items-center gap-1 text-[10px]"
                            title="Copy example"
                          >
                            {copiedExample === ex ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-emerald-500">Copied</span>
                              </>
                            ) : (
                              <>
                                <Code className="w-3.5 h-3.5" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-foreground-muted">
                Select a function to view its details.
              </div>
            )}

            {/* Bottom Action Footer */}
            {activeFunction && onInsertFunction && (
              <div className="pt-4 mt-6 border-t border-border flex justify-end">
                <button
                  onClick={() => handleInsert(activeFunction)}
                  className="px-4 py-2 rounded-lg bg-accent text-accent-foreground font-semibold text-xs hover:bg-accent/90 transition-all flex items-center gap-2 shadow-sm"
                >
                  <span>Insert {activeFunction.name}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
