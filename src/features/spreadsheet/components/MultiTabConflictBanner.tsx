import React from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';

interface MultiTabConflictBannerProps {
  externalRevision: number;
  onReload: () => void;
  onDismiss: () => void;
}

export const MultiTabConflictBanner: React.FC<MultiTabConflictBannerProps> = ({
  externalRevision,
  onReload,
  onDismiss,
}) => {
  return (
    <div className="z-30 bg-amber-500 text-amber-950 dark:bg-amber-600 dark:text-amber-50 px-4 py-2 flex items-center justify-between text-xs font-medium shadow-sm animate-in slide-in-from-top-2 duration-200 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-950 dark:text-amber-50" />
        <span className="truncate">
          <strong>Multi-Tab Notice:</strong> This workbook was modified in another open browser tab (Revision #{externalRevision}).
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onReload}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-950 text-amber-50 dark:bg-amber-50 dark:text-amber-950 hover:opacity-90 transition-opacity font-semibold shadow-2xs"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Reload Latest</span>
        </button>

        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded hover:bg-black/10 transition-colors"
          title="Dismiss warning"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
