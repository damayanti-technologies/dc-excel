import React, { useState, useMemo } from 'react';
import {
  FunctionSquare,
  Search,
  BookOpen,
  Code,
  CheckCircle2,
  Copy,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/stores/toast-store';
import { calculationEngine } from '@/engine/calculation';

interface FormulaDoc {
  name: string;
  category: 'Math' | 'Statistical' | 'Logical' | 'Lookup' | 'Text' | 'Date & Time' | 'Financial';
  syntax: string;
  description: string;
  arguments: { name: string; type: string; desc: string; optional?: boolean }[];
  example: string;
  expected: string | number;
}

const FORMULA_REGISTRY_DOCS: FormulaDoc[] = [
  {
    name: 'SUM',
    category: 'Math',
    syntax: 'SUM(number1, [number2], ...)',
    description: 'Calculates the sum of all numerical values in a list of numbers or cell ranges.',
    arguments: [
      { name: 'number1', type: 'Number / Range', desc: 'The first number, cell reference, or range to sum.' },
      { name: 'number2', type: 'Number / Range', desc: 'Optional additional numbers or ranges.', optional: true }
    ],
    example: '=SUM(10, 25, 45)',
    expected: 80
  },
  {
    name: 'AVERAGE',
    category: 'Statistical',
    syntax: 'AVERAGE(number1, [number2], ...)',
    description: 'Returns the numerical average (arithmetic mean) of arguments.',
    arguments: [
      { name: 'number1', type: 'Number / Range', desc: 'First number or cell range.' }
    ],
    example: '=AVERAGE(10, 20, 30)',
    expected: 20
  },
  {
    name: 'IF',
    category: 'Logical',
    syntax: 'IF(logical_test, value_if_true, [value_if_false])',
    description: 'Checks whether a condition is met and returns one value if TRUE, and another if FALSE.',
    arguments: [
      { name: 'logical_test', type: 'Boolean Condition', desc: 'Any expression that can be evaluated to TRUE or FALSE.' },
      { name: 'value_if_true', type: 'Any', desc: 'The value to return if logical_test is TRUE.' },
      { name: 'value_if_false', type: 'Any', desc: 'The value to return if logical_test is FALSE.', optional: true }
    ],
    example: '=IF(10 > 5, "Pass", "Fail")',
    expected: 'Pass'
  },
  {
    name: 'VLOOKUP',
    category: 'Lookup',
    syntax: 'VLOOKUP(lookup_value, table_array, col_index_num, [range_lookup])',
    description: 'Looks for a value in the leftmost column of a table and returns a value in the same row from a specified column.',
    arguments: [
      { name: 'lookup_value', type: 'Any', desc: 'The value to search for in the first column of the table.' },
      { name: 'table_array', type: 'Range', desc: 'Two or more columns of data where the lookup is performed.' },
      { name: 'col_index_num', type: 'Integer', desc: 'The 1-based column number in table_array from which to retrieve the value.' },
      { name: 'range_lookup', type: 'Boolean', desc: 'FALSE for exact match; TRUE for approximate match.', optional: true }
    ],
    example: '=VLOOKUP(102, A1:C10, 2, FALSE)',
    expected: 'Value from Column 2'
  },
  {
    name: 'XLOOKUP',
    category: 'Lookup',
    syntax: 'XLOOKUP(lookup_value, lookup_array, return_array, [if_not_found])',
    description: 'Searches a range or array for a match and returns the corresponding item from a second range or array.',
    arguments: [
      { name: 'lookup_value', type: 'Any', desc: 'The value to search for.' },
      { name: 'lookup_array', type: 'Range', desc: 'The array or range to search.' },
      { name: 'return_array', type: 'Range', desc: 'The array or range to return.' },
      { name: 'if_not_found', type: 'Any', desc: 'Value to return if no match is found.', optional: true }
    ],
    example: '=XLOOKUP("SKU-99", A1:A50, B1:B50, "Not Found")',
    expected: 'Matching product'
  },
  {
    name: 'INDEX',
    category: 'Lookup',
    syntax: 'INDEX(array, row_num, [column_num])',
    description: 'Returns a value or reference of the cell at the intersection of a particular row and column.',
    arguments: [
      { name: 'array', type: 'Range', desc: 'A range of cells or an array constant.' },
      { name: 'row_num', type: 'Integer', desc: 'Selects the row in array from which to return a value.' },
      { name: 'column_num', type: 'Integer', desc: 'Selects the column in array from which to return a value.', optional: true }
    ],
    example: '=INDEX(A1:C5, 2, 3)',
    expected: 'Cell C2 value'
  },
  {
    name: 'MATCH',
    category: 'Lookup',
    syntax: 'MATCH(lookup_value, lookup_array, [match_type])',
    description: 'Searches for a specified item in a range of cells and returns the relative position of that item.',
    arguments: [
      { name: 'lookup_value', type: 'Any', desc: 'The value you want to match in lookup_array.' },
      { name: 'lookup_array', type: 'Range', desc: 'The range of cells being searched.' },
      { name: 'match_type', type: 'Number', desc: '0 for exact match, 1 for less than, -1 for greater than.', optional: true }
    ],
    example: '=MATCH(25, A1:A10, 0)',
    expected: 3
  },
  {
    name: 'SUMIF',
    category: 'Math',
    syntax: 'SUMIF(range, criteria, [sum_range])',
    description: 'Adds the cells specified by a given condition or criteria.',
    arguments: [
      { name: 'range', type: 'Range', desc: 'The range of cells you want evaluated by criteria.' },
      { name: 'criteria', type: 'String / Number', desc: 'The condition that defines which cells will be added (e.g. ">50").' },
      { name: 'sum_range', type: 'Range', desc: 'The actual cells to sum if different from range.', optional: true }
    ],
    example: '=SUMIF(A1:A10, ">100")',
    expected: 450
  },
  {
    name: 'COUNTIF',
    category: 'Statistical',
    syntax: 'COUNTIF(range, criteria)',
    description: 'Counts the number of cells within a range that meet the given criteria.',
    arguments: [
      { name: 'range', type: 'Range', desc: 'The range of cells to count.' },
      { name: 'criteria', type: 'String / Number', desc: 'The criteria in the form of a number, expression, or text.' }
    ],
    example: '=COUNTIF(B1:B20, "Pass")',
    expected: 14
  },
  {
    name: 'ROUND',
    category: 'Math',
    syntax: 'ROUND(number, num_digits)',
    description: 'Rounds a number to a specified number of decimal digits using round-half-up semantics.',
    arguments: [
      { name: 'number', type: 'Number', desc: 'The number you want to round.' },
      { name: 'num_digits', type: 'Integer', desc: 'The number of digits to which you want to round the number.' }
    ],
    example: '=ROUND(3.14159, 2)',
    expected: 3.14
  },
  {
    name: 'TEXTJOIN',
    category: 'Text',
    syntax: 'TEXTJOIN(delimiter, ignore_empty, text1, [text2], ...)',
    description: 'Combines the text from multiple ranges and/or strings with a specified delimiter.',
    arguments: [
      { name: 'delimiter', type: 'String', desc: 'The separator string placed between each text item.' },
      { name: 'ignore_empty', type: 'Boolean', desc: 'If TRUE, ignores blank cells.' },
      { name: 'text1', type: 'String / Range', desc: 'Text item or range to join.' }
    ],
    example: '=TEXTJOIN(", ", TRUE, "Apple", "Banana", "Orange")',
    expected: 'Apple, Banana, Orange'
  },
  {
    name: 'PMT',
    category: 'Financial',
    syntax: 'PMT(rate, nper, pv, [fv], [type])',
    description: 'Calculates the periodic payment for a loan based on constant payments and a constant interest rate.',
    arguments: [
      { name: 'rate', type: 'Number', desc: 'The interest rate per period.' },
      { name: 'nper', type: 'Integer', desc: 'The total number of payment periods for the loan.' },
      { name: 'pv', type: 'Number', desc: 'The present value or principal amount.' }
    ],
    example: '=PMT(0.08/12, 120, -100000)',
    expected: 1213.28
  }
];

export const FormulaCenterPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<'explorer' | 'builder' | 'sandbox'>('explorer');

  // Sandbox state
  const [sandboxExpr, setSandboxExpr] = useState('=SUM(10, 20, 30) * 2');
  const [sandboxOutput, setSandboxOutput] = useState<string>('120');

  const handleTestSandbox = (expr: string) => {
    try {
      const formula = expr.startsWith('=') ? expr : `=${expr}`;
      const mockCells = {
        '0:0': { value: 10, rawInput: '10', dataType: 'number' as const },
        '0:1': { value: 20, rawInput: '20', dataType: 'number' as const },
        '0:2': { value: 30, rawInput: '30', dataType: 'number' as const }
      };
      const result = calculationEngine.evaluateFormula(formula, mockCells);
      setSandboxOutput(String(result));
    } catch (e: any) {
      setSandboxOutput(`Error: ${e.message}`);
    }
  };

  // Filter formulas
  const filteredDocs = useMemo(() => {
    return FORMULA_REGISTRY_DOCS.filter((doc) => {
      const matchesCat = selectedCategory === 'All' || doc.category === selectedCategory;
      const matchesSearch =
        searchQuery.trim() === '' ||
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.syntax.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-accent/10 text-accent border border-accent/20">
              <FunctionSquare className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Formula Center & Explorer
              </h1>
              <p className="text-xs sm:text-sm text-foreground-muted">
                Complete documentation, argument visualizer, and sandboxed tester for all Excel-standard formulas.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="accent" size="sm">
            {FORMULA_REGISTRY_DOCS.length}+ Formulas
          </Badge>
          <Badge variant="neutral" size="sm">
            AST Evaluated
          </Badge>
        </div>
      </div>

      {/* Mode Navigation */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        {[
          { id: 'explorer', label: 'Formula Explorer', icon: <BookOpen className="w-4 h-4" /> },
          { id: 'builder', label: 'Visual Formula Builder', icon: <Sparkles className="w-4 h-4" /> },
          { id: 'sandbox', label: 'Formula Sandbox & Tester', icon: <Code className="w-4 h-4" /> }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-accent text-zinc-950 shadow-xs'
                : 'text-foreground-muted hover:text-foreground hover:bg-surface-secondary'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* View 1: Formula Explorer */}
      {activeTab === 'explorer' && (
        <div className="space-y-5">
          {/* Search & Categories Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-subtle" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search formulas by name or description (e.g. SUM, VLOOKUP, IF)..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-surface text-xs font-medium text-foreground focus:outline-none focus:border-accent shadow-xs"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {['All', 'Math', 'Statistical', 'Logical', 'Lookup', 'Text', 'Financial'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-surface-elevated text-accent border border-accent/30'
                      : 'bg-surface-secondary text-foreground-muted hover:text-foreground'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Formulas Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDocs.map((doc) => (
              <div
                key={doc.name}
                className="rounded-2xl border border-border bg-surface hover:bg-surface-elevated p-5 space-y-3 transition-all shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-accent">={doc.name}</span>
                    <Badge variant="neutral" size="sm">
                      {doc.category}
                    </Badge>
                  </div>
                  <Button
                    size="xs"
                    variant="ghost"
                    leftIcon={<Copy className="w-3 h-3" />}
                    onClick={() => {
                      navigator.clipboard.writeText(doc.example);
                      toast.success(`Copied ${doc.example} to clipboard`);
                    }}
                  >
                    Copy Example
                  </Button>
                </div>

                <p className="text-xs text-foreground-muted">{doc.description}</p>

                <div className="p-2.5 rounded-xl border border-border bg-surface-secondary font-mono text-xs text-foreground select-all">
                  {doc.syntax}
                </div>

                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-subtle block">
                    Arguments
                  </span>
                  <div className="space-y-1">
                    {doc.arguments.map((arg) => (
                      <div key={arg.name} className="text-[11px] flex items-start gap-1.5">
                        <code className="text-accent font-semibold">{arg.name}</code>
                        <span className="text-foreground-subtle">({arg.type}):</span>
                        <span className="text-foreground-muted">{arg.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-border font-mono">
                  <span className="text-foreground-subtle">Example: {doc.example}</span>
                  <span className="text-emerald-400 font-bold">Result: {String(doc.expected)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View 2: Visual Formula Builder */}
      {activeTab === 'builder' && (
        <div className="max-w-2xl mx-auto rounded-2xl border border-border bg-surface p-6 space-y-6 shadow-xs">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" />
              Visual Formula Composer
            </h2>
            <p className="text-xs text-foreground-muted">
              Select a formula and customize parameters with live preview and syntax checking.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-foreground-muted block mb-1">Function</label>
              <select className="w-full px-3 py-2 rounded-xl border border-border bg-surface-secondary text-xs font-semibold">
                <option value="SUM">SUM - Add numbers or ranges</option>
                <option value="AVERAGE">AVERAGE - Calculate arithmetic mean</option>
                <option value="IF">IF - Conditional evaluation</option>
                <option value="VLOOKUP">VLOOKUP - Vertical lookup table</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground-muted block mb-1">Target Range / Expression</label>
              <input
                type="text"
                defaultValue="A1:A20"
                className="w-full px-3 py-2 rounded-xl border border-border bg-surface-secondary text-sm font-mono text-foreground focus:outline-none focus:border-accent"
              />
            </div>

            <div className="p-4 rounded-xl border border-border bg-surface-secondary space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-subtle block">
                Generated Excel Syntax
              </span>
              <div className="text-base font-mono font-bold text-accent">=SUM(A1:A20)</div>
            </div>

            <Button
              variant="accent"
              className="w-full"
              onClick={() => {
                navigator.clipboard.writeText('=SUM(A1:A20)');
                toast.success('Copied formula to clipboard!');
              }}
            >
              Copy Formula to Clipboard
            </Button>
          </div>
        </div>
      )}

      {/* View 3: Formula Sandbox */}
      {activeTab === 'sandbox' && (
        <div className="max-w-2xl mx-auto rounded-2xl border border-border bg-surface p-6 space-y-5 shadow-xs">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Code className="w-5 h-5 text-accent" />
              Sandboxed Formula Evaluator
            </h2>
            <p className="text-xs text-foreground-muted">
              Test expressions safely in real time using the DC Excel AST execution engine.
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-semibold text-foreground-muted block">Formula to Test</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={sandboxExpr}
                onChange={(e) => {
                  setSandboxExpr(e.target.value);
                  handleTestSandbox(e.target.value);
                }}
                className="flex-1 px-4 py-2 rounded-xl border border-border bg-surface-secondary text-sm font-mono text-foreground focus:outline-none focus:border-accent"
              />
              <Button variant="accent" onClick={() => handleTestSandbox(sandboxExpr)}>
                Evaluate
              </Button>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border bg-surface-secondary flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-subtle block">
                Evaluator Output
              </span>
              <span className="text-2xl font-bold font-mono text-accent">{sandboxOutput}</span>
            </div>
            <Badge variant="accent" size="sm">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400" />
              AST Computed
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
};
