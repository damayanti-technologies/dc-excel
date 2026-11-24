import React, { useState, useRef, useEffect } from 'react';
import {
  Save,
  Undo2,
  Redo2,
  FilePlus,
  FolderOpen,
  Printer,
  Search,
  Scissors,
  Copy,
  Clipboard,
  Bold,
  Italic,
  ArrowUpAZ,
  Filter,
  ChevronDown,
  Check
} from 'lucide-react';
import { useUIPreferencesStore } from '@/stores/ui-preferences-store';
import { cn } from '@/utils/cn';

export interface QATAction {
  id: string;
  label: string;
  shortcut?: string;
  icon: React.ReactNode;
  onExecute: () => void;
}

interface QuickAccessToolbarProps {
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onNew: () => void;
  onOpenDashboard: () => void;
  onPrint: () => void;
  onFind: () => void;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onBold: () => void;
  onItalic: () => void;
  onSortAsc: () => void;
  onFilter: () => void;
  className?: string;
}

export const QuickAccessToolbar: React.FC<QuickAccessToolbarProps> = ({
  onSave,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onNew,
  onOpenDashboard,
  onPrint,
  onFind,
  onCut,
  onCopy,
  onPaste,
  onBold,
  onItalic,
  onSortAsc,
  onFilter,
  className
}) => {
  const preferences = useUIPreferencesStore((s) => s.preferences);
  const updatePreferences = useUIPreferencesStore((s) => s.updatePreferences);

  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsCustomizeOpen(false);
      }
    };
    if (isCustomizeOpen) {
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isCustomizeOpen]);

  // All available QAT actions registry
  const allActions: QATAction[] = [
    { id: 'save', label: 'Save', shortcut: 'Ctrl + S', icon: <Save className="w-3.5 h-3.5" />, onExecute: onSave },
    { id: 'undo', label: 'Undo', shortcut: 'Ctrl + Z', icon: <Undo2 className="w-3.5 h-3.5" />, onExecute: onUndo },
    { id: 'redo', label: 'Redo', shortcut: 'Ctrl + Y', icon: <Redo2 className="w-3.5 h-3.5" />, onExecute: onRedo },
    { id: 'print', label: 'Print', shortcut: 'Ctrl + P', icon: <Printer className="w-3.5 h-3.5" />, onExecute: onPrint },
    { id: 'find', label: 'Find', shortcut: 'Ctrl + F', icon: <Search className="w-3.5 h-3.5" />, onExecute: onFind },
    { id: 'new', label: 'New Workbook', icon: <FilePlus className="w-3.5 h-3.5" />, onExecute: onNew },
    { id: 'open', label: 'Open / Dashboard', icon: <FolderOpen className="w-3.5 h-3.5" />, onExecute: onOpenDashboard },
    { id: 'cut', label: 'Cut', shortcut: 'Ctrl + X', icon: <Scissors className="w-3.5 h-3.5" />, onExecute: onCut },
    { id: 'copy', label: 'Copy', shortcut: 'Ctrl + C', icon: <Copy className="w-3.5 h-3.5" />, onExecute: onCopy },
    { id: 'paste', label: 'Paste', shortcut: 'Ctrl + V', icon: <Clipboard className="w-3.5 h-3.5" />, onExecute: onPaste },
    { id: 'bold', label: 'Bold', shortcut: 'Ctrl + B', icon: <Bold className="w-3.5 h-3.5" />, onExecute: onBold },
    { id: 'italic', label: 'Italic', shortcut: 'Ctrl + I', icon: <Italic className="w-3.5 h-3.5" />, onExecute: onItalic },
    { id: 'sort_asc', label: 'Sort A-Z', icon: <ArrowUpAZ className="w-3.5 h-3.5" />, onExecute: onSortAsc },
    { id: 'filter', label: 'Filter', icon: <Filter className="w-3.5 h-3.5" />, onExecute: onFilter }
  ];

  const pinnedIds = preferences.applicationPreferences?.quickAccessToolbar || ['save', 'undo', 'redo', 'print', 'find'];

  const togglePinnedAction = (actionId: string) => {
    let nextPinned: string[];
    if (pinnedIds.includes(actionId)) {
      nextPinned = pinnedIds.filter((id) => id !== actionId);
    } else {
      nextPinned = [...pinnedIds, actionId];
    }
    void updatePreferences({
      applicationPreferences: {
        ...preferences.applicationPreferences,
        quickAccessToolbar: nextPinned
      }
    });
  };

  const handleResetDefaults = () => {
    void updatePreferences({
      applicationPreferences: {
        ...preferences.applicationPreferences,
        quickAccessToolbar: ['save', 'undo', 'redo', 'print', 'find']
      }
    });
  };

  return (
    <div
      role="toolbar"
      aria-label="Quick Access Toolbar"
      className={cn('flex items-center gap-0.5 px-1 py-0.5 rounded border border-border/40 bg-surface-secondary/40 select-none', className)}
    >
      {/* Pinned Action Buttons */}
      {pinnedIds.map((id) => {
        const action = allActions.find((a) => a.id === id);
        if (!action) return null;

        const isDisabled = (id === 'undo' && !canUndo) || (id === 'redo' && !canRedo);

        return (
          <button
            key={id}
            type="button"
            onClick={action.onExecute}
            disabled={isDisabled}
            title={`${action.label}${action.shortcut ? ` (${action.shortcut})` : ''}`}
            aria-label={action.label}
            className={cn(
              'p-1.5 rounded text-foreground-muted hover:text-foreground hover:bg-surface-secondary transition-colors cursor-pointer',
              isDisabled && 'opacity-30 cursor-not-allowed hover:bg-transparent hover:text-foreground-muted'
            )}
          >
            {action.icon}
          </button>
        );
      })}

      {/* Customize QAT Dropdown Menu */}
      <div ref={dropdownRef} className="relative inline-block">
        <button
          type="button"
          onClick={() => setIsCustomizeOpen(!isCustomizeOpen)}
          title="Customize Quick Access Toolbar"
          aria-label="Customize Quick Access Toolbar"
          aria-expanded={isCustomizeOpen}
          className="p-1 rounded text-foreground-muted hover:text-foreground hover:bg-surface-secondary transition-colors cursor-pointer"
        >
          <ChevronDown className="w-3 h-3" />
        </button>

        {isCustomizeOpen && (
          <div
            role="menu"
            className="absolute top-7 left-0 z-50 w-52 bg-surface-elevated border border-border rounded-xl shadow-xl py-1 text-xs select-none animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="px-3 py-1.5 font-semibold text-[11px] text-foreground-muted uppercase tracking-wider border-b border-border">
              Quick Access Toolbar
            </div>

            <div className="max-h-56 overflow-y-auto py-1">
              {allActions.map((action) => {
                const isPinned = pinnedIds.includes(action.id);
                return (
                  <button
                    key={action.id}
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={isPinned}
                    onClick={() => togglePinnedAction(action.id)}
                    className="w-full px-3 py-1.5 text-left flex items-center justify-between text-foreground hover:bg-surface-secondary transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-3.5 h-3.5 text-foreground-muted">{action.icon}</span>
                      <span className="truncate">{action.label}</span>
                    </div>
                    {isPinned && <Check className="w-3.5 h-3.5 text-accent shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="border-t border-border pt-1 mt-1 px-2">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="w-full py-1 text-center text-[11px] text-accent hover:underline cursor-pointer"
              >
                Reset to Defaults
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
