import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Upload,
  FolderArchive,
  HardDrive,
  ShieldAlert,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { ImportDialog } from '@/features/spreadsheet/components/ImportDialog';
import { BackupRestoreDialog } from '@/features/spreadsheet/components/BackupRestoreDialog';
import { StorageManagementDialog } from '@/features/spreadsheet/components/StorageManagementDialog';
import { WelcomeTourModal } from '@/features/spreadsheet/components/WelcomeTourModal';
import { HelpShortcutsDialog } from '@/features/spreadsheet/components/HelpShortcutsDialog';
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
  const [isTourDialogOpen, setIsTourDialogOpen] = useState(false);
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
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
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-500 shrink-0">
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

      {/* Modern Studio Command Strip (Zero AI-fluff, 100% Pro Utility) */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-surface-elevated/70 backdrop-blur-md p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-accent bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                Local Engine
              </span>
              <span className="text-xs text-foreground-subtle">•</span>
              <span className="text-xs font-mono text-foreground-subtle">IndexedDB v3</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Welcome to OmniSheet
            </h1>
            <p className="text-xs sm:text-sm text-foreground-muted">
              Fast, private, and local-first. Spreadsheets stay safely in your browser with zero remote telemetry.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="accent"
              size="md"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => openCreateWorkbook()}
              className="font-semibold shadow-xs"
            >
              Create New Workbook
            </Button>

            <Button
              variant="secondary"
              size="md"
              leftIcon={<Upload className="w-4 h-4" />}
              onClick={() => setIsImportDialogOpen(true)}
            >
              Import File
            </Button>

            <Button
              variant="secondary"
              size="md"
              leftIcon={<FolderArchive className="w-4 h-4" />}
              onClick={() => setIsBackupDialogOpen(true)}
              title="Backup & Restore (.omni archive)"
            >
              Backup & Restore
            </Button>

            <Button
              variant="secondary"
              size="md"
              leftIcon={<HardDrive className="w-4 h-4" />}
              onClick={() => setIsStorageDialogOpen(true)}
              title="Storage Quota & Diagnostics"
            >
              Storage
            </Button>

            <Button
              variant="outline"
              size="md"
              leftIcon={<HelpCircle className="w-4 h-4" />}
              onClick={() => setIsHelpDialogOpen(true)}
              title="Help & Shortcuts (F1)"
            >
              Shortcuts
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

        {/* Welcome Tour Modal */}
        <WelcomeTourModal
          isOpen={isTourDialogOpen}
          onClose={() => setIsTourDialogOpen(false)}
          onNewWorkbook={() => openCreateWorkbook()}
          onImportFile={() => setIsImportDialogOpen(true)}
        />

        {/* Help & Shortcuts Modal */}
        <HelpShortcutsDialog
          isOpen={isHelpDialogOpen}
          onClose={() => setIsHelpDialogOpen(false)}
        />
      </div>
    </div>
  );
};
