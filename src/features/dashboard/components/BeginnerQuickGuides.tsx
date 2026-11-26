import React, { useState } from 'react';
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  FunctionSquare,
  BarChart2,
  Sliders,
  Calculator,
  Upload
} from 'lucide-react';

interface GuideTopic {
  id: string;
  title: string;
  icon: React.ReactNode;
  summary: string;
  steps: string[];
}

const QUICK_GUIDES: GuideTopic[] = [
  {
    id: 'create-workbook',
    title: 'Creating and Managing Workbooks',
    icon: <FileSpreadsheet className="w-4 h-4 text-accent" />,
    summary: 'How to start a new spreadsheet, name worksheets, and organize folders.',
    steps: [
      'Click "+ New Workbook" or "+ Blank Workbook" on the Home page.',
      'Enter your workbook name or let DC Excel auto-generate a timestamped title.',
      'In the spreadsheet workspace, use the bottom tab strip to add, rename, duplicate, or delete worksheets.',
      'Right-click any worksheet tab to customize its tab color or hide/unhide sheets.'
    ]
  },
  {
    id: 'enter-formulas',
    title: 'Writing Formulas and Using the Formula Bar',
    icon: <FunctionSquare className="w-4 h-4 text-purple-400" />,
    summary: 'Syntax rules, cell coordinates, and Excel-standard functions.',
    steps: [
      'Select any cell and type "=" to begin a formula (e.g. "=SUM(A1:A10)").',
      'Use the Name Box at the top-left to jump directly to any coordinate (e.g. "AA100").',
      'The Formula Bar provides autocomplete suggestions as you type function names.',
      'Use absolute references ($A$1) by adding dollar signs to lock rows or columns during autofill.'
    ]
  },
  {
    id: 'format-cells',
    title: 'Cell Formatting, Styles & Number Formats',
    icon: <Sliders className="w-4 h-4 text-emerald-400" />,
    summary: 'Apply currencies, percentages, borders, custom fonts, and cell styles.',
    steps: [
      'Highlight a range of cells using mouse drag or Shift + Arrow keys.',
      'Use the Home Ribbon to toggle Bold, Italic, Text Color, or Fill Color.',
      'Select the Number Format dropdown to format values as Currency ($), Percentage (%), or Dates.',
      'Click the Border tool to apply grid borders, thick borders, or double bottom lines.'
    ]
  },
  {
    id: 'insert-charts',
    title: 'Creating Interactive Charts & Graphs',
    icon: <BarChart2 className="w-4 h-4 text-cyan-400" />,
    summary: 'Transform spreadsheet ranges into hardware-accelerated ECharts visualizations.',
    steps: [
      'Highlight a range of data that includes row/column headers.',
      'Click "Insert" > "Chart" on the toolbar.',
      'Select your preferred chart style (Column, Bar, Line, Area, Pie, or Scatter).',
      'Click "Insert Chart" — a movable, resizable chart overlay will appear directly on the worksheet.',
      'Charts update reactively in real time whenever underlying cell values change.'
    ]
  },
  {
    id: 'calculators-labs',
    title: 'Using Calculators, Labs & Unit Converters',
    icon: <Calculator className="w-4 h-4 text-amber-400" />,
    summary: 'Solve scientific, engineering, financial, and statistical problems in dedicated hubs.',
    steps: [
      'Navigate to "Tools Hub" in the left sidebar.',
      'Choose your tool: Scientific Lab, Standard Calculator, Loan & EMI, or Universal Unit Converter.',
      'Inputs calculate live client-side with zero network delay.',
      'Click "Copy Result" to immediately paste computed numbers into any worksheet cell.'
    ]
  },
  {
    id: 'import-export',
    title: 'Importing and Exporting Excel (XLSX) & CSV Files',
    icon: <Upload className="w-4 h-4 text-teal-400" />,
    summary: 'Seamless interoperability with desktop Microsoft Excel and CSV files.',
    steps: [
      'Click "Import File" on the Home page or inside any workbook.',
      'Drag and drop an .xlsx, .csv, or .tsv file.',
      'DC Excel preserves cell values, formulas, number formats, styles, and worksheet tabs.',
      'To export, open any workbook, click "File" > "Export XLSX" or "Export CSV" to download locally.'
    ]
  }
];

export const BeginnerQuickGuides: React.FC = () => {
  const [openGuideId, setOpenGuideId] = useState<string | null>('create-workbook');

  const toggleGuide = (id: string) => {
    setOpenGuideId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold uppercase tracking-wider text-foreground-subtle flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-accent" />
          <span>Beginner Quick Guides & Documentation</span>
        </div>
        <span className="text-[11px] text-foreground-subtle">
          Searchable offline instructions
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {QUICK_GUIDES.map((guide) => {
          const isOpen = openGuideId === guide.id;
          return (
            <div
              key={guide.id}
              className="rounded-2xl border border-border bg-surface transition-all overflow-hidden shadow-xs"
            >
              <button
                type="button"
                onClick={() => toggleGuide(guide.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-surface-elevated transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-surface-secondary border border-border shrink-0">
                    {guide.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-foreground truncate">
                      {guide.title}
                    </h3>
                    <p className="text-[11px] text-foreground-muted truncate">
                      {guide.summary}
                    </p>
                  </div>
                </div>
                <div className="text-foreground-subtle p-1 shrink-0">
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-1 border-t border-border/60 bg-surface-secondary/40 space-y-2 animate-in fade-in-50">
                  <ol className="text-xs text-foreground-muted space-y-1.5 list-decimal list-inside leading-relaxed">
                    {guide.steps.map((st, i) => (
                      <li key={i} className="pl-1">
                        <span className="text-foreground">{st}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
