import React from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  FileSpreadsheet,
  Calculator,
  FunctionSquare,
  ArrowRightLeft,
  Scissors,
  Cpu,
  DollarSign,
  GraduationCap
} from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspace-store';

export const QuickActions: React.FC = () => {
  const openCreateWorkbook = useWorkspaceStore((state) => state.openCreateWorkbook);

  const actions = [
    {
      label: 'Blank Workbook',
      desc: 'Start with a clean spreadsheet',
      icon: <Plus className="w-4 h-4" />,
      onClick: () => openCreateWorkbook(),
      accentColor: 'text-accent bg-accent/10 group-hover:bg-accent group-hover:text-zinc-950'
    },
    {
      label: 'Recent Workbooks',
      desc: 'Continue where you left off',
      icon: <FileSpreadsheet className="w-4 h-4" />,
      path: '/recent',
      accentColor: 'text-emerald-400 bg-emerald-500/10 group-hover:bg-emerald-500 group-hover:text-zinc-950'
    },
    {
      label: 'My Folders',
      desc: 'Organize your spreadsheets',
      icon: <FileSpreadsheet className="w-4 h-4" />,
      path: '/folders',
      accentColor: 'text-amber-400 bg-amber-500/10 group-hover:bg-amber-500 group-hover:text-zinc-950'
    },
    {
      label: 'Calculator Lab',
      desc: 'Scientific, finance & stats math',
      icon: <Calculator className="w-4 h-4" />,
      path: '/tools',
      accentColor: 'text-cyan-400 bg-cyan-500/10 group-hover:bg-cyan-500 group-hover:text-zinc-950'
    },
    {
      label: 'Formula Explorer',
      desc: 'Browse & compose 60+ formulas',
      icon: <FunctionSquare className="w-4 h-4" />,
      path: '/formulas',
      accentColor: 'text-purple-400 bg-purple-500/10 group-hover:bg-purple-500 group-hover:text-zinc-950'
    },
    {
      label: 'Universal Converter',
      desc: 'Length, mass, temp, digital & more',
      icon: <ArrowRightLeft className="w-4 h-4" />,
      path: '/tools',
      accentColor: 'text-amber-400 bg-amber-500/10 group-hover:bg-amber-500 group-hover:text-zinc-950'
    },
    {
      label: 'Data Cleaner',
      desc: 'Sanitize, trim & split text',
      icon: <Scissors className="w-4 h-4" />,
      path: '/data-tools',
      accentColor: 'text-rose-400 bg-rose-500/10 group-hover:bg-rose-500 group-hover:text-zinc-950'
    },
    {
      label: 'Engineering Lab',
      desc: 'Ohm’s law, dividers & binary',
      icon: <Cpu className="w-4 h-4" />,
      path: '/tools',
      accentColor: 'text-teal-400 bg-teal-500/10 group-hover:bg-teal-500 group-hover:text-zinc-950'
    },
    {
      label: 'Finance & Loan Lab',
      desc: 'EMI, SIP & compound growth',
      icon: <DollarSign className="w-4 h-4" />,
      path: '/tools',
      accentColor: 'text-emerald-400 bg-emerald-500/10 group-hover:bg-emerald-500 group-hover:text-zinc-950'
    },
    {
      label: 'DC Excel Academy',
      desc: '19 interactive courses & sandbox',
      icon: <GraduationCap className="w-4 h-4" />,
      path: '/academy',
      accentColor: 'text-blue-400 bg-blue-500/10 group-hover:bg-blue-500 group-hover:text-zinc-950'
    }
  ];

  return (
    <div className="space-y-3">
      <div className="text-xs font-bold uppercase tracking-wider text-foreground-subtle">
        Quick Action Command Cards
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {actions.map((act) => {
          if (act.onClick) {
            return (
              <button
                key={act.label}
                type="button"
                onClick={act.onClick}
                className="group relative flex items-center gap-3 p-3.5 rounded-xl border border-border bg-surface hover:bg-surface-elevated hover:border-accent/40 transition-all text-left shadow-xs cursor-pointer"
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${act.accentColor}`}
                >
                  {act.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-foreground group-hover:text-accent transition-colors">
                    {act.label}
                  </div>
                  <div className="text-[11px] text-foreground-muted truncate">{act.desc}</div>
                </div>
              </button>
            );
          }

          return (
            <Link
              key={act.label}
              to={act.path!}
              className="group relative flex items-center gap-3 p-3.5 rounded-xl border border-border bg-surface hover:bg-surface-elevated hover:border-accent/40 transition-all text-left shadow-xs"
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${act.accentColor}`}
              >
                {act.icon}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-foreground group-hover:text-accent transition-colors">
                  {act.label}
                </div>
                <div className="text-[11px] text-foreground-muted truncate">{act.desc}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
