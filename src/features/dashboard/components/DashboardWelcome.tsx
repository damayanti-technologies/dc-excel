import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Upload,
  Sparkles,
  Database,
  ShieldCheck,
  FolderArchive,
  HardDrive,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { ImportDialog } from '@/features/spreadsheet/components/ImportDialog';
import { BackupRestoreDialog } from '@/features/spreadsheet/components/BackupRestoreDialog';
import { StorageManagementDialog } from '@/features/spreadsheet/components/StorageManagementDialog';
import { recoveryService } from '@/services/recovery-service';
import { CrashRecoveryRecord } from '@/types/persistence';
import { toast } from '@/stores/toast-store';

export const DashboardWelcome: React.FC = () => {
  const navigate = useNavigate();
  const openCreateWorkbook = useWorkspaceStore((state) => state.openCreateWorkbook);
  const loadWorkspaceData = useWorkspaceStore((state) => state.loadWorkspaceData);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isBackupDialogOpen, setIsBackupDialogOpen] = useState(false);
  const [isStorageDialogOpen, setIsStorageDialogOpen] = useState(false);
  const [pendingRecoveries, setPendingRecoveries] = useState<CrashRecoveryRecord[]>([]);

  useEffect(() => {
    void (async () => {
      const list = await recoveryService.getAllPendingRecoveries();
      setPendingRecoveries(list);
    })();
  }, []);

  const handleImportSuccess = (result: any) => {
    toast.success(`Imported "${result.workbookName}" (${result.sheetCount} sheet${result.sheetCount === 1 ? '' : 's'})`);
    loadWorkspaceData();
    if (result.workbookId) {
      navigate(`/workbook/${result.workbookId}`);
    }
  };

  const primaryRecovery = pendingRecoveries[0];

  return (
    <div className="space-y-4">
      {/* Crash Recovery Notification Banner */}
      {primaryRecovery && (
        <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20 text-primary shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground text-sm">
                Unsaved Work Detected ({pendingRecoveries.length} workbook{pendingRecoveries.length > 1 ? 's' : ''})
              </h4>
              <p className="text-muted-foreground">
                OmniSheet preserved unsaved session data for &quot;{primaryRecovery.workbookName}&quot; before a crash or tab close.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="accent"
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            onClick={() => navigate(`/workbook/${primaryRecovery.workbookId}`)}
          >
            Review & Recover
          </Button>
        </div>
      )}

      <div className="relative overflow-hidden rounded-2xl border border-border bg-linear-to-b from-surface-elevated to-surface p-6 sm:p-8 shadow-xs">
        {/* Background ambient decoration */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-accent/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="accent" size="sm">
                <Sparkles className="w-3 h-3 text-accent" />
                <span>Local-First Workspace</span>
              </Badge>
              <Badge variant="neutral" size="sm">
                <Database className="w-3 h-3 text-foreground-muted" />
                <span>IndexedDB v3</span>
              </Badge>
              <Badge variant="success" size="sm">
                <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>Zero Cloud Dependency</span>
              </Badge>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Welcome to OmniSheet
            </h1>
            <p className="text-sm sm:text-base text-foreground-muted leading-relaxed">
              Your workspace for organizing, creating and managing spreadsheets. Fast, private, and
              saved directly in your browser.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              variant="accent"
              size="md"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => openCreateWorkbook()}
              className="shadow-sm"
            >
              Create New Workbook
            </Button>

            <Button
              variant="outline"
              size="md"
              leftIcon={<Upload className="w-4 h-4" />}
              onClick={() => setIsImportDialogOpen(true)}
            >
              Import File
            </Button>

            <Button
              variant="outline"
              size="md"
              leftIcon={<FolderArchive className="w-4 h-4" />}
              onClick={() => setIsBackupDialogOpen(true)}
              title="Backup & Restore (.omni archive)"
            >
              Backup & Restore
            </Button>

            <Button
              variant="outline"
              size="md"
              leftIcon={<HardDrive className="w-4 h-4" />}
              onClick={() => setIsStorageDialogOpen(true)}
              title="Storage Quota & Diagnostics"
            >
              Storage
            </Button>
          </div>
        </div>

        {/* Import Spreadsheet Modal */}
        <ImportDialog
          isOpen={isImportDialogOpen}
          onClose={() => setIsImportDialogOpen(false)}
          onImportSuccess={handleImportSuccess}
        />

        {/* Backup & Restore Modal */}
        <BackupRestoreDialog
          isOpen={isBackupDialogOpen}
          onClose={() => setIsBackupDialogOpen(false)}
          onRestoreSuccess={() => {
            loadWorkspaceData();
          }}
        />

        {/* Storage Management Modal */}
        <StorageManagementDialog
          isOpen={isStorageDialogOpen}
          onClose={() => setIsStorageDialogOpen(false)}
        />
      </div>
    </div>
  );
};
