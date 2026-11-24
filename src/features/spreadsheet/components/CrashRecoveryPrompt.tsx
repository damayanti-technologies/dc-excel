import React from 'react';
import { ShieldAlert, RotateCcw, Trash2 } from 'lucide-react';
import { CrashRecoveryRecord } from '@/types/persistence';

interface CrashRecoveryPromptProps {
  recoveryRecord: CrashRecoveryRecord;
  onRestore: () => void;
  onDiscard: () => void;
}

export const CrashRecoveryPrompt: React.FC<CrashRecoveryPromptProps> = ({
  recoveryRecord,
  onRestore,
  onDiscard,
}) => {
  const dateStr = new Date(recoveryRecord.timestamp).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className="z-30 bg-primary/10 border-b border-primary/20 text-foreground px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs animate-in slide-in-from-top-2 duration-200 shrink-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="p-1 rounded bg-primary/20 text-primary shrink-0">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div>
          <span className="font-semibold text-foreground">Crash Recovery Available:</span>{' '}
          <span className="text-muted-foreground">
            Unsaved changes detected from a previous interrupted session at {dateStr} (Revision #{recoveryRecord.revision}).
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onDiscard}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-border bg-surface text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors text-xs font-medium"
        >
          <Trash2 className="w-3 h-3" />
          <span>Discard</span>
        </button>

        <button
          type="button"
          onClick={onRestore}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-xs font-semibold shadow-2xs"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restore Recovered Work</span>
        </button>
      </div>
    </div>
  );
};
