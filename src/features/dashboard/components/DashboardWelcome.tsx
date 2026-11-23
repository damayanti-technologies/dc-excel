import React, { useState } from 'react';
import { Plus, Upload, Sparkles, Database, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useWorkspaceStore } from '@/stores/workspace-store';

export const DashboardWelcome: React.FC = () => {
  const openCreateWorkbook = useWorkspaceStore((state) => state.openCreateWorkbook);
  const [isOpenInfoModalOpen, setIsOpenInfoModalOpen] = useState(false);

  return (
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
              <span>IndexedDB v2</span>
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

        <div className="flex flex-wrap items-center gap-3 shrink-0">
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
            onClick={() => setIsOpenInfoModalOpen(true)}
          >
            Open Existing Workbook
          </Button>
        </div>
      </div>

      {/* Excel Import Information Modal (Stage 12 Placeholder) */}
      <Modal
        isOpen={isOpenInfoModalOpen}
        onClose={() => setIsOpenInfoModalOpen(false)}
        title="Open Existing Workbook File"
        description="Local XLSX and CSV import capabilities"
        footer={
          <Button variant="accent" size="sm" onClick={() => setIsOpenInfoModalOpen(false)}>
            Understood
          </Button>
        }
      >
        <div className="space-y-3 py-1">
          <p className="text-xs sm:text-sm text-foreground-secondary leading-relaxed">
            Direct parsing of local <strong>.xlsx</strong> and <strong>.csv</strong> files is scheduled for
            <strong> Stage 12: Import & Export</strong>.
          </p>
          <div className="p-3 rounded-lg bg-surface-secondary border border-border text-xs text-foreground-muted space-y-1.5">
            <div className="font-semibold text-foreground">Currently Available:</div>
            <div>• All workbooks created here are persistently stored locally in your browser’s IndexedDB.</div>
            <div>• You can create unlimited workbooks, organize them into folders, duplicate, and rename them right now.</div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
