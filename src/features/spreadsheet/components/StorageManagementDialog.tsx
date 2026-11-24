import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  Trash2,
  CheckCircle2,
  X,
  ShieldCheck,
  RefreshCw,
  Activity,
  Loader2,
} from 'lucide-react';
import { StorageBreakdown, DataIntegrityReport } from '@/types/persistence';
import { storageService } from '@/services/storage-service';

interface StorageManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StorageManagementDialog: React.FC<StorageManagementDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const [breakdown, setBreakdown] = useState<StorageBreakdown | null>(null);
  const [integrityReport, setIntegrityReport] = useState<DataIntegrityReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isCheckingIntegrity, setIsCheckingIntegrity] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadMetrics = async () => {
    setIsLoading(true);
    try {
      const data = await storageService.getStorageBreakdown();
      setBreakdown(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void loadMetrics();
      setIntegrityReport(null);
      setActionMessage(null);
    }
  }, [isOpen]);

  const handleCleanRecovery = async () => {
    setIsCleaning(true);
    try {
      const count = await storageService.cleanupRecoveryCheckpoints();
      setActionMessage(`Cleaned ${count} crash recovery checkpoint(s).`);
      await loadMetrics();
    } finally {
      setIsCleaning(false);
    }
  };

  const handleCleanOldVersions = async () => {
    setIsCleaning(true);
    try {
      const count = await storageService.cleanupOldVersions(7);
      setActionMessage(`Cleaned ${count} automatic checkpoint(s) older than 7 days.`);
      await loadMetrics();
    } finally {
      setIsCleaning(false);
    }
  };

  const handlePurgeAllVersions = async () => {
    if (!window.confirm('Are you sure you want to delete all historical version checkpoints across all workbooks? This will permanently remove version snapshots.')) {
      return;
    }

    setIsCleaning(true);
    try {
      const count = await storageService.cleanupAllVersions();
      setActionMessage(`Purged all ${count} historical version checkpoint(s).`);
      await loadMetrics();
    } finally {
      setIsCleaning(false);
    }
  };

  const handleRunIntegrityCheck = async () => {
    setIsCheckingIntegrity(true);
    try {
      const report = await storageService.checkDataIntegrity();
      setIntegrityReport(report);
    } finally {
      setIsCheckingIntegrity(false);
    }
  };

  if (!isOpen) return null;

  const usageMb = breakdown ? (breakdown.usageBytes / (1024 * 1024)).toFixed(2) : '0';
  const quotaMb = breakdown ? (breakdown.quotaBytes / (1024 * 1024)).toFixed(0) : '0';
  const percent = breakdown ? breakdown.percentageUsed : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="storage-management-dialog-title"
    >
      <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-secondary/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 id="storage-management-dialog-title" className="text-base font-semibold text-foreground">
                Storage & Data Management
              </h2>
              <p className="text-xs text-muted-foreground">
                Inspect local IndexedDB quota, cleanup caches, and verify data integrity
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => void loadMetrics()}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-secondary transition-colors"
              title="Refresh Storage Metrics"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-secondary transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {actionMessage && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{actionMessage}</span>
            </div>
          )}

          {/* Storage Meter */}
          <div className="p-4 rounded-xl border border-border bg-surface-secondary/20 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-primary" />
                Browser Local Storage Quota
              </span>
              <span className="font-mono text-muted-foreground">
                {usageMb} MB / {quotaMb !== '0' ? `${quotaMb} MB` : 'Available'} ({percent}%)
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 rounded-full bg-border overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  percent > 90 ? 'bg-destructive' : percent > 70 ? 'bg-amber-500' : 'bg-primary'
                }`}
                style={{ width: `${Math.max(2, Math.min(100, percent))}%` }}
              />
            </div>

            <p className="text-[11px] text-muted-foreground">
              All data is stored exclusively in your browser&apos;s IndexedDB database (<code className="font-mono text-[10px]">omnisheet_db</code>). No cloud servers are contacted.
            </p>
          </div>

          {/* Breakdown Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="p-3 rounded-lg border border-border bg-surface">
              <span className="text-muted-foreground block text-[10px]">Workbooks</span>
              <span className="font-bold text-foreground text-base">
                {breakdown?.workbookCount ?? 0}
              </span>
            </div>
            <div className="p-3 rounded-lg border border-border bg-surface">
              <span className="text-muted-foreground block text-[10px]">Worksheets</span>
              <span className="font-bold text-foreground text-base">
                {breakdown?.sheetCount ?? 0}
              </span>
            </div>
            <div className="p-3 rounded-lg border border-border bg-surface">
              <span className="text-muted-foreground block text-[10px]">Version Checkpoints</span>
              <span className="font-bold text-foreground text-base">
                {breakdown?.versionCount ?? 0}
              </span>
              <span className="text-[10px] text-muted-foreground block mt-0.5">
                {breakdown ? (breakdown.versionSizeBytes / 1024).toFixed(1) : 0} KB
              </span>
            </div>
            <div className="p-3 rounded-lg border border-border bg-surface">
              <span className="text-muted-foreground block text-[10px]">Recovery Checkpoints</span>
              <span className="font-bold text-foreground text-base">
                {breakdown?.recoveryCount ?? 0}
              </span>
            </div>
          </div>

          {/* Cleanup Tools */}
          <div className="p-4 rounded-xl border border-border bg-surface-secondary/20 space-y-3">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5 text-primary" />
              Storage Cleanup Actions
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                disabled={isCleaning}
                onClick={handleCleanRecovery}
                className="px-3 py-2 text-xs font-medium rounded-md border border-border bg-surface hover:bg-surface-secondary text-foreground transition-colors disabled:opacity-50 text-left"
              >
                Clear Temp Checkpoints
              </button>
              <button
                type="button"
                disabled={isCleaning}
                onClick={handleCleanOldVersions}
                className="px-3 py-2 text-xs font-medium rounded-md border border-border bg-surface hover:bg-surface-secondary text-foreground transition-colors disabled:opacity-50 text-left"
              >
                Clean Versions &gt; 7 Days
              </button>
              <button
                type="button"
                disabled={isCleaning}
                onClick={handlePurgeAllVersions}
                className="px-3 py-2 text-xs font-medium rounded-md border border-border bg-surface hover:bg-destructive/10 text-destructive transition-colors disabled:opacity-50 text-left"
              >
                Purge All Versions
              </button>
            </div>
          </div>

          {/* Data Integrity Checker */}
          <div className="p-4 rounded-xl border border-border bg-surface-secondary/20 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-primary" />
                Data Integrity Diagnostics
              </h4>
              <button
                type="button"
                disabled={isCheckingIntegrity}
                onClick={handleRunIntegrityCheck}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md bg-surface border border-border hover:bg-surface-secondary text-foreground transition-colors"
              >
                {isCheckingIntegrity ? (
                  <RefreshCw className="w-3 h-3 animate-spin text-primary" />
                ) : (
                  <Activity className="w-3 h-3 text-primary" />
                )}
                <span>Run Integrity Check</span>
              </button>
            </div>

            {integrityReport && (
              <div className="space-y-2 animate-in fade-in">
                {integrityReport.isValid ? (
                  <div className="flex items-center gap-2 p-2.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>Database Healthy: No orphaned records, missing references, or corrupted coordinates found.</span>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-1">
                    <span className="font-semibold block">Integrity Discrepancies Detected:</span>
                    <ul className="list-disc list-inside text-[11px] space-y-0.5">
                      {integrityReport.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-surface-secondary/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-md border border-border bg-surface text-xs font-medium text-foreground hover:bg-surface-secondary transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
