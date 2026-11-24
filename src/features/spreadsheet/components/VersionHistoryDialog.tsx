import React, { useState, useEffect, useCallback } from 'react';
import {
  History,
  Clock,
  RotateCcw,
  Trash2,
  Bookmark,
  Plus,
  AlertTriangle,
  X,
  FileSpreadsheet,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { Workbook } from '@/types/workbook';
import { Sheet } from '@/types/sheet';
import { WorkbookVersion } from '@/types/persistence';
import { versionService } from '@/services/version-service';

interface VersionHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  workbook: Workbook;
  sheets: Sheet[];
  onRestoreSuccess: (restoredWorkbook: Workbook, restoredSheets: Sheet[]) => void;
}

export const VersionHistoryDialog: React.FC<VersionHistoryDialogProps> = ({
  isOpen,
  onClose,
  workbook,
  sheets,
  onRestoreSuccess,
}) => {
  const [versions, setVersions] = useState<WorkbookVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New checkpoint form
  const [isCreatingCheckpoint, setIsCreatingCheckpoint] = useState(false);
  const [newCheckpointLabel, setNewCheckpointLabel] = useState('');
  const [newCheckpointDesc, setNewCheckpointDesc] = useState('');

  // Confirmation before restore
  const [confirmingRestoreId, setConfirmingRestoreId] = useState<string | null>(null);

  const loadVersions = useCallback(async () => {
    if (!workbook?.id) return;
    setIsLoading(true);
    try {
      const list = await versionService.getVersions(workbook.id);
      setVersions(list);
      if (list.length > 0 && (!selectedVersionId || !list.find((v) => v.id === selectedVersionId))) {
        setSelectedVersionId(list[0]?.id || null);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to load version history.');
    } finally {
      setIsLoading(false);
    }
  }, [workbook?.id, selectedVersionId]);

  useEffect(() => {
    if (isOpen) {
      void loadVersions();
      setIsCreatingCheckpoint(false);
      setConfirmingRestoreId(null);
      setErrorMessage(null);
    }
  }, [isOpen, loadVersions]);

  const handleCreateManualCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCheckpointLabel.trim()) return;

    try {
      await versionService.createVersion(
        workbook,
        sheets,
        newCheckpointLabel.trim(),
        newCheckpointDesc.trim(),
        true
      );
      setNewCheckpointLabel('');
      setNewCheckpointDesc('');
      setIsCreatingCheckpoint(false);
      await loadVersions();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to create checkpoint.');
    }
  };

  const handleExecuteRestore = async () => {
    if (!confirmingRestoreId) return;
    setIsRestoring(true);
    setErrorMessage(null);

    try {
      const { workbook: restoredWb, sheets: restoredSheets } =
        await versionService.restoreVersion(confirmingRestoreId, workbook, sheets);
      onRestoreSuccess(restoredWb, restoredSheets);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to restore selected version.');
    } finally {
      setIsRestoring(false);
      setConfirmingRestoreId(null);
    }
  };

  const handleDeleteVersion = async (versionId: string) => {
    try {
      await versionService.deleteVersion(versionId);
      await loadVersions();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to delete version checkpoint.');
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Are you sure you want to delete all historical versions for this workbook? This cannot be undone.')) {
      return;
    }

    try {
      await versionService.deleteAllVersions(workbook.id);
      await loadVersions();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to delete all versions.');
    }
  };

  if (!isOpen) return null;

  const selectedVersion = versions.find((v) => v.id === selectedVersionId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="version-history-dialog-title"
    >
      <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-secondary/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 id="version-history-dialog-title" className="text-base font-semibold text-foreground">
                Workbook Version History
              </h2>
              <p className="text-xs text-muted-foreground">
                Inspect checkpoints and restore previous versions of &ldquo;{workbook.name}&rdquo;
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-secondary transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Left Column: Version List */}
          <div className="w-full md:w-1/2 border-r border-border flex flex-col h-full overflow-hidden bg-surface-secondary/20">
            {/* Action Bar */}
            <div className="p-3 border-b border-border flex items-center justify-between gap-2 bg-surface">
              <button
                type="button"
                onClick={() => setIsCreatingCheckpoint(!isCreatingCheckpoint)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Checkpoint</span>
              </button>

              {versions.length > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteAll}
                  className="text-xs text-destructive hover:underline font-medium"
                >
                  Clear History
                </button>
              )}
            </div>

            {/* Create Checkpoint Form */}
            {isCreatingCheckpoint && (
              <form onSubmit={handleCreateManualCheckpoint} className="p-3 border-b border-border bg-surface space-y-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-foreground">Checkpoint Label</label>
                  <input
                    type="text"
                    value={newCheckpointLabel}
                    onChange={(e) => setNewCheckpointLabel(e.target.value)}
                    placeholder="e.g. Before revenue formula updates"
                    className="w-full h-7 px-2.5 rounded-md border border-border bg-surface text-foreground text-xs focus:ring-1 focus:ring-primary outline-hidden"
                    autoFocus
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">Description (Optional)</label>
                  <input
                    type="text"
                    value={newCheckpointDesc}
                    onChange={(e) => setNewCheckpointDesc(e.target.value)}
                    placeholder="Brief notes about this version"
                    className="w-full h-7 px-2.5 rounded-md border border-border bg-surface text-foreground text-xs focus:ring-1 focus:ring-primary outline-hidden"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsCreatingCheckpoint(false)}
                    className="px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                  >
                    Save
                  </button>
                </div>
              </form>
            )}

            {/* Versions List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-xs text-muted-foreground gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                  <span>Loading version history...</span>
                </div>
              ) : versions.length === 0 ? (
                <div className="text-center py-12 px-4 space-y-2">
                  <Clock className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                  <p className="text-xs text-muted-foreground">
                    No historical versions recorded yet. Versions are created automatically during major operations or when you click &ldquo;Create Checkpoint&rdquo;.
                  </p>
                </div>
              ) : (
                versions.map((ver) => {
                  const isSelected = ver.id === selectedVersionId;
                  const dateStr = new Date(ver.createdAt).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  return (
                    <div
                      key={ver.id}
                      onClick={() => setSelectedVersionId(ver.id)}
                      className={`group p-3 rounded-lg border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-2xs'
                          : 'border-border bg-surface hover:bg-surface-secondary/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-semibold text-foreground truncate">
                              {ver.label}
                            </span>
                            {ver.isManual ? (
                              <span className="px-1.5 py-0.2 rounded-full bg-primary/20 text-primary text-[10px] font-medium">
                                Manual
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded-full bg-surface-secondary text-muted-foreground text-[10px]">
                                Auto
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1">
                            <Clock className="w-3 h-3 shrink-0" />
                            <span>{dateStr}</span>
                            <span>•</span>
                            <span>Rev #{ver.revision}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDeleteVersion(ver.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-opacity"
                          title="Delete this checkpoint"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {ver.description && (
                        <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2">
                          {ver.description}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Version Preview & Restore */}
          <div className="w-full md:w-1/2 p-6 flex flex-col justify-between overflow-y-auto bg-surface">
            {selectedVersion ? (
              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Bookmark className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold text-foreground">
                      {selectedVersion.label}
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Captured on {new Date(selectedVersion.createdAt).toLocaleString()}
                  </p>
                </div>

                {/* Metadata card */}
                <div className="p-4 rounded-xl border border-border bg-surface-secondary/20 space-y-3">
                  <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-primary" />
                    Snapshot Details
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[11px] text-muted-foreground block">Worksheets</span>
                      <span className="font-semibold text-foreground">
                        {selectedVersion.sheetsSnapshot.length} sheet(s)
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground block">Revision</span>
                      <span className="font-semibold text-foreground">
                        #{selectedVersion.revision}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground block">Snapshot Size</span>
                      <span className="font-semibold text-foreground">
                        {(selectedVersion.sizeBytes / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground block">Type</span>
                      <span className="font-semibold text-foreground">
                        {selectedVersion.isManual ? 'User Checkpoint' : 'Automatic Checkpoint'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border">
                    <span className="text-[11px] text-muted-foreground block mb-1">Included Sheets:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedVersion.sheetsSnapshot.map((s) => (
                        <span
                          key={s.id}
                          className="px-2 py-0.5 rounded-md border border-border bg-surface text-[11px] font-medium text-foreground"
                        >
                          {s.name} ({Object.keys(s.cells || {}).length} cells)
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Safety Guarantee Banner */}
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs">
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Safe Restore Guarantee:</strong> Restoring this version will automatically save your current workbook state as a pre-restore backup checkpoint, so you can always revert back.
                  </p>
                </div>

                {/* Restore Confirmation Box */}
                {confirmingRestoreId === selectedVersion.id && (
                  <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs space-y-2 animate-in fade-in">
                    <div className="font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Confirm Version Restore</span>
                    </div>
                    <p className="leading-relaxed">
                      Are you sure you want to restore &ldquo;{selectedVersion.label}&rdquo;? The workbook will be rolled back to this snapshot.
                    </p>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setConfirmingRestoreId(null)}
                        className="px-3 py-1 rounded border border-border bg-surface text-foreground text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleExecuteRestore}
                        disabled={isRestoring}
                        className="px-3 py-1 rounded bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90"
                      >
                        {isRestoring ? 'Restoring...' : 'Yes, Restore Version'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-24 text-center text-xs text-muted-foreground">
                Select a checkpoint on the left to inspect its details and restore it.
              </div>
            )}

            {/* Restore Action Button */}
            {selectedVersion && confirmingRestoreId !== selectedVersion.id && (
              <div className="pt-4 border-t border-border mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setConfirmingRestoreId(selectedVersion.id)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore This Version</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-surface-secondary/40 flex items-center justify-between text-xs text-muted-foreground">
          {errorMessage ? (
            <span className="text-destructive font-medium">{errorMessage}</span>
          ) : (
            <span>All checkpoints are stored persistently inside your browser&apos;s local IndexedDB.</span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-md border border-border bg-surface text-xs font-medium text-foreground hover:bg-surface-secondary transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
