import React from 'react';
import {
  Copy,
  Scissors,
  Clipboard,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronDown
} from 'lucide-react';
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown';
import { Tooltip } from '@/components/ui/Tooltip';
import { ZOOM_LEVELS } from '@/engine/grid/constants';

interface SpreadsheetToolbarProps {
  rangeLabel: string;
  zoom: number;
  onZoomChange: (newZoom: number) => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onSelectAll: () => void;
  onInsertRowAbove: () => void;
  onInsertRowBelow: () => void;
  onDeleteRow: () => void;
  onInsertColBefore: () => void;
  onInsertColAfter: () => void;
  onDeleteCol: () => void;
}

export const SpreadsheetToolbar: React.FC<SpreadsheetToolbarProps> = ({
  rangeLabel,
  zoom,
  onZoomChange,
  onCopy,
  onCut,
  onPaste,
  onSelectAll,
  onInsertRowAbove,
  onInsertRowBelow,
  onDeleteRow,
  onInsertColBefore,
  onInsertColAfter,
  onDeleteCol
}) => {
  const insertRowItems: (DropdownItem | 'divider')[] = [
    {
      id: 'row-above',
      label: 'Insert Row Above',
      icon: <Plus className="w-3.5 h-3.5" />,
      onClick: onInsertRowAbove
    },
    {
      id: 'row-below',
      label: 'Insert Row Below',
      icon: <Plus className="w-3.5 h-3.5" />,
      onClick: onInsertRowBelow
    }
  ];

  const insertColItems: (DropdownItem | 'divider')[] = [
    {
      id: 'col-before',
      label: 'Insert Column Before',
      icon: <Plus className="w-3.5 h-3.5" />,
      onClick: onInsertColBefore
    },
    {
      id: 'col-after',
      label: 'Insert Column After',
      icon: <Plus className="w-3.5 h-3.5" />,
      onClick: onInsertColAfter
    }
  ];

  const zoomItems: (DropdownItem | 'divider')[] = ZOOM_LEVELS.map((z) => ({
    id: `zoom-${Math.round(z * 100)}`,
    label: `${Math.round(z * 100)}%`,
    shortcut: Math.abs(zoom - z) < 0.01 ? '✓' : undefined,
    onClick: () => onZoomChange(z)
  }));

  const handleZoomIn = () => {
    const next = ZOOM_LEVELS.find((z) => z > zoom + 0.01);
    if (next) onZoomChange(next);
  };

  const handleZoomOut = () => {
    const prev = [...ZOOM_LEVELS].reverse().find((z) => z < zoom - 0.01);
    if (prev) onZoomChange(prev);
  };

  return (
    <div className="h-10 bg-surface-secondary border-b border-border px-3 flex items-center justify-between gap-2 overflow-visible shrink-0 text-xs select-none">
      {/* Left: Range Indicator, Clipboard, Row/Col operations */}
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-max">
        {/* Active Selection Range Badge */}
        <div
          className="h-7 px-2.5 rounded-md bg-surface border border-border flex items-center justify-center font-mono font-semibold text-foreground text-xs shadow-2xs"
          title="Active selection reference"
        >
          {rangeLabel || 'A1'}
        </div>

        {/* Select All */}
        <Tooltip content="Select Entire Sheet (Ctrl+A)">
          <button
            type="button"
            onClick={onSelectAll}
            className="p-1.5 rounded hover:bg-surface text-foreground-secondary hover:text-foreground transition-colors"
            aria-label="Select all"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </Tooltip>

        <div className="h-4 w-px bg-border mx-0.5" />

        {/* Clipboard Actions */}
        <div className="flex items-center gap-0.5">
          <Tooltip content="Copy Range (Ctrl+C)">
            <button
              type="button"
              onClick={onCopy}
              className="p-1.5 rounded hover:bg-surface text-foreground-secondary hover:text-foreground transition-colors"
              aria-label="Copy"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </Tooltip>

          <Tooltip content="Cut Range (Ctrl+X)">
            <button
              type="button"
              onClick={onCut}
              className="p-1.5 rounded hover:bg-surface text-foreground-secondary hover:text-foreground transition-colors"
              aria-label="Cut"
            >
              <Scissors className="w-3.5 h-3.5" />
            </button>
          </Tooltip>

          <Tooltip content="Paste from Clipboard (Ctrl+V)">
            <button
              type="button"
              onClick={onPaste}
              className="p-1.5 rounded hover:bg-surface text-foreground-secondary hover:text-foreground transition-colors"
              aria-label="Paste"
            >
              <Clipboard className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
        </div>

        <div className="h-4 w-px bg-border mx-0.5" />

        {/* Row Operations */}
        <div className="flex items-center gap-1">
          <Dropdown
            align="left"
            trigger={
              <button
                type="button"
                className="flex items-center gap-1 px-2 py-1 rounded hover:bg-surface text-foreground-secondary hover:text-foreground transition-colors text-[11px] font-medium"
                title="Insert row"
              >
                <span>+ Row</span>
                <ChevronDown className="w-3 h-3 text-foreground-muted" />
              </button>
            }
            items={insertRowItems}
          />

          <Tooltip content="Delete Selected Row">
            <button
              type="button"
              onClick={onDeleteRow}
              className="flex items-center gap-1 px-2 py-1 rounded hover:bg-surface text-red-600 dark:text-red-400 transition-colors text-[11px] font-medium"
              aria-label="Delete row"
            >
              <Trash2 className="w-3 h-3" />
              <span className="hidden md:inline">Row</span>
            </button>
          </Tooltip>
        </div>

        <div className="h-4 w-px bg-border mx-0.5" />

        {/* Column Operations */}
        <div className="flex items-center gap-1">
          <Dropdown
            align="left"
            trigger={
              <button
                type="button"
                className="flex items-center gap-1 px-2 py-1 rounded hover:bg-surface text-foreground-secondary hover:text-foreground transition-colors text-[11px] font-medium"
                title="Insert column"
              >
                <span>+ Col</span>
                <ChevronDown className="w-3 h-3 text-foreground-muted" />
              </button>
            }
            items={insertColItems}
          />

          <Tooltip content="Delete Selected Column">
            <button
              type="button"
              onClick={onDeleteCol}
              className="flex items-center gap-1 px-2 py-1 rounded hover:bg-surface text-red-600 dark:text-red-400 transition-colors text-[11px] font-medium"
              aria-label="Delete column"
            >
              <Trash2 className="w-3 h-3" />
              <span className="hidden md:inline">Col</span>
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Right: Zoom controls */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={zoom <= ZOOM_LEVELS[0]!}
          className="p-1 rounded hover:bg-surface text-foreground-muted hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
          title="Zoom out"
          aria-label="Zoom out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <Dropdown
          align="right"
          trigger={
            <button
              type="button"
              className="h-7 px-2 rounded hover:bg-surface text-foreground font-mono text-[11px] font-medium transition-colors flex items-center gap-1"
              title="Select zoom level"
            >
              <span>{Math.round(zoom * 100)}%</span>
              <ChevronDown className="w-3 h-3 text-foreground-muted" />
            </button>
          }
          items={zoomItems}
        />

        <button
          type="button"
          onClick={handleZoomIn}
          disabled={zoom >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]!}
          className="p-1 rounded hover:bg-surface text-foreground-muted hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
          title="Zoom in"
          aria-label="Zoom in"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
