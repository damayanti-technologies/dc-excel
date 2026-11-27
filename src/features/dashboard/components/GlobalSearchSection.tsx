import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  FileSpreadsheet,
  FunctionSquare,
  Calculator,
  Keyboard,
  GraduationCap,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { Badge } from '@/components/ui/Badge';

interface SearchResultItem {
  id: string;
  title: string;
  category: 'Workbook' | 'Formula' | 'Tool' | 'Template' | 'Shortcut' | 'Academy' | 'Action';
  description: string;
  icon: React.ReactNode;
  action: () => void;
}

export const GlobalSearchSection: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const navigate = useNavigate();
  const workbooks = useWorkspaceStore((state) => state.workbooks);
  const openCreateWorkbook = useWorkspaceStore((state) => state.openCreateWorkbook);

  const staticSearchCatalog: SearchResultItem[] = useMemo(() => [
    // Actions
    {
      id: 'act-new-wb',
      title: 'Create Blank Workbook',
      category: 'Action',
      description: 'Start a clean spreadsheet with 50,000+ rows',
      icon: <FileSpreadsheet className="w-4 h-4 text-accent" />,
      action: () => openCreateWorkbook()
    },
    // Tools
    {
      id: 'tool-sci-calc',
      title: 'Scientific Calculator',
      category: 'Tool',
      description: 'Evaluate trig, log, powers, roots, and constants',
      icon: <Calculator className="w-4 h-4 text-teal-400" />,
      action: () => navigate('/tools')
    },
    {
      id: 'tool-loan-emi',
      title: 'Loan & EMI Calculator',
      category: 'Tool',
      description: 'Calculate monthly EMI, interest, and total payback',
      icon: <Calculator className="w-4 h-4 text-emerald-400" />,
      action: () => navigate('/tools')
    },
    {
      id: 'tool-unit-conv',
      title: 'Universal Unit Converter',
      category: 'Tool',
      description: 'Convert length, mass, temperature, digital bytes, and pressure',
      icon: <Sparkles className="w-4 h-4 text-amber-400" />,
      action: () => navigate('/tools')
    },
    // Templates
    {
      id: 'tmpl-budget',
      title: 'Monthly Personal Budget Planner',
      category: 'Template',
      description: 'Income, rent, groceries, and expense variance spreadsheet template',
      icon: <FileSpreadsheet className="w-4 h-4 text-emerald-400" />,
      action: () => navigate('/templates')
    },
    {
      id: 'tmpl-loan',
      title: 'Loan Amortization & EMI Schedule',
      category: 'Template',
      description: 'Principal breakdown, interest curves, and loan payoff tracking template',
      icon: <FileSpreadsheet className="w-4 h-4 text-emerald-400" />,
      action: () => navigate('/templates')
    },
    {
      id: 'tmpl-project',
      title: 'Project Milestone & Task Tracker',
      category: 'Template',
      description: 'Sprint planning, deliverables, and team task allocation template',
      icon: <FileSpreadsheet className="w-4 h-4 text-teal-400" />,
      action: () => navigate('/templates')
    },
    // Formulas
    {
      id: 'fn-sum',
      title: '=SUM(number1, [number2], ...)',
      category: 'Formula',
      description: 'Sum numerical values and cell ranges',
      icon: <FunctionSquare className="w-4 h-4 text-purple-400" />,
      action: () => navigate('/formulas')
    },
    {
      id: 'fn-vlookup',
      title: '=VLOOKUP(lookup_value, table, col_index, [range])',
      category: 'Formula',
      description: 'Search leftmost column and return matching value',
      icon: <FunctionSquare className="w-4 h-4 text-purple-400" />,
      action: () => navigate('/formulas')
    },
    {
      id: 'fn-if',
      title: '=IF(logical_test, value_if_true, [value_if_false])',
      category: 'Formula',
      description: 'Conditional decision making expression',
      icon: <FunctionSquare className="w-4 h-4 text-purple-400" />,
      action: () => navigate('/formulas')
    },
    // Shortcuts
    {
      id: 'sc-cmd-pal',
      title: 'Ctrl + K (or ⌘ + K)',
      category: 'Shortcut',
      description: 'Open the global command palette',
      icon: <Keyboard className="w-4 h-4 text-emerald-400" />,
      action: () => navigate('/shortcuts')
    },
    {
      id: 'sc-edit-cell',
      title: 'F2 Key',
      category: 'Shortcut',
      description: 'Edit active cell in-place without overwriting',
      icon: <Keyboard className="w-4 h-4 text-emerald-400" />,
      action: () => navigate('/shortcuts')
    },
    // Academy
    {
      id: 'acad-basics',
      title: 'Lesson 1: Spreadsheet Basics & Navigation',
      category: 'Academy',
      description: 'Learn grid coordinates, rows, columns, and formula bar',
      icon: <GraduationCap className="w-4 h-4 text-amber-400" />,
      action: () => navigate('/academy')
    },
    {
      id: 'acad-abs-ref',
      title: 'Lesson 3: Relative vs Absolute ($A$1) References',
      category: 'Academy',
      description: 'Master formula locking and range expansion',
      icon: <GraduationCap className="w-4 h-4 text-amber-400" />,
      action: () => navigate('/academy')
    }
  ], [openCreateWorkbook, navigate]);

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();

    // Workbooks results
    const wbResults: SearchResultItem[] = workbooks
      .filter((wb) => wb.name.toLowerCase().includes(q))
      .map((wb) => ({
        id: `wb-${wb.id}`,
        title: wb.name,
        category: 'Workbook',
        description: `Last opened ${new Date(wb.lastOpenedAt || wb.updatedAt).toLocaleDateString()}`,
        icon: <FileSpreadsheet className="w-4 h-4 text-accent" />,
        action: () => navigate(`/workbook/${wb.id}`)
      }));

    // Catalog results
    const catResults = staticSearchCatalog.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );

    return [...wbResults, ...catResults].slice(0, 8);
  }, [query, workbooks, navigate, staticSearchCatalog]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-subtle" />
        <input
          type="text"
          value={query}
          onFocus={() => setIsFocused(true)}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Global Search: Find workbooks, formulas (=SUM, VLOOKUP), calculators, shortcuts, or lessons..."
          className="w-full pl-10 pr-24 py-2.5 rounded-2xl border border-border bg-surface text-xs font-medium text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent shadow-xs"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-surface-secondary border border-border text-foreground-subtle">
            Ctrl+K
          </kbd>
        </div>
      </div>

      {/* Instant Dropdown Results */}
      {isFocused && query.trim() !== '' && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setIsFocused(false)}
          />
          <div className="absolute left-0 right-0 top-full mt-2 z-40 rounded-2xl border border-border bg-surface-elevated/95 backdrop-blur-md p-2 shadow-xl space-y-1 animate-in fade-in-50 zoom-in-95">
            {searchResults.length === 0 ? (
              <div className="p-4 text-center text-xs text-foreground-muted">
                No matching results found for &quot;{query}&quot;. Try searching for <strong>SUM</strong>, <strong>Calculator</strong>, or a workbook name.
              </div>
            ) : (
              searchResults.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    item.action();
                    setIsFocused(false);
                  }}
                  className="w-full flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-surface-secondary text-left transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-surface border border-border shrink-0">
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-foreground group-hover:text-accent transition-colors truncate">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-foreground-muted truncate">
                        {item.description}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="neutral" size="sm">
                      {item.category}
                    </Badge>
                    <ArrowRight className="w-3.5 h-3.5 text-foreground-subtle group-hover:text-accent transition-colors" />
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};
