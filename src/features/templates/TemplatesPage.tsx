import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutTemplate,
  DollarSign,
  PieChart,
  Briefcase,
  GraduationCap,
  Cpu,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/stores/toast-store';
import { workbookService } from '@/services';
import { sheetRepository } from '@/storage/repositories/sheet-repository';
import { Cell } from '@/types/cell';

interface TemplateItem {
  id: string;
  title: string;
  category: 'Finance' | 'Business' | 'Personal' | 'Education' | 'Engineering';
  description: string;
  icon: React.ReactNode;
  tags: string[];
  generateCells: () => Record<string, Cell>;
}

function makeCell(value: Cell['value'], formulaOrStyle?: string | Cell['style'], style?: Cell['style']): Cell {
  const formula = typeof formulaOrStyle === 'string' ? formulaOrStyle : undefined;
  const s = typeof formulaOrStyle === 'object' ? formulaOrStyle : style;
  return {
    value,
    formula,
    dataType: formula ? 'formula' : typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : 'string',
    style: s
  };
}

const TEMPLATES_LIST: TemplateItem[] = [
  {
    id: 'monthly-budget',
    title: 'Monthly Personal Budget',
    category: 'Personal',
    description: 'Track monthly income, fixed and discretionary expenses with automatic net savings calculation.',
    icon: <DollarSign className="w-5 h-5 text-emerald-400" />,
    tags: ['Income', 'Expenses', 'Savings', 'SUM'],
    generateCells: () => ({
      '0:0': makeCell('MONTHLY PERSONAL BUDGET', { bold: true }),
      '2:0': makeCell('Category', { bold: true }),
      '2:1': makeCell('Budgeted ($)', { bold: true }),
      '2:2': makeCell('Actual ($)', { bold: true }),
      '2:3': makeCell('Variance ($)', { bold: true }),
      '3:0': makeCell('Salary Income'),
      '3:1': makeCell(5000),
      '3:2': makeCell(5200),
      '3:3': makeCell(200, '=C4-B4'),
      '4:0': makeCell('Rent / Mortgage'),
      '4:1': makeCell(1600),
      '4:2': makeCell(1600),
      '4:3': makeCell(0, '=C5-B5'),
      '5:0': makeCell('Groceries & Food'),
      '5:1': makeCell(600),
      '5:2': makeCell(650),
      '5:3': makeCell(50, '=C6-B6'),
      '6:0': makeCell('Utilities & Internet'),
      '6:1': makeCell(250),
      '6:2': makeCell(240),
      '6:3': makeCell(-10, '=C7-B7'),
      '8:0': makeCell('Total Expenses', { bold: true }),
      '8:1': makeCell(2450, '=SUM(B5:B7)', { bold: true }),
      '8:2': makeCell(2490, '=SUM(C5:C7)', { bold: true }),
      '8:3': makeCell(40, '=C9-B9', { bold: true })
    })
  },
  {
    id: 'project-tracker',
    title: 'Project Milestone & Task Tracker',
    category: 'Business',
    description: 'Manage tasks, assignees, priorities, due dates, and completion status across project sprints.',
    icon: <Briefcase className="w-5 h-5 text-accent" />,
    tags: ['Tasks', 'Deadlines', 'Status', 'Productivity'],
    generateCells: () => ({
      '0:0': makeCell('PROJECT MILESTONE TRACKER', { bold: true }),
      '2:0': makeCell('Task ID', { bold: true }),
      '2:1': makeCell('Task Description', { bold: true }),
      '2:2': makeCell('Assignee', { bold: true }),
      '2:3': makeCell('Priority', { bold: true }),
      '2:4': makeCell('Status', { bold: true }),
      '3:0': makeCell('TSK-101'),
      '3:1': makeCell('Architecture Audit & Review'),
      '3:2': makeCell('Damayanti'),
      '3:3': makeCell('High'),
      '3:4': makeCell('Completed'),
      '4:0': makeCell('TSK-102'),
      '4:1': makeCell('Grid Engine Optimization'),
      '4:2': makeCell('Alex'),
      '4:3': makeCell('Critical'),
      '4:4': makeCell('In Progress')
    })
  },
  {
    id: 'loan-schedule',
    title: 'Loan Amortization & EMI Schedule',
    category: 'Finance',
    description: 'Calculate monthly loan principal and interest payments with compound interest formulas.',
    icon: <PieChart className="w-5 h-5 text-indigo-400" />,
    tags: ['PMT', 'Interest', 'Mortgage', 'Finance'],
    generateCells: () => ({
      '0:0': makeCell('LOAN AMORTIZATION SCHEDULE', { bold: true }),
      '2:0': makeCell('Loan Principal ($)', { bold: true }),
      '2:1': makeCell(100000),
      '3:0': makeCell('Annual Interest Rate (%)', { bold: true }),
      '3:1': makeCell(0.075),
      '4:0': makeCell('Tenure (Months)', { bold: true }),
      '4:1': makeCell(120),
      '5:0': makeCell('Monthly Payment (EMI)', { bold: true }),
      '5:1': makeCell(1187.02, '=PMT(B4/12, B5, -B3)', { bold: true })
    })
  },
  {
    id: 'student-gradebook',
    title: 'Student Gradebook & Score Sheet',
    category: 'Education',
    description: 'Record assignment scores, quiz results, and calculate weighted averages with letter grades.',
    icon: <GraduationCap className="w-5 h-5 text-amber-400" />,
    tags: ['Grades', 'AVERAGE', 'IF', 'Education'],
    generateCells: () => ({
      '0:0': makeCell('ACADEMIC GRADEBOOK', { bold: true }),
      '2:0': makeCell('Student Name', { bold: true }),
      '2:1': makeCell('Assignment (30%)', { bold: true }),
      '2:2': makeCell('Midterm (30%)', { bold: true }),
      '2:3': makeCell('Final Exam (40%)', { bold: true }),
      '2:4': makeCell('Final Score', { bold: true }),
      '3:0': makeCell('Alice Johnson'),
      '3:1': makeCell(92),
      '3:2': makeCell(88),
      '3:3': makeCell(95),
      '3:4': makeCell(92, '=B4*0.3 + C4*0.3 + D4*0.4', { bold: true })
    })
  },
  {
    id: 'circuit-design',
    title: 'Engineering Electrical Lab Sheet',
    category: 'Engineering',
    description: 'Calculate voltage dividers, series-parallel resistance, and power dissipation.',
    icon: <Cpu className="w-5 h-5 text-cyan-400" />,
    tags: ['Ohm', 'Voltage', 'Circuit', 'Engineering'],
    generateCells: () => ({
      '0:0': makeCell('ELECTRICAL CIRCUIT CALCULATIONS', { bold: true }),
      '2:0': makeCell('Input Voltage Vin (V)', { bold: true }),
      '2:1': makeCell(12),
      '3:0': makeCell('Resistor R1 (Ohms)', { bold: true }),
      '3:1': makeCell(1000),
      '4:0': makeCell('Resistor R2 (Ohms)', { bold: true }),
      '4:1': makeCell(2000),
      '5:0': makeCell('Divider Output Vout (V)', { bold: true }),
      '5:1': makeCell(8, '=B3 * (B5 / (B4 + B5))', { bold: true })
    })
  }
];

export const TemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedCat, setSelectedCat] = useState<string>('All');

  const handleUseTemplate = async (template: TemplateItem) => {
    try {
      const { workbook, initialSheet } = await workbookService.createWorkbook(template.title);
      const cells = template.generateCells();
      await sheetRepository.save({ ...initialSheet, cells });
      toast.success(`Created "${template.title}" from template!`);
      navigate(`/workbook/${workbook.id}`);
    } catch (e: unknown) {
      toast.error(`Failed to instantiate template: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const filtered = TEMPLATES_LIST.filter(
    (t) => selectedCat === 'All' || t.category === selectedCat
  );

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-accent/10 text-accent border border-accent/20">
              <LayoutTemplate className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Template Gallery
              </h1>
              <p className="text-xs sm:text-sm text-foreground-muted">
                Pre-configured professional workbooks with functional formulas, calculations, and structured styling.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="accent" size="sm">
            1-Click Instantiation
          </Badge>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {['All', 'Personal', 'Business', 'Finance', 'Education', 'Engineering'].map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCat(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCat === cat
                ? 'bg-accent text-zinc-950 shadow-xs'
                : 'bg-surface-secondary text-foreground-muted hover:text-foreground'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-border bg-surface hover:bg-surface-elevated p-6 space-y-4 transition-all shadow-xs flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-surface-secondary border border-border">
                  {item.icon}
                </div>
                <Badge variant="neutral" size="sm">
                  {item.category}
                </Badge>
              </div>

              <div>
                <h3 className="text-base font-bold text-foreground">{item.title}</h3>
                <p className="text-xs text-foreground-muted mt-1 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-surface-secondary text-foreground-subtle border border-border"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            <Button
              variant="accent"
              className="w-full mt-2"
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => handleUseTemplate(item)}
            >
              Use This Template
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
