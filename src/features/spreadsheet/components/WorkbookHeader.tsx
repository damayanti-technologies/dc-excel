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
  Laptop
} from 'lucide-react';
import { Workbook } from '@/types/workbook';
import { PersistenceStatus } from '@/types/storage';
import { useUIPreferencesStore } from '@/stores/ui-preferences-store';
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown';
import { Tooltip } from '@/components/ui/Tooltip';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface WorkbookHeaderProps {
  workbook: Workbook | null;
  saveStatus: PersistenceStatus;
  onRename: (newName: string) => Promise<void>;
}

export const WorkbookHeader: React.FC<WorkbookHeaderProps> = ({
  workbook,
  saveStatus,
  onRename
}) => {
  const theme = useUIPreferencesStore((state) => state.theme);
  const setTheme = useUIPreferencesStore((state) => state.setTheme);

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

        {/* Right: Save Status, Undo/Redo visual buttons, Theme, Settings */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 text-xs">
          {/* Save Status Signal */}
          <div className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md bg-surface-secondary border border-border/70 text-foreground-muted">
            {saveStatus === 'saving' ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-accent" />
                <span className="hidden sm:inline">Saving...</span>
              </>
            ) : saveStatus === 'error' ? (
              <>
                <AlertCircle className="w-3 h-3 text-red-500" />
                <span className="text-red-500 hidden sm:inline">Save failed</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline">Saved locally</span>
              </>
            )}
          </div>

          <div className="h-4 w-px bg-border hidden sm:block" />

          {/* Visual Undo / Redo Placeholders */}
          <div className="flex items-center gap-0.5 text-foreground-muted">
            <Tooltip content="Undo (Coming in Stage 8)">
              <button
                type="button"
                disabled
                className="p-1.5 rounded opacity-40 cursor-not-allowed hover:bg-transparent"
                aria-label="Undo"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
            <Tooltip content="Redo (Coming in Stage 8)">
              <button
                type="button"
                disabled
                className="p-1.5 rounded opacity-40 cursor-not-allowed hover:bg-transparent"
                aria-label="Redo"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
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
