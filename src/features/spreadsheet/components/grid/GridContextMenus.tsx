import React from 'react';
import {
  Scissors,
  Copy,
  Clipboard,
  Trash2,
  Plus,
  ArrowUpAZ,
  ArrowDownAZ,
  Tag,
  Palette,
  Filter,
} from 'lucide-react';
import { CellCoordinates } from '@/types/cell';
import { colIndexToName } from '@/utils/coordinates';

export interface GridContextMenusProps {
  cellContextMenu: { x: number; y: number; row: number; col: number } | null;
  rowContextMenu: { x: number; y: number; row: number } | null;
  colContextMenu: { x: number; y: number; col: number } | null;
  onCloseCellMenu: () => void;
  onCloseRowMenu: () => void;
  onCloseColMenu: () => void;
  onCut?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onClearCell: (coord: CellCoordinates) => void;
  onInsertRow?: (row: number) => void;
  onDeleteRow?: (row: number) => void;
  onInsertColumn?: (col: number) => void;
  onDeleteColumn?: (col: number) => void;
  onQuickSort?: (direction: 'asc' | 'desc', col?: number) => void;
  onOpenColumnFilter?: (col: number) => void;
  onOpenDefineName?: () => void;
  onOpenFormatCells?: () => void;
}

export const GridContextMenus: React.FC<GridContextMenusProps> = ({
  cellContextMenu,
  rowContextMenu,
  colContextMenu,
  onCloseCellMenu,
  onCloseRowMenu,
  onCloseColMenu,
  onCut,
  onCopy,
  onPaste,
  onClearCell,
  onInsertRow,
  onDeleteRow,
  onInsertColumn,
  onDeleteColumn,
  onQuickSort,
  onOpenColumnFilter,
  onOpenDefineName,
  onOpenFormatCells,
}) => {
  return (
    <>
      {/* 1. Cell Context Menu */}
      {cellContextMenu && (
        <div
          role="menu"
          aria-label="Cell context menu"
          style={{ top: cellContextMenu.y, left: cellContextMenu.x }}
          className="fixed z-50 min-w-[200px] py-1 bg-surface-elevated border border-border rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-100 select-none text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onCut?.();
              onCloseCellMenu();
            }}
            className="w-full px-3 py-1.5 text-left text-foreground hover:bg-surface-secondary flex items-center justify-between cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2">
              <Scissors className="w-3.5 h-3.5 text-foreground-muted" />
              <span>Cut</span>
            </div>
            <kbd className="text-[10px] font-mono text-foreground-muted px-1 py-0.5 rounded bg-surface-secondary border border-border">Ctrl+X</kbd>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onCopy?.();
              onCloseCellMenu();
            }}
            className="w-full px-3 py-1.5 text-left text-foreground hover:bg-surface-secondary flex items-center justify-between cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2">
              <Copy className="w-3.5 h-3.5 text-foreground-muted" />
              <span>Copy</span>
            </div>
            <kbd className="text-[10px] font-mono text-foreground-muted px-1 py-0.5 rounded bg-surface-secondary border border-border">Ctrl+C</kbd>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onPaste?.();
              onCloseCellMenu();
            }}
            className="w-full px-3 py-1.5 text-left text-foreground hover:bg-surface-secondary flex items-center justify-between cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2">
              <Clipboard className="w-3.5 h-3.5 text-foreground-muted" />
              <span>Paste</span>
            </div>
            <kbd className="text-[10px] font-mono text-foreground-muted px-1 py-0.5 rounded bg-surface-secondary border border-border">Ctrl+V</kbd>
          </button>

          <div className="h-px bg-border my-1" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onClearCell({ row: cellContextMenu.row, col: cellContextMenu.col });
              onCloseCellMenu();
            }}
            className="w-full px-3 py-1.5 text-left text-foreground hover:bg-surface-secondary flex items-center justify-between cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2">
              <Trash2 className="w-3.5 h-3.5 text-foreground-muted" />
              <span>Clear Contents</span>
            </div>
            <kbd className="text-[10px] font-mono text-foreground-muted px-1 py-0.5 rounded bg-surface-secondary border border-border">Del</kbd>
          </button>

          <div className="h-px bg-border my-1" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onInsertRow?.(cellContextMenu.row);
              onCloseCellMenu();
            }}
            className="w-full px-3 py-1.5 text-left text-foreground hover:bg-surface-secondary flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-foreground-muted" />
            <span>Insert Row Above</span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onInsertColumn?.(cellContextMenu.col);
              onCloseCellMenu();
            }}
            className="w-full px-3 py-1.5 text-left text-foreground hover:bg-surface-secondary flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-foreground-muted" />
            <span>Insert Column Left</span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onDeleteRow?.(cellContextMenu.row);
              onCloseCellMenu();
            }}
            className="w-full px-3 py-1.5 text-left text-foreground hover:bg-surface-secondary flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 text-foreground-muted" />
            <span>Delete Row</span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onDeleteColumn?.(cellContextMenu.col);
              onCloseCellMenu();
            }}
            className="w-full px-3 py-1.5 text-left text-foreground hover:bg-surface-secondary flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 text-foreground-muted" />
            <span>Delete Column</span>
          </button>

          <div className="h-px bg-border my-1" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onQuickSort?.('asc', cellContextMenu.col);
              onCloseCellMenu();
            }}
            className="w-full px-3 py-1.5 text-left text-foreground hover:bg-surface-secondary flex items-center gap-2 cursor-pointer transition-colors"
          >
            <ArrowUpAZ className="w-3.5 h-3.5 text-foreground-muted" />
            <span>Sort Ascending</span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onQuickSort?.('desc', cellContextMenu.col);
              onCloseCellMenu();
            }}
            className="w-full px-3 py-1.5 text-left text-foreground hover:bg-surface-secondary flex items-center gap-2 cursor-pointer transition-colors"
          >
            <ArrowDownAZ className="w-3.5 h-3.5 text-foreground-muted" />
            <span>Sort Descending</span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onOpenColumnFilter?.(cellContextMenu.col);
              onCloseCellMenu();
            }}
            className="w-full px-3 py-1.5 text-left text-foreground hover:bg-surface-secondary flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Filter className="w-3.5 h-3.5 text-foreground-muted" />
            <span>Filter Column...</span>
          </button>

          <div className="h-px bg-border my-1" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onOpenDefineName?.();
              onCloseCellMenu();
            }}
            className="w-full px-3 py-1.5 text-left text-foreground hover:bg-surface-secondary flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Tag className="w-3.5 h-3.5 text-foreground-muted" />
            <span>Define Named Range...</span>
          </button>

          {onOpenFormatCells && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onOpenFormatCells();
                onCloseCellMenu();
              }}
              className="w-full px-3 py-1.5 text-left text-foreground hover:bg-surface-secondary flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Palette className="w-3.5 h-3.5 text-foreground-muted" />
              <span>Format Cells...</span>
            </button>
          )}
        </div>
      )}

      {/* 2. Row Header Context Menu */}
      {rowContextMenu && (
        <div
          role="menu"
          aria-label="Row header context menu"
          style={{ top: rowContextMenu.y, left: rowContextMenu.x }}
          className="fixed z-50 min-w-[190px] py-1 bg-surface-elevated border border-border rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-100 select-none text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1 font-semibold text-[10px] text-foreground-muted uppercase tracking-wider border-b border-border">
            Row {rowContextMenu.row + 1}
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onInsertRow?.(rowContextMenu.row);
              onCloseRowMenu();
            }}
            className="w-full px-3 py-1.5 text-left text-foreground hover:bg-surface-secondary flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-foreground-muted" />
            <span>Insert 1 Row Above</span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onDeleteRow?.(rowContextMenu.row);
              onCloseRowMenu();
            }}
            className="w-full px-3 py-1.5 text-left text-foreground hover:bg-surface-secondary flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 text-foreground-muted" />
            <span>Delete Row</span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onClearCell({ row: rowContextMenu.row, col: 0 });
              onCloseRowMenu();
            }}
            className="w-full px-3 py-1.5 text-left text-foreground hover:bg-surface-secondary flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 text-foreground-muted" />
            <span>Clear Contents</span>
          </button>
        </div>
      )}

      {/* 3. Column Header Context Menu */}
      {colContextMenu && (
        <div
          role="menu"
          aria-label="Column header context menu"
          style={{ top: colContextMenu.y, left: colContextMenu.x }}
          className="fixed z-50 min-w-[190px] py-1 bg-surface-elevated border border-border rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-100 select-none text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1 font-semibold text-[10px] text-foreground-muted uppercase tracking-wider border-b border-border">
            Column {colIndexToName(colContextMenu.col)}
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onInsertColumn?.(colContextMenu.col);
              onCloseColMenu();
            }}
            className="w-full px-3 py-1.5 text-left text-foreground hover:bg-surface-secondary flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-foreground-muted" />
            <span>Insert 1 Column Left</span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onDeleteColumn?.(colContextMenu.col);
              onCloseColMenu();
            }}
            className="w-full px-3 py-1.5 text-left text-foreground hover:bg-surface-secondary flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 text-foreground-muted" />
            <span>Delete Column</span>
          </button>

          <div className="h-px bg-border my-1" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onQuickSort?.('asc', colContextMenu.col);
              onCloseColMenu();
            }}
            className="w-full px-3 py-1.5 text-left text-foreground hover:bg-surface-secondary flex items-center gap-2 cursor-pointer transition-colors"
          >
            <ArrowUpAZ className="w-3.5 h-3.5 text-foreground-muted" />
            <span>Sort Ascending (A to Z)</span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onQuickSort?.('desc', colContextMenu.col);
              onCloseColMenu();
            }}
            className="w-full px-3 py-1.5 text-left text-foreground hover:bg-surface-secondary flex items-center gap-2 cursor-pointer transition-colors"
          >
            <ArrowDownAZ className="w-3.5 h-3.5 text-foreground-muted" />
            <span>Sort Descending (Z to A)</span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onOpenColumnFilter?.(colContextMenu.col);
              onCloseColMenu();
            }}
            className="w-full px-3 py-1.5 text-left text-foreground hover:bg-surface-secondary flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Filter className="w-3.5 h-3.5 text-foreground-muted" />
            <span>Filter Column...</span>
          </button>
        </div>
      )}
    </>
  );
};
