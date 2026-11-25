import React from 'react';
import {
  BarChart3,
  LineChart,
  PieChart,
  AreaChart,
  ScatterChart,
  Layers,
  Sparkles,
  Table,
  HelpCircle,
} from 'lucide-react';
import { ChartType } from '@/types/chart';

interface InsertToolbarProps {
  onOpenInsertChart: (defaultType?: ChartType) => void;
  onOpenPivotTable?: () => void;
  onOpenFormulaReference?: () => void;
}

export const InsertToolbar: React.FC<InsertToolbarProps> = ({
  onOpenInsertChart,
  onOpenPivotTable,
  onOpenFormulaReference,
}) => {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-surface text-xs overflow-x-auto min-h-[44px]">
      {/* 1. Main Insert Chart Button */}
      <div className="flex items-center gap-1.5 pr-2 border-r border-border/60">
        <button
          type="button"
          onClick={() => onOpenInsertChart()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent text-accent-foreground font-semibold hover:bg-accent/90 shadow-xs transition-colors"
        >
          <BarChart3 className="w-4 h-4" />
          <span>Insert Chart</span>
        </button>
      </div>

      {/* 2. Quick Chart Types */}
      <div className="flex items-center gap-1 pr-2 border-r border-border/60">
        <span className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wider px-1">
          Quick Charts
        </span>

        <button
          type="button"
          onClick={() => onOpenInsertChart('column-clustered')}
          title="Column Chart"
          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-secondary transition-colors"
        >
          <BarChart3 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Column</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenInsertChart('bar-clustered')}
          title="Bar Chart"
          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-secondary transition-colors"
        >
          <Layers className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>Bar</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenInsertChart('line-standard')}
          title="Line Chart"
          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-secondary transition-colors"
        >
          <LineChart className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>Line</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenInsertChart('area-standard')}
          title="Area Chart"
          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-secondary transition-colors"
        >
          <AreaChart className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>Area</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenInsertChart('pie-standard')}
          title="Pie / Doughnut Chart"
          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-secondary transition-colors"
        >
          <PieChart className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
          <span>Pie</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenInsertChart('scatter-standard')}
          title="Scatter Chart"
          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-secondary transition-colors"
        >
          <ScatterChart className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>Scatter</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenInsertChart('combination')}
          title="Combination (Bar + Line)"
          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-secondary transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          <span>Combo</span>
        </button>
      </div>

      {/* 3. Tables & References */}
      <div className="flex items-center gap-1">
        {onOpenPivotTable && (
          <button
            type="button"
            onClick={onOpenPivotTable}
            title="Create or Manage Pivot Table"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-secondary transition-colors"
          >
            <Table className="w-3.5 h-3.5 text-accent" />
            <span>Pivot Table</span>
          </button>
        )}

        {onOpenFormulaReference && (
          <button
            type="button"
            onClick={onOpenFormulaReference}
            title="Browse Formula Function Reference"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-secondary transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Function Help</span>
          </button>
        )}
      </div>
    </div>
  );
};
