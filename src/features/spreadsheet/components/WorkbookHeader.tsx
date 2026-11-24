import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  RotateCcw,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Edit2,
  Settings,
  Table2,
  Sun,
  Moon,
  Laptop,
  Upload,
  Download,
  History,
  FolderArchive,
  HardDrive,
  Save,
} from 'lucide-react';
import { Workbook } from '@/types/workbook';
import { PersistenceStatus } from '@/types/storage';
import { useUIPreferencesStore } from '@/stores/ui-preferences-store';
import { useHistoryStore } from '@/stores/history-store';
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown';
import { Tooltip } from '@/components/ui/Tooltip';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface WorkbookHeaderProps {
  workbook: Workbook | null;
  saveStatus: PersistenceStatus;
  lastSavedAt?: number | null;
  onRename: (newName: string) => Promise<void>;
  onManualSave?: () => void;
  onRetrySave?: () => void;
  onOpenImport?: () => void;
  onOpenExport?: () => void;
  onOpenVersionHistory?: () => void;
  onOpenBackupRestore?: () => void;
  onOpenStorageManagement?: () => void;
}

export const WorkbookHeader: React.FC<WorkbookHeaderProps> = ({
  workbook,
  saveStatus,
  lastSavedAt,
  onRename,
  onManualSave,
  onRetrySave,
  onOpenImport,
  onOpenExport,
  onOpenVersionHistory,
  onOpenBackupRestore,
  onOpenStorageManagement,
}) => {
  const theme = useUIPreferencesStore((state) => state.theme);
  const setTheme = useUIPreferencesStore((state) => state.setTheme);

  // Undo & Redo from History Store
  const canUndo = useHistoryStore((state) => state.canUndo);
  const canRedo = useHistoryStore((state) => state.canRedo);
  const undoDescription = useHistoryStore((state) => state.undoDescription);
  const redoDescription = useHistoryStore((state) => state.redoDescription);
  const undo = useHistoryStore((state) => state.undo);
  const redo = useHistoryStore((state) => state.redo);

  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  const handleOpenRename = () => {
    if (workbook) {
      setRenameValue(workbook.name);
      setIsRenameOpen(true);
    }
  };

  const handleRenameSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = renameValue.trim();
    if (!trimmed) return;

    try {
      setIsRenaming(true);
      await onRename(trimmed);
      setIsRenameOpen(false);
    } finally {
      setIsRenaming(false);
    }
  };

  const themeDropdownItems: (DropdownItem | 'divider')[] = [
    {
      id: 'theme-light',
      label: 'Light Theme',
      icon: <Sun className="w-4 h-4 text-amber-500" />,
      shortcut: theme === 'light' ? 'Active' : undefined,
      onClick: () => void setTheme('light')
    },
    {
      id: 'theme-dark',
      label: 'Dark Theme',
      icon: <Moon className="w-4 h-4 text-blue-400" />,
      shortcut: theme === 'dark' ? 'Active' : undefined,
      onClick: () => void setTheme('dark')
    },
    {
      id: 'theme-system',
      label: 'System Theme',
      icon: <Laptop className="w-4 h-4 text-foreground-muted" />,
      shortcut: theme === 'system' ? 'Active' : undefined,
      onClick: () => void setTheme('system')
    }
  ];

  const currentThemeIcon = {
    light: <Sun className="w-4 h-4 text-amber-500" />,
    dark: <Moon className="w-4 h-4 text-blue-400" />,
    system: <Laptop className="w-4 h-4" />
  }[theme] || <Laptop className="w-4 h-4" />;

  return (
    <>
      <header className="h-12 border-b border-border bg-surface-elevated px-3 sm:px-4 flex items-center justify-between transition-colors z-20 shrink-0 select-none">
        {/* Left: Home Navigation, Logo, Title & Rename */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <Link
            to="/"
            className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-secondary transition-colors"
            title="Return to Dashboard"
            aria-label="Return to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <Link to="/" className="flex items-center gap-2 text-foreground font-bold shrink-0">
            <div className="w-6 h-6 rounded-md bg-accent text-white flex items-center justify-center shadow-xs">
              <Table2 className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold tracking-tight text-sm hidden md:inline">OmniSheet</span>
          </Link>

          <div className="h-4 w-px bg-border mx-0.5 hidden sm:block" />

          {/* Workbook Name Display & Quick Rename Trigger */}
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={handleOpenRename}
              className="group flex items-center gap-1.5 text-xs sm:text-sm font-bold text-foreground hover:text-accent transition-colors truncate text-left px-1.5 py-1 rounded hover:bg-surface-secondary cursor-pointer"
              title="Click to rename workbook"
            >
              <span className="truncate max-w-[150px] sm:max-w-xs">
                {workbook?.name || 'Untitled Workbook'}
              </span>
              <Edit2 className="w-3 h-3 text-foreground-subtle opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          </div>
        </div>

        {/* Right: Save Status, Undo/Redo, Persistence Tools, Theme, Settings */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 text-xs">
          {/* Save Status Signal */}
          {saveStatus === 'saving' ? (
            <div className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
              <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
              <span className="hidden sm:inline">Saving...</span>
            </div>
          ) : saveStatus === 'dirty' ? (
            <button
              type="button"
              onClick={onManualSave}
              className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-colors cursor-pointer"
              title="Unsaved changes. Click to save now (Ctrl+S)"
            >
              <Save className="w-3 h-3 text-amber-500" />
              <span className="hidden sm:inline">Unsaved (Save)</span>
            </button>
          ) : saveStatus === 'error' ? (
            <button
              type="button"
              onClick={onRetrySave || onManualSave}
              className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
              title="Save failed. Click to retry."
            >
              <AlertCircle className="w-3 h-3 text-red-500" />
              <span className="hidden sm:inline">Save failed (Retry)</span>
            </button>
          ) : saveStatus === 'recovering' ? (
            <div className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400">
              <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
              <span className="hidden sm:inline">Recovering...</span>
            </div>
          ) : (
            <div
              className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
              title={lastSavedAt ? `Saved at ${new Date(lastSavedAt).toLocaleTimeString()}` : 'Saved locally to IndexedDB'}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Saved locally</span>
            </div>
          )}

          <div className="h-4 w-px bg-border hidden sm:block" />

          {/* Active Undo / Redo Buttons */}
          <div className="flex items-center gap-0.5 text-foreground-muted">
            <Tooltip content={canUndo ? `Undo: ${undoDescription || 'action'} (Ctrl+Z)` : 'Undo (Ctrl+Z)'}>
              <button
                type="button"
                onClick={() => void undo()}
                disabled={!canUndo}
                className={`p-1.5 rounded transition-colors ${
                  canUndo
                    ? 'hover:bg-surface-secondary text-foreground cursor-pointer active:scale-95'
                    : 'opacity-40 cursor-not-allowed hover:bg-transparent'
                }`}
                aria-label="Undo"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
            <Tooltip content={canRedo ? `Redo: ${redoDescription || 'action'} (Ctrl+Y)` : 'Redo (Ctrl+Y)'}>
              <button
                type="button"
                onClick={() => void redo()}
                disabled={!canRedo}
                className={`p-1.5 rounded transition-colors ${
                  canRedo
                    ? 'hover:bg-surface-secondary text-foreground cursor-pointer active:scale-95'
                    : 'opacity-40 cursor-not-allowed hover:bg-transparent'
                }`}
                aria-label="Redo"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          </div>

          <div className="h-4 w-px bg-border" />

          {/* Persistence & Version Tools */}
          <div className="flex items-center gap-1.5">
            {onOpenVersionHistory && (
              <button
                type="button"
                onClick={onOpenVersionHistory}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-border bg-surface text-foreground hover:bg-surface-secondary transition-colors"
                title="Workbook Version History"
              >
                <History className="w-3.5 h-3.5 text-accent" />
                <span className="hidden md:inline">History</span>
              </button>
            )}

            {onOpenBackupRestore && (
              <button
                type="button"
                onClick={onOpenBackupRestore}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-border bg-surface text-foreground hover:bg-surface-secondary transition-colors"
                title="Backup & Restore (.omni archive)"
              >
                <FolderArchive className="w-3.5 h-3.5 text-accent" />
                <span className="hidden lg:inline">Backup</span>
              </button>
            )}

            {onOpenStorageManagement && (
              <button
                type="button"
                onClick={onOpenStorageManagement}
                className="w-7 h-7 rounded-lg flex items-center justify-center border border-border text-foreground hover:bg-surface-secondary transition-colors"
                title="Storage & Diagnostics"
                aria-label="Storage & Diagnostics"
              >
                <HardDrive className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="h-4 w-px bg-border" />

          {/* Import & Export Quick Actions */}
          <div className="flex items-center gap-1.5">
            {onOpenImport && (
              <button
                type="button"
                onClick={onOpenImport}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-border bg-surface text-foreground hover:bg-surface-secondary transition-colors"
                title="Import Excel (.xlsx) or CSV"
              >
                <Upload className="w-3.5 h-3.5 text-primary" />
                <span className="hidden sm:inline">Import</span>
              </button>
            )}

            {onOpenExport && (
              <button
                type="button"
                onClick={onOpenExport}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-border bg-surface text-foreground hover:bg-surface-secondary transition-colors"
                title="Export as Excel (.xlsx), CSV, or TSV"
              >
                <Download className="w-3.5 h-3.5 text-primary" />
                <span className="hidden sm:inline">Export</span>
              </button>
            )}
          </div>

          <div className="h-4 w-px bg-border" />

          {/* Theme Dropdown */}
          <Dropdown
            align="right"
            trigger={
              <button
                type="button"
                aria-label="Toggle theme"
                className="w-7 h-7 rounded-lg flex items-center justify-center border border-border text-foreground hover:bg-surface-secondary transition-colors"
                title={`Theme: ${theme}`}
              >
                {currentThemeIcon}
              </button>
            }
            items={themeDropdownItems}
          />

          {/* Settings link */}
          <Link
            to="/settings"
            className="w-7 h-7 rounded-lg flex items-center justify-center border border-border text-foreground hover:bg-surface-secondary transition-colors"
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Rename Dialog Modal */}
      <Modal
        isOpen={isRenameOpen}
        onClose={() => setIsRenameOpen(false)}
        title="Rename Workbook"
        description="Enter a new title for this spreadsheet workbook."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsRenameOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="accent"
              size="sm"
              onClick={() => void handleRenameSubmit()}
              isLoading={isRenaming}
            >
              Save Name
            </Button>
          </>
        }
      >
        <form onSubmit={handleRenameSubmit} className="space-y-4 py-1">
          <Input
            label="Workbook Title"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="e.g. Annual Model 2026"
            autoFocus
            required
          />
        </form>
      </Modal>
    </>
  );
};
