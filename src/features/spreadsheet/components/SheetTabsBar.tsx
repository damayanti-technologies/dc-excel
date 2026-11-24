import React, { useState, useRef, useEffect, KeyboardEvent, MouseEvent } from 'react';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Copy,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Palette,
  EyeOff,
  Eye
} from 'lucide-react';
import { Sheet } from '@/types/sheet';
import { cn } from '@/utils/cn';
import { AllSheetsMenu } from './AllSheetsMenu';
import { TabColorPickerPopover } from './TabColorPickerPopover';
import { validateSheetName } from '@/engine/worksheet';
import { toast } from '@/stores/toast-store';

interface SheetTabsBarProps {
  sheets: Sheet[];
  activeSheetId: string | null;
  onSelectSheet: (sheetId: string) => void;
  onAddSheet: (insertAfterSheetId?: string) => void;
  onRenameSheet: (sheetId: string, newName: string) => Promise<void>;
  onDuplicateSheet: (sheetId: string) => Promise<void>;
  onDeleteSheetRequest: (sheet: Sheet) => void;
  onMoveSheet: (sheetId: string, direction: 'left' | 'right') => Promise<void>;
  onReorderSheets: (reorderedIds: string[]) => Promise<void>;
  onSetTabColor: (sheetId: string, color: string | null) => Promise<void>;
  onHideSheet: (sheetId: string) => Promise<void>;
  onOpenUnhideDialog: () => void;
}

export const SheetTabsBar: React.FC<SheetTabsBarProps> = ({
  sheets,
  activeSheetId,
  onSelectSheet,
  onAddSheet,
  onRenameSheet,
  onDuplicateSheet,
  onDeleteSheetRequest,
  onMoveSheet,
  onReorderSheets,
  onSetTabColor,
  onHideSheet,
  onOpenUnhideDialog
}) => {
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  // Renaming state
  const [renamingSheetId, setRenamingSheetId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    sheet: Sheet;
    x: number;
    y: number;
  } | null>(null);

  // Tab Color Popover state
  const [colorPickerTarget, setColorPickerTarget] = useState<{
    sheetId: string;
    currentColor?: string;
    anchor: { x: number; y: number };
  } | null>(null);

  // Drag and drop state
  const [draggedSheetId, setDraggedSheetId] = useState<string | null>(null);
  const [dropTargetSheetId, setDropTargetSheetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after'>('before');

  const visibleSheets = sheets.filter((s) => !s.metadata?.isHidden);
  const hiddenSheets = sheets.filter((s) => s.metadata?.isHidden);

  // Auto-focus and select text when entering rename mode
  useEffect(() => {
    if (renamingSheetId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingSheetId]);

  // Close context menu on outside click or escape
  useEffect(() => {
    if (!contextMenu) return;

    const handleClose = () => setContextMenu(null);
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };

    window.addEventListener('click', handleClose);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleClose);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu]);

  // Horizontal scroll controls
  const handleScroll = (direction: 'left' | 'right') => {
    if (!tabsContainerRef.current) return;
    const delta = direction === 'left' ? -150 : 150;
    tabsContainerRef.current.scrollBy({ left: delta, behavior: 'smooth' });
  };

  // Start renaming
  const handleStartRename = (sheet: Sheet) => {
    setRenamingSheetId(sheet.id);
    setRenameValue(sheet.name);
    setContextMenu(null);
  };

  // Commit rename
  const handleCommitRename = async () => {
    if (!renamingSheetId) return;

    const targetSheet = sheets.find((s) => s.id === renamingSheetId);
    if (!targetSheet) {
      setRenamingSheetId(null);
      return;
    }

    if (renameValue.trim() === targetSheet.name) {
      setRenamingSheetId(null);
      return;
    }

    const validation = validateSheetName(renameValue, sheets, renamingSheetId);
    if (!validation.isValid) {
      toast.error('Invalid Name', validation.error || 'Invalid sheet name');
      // Re-focus input so user can correct it
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
      return;
    }

    try {
      await onRenameSheet(renamingSheetId, validation.sanitizedName);
      setRenamingSheetId(null);
    } catch (err) {
      toast.error('Rename Failed', err instanceof Error ? err.message : 'Could not rename sheet');
    }
  };

  // Cancel rename
  const handleCancelRename = () => {
    setRenamingSheetId(null);
  };

  // Right-click context menu
  const handleContextMenu = (e: MouseEvent, sheet: Sheet) => {
    e.preventDefault();
    e.stopPropagation();

    // Clamp inside viewport
    const menuWidth = 190;
    const menuHeight = 280;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 10);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 10);

    setContextMenu({ sheet, x, y });
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, sheetId: string) => {
    if (renamingSheetId) {
      e.preventDefault();
      return;
    }
    setDraggedSheetId(sheetId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', sheetId);
  };

  const handleDragOver = (e: React.DragEvent, targetSheetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (draggedSheetId === targetSheetId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    const pos = e.clientX < midX ? 'before' : 'after';

    setDropTargetSheetId(targetSheetId);
    setDropPosition(pos);
  };

  const handleDragLeave = () => {
    setDropTargetSheetId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetSheetId: string) => {
    e.preventDefault();
    if (!draggedSheetId || draggedSheetId === targetSheetId) {
      setDraggedSheetId(null);
      setDropTargetSheetId(null);
      return;
    }

    const currentOrder = visibleSheets.map((s) => s.id);
    const fromIdx = currentOrder.indexOf(draggedSheetId);
    let toIdx = currentOrder.indexOf(targetSheetId);

    if (fromIdx === -1 || toIdx === -1) return;

    if (dropPosition === 'after') {
      toIdx += 1;
    }
    if (fromIdx < toIdx) {
      toIdx -= 1;
    }

    const reorderedVisible = [...currentOrder];
    const [moved] = reorderedVisible.splice(fromIdx, 1);
    if (moved) {
      reorderedVisible.splice(toIdx, 0, moved);
    }

    // Preserve any hidden sheet IDs in the full workbook sheetIds array
    const fullOrder = sheets.map((s) => s.id);
    const updatedFullOrder = [...fullOrder].sort((a, b) => {
      const aVisIdx = reorderedVisible.indexOf(a);
      const bVisIdx = reorderedVisible.indexOf(b);
      if (aVisIdx !== -1 && bVisIdx !== -1) return aVisIdx - bVisIdx;
      return 0;
    });

    setDraggedSheetId(null);
    setDropTargetSheetId(null);

    await onReorderSheets(updatedFullOrder);
  };

  return (
    <div className="h-9 border-t border-border bg-surface-secondary px-2 flex items-center justify-between text-xs shrink-0 select-none">
      {/* Left: Navigation Controls & Tabs List */}
      <div className="flex items-center gap-0.5 overflow-hidden flex-1 mr-2">
        {/* Navigation scroll buttons (< >) */}
        <div className="flex items-center shrink-0 border-r border-border pr-1 mr-1 gap-0.5">
          <button
            type="button"
            onClick={() => handleScroll('left')}
            className="p-1 rounded hover:bg-surface text-foreground-muted hover:text-foreground transition-colors cursor-pointer"
            title="Scroll Tabs Left"
            aria-label="Scroll Tabs Left"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleScroll('right')}
            className="p-1 rounded hover:bg-surface text-foreground-muted hover:text-foreground transition-colors cursor-pointer"
            title="Scroll Tabs Right"
            aria-label="Scroll Tabs Right"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Quick jump menu showing all sheets */}
          <AllSheetsMenu
            sheets={sheets}
            activeSheetId={activeSheetId}
            onSelectSheet={onSelectSheet}
            onOpenUnhideDialog={onOpenUnhideDialog}
          />

          {/* Add Sheet (+) Button */}
          <button
            type="button"
            onClick={() => onAddSheet(activeSheetId || undefined)}
            className="p-1 rounded hover:bg-surface text-foreground-muted hover:text-foreground transition-colors cursor-pointer"
            title="New Worksheet (+)"
            aria-label="New Worksheet"
          >
            <Plus className="w-4 h-4 text-accent" />
          </button>
        </div>

        {/* Scrollable Tabs Container */}
        <div
          ref={tabsContainerRef}
          className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 flex-1"
        >
          {visibleSheets.map((sheet) => {
            const isActive = sheet.id === activeSheetId;
            const isRenaming = renamingSheetId === sheet.id;
            const isDropTarget = dropTargetSheetId === sheet.id;
            const tabColor = sheet.metadata?.tabColor;

            return (
              <div
                key={sheet.id}
                draggable={!isRenaming}
                onDragStart={(e) => handleDragStart(e, sheet.id)}
                onDragOver={(e) => handleDragOver(e, sheet.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => void handleDrop(e, sheet.id)}
                onContextMenu={(e) => handleContextMenu(e, sheet)}
                className={cn(
                  'relative group flex items-center shrink-0 cursor-pointer rounded-t-md transition-all',
                  isDropTarget && dropPosition === 'before' ? 'border-l-2 border-accent pl-1' : '',
                  isDropTarget && dropPosition === 'after' ? 'border-r-2 border-accent pr-1' : '',
                  isActive
                    ? 'bg-background text-foreground shadow-xs'
                    : 'bg-surface/50 text-foreground-muted hover:text-foreground hover:bg-surface'
                )}
                role="tab"
                aria-selected={isActive}
              >
                {/* Active indicator top bar */}
                {isActive && (
                  <span className="absolute top-0 left-0 right-0 h-0.5 bg-accent rounded-t" />
                )}

                {/* Tab content / rename input */}
                <div
                  onClick={() => !isRenaming && onSelectSheet(sheet.id)}
                  onDoubleClick={() => handleStartRename(sheet)}
                  className="px-3 py-1.5 text-xs font-medium flex items-center gap-1.5"
                >
                  {isRenaming ? (
                    <input
                      ref={renameInputRef}
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => void handleCommitRename()}
                      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === 'Enter') void handleCommitRename();
                        if (e.key === 'Escape') handleCancelRename();
                      }}
                      className="w-24 px-1 py-0 text-xs bg-surface border border-accent rounded font-medium text-foreground focus:outline-none"
                    />
                  ) : (
                    <span className="truncate max-w-[140px]">{sheet.name}</span>
                  )}
                </div>

                {/* Color Accent Line (Bottom of tab) */}
                {tabColor && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-[3.5px] rounded-b"
                    style={{ backgroundColor: tabColor }}
                    title={`Tab Color: ${tabColor}`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Sheet Count & Status */}
      <div className="flex items-center gap-3 text-foreground-muted text-[11px] shrink-0 border-l border-border pl-3">
        <span>
          {visibleSheets.length} {visibleSheets.length === 1 ? 'sheet' : 'sheets'}
          {hiddenSheets.length > 0 && ` (${hiddenSheets.length} hidden)`}
        </span>
        <span className="hidden md:inline border-l border-border pl-3 text-emerald-600 dark:text-emerald-400 font-medium">
          Ready
        </span>
      </div>

      {/* Context Menu Dropdown */}
      {contextMenu && (
        <div
          role="menu"
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className={cn(
            'fixed z-50 min-w-[190px] py-1 bg-surface-elevated border border-border rounded-xl shadow-xl',
            'animate-in fade-in zoom-in-95 duration-100 select-none'
          )}
        >
          <div className="px-3 py-1 border-b border-border text-[11px] font-semibold text-foreground-muted truncate">
            {contextMenu.sheet.name}
          </div>

          {/* Insert Sheet */}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onAddSheet(contextMenu.sheet.id);
              setContextMenu(null);
            }}
            className="w-full px-3 py-1.5 text-xs text-left text-foreground hover:bg-surface-secondary flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-foreground-muted" />
            <span>Insert Sheet</span>
          </button>

          {/* Rename */}
          <button
            type="button"
            role="menuitem"
            onClick={() => handleStartRename(contextMenu.sheet)}
            className="w-full px-3 py-1.5 text-xs text-left text-foreground hover:bg-surface-secondary flex items-center gap-2 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-foreground-muted" />
            <span>Rename</span>
          </button>

          {/* Duplicate */}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              void onDuplicateSheet(contextMenu.sheet.id);
              setContextMenu(null);
            }}
            className="w-full px-3 py-1.5 text-xs text-left text-foreground hover:bg-surface-secondary flex items-center gap-2 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-foreground-muted" />
            <span>Duplicate</span>
          </button>

          {/* Delete */}
          <button
            type="button"
            role="menuitem"
            disabled={visibleSheets.length <= 1}
            onClick={() => {
              onDeleteSheetRequest(contextMenu.sheet);
              setContextMenu(null);
            }}
            className={cn(
              'w-full px-3 py-1.5 text-xs text-left flex items-center gap-2 cursor-pointer',
              visibleSheets.length <= 1
                ? 'opacity-40 cursor-not-allowed text-foreground-muted'
                : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30'
            )}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>

          <div className="h-px bg-border my-1" />

          {/* Move Left */}
          <button
            type="button"
            role="menuitem"
            disabled={visibleSheets.findIndex((s) => s.id === contextMenu.sheet.id) <= 0}
            onClick={() => {
              void onMoveSheet(contextMenu.sheet.id, 'left');
              setContextMenu(null);
            }}
            className="w-full px-3 py-1.5 text-xs text-left text-foreground hover:bg-surface-secondary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-foreground-muted" />
            <span>Move Left</span>
          </button>

          {/* Move Right */}
          <button
            type="button"
            role="menuitem"
            disabled={
              visibleSheets.findIndex((s) => s.id === contextMenu.sheet.id) >=
              visibleSheets.length - 1
            }
            onClick={() => {
              void onMoveSheet(contextMenu.sheet.id, 'right');
              setContextMenu(null);
            }}
            className="w-full px-3 py-1.5 text-xs text-left text-foreground hover:bg-surface-secondary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ArrowRight className="w-3.5 h-3.5 text-foreground-muted" />
            <span>Move Right</span>
          </button>

          <div className="h-px bg-border my-1" />

          {/* Tab Color */}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setColorPickerTarget({
                sheetId: contextMenu.sheet.id,
                currentColor: contextMenu.sheet.metadata?.tabColor,
                anchor: { x: contextMenu.x, y: contextMenu.y }
              });
              setContextMenu(null);
            }}
            className="w-full px-3 py-1.5 text-xs text-left text-foreground hover:bg-surface-secondary flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Palette className="w-3.5 h-3.5 text-foreground-muted" />
              <span>Tab Color</span>
            </div>
            {contextMenu.sheet.metadata?.tabColor && (
              <span
                className="w-2.5 h-2.5 rounded-full border border-border"
                style={{ backgroundColor: contextMenu.sheet.metadata.tabColor }}
              />
            )}
          </button>

          <div className="h-px bg-border my-1" />

          {/* Hide Sheet */}
          <button
            type="button"
            role="menuitem"
            disabled={visibleSheets.length <= 1}
            onClick={() => {
              void onHideSheet(contextMenu.sheet.id);
              setContextMenu(null);
            }}
            className="w-full px-3 py-1.5 text-xs text-left text-foreground hover:bg-surface-secondary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <EyeOff className="w-3.5 h-3.5 text-foreground-muted" />
            <span>Hide Sheet</span>
          </button>

          {/* Unhide... */}
          <button
            type="button"
            role="menuitem"
            disabled={hiddenSheets.length === 0}
            onClick={() => {
              onOpenUnhideDialog();
              setContextMenu(null);
            }}
            className="w-full px-3 py-1.5 text-xs text-left text-foreground hover:bg-surface-secondary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-foreground-muted" />
            <span>Unhide... {hiddenSheets.length > 0 && `(${hiddenSheets.length})`}</span>
          </button>
        </div>
      )}

      {/* Tab Color Picker Popover */}
      {colorPickerTarget && (
        <TabColorPickerPopover
          isOpen={Boolean(colorPickerTarget)}
          onClose={() => setColorPickerTarget(null)}
          currentColor={colorPickerTarget.currentColor}
          anchorPosition={colorPickerTarget.anchor}
          onSelectColor={(color) => {
            void onSetTabColor(colorPickerTarget.sheetId, color);
            setColorPickerTarget(null);
          }}
        />
      )}
    </div>
  );
};
