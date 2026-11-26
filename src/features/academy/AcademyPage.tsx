import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  CheckCircle,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/stores/toast-store';
import { useWorkspaceStore } from '@/stores/workspace-store';

interface Lesson {
  id: number;
  title: string;
  category: 'Beginner' | 'Intermediate' | 'Advanced' | 'Professional';
  duration: string;
  description: string;
  challenge: string;
  sampleInput: string;
  expectedResult: string;
}

const ACADEMY_COURSES: Lesson[] = [
  {
    id: 1,
    title: 'Spreadsheet Basics & Navigation',
    category: 'Beginner',
    duration: '5 mins',
    description: 'Learn grid terminology: rows, columns, coordinates (A1), Name Box, and the Formula Bar.',
    challenge: 'Navigate to cell B5 and verify coordinate formatting.',
    sampleInput: 'Select B5',
    expectedResult: 'Row 5, Column B (Col 1)'
  },
  {
    id: 2,
    title: 'Entering and Editing Data',
    category: 'Beginner',
    duration: '8 mins',
    description: 'Master in-cell editing, F2 keyboard activation, Enter vs Tab movement, and data types.',
    challenge: 'Enter numerical value 250 in cell A1 and text "Sales" in cell A2.',
    sampleInput: '250',
    expectedResult: 'Number 250'
  },
  {
    id: 3,
    title: 'Cell References: Relative vs Absolute',
    category: 'Beginner',
    duration: '10 mins',
    description: 'Understand how $A$1 locks row and column references during copy and autofill.',
    challenge: 'Construct an absolute tax multiplier reference using $C$1.',
    sampleInput: '=A2*$C$1',
    expectedResult: 'Locked coordinate C1'
  },
  {
    id: 4,
    title: 'Essential Arithmetic & Math Formulas',
    category: 'Beginner',
    duration: '10 mins',
    description: 'Compute sums, differences, products, and percentages with =SUM, =PRODUCT, and operators.',
    challenge: 'Calculate the total of cells A1 through A10.',
    sampleInput: '=SUM(A1:A10)',
    expectedResult: 'Total sum of range'
  },
  {
    id: 5,
    title: 'Statistical Functions: Average & Medians',
    category: 'Beginner',
    duration: '12 mins',
    description: 'Summarize datasets using =AVERAGE, =MEDIAN, =MIN, =MAX, and =COUNT.',
    challenge: 'Determine the arithmetic mean of scores in B2:B20.',
    sampleInput: '=AVERAGE(B2:B20)',
    expectedResult: 'Arithmetic mean'
  },
  {
    id: 6,
    title: 'Logical Decision Making with IF & IFS',
    category: 'Intermediate',
    duration: '15 mins',
    description: 'Build conditional branching logic with =IF(condition, true_val, false_val) and nested conditions.',
    challenge: 'Mark scores >= 50 as "Pass", otherwise "Fail".',
    sampleInput: '=IF(A1>=50, "Pass", "Fail")',
    expectedResult: '"Pass" or "Fail"'
  },
  {
    id: 7,
    title: 'Text Transformation Functions',
    category: 'Intermediate',
    duration: '12 mins',
    description: 'Manipulate strings with =CONCAT, =TEXTJOIN, =TRIM, =UPPER, =LOWER, and =MID.',
    challenge: 'Combine first and last names with a comma and space.',
    sampleInput: '=TEXTJOIN(", ", TRUE, A1, B1)',
    expectedResult: 'Combined string'
  },
  {
    id: 8,
    title: 'Date & Time Calculations',
    category: 'Intermediate',
    duration: '10 mins',
    description: 'Calculate working days, anniversaries, and age with =TODAY(), =NOW(), and =DATE().',
    challenge: 'Compute the current date dynamically.',
    sampleInput: '=TODAY()',
    expectedResult: 'Current localized date'
  },
  {
    id: 9,
    title: 'Lookup Mastery: VLOOKUP & XLOOKUP',
    category: 'Intermediate',
    duration: '20 mins',
    description: 'Query vertical tables and exact matches using =VLOOKUP and modern two-way =XLOOKUP.',
    challenge: 'Look up employee ID 104 in range A2:D50 and return department in column 3.',
    sampleInput: '=VLOOKUP(104, A2:D50, 3, FALSE)',
    expectedResult: 'Matched department'
  },
  {
    id: 10,
    title: 'Index and Match: The Power Duo',
    category: 'Intermediate',
    duration: '18 mins',
    description: 'Unlock left-lookups and resilient references combining =INDEX() with =MATCH().',
    challenge: 'Retrieve product price where SKU matches in column A.',
    sampleInput: '=INDEX(C1:C100, MATCH("SKU-1", A1:A100, 0))',
    expectedResult: 'Matched price'
  },
  {
    id: 11,
    title: 'Conditional Formatting & Data Bars',
    category: 'Intermediate',
    duration: '14 mins',
    description: 'Highlight outliers, top 10% values, and duplicate entries automatically with visual scales.',
    challenge: 'Create a green-to-red heat map rule across financial quarterly results.',
    sampleInput: 'Color Scale 3-Color',
    expectedResult: 'Active conditional rule'
  },
  {
    id: 12,
    title: 'Data Validation & Dropdown Menus',
    category: 'Intermediate',
    duration: '12 mins',
    description: 'Restrict inputs to valid lists, positive integers, or date windows to prevent input errors.',
    challenge: 'Configure a dropdown list restricted to "Pending", "In Progress", "Completed".',
    sampleInput: 'List: Pending, In Progress, Completed',
    expectedResult: 'Active validation dropdown'
  },
  {
    id: 13,
    title: 'Table Styles & Structured References',
    category: 'Advanced',
    duration: '15 mins',
    description: 'Convert plain grids into styled tables with banded rows, auto-filtering, and total rows.',
    challenge: 'Convert range A1:E20 into Table1 with headers.',
    sampleInput: 'Format as Table',
    expectedResult: 'Active table structure'
  },
  {
    id: 14,
    title: 'Interactive Charting & Visualizations',
    category: 'Advanced',
    duration: '20 mins',
    description: 'Generate Column, Line, Area, and Pie charts using ECharts overlay engine.',
    challenge: 'Create a bar chart comparing regional revenue totals.',
    sampleInput: 'Insert Chart > Column',
    expectedResult: 'Rendered chart overlay'
  },
  {
    id: 15,
    title: 'Sorting & Advanced Multi-Column Filters',
    category: 'Advanced',
    duration: '15 mins',
    description: 'Order massive datasets by multiple columns while preserving complete row integrity.',
    challenge: 'Sort by Department ascending, then Salary descending.',
    sampleInput: 'Custom Sort [Dept: Asc, Sal: Desc]',
    expectedResult: 'Sorted range'
  },
  {
    id: 16,
    title: 'Financial Modeling & Loan Amortization',
    category: 'Professional',
    duration: '25 mins',
    description: 'Calculate PMT, compounding interest, NPV, and IRR for investment analysis.',
    challenge: 'Determine monthly payment on a $500,000 mortgage at 6.5% over 30 years.',
    sampleInput: '=PMT(0.065/12, 360, -500000)',
    expectedResult: '$3,160.34'
  },
  {
    id: 17,
    title: 'Engineering & Scientific Calculations',
    category: 'Professional',
    duration: '20 mins',
    description: 'Apply Ohm’s Law, unit conversions, scientific exponents, and trigonometric functions in grids.',
    challenge: 'Compute voltage divider output in cell C2.',
    sampleInput: '=A2*(R2/(R1+R2))',
    expectedResult: 'Output voltage'
  },
  {
    id: 18,
    title: 'Keyboard Shortcuts & Speed Mastery',
    category: 'Professional',
    duration: '15 mins',
    description: 'Navigate without a mouse using Ctrl+Arrow, Shift+Space, Ctrl+Space, F2, and Ctrl+K.',
    challenge: 'Select 100 rows using Shift+Down arrow.',
    sampleInput: 'Shift+PageDown',
    expectedResult: '100% mouse-free workflow'
  },
  {
    id: 19,
    title: 'Capstone: End-to-End Business Model',
    category: 'Professional',
    duration: '35 mins',
    description: 'Build a complete 3-sheet corporate financial forecast with charts, validation, and formulas.',
    challenge: 'Assemble Income Statement, Balance Sheet, and KPI dashboard.',
    sampleInput: 'Full Model',
    expectedResult: 'Production-ready workbook'
  }
];

export const AcademyPage: React.FC = () => {
  const navigate = useNavigate();
  const createWorkbook = useWorkspaceStore((state) => state.createWorkbook);
  const [completedIds, setCompletedIds] = useState<number[]>([]);
  const [activeLesson, setActiveLesson] = useState<Lesson>(ACADEMY_COURSES[0]!);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('dc_excel_academy_completed');
      if (stored) {
        setCompletedIds(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleComplete = (id: number) => {
    const next = completedIds.includes(id)
      ? completedIds.filter((i) => i !== id)
      : [...completedIds, id];
    setCompletedIds(next);
    localStorage.setItem('dc_excel_academy_completed', JSON.stringify(next));
    toast.success(completedIds.includes(id) ? 'Lesson unmarked' : 'Lesson marked complete! 🎉');
  };

  const handleLaunchSandbox = async () => {
    try {
      const wb = await createWorkbook(`Academy Practice Sandbox - ${activeLesson.title}`);
      toast.success('Created Academy Sandbox Workbook!');
      navigate(`/workbook/${wb.id}`);
    } catch (e: any) {
      toast.error('Failed to launch sandbox');
    }
  };

  const progressPercent = Math.round((completedIds.length / ACADEMY_COURSES.length) * 100);

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-accent/10 text-accent border border-accent/20">
              <GraduationCap className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                DC Excel Academy
              </h1>
              <p className="text-xs sm:text-sm text-foreground-muted">
                19 comprehensive, offline-capable interactive lessons from beginner fundamentals to professional modeling.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-bold text-foreground">
              {completedIds.length} of {ACADEMY_COURSES.length} Completed
            </div>
            <div className="text-[11px] text-accent font-semibold">{progressPercent}% Progress</div>
          </div>
          <div className="w-24 h-2 rounded-full bg-surface-secondary overflow-hidden border border-border">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Lessons List */}
        <div className="rounded-2xl border border-border bg-surface p-4 space-y-2 max-h-[700px] overflow-y-auto shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-foreground-subtle px-2 py-1">
            Course Curriculum
          </div>
          {ACADEMY_COURSES.map((course) => {
            const isDone = completedIds.includes(course.id);
            const isSelected = activeLesson.id === course.id;
            return (
              <button
                key={course.id}
                type="button"
                onClick={() => setActiveLesson(course)}
                className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-accent bg-accent/10 shadow-xs'
                    : 'border-border bg-surface-secondary/60 hover:bg-surface-elevated'
                }`}
              >
                <div
                  className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    isDone ? 'bg-emerald-500 text-zinc-950' : 'bg-surface-elevated text-foreground-subtle border border-border'
                  }`}
                >
                  {isDone ? <CheckCircle className="w-3.5 h-3.5" /> : course.id}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-foreground truncate">
                      {course.title}
                    </span>
                    <span className="text-[10px] text-foreground-subtle">{course.duration}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="neutral" size="sm">
                      {course.category}
                    </Badge>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: Active Lesson Detail & Sandbox Launcher */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-6 space-y-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
              <div>
                <span className="text-xs font-bold text-accent uppercase tracking-wider">
                  Lesson {activeLesson.id} • {activeLesson.category}
                </span>
                <h2 className="text-xl font-bold text-foreground mt-1">{activeLesson.title}</h2>
              </div>
              <Button
                variant={completedIds.includes(activeLesson.id) ? 'secondary' : 'accent'}
                size="sm"
                leftIcon={<CheckCircle className="w-4 h-4" />}
                onClick={() => toggleComplete(activeLesson.id)}
              >
                {completedIds.includes(activeLesson.id) ? 'Completed' : 'Mark as Complete'}
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-foreground mb-1">Concept Overview</h3>
                <p className="text-xs leading-relaxed text-foreground-muted">
                  {activeLesson.description}
                </p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-surface-secondary space-y-2">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-accent" />
                  Practical Challenge
                </h4>
                <p className="text-xs text-foreground-muted">{activeLesson.challenge}</p>
                <div className="pt-2 flex flex-col sm:flex-row gap-2 font-mono text-xs">
                  <div className="p-2 rounded-lg bg-surface border border-border flex-1">
                    <span className="text-[10px] text-foreground-subtle block">Sample Formula</span>
                    <span className="text-accent font-semibold">{activeLesson.sampleInput}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-surface border border-border flex-1">
                    <span className="text-[10px] text-foreground-subtle block">Expected Outcome</span>
                    <span className="text-emerald-400 font-semibold">{activeLesson.expectedResult}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Launch Practice Sandbox */}
            <div className="p-5 rounded-xl border border-accent/30 bg-accent/5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-foreground">Interactive Practice Sandbox</h4>
                <p className="text-xs text-foreground-muted">
                  Launch a dedicated workbook pre-configured for this lesson to practise without altering existing files.
                </p>
              </div>
              <Button
                variant="accent"
                rightIcon={<ArrowRight className="w-4 h-4" />}
                onClick={handleLaunchSandbox}
              >
                Open Practice Sandbox
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
