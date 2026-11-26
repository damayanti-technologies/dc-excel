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

interface TemplateItem {
  id: string;
  title: string;
  category: 'Finance' | 'Business' | 'Personal' | 'Education' | 'Engineering';
  description: string;
  icon: React.ReactNode;
  tags: string[];
  generateCells: () => Record<string, any>;
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
      '0:0': { value: 'MONTHLY PERSONAL BUDGET', rawInput: 'MONTHLY PERSONAL BUDGET', style: { bold: true } },
      '2:0': { value: 'Category', rawInput: 'Category', style: { bold: true } },
      '2:1': { value: 'Budgeted ($)', rawInput: 'Budgeted ($)', style: { bold: true } },
      '2:2': { value: 'Actual ($)', rawInput: 'Actual ($)', style: { bold: true } },
      '2:3': { value: 'Variance ($)', rawInput: 'Variance ($)', style: { bold: true } },
      '3:0': { value: 'Salary Income', rawInput: 'Salary Income' },
      '3:1': { value: 5000, rawInput: '5000' },
      '3:2': { value: 5200, rawInput: '5200' },
      '3:3': { value: 200, rawInput: '=C4-B4', formula: '=C4-B4' },
      '4:0': { value: 'Rent / Mortgage', rawInput: 'Rent / Mortgage' },
      '4:1': { value: 1600, rawInput: '1600' },
      '4:2': { value: 1600, rawInput: '1600' },
      '4:3': { value: 0, rawInput: '=C5-B5', formula: '=C5-B5' },
      '5:0': { value: 'Groceries & Food', rawInput: 'Groceries & Food' },
      '5:1': { value: 600, rawInput: '600' },
      '5:2': { value: 650, rawInput: '650' },
      '5:3': { value: 50, rawInput: '=C6-B6', formula: '=C6-B6' },
      '6:0': { value: 'Utilities & Internet', rawInput: 'Utilities & Internet' },
      '6:1': { value: 250, rawInput: '250' },
      '6:2': { value: 240, rawInput: '240' },
      '6:3': { value: -10, rawInput: '=C7-B7', formula: '=C7-B7' },
      '8:0': { value: 'Total Expenses', rawInput: 'Total Expenses', style: { bold: true } },
      '8:1': { value: 2450, rawInput: '=SUM(B5:B7)', formula: '=SUM(B5:B7)', style: { bold: true } },
      '8:2': { value: 2490, rawInput: '=SUM(C5:C7)', formula: '=SUM(C5:C7)', style: { bold: true } },
      '8:3': { value: 40, rawInput: '=C9-B9', formula: '=C9-B9', style: { bold: true } }
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
      '0:0': { value: 'PROJECT MILESTONE TRACKER', rawInput: 'PROJECT MILESTONE TRACKER', style: { bold: true } },
      '2:0': { value: 'Task ID', rawInput: 'Task ID', style: { bold: true } },
      '2:1': { value: 'Task Description', rawInput: 'Task Description', style: { bold: true } },
      '2:2': { value: 'Assignee', rawInput: 'Assignee', style: { bold: true } },
      '2:3': { value: 'Priority', rawInput: 'Priority', style: { bold: true } },
      '2:4': { value: 'Status', rawInput: 'Status', style: { bold: true } },
      '3:0': { value: 'TSK-101', rawInput: 'TSK-101' },
      '3:1': { value: 'Architecture Audit & Review', rawInput: 'Architecture Audit & Review' },
      '3:2': { value: 'Damayanti', rawInput: 'Damayanti' },
      '3:3': { value: 'High', rawInput: 'High' },
      '3:4': { value: 'Completed', rawInput: 'Completed' },
      '4:0': { value: 'TSK-102', rawInput: 'TSK-102' },
      '4:1': { value: 'Grid Engine Optimization', rawInput: 'Grid Engine Optimization' },
      '4:2': { value: 'Alex', rawInput: 'Alex' },
      '4:3': { value: 'Critical', rawInput: 'Critical' },
      '4:4': { value: 'In Progress', rawInput: 'In Progress' }
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
      '0:0': { value: 'LOAN AMORTIZATION SCHEDULE', rawInput: 'LOAN AMORTIZATION SCHEDULE', style: { bold: true } },
      '2:0': { value: 'Loan Principal ($)', rawInput: 'Loan Principal ($)', style: { bold: true } },
      '2:1': { value: 100000, rawInput: '100000' },
      '3:0': { value: 'Annual Interest Rate (%)', rawInput: 'Annual Interest Rate (%)', style: { bold: true } },
      '3:1': { value: 0.075, rawInput: '0.075' },
      '4:0': { value: 'Tenure (Months)', rawInput: 'Tenure (Months)', style: { bold: true } },
      '4:1': { value: 120, rawInput: '120' },
      '5:0': { value: 'Monthly Payment (EMI)', rawInput: 'Monthly Payment (EMI)', style: { bold: true } },
      '5:1': { value: 1187.02, rawInput: '=PMT(B4/12, B5, -B3)', formula: '=PMT(B4/12, B5, -B3)', style: { bold: true } }
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
      '0:0': { value: 'ACADEMIC GRADEBOOK', rawInput: 'ACADEMIC GRADEBOOK', style: { bold: true } },
      '2:0': { value: 'Student Name', rawInput: 'Student Name', style: { bold: true } },
      '2:1': { value: 'Assignment (30%)', rawInput: 'Assignment (30%)', style: { bold: true } },
      '2:2': { value: 'Midterm (30%)', rawInput: 'Midterm (30%)', style: { bold: true } },
      '2:3': { value: 'Final Exam (40%)', rawInput: 'Final Exam (40%)', style: { bold: true } },
      '2:4': { value: 'Final Score', rawInput: 'Final Score', style: { bold: true } },
      '3:0': { value: 'Alice Johnson', rawInput: 'Alice Johnson' },
      '3:1': { value: 92, rawInput: '92' },
      '3:2': { value: 88, rawInput: '88' },
      '3:3': { value: 95, rawInput: '95' },
      '3:4': { value: 92, rawInput: '=B4*0.3 + C4*0.3 + D4*0.4', formula: '=B4*0.3 + C4*0.3 + D4*0.4', style: { bold: true } }
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
      '0:0': { value: 'ELECTRICAL CIRCUIT CALCULATIONS', rawInput: 'ELECTRICAL CIRCUIT CALCULATIONS', style: { bold: true } },
      '2:0': { value: 'Input Voltage Vin (V)', rawInput: 'Input Voltage Vin (V)', style: { bold: true } },
      '2:1': { value: 12, rawInput: '12' },
      '3:0': { value: 'Resistor R1 (Ohms)', rawInput: 'Resistor R1 (Ohms)', style: { bold: true } },
      '3:1': { value: 1000, rawInput: '1000' },
      '4:0': { value: 'Resistor R2 (Ohms)', rawInput: 'Resistor R2 (Ohms)', style: { bold: true } },
      '4:1': { value: 2000, rawInput: '2000' },
      '5:0': { value: 'Divider Output Vout (V)', rawInput: 'Divider Output Vout (V)', style: { bold: true } },
      '5:1': { value: 8, rawInput: '=B3 * (B5 / (B4 + B5))', formula: '=B3 * (B5 / (B4 + B5))', style: { bold: true } }
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
    } catch (e: any) {
      toast.error(`Failed to instantiate template: ${e.message}`);
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
