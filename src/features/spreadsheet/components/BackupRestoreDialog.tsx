import React, { useState, useRef } from 'react';
import {
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  X,
  ShieldCheck,
  RefreshCw,
  FolderArchive,
} from 'lucide-react';
import { Workbook } from '@/types/workbook';
import { Sheet } from '@/types/sheet';
import { BackupManifest } from '@/types/persistence';
import { backupService } from '@/services/backup-service';
import { workbookRepository } from '@/storage/repositories/workbook-repository';
import { sheetRepository } from '@/storage/repositories/sheet-repository';

interface BackupRestoreDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentWorkbook?: Workbook;
  currentSheets?: Sheet[];
  onRestoreSuccess?: () => void;
}

export const BackupRestoreDialog: React.FC<BackupRestoreDialogProps> = ({
  isOpen,
  onClose,
  currentWorkbook,
  currentSheets,
  onRestoreSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'backup' | 'restore'>('backup');

  // Backup state
  const [backupScope, setBackupScope] = useState<'current' | 'all'>(currentWorkbook ? 'current' : 'all');
  const [customFileName, setCustomFileName] = useState('');
  const [isGeneratingBackup, setIsGeneratingBackup] = useState(false);

  // Restore state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [manifestPreview, setManifestPreview] = useState<BackupManifest | null>(null);
  const [restoreMode, setRestoreMode] = useState<'new' | 'replace'>('new');
  const [confirmingReplace, setConfirmingReplace] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleCreateBackup = async () => {
    setIsGeneratingBackup(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      let wbs: Workbook[] = [];
      let allSheets: Sheet[] = [];

      if (backupScope === 'current' && currentWorkbook && currentSheets) {
        wbs = [currentWorkbook];
        allSheets = currentSheets;
      } else {
        // Load all workbooks and sheets from IndexedDB
        const summaries = await workbookRepository.getAll();
        for (const s of summaries) {
          const wb = await workbookRepository.getById(s.id);
          if (wb) {
            wbs.push(wb);
            const sheetList = await sheetRepository.getByWorkbookId(wb.id);
            allSheets.push(...sheetList);
          }
        }
      }

      const result = await backupService.createBackup(wbs, allSheets, customFileName, true);
      setSuccessMessage(`Backup archive "${result.fileName}" generated and downloaded successfully!`);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to generate backup archive.');
    } finally {
      setIsGeneratingBackup(false);
    }
  };

  const handleFileSelected = async (file: File) => {
    setSelectedFile(file);
    setIsInspecting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setManifestPreview(null);

    try {
      const { manifest } = await backupService.inspectBackup(file);
      setManifestPreview(manifest);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Invalid backup archive.');
      setSelectedFile(null);
    } finally {
      setIsInspecting(false);
    }
  };

  const handleExecuteRestore = async () => {
    if (!selectedFile) return;

    if (restoreMode === 'replace' && !confirmingReplace) {
      setConfirmingReplace(true);
      return;
    }

    setIsRestoring(true);
    setErrorMessage(null);

    try {
      const { restoredWorkbooks } = await backupService.restoreBackup(selectedFile, restoreMode);
      setSuccessMessage(`Successfully restored ${restoredWorkbooks.length} workbook(s)!`);
      if (onRestoreSuccess) {
        onRestoreSuccess();
      }
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to restore backup archive.');
    } finally {
      setIsRestoring(false);
      setConfirmingReplace(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="backup-restore-dialog-title"
    >
      <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-secondary/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <h2 id="backup-restore-dialog-title" className="text-base font-semibold text-foreground">
                Backup & Restore System
              </h2>
              <p className="text-xs text-muted-foreground">
                Create portable offline backups or restore existing archives
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

        {/* Tab Switcher */}
        <div className="flex border-b border-border bg-surface-secondary/20 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'backup'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Create Backup</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('restore')}
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'restore'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Restore Backup</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Messages */}
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* TAB 1: CREATE BACKUP */}
          {activeTab === 'backup' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">Select Backup Scope</label>
                <div className="grid grid-cols-2 gap-3">
                  {currentWorkbook && (
                    <label
                      className={`flex flex-col p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                        backupScope === 'current'
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border bg-surface text-muted-foreground hover:bg-surface-secondary'
                      }`}
                    >
                      <input
                        type="radio"
                        name="scope"
                        checked={backupScope === 'current'}
                        onChange={() => setBackupScope('current')}
                        className="sr-only"
                      />
                      <span className="font-semibold text-foreground">Current Workbook Only</span>
                      <span className="text-[11px] text-muted-foreground mt-1 truncate">
                        &ldquo;{currentWorkbook.name}&rdquo; ({currentSheets?.length || 1} sheets)
                      </span>
                    </label>
                  )}

                  <label
                    className={`flex flex-col p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                      backupScope === 'all'
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border bg-surface text-muted-foreground hover:bg-surface-secondary'
                    }`}
                  >
                    <input
                      type="radio"
                      name="scope"
                      checked={backupScope === 'all'}
                      onChange={() => setBackupScope('all')}
                      className="sr-only"
                    />
                    <span className="font-semibold text-foreground">All Workbooks in Workspace</span>
                    <span className="text-[11px] text-muted-foreground mt-1">
                      Full workspace archive containing all sheets & metadata
                    </span>
                  </label>
                </div>
              </div>

              {/* Custom Filename */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Backup File Name (Optional)</label>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={customFileName}
                    onChange={(e) => setCustomFileName(e.target.value)}
                    placeholder="e.g. My_DC_Excel_Backup"
                    className="w-full h-8 px-3 rounded-l-md border border-border bg-surface text-foreground text-xs focus:ring-1 focus:ring-primary outline-hidden"
                  />
                  <span className="h-8 px-3 rounded-r-md border border-l-0 border-border bg-surface-secondary text-xs text-muted-foreground flex items-center font-mono">
                    .omni
                  </span>
                </div>
              </div>

              {/* Portable Security Guarantee */}
              <div className="flex items-start gap-2.5 p-3 rounded-lg border border-border bg-surface-secondary/30 text-xs text-muted-foreground">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                <p className="leading-relaxed">
                  Backups are generated completely in your browser as compressed archives containing manifest, workbooks, and sheets. They contain zero proprietary cloud lock-in and can be restored on any device running DC Excel.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={isGeneratingBackup}
                  onClick={handleCreateBackup}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>{isGeneratingBackup ? 'Creating Archive...' : 'Download Backup Archive (.omni)'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: RESTORE BACKUP */}
          {activeTab === 'restore' && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".omni,.zip"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFileSelected(f);
                }}
                className="hidden"
              />

              {!manifestPreview && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border hover:border-primary/50 hover:bg-surface-secondary/40 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2.5">
                    {isInspecting ? (
                      <RefreshCw className="w-6 h-6 animate-spin" />
                    ) : (
                      <Upload className="w-6 h-6" />
                    )}
                  </div>
                  <h4 className="text-xs font-semibold text-foreground">
                    {isInspecting ? 'Validating backup archive...' : 'Click to select a DC Excel backup file (.omni / .zip)'}
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Select a previously exported portable archive
                  </p>
                </div>
              )}

              {manifestPreview && (
                <div className="space-y-4">
                  {/* File summary */}
                  <div className="p-3.5 rounded-lg border border-border bg-surface-secondary/30 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-foreground">{selectedFile?.name}</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Format v{manifestPreview.version} • Created on {new Date(manifestPreview.createdAt).toLocaleDateString()} • {manifestPreview.workbookCount} workbook(s)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setManifestPreview(null);
                        setSelectedFile(null);
                      }}
                      className="text-xs text-primary hover:underline"
                    >
                      Change File
                    </button>
                  </div>

                  {/* List of workbooks in archive */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Workbooks in Archive:</label>
                    <div className="max-h-36 overflow-y-auto border border-border rounded-lg divide-y divide-border bg-surface">
                      {manifestPreview.workbooksSummary.map((wb) => (
                        <div key={wb.id} className="p-2.5 flex items-center justify-between text-xs">
                          <span className="font-medium text-foreground">{wb.name}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {wb.sheetCount} sheets • {wb.cellCount} cells
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Restore Mode */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Restore Destination Mode</label>
                    <div className="grid grid-cols-2 gap-3">
                      <label
                        className={`flex flex-col p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                          restoreMode === 'new'
                            ? 'border-primary bg-primary/10 text-foreground'
                            : 'border-border bg-surface text-muted-foreground hover:bg-surface-secondary'
                        }`}
                      >
                        <input
                          type="radio"
                          name="rmode"
                          checked={restoreMode === 'new'}
                          onChange={() => {
                            setRestoreMode('new');
                            setConfirmingReplace(false);
                          }}
                          className="sr-only"
                        />
                        <span className="font-semibold text-foreground">Restore as New</span>
                        <span className="text-[11px] text-muted-foreground mt-1">
                          Generates new IDs; safe from overwriting existing workbooks
                        </span>
                      </label>

                      <label
                        className={`flex flex-col p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                          restoreMode === 'replace'
                            ? 'border-primary bg-primary/10 text-foreground'
                            : 'border-border bg-surface text-muted-foreground hover:bg-surface-secondary'
                        }`}
                      >
                        <input
                          type="radio"
                          name="rmode"
                          checked={restoreMode === 'replace'}
                          onChange={() => setRestoreMode('replace')}
                          className="sr-only"
                        />
                        <span className="font-semibold text-foreground">Replace Existing</span>
                        <span className="text-[11px] text-muted-foreground mt-1">
                          Updates matched workbooks by original ID
                        </span>
                      </label>
                    </div>
                  </div>

                  {confirmingReplace && (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs space-y-1.5">
                      <div className="font-semibold flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Confirm Replace Mode</span>
                      </div>
                      <p className="leading-relaxed">
                        Replacing will overwrite existing workbooks with identical IDs. Are you sure you wish to proceed?
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      disabled={isRestoring}
                      onClick={handleExecuteRestore}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-xs"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{isRestoring ? 'Restoring...' : confirmingReplace ? 'Confirm & Replace Workbooks' : 'Restore Workbooks'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
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
