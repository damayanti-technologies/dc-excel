import React from 'react';
import { Link } from 'react-router-dom';
import { Plus, Clock, Folder } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspace-store';

export const QuickActions: React.FC = () => {
  const openCreateWorkbook = useWorkspaceStore((state) => state.openCreateWorkbook);

  return (
    <div className="space-y-3">
      <div className="text-xs font-bold uppercase tracking-wider text-foreground-subtle">
        Quick Actions
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* 1. Blank Workbook Card */}
        <button
          type="button"
          onClick={() => openCreateWorkbook()}
          className="group relative flex items-center gap-3.5 p-4 rounded-xl border border-border bg-surface hover:bg-surface-elevated hover:border-accent/40 transition-all text-left shadow-xs hover:shadow-sm cursor-pointer"
        >
          <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent group-hover:bg-accent group-hover:text-white transition-colors flex items-center justify-center shrink-0">
            <Plus className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors">
              Blank Workbook
            </div>
            <div className="text-xs text-foreground-muted truncate">
              Start with a clean spreadsheet
            </div>
          </div>
        </button>

        {/* 2. Recent Workbooks Card */}
        <Link
          to="/recent"
          className="group relative flex items-center gap-3.5 p-4 rounded-xl border border-border bg-surface hover:bg-surface-elevated hover:border-accent/40 transition-all text-left shadow-xs hover:shadow-sm"
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors">
              Recent Workbooks
            </div>
            <div className="text-xs text-foreground-muted truncate">
              Continue where you left off
            </div>
          </div>
        </Link>

        {/* 3. My Folders Card */}
        <Link
          to="/folders"
          className="group relative flex items-center gap-3.5 p-4 rounded-xl border border-border bg-surface hover:bg-surface-elevated hover:border-accent/40 transition-all text-left shadow-xs hover:shadow-sm"
        >
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition-colors flex items-center justify-center shrink-0">
            <Folder className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors">
              My Folders
            </div>
            <div className="text-xs text-foreground-muted truncate">
              Organize your spreadsheets
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
};
