import React from 'react';
import { CellRange } from '@/types/cell';
import { RowGroup } from '@/types/analysis';
import { GridVirtualizer } from '@/engine/grid/virtualizer';
import { isHeaderHighlighted } from '@/engine/grid/selection';
import { cn } from '@/utils/cn';

export interface GridRowHeadersProps {
  cornerW: number;
  totalHeight: number;
  visibleRows: number[];
  frozenRows: number;
  scrollTop: number;
  zoom: number;
  selectedRange: CellRange | null;
  rowGroups?: RowGroup[];
  virtualizer: GridVirtualizer;
  onSelectEntireRow: (row: number) => void;
  onRowContextMenu: (e: React.MouseEvent, row: number) => void;
  onToggleRowGroup?: (groupIndex: number) => void;
  onRowResizeStart: (row: number, e: React.MouseEvent) => void;
}

export const GridRowHeaders: React.FC<GridRowHeadersProps> = ({
  cornerW,
  totalHeight,
  visibleRows,
  frozenRows,
  scrollTop,
  zoom,
  selectedRange,
  rowGroups,
  virtualizer,
  onSelectEntireRow,
  onRowContextMenu,
  onToggleRowGroup,
  onRowResizeStart,
}) => {
  return (
    <div
      style={{
        width: cornerW,
        height: totalHeight,
        position: 'sticky',
        left: 0,
        zIndex: 10,
      }}
      className="bg-surface-secondary border-r border-border pointer-events-none"
    >
      {visibleRows.map((row) => {
        const isFrozen = row < frozenRows;
        const top = isFrozen
          ? scrollTop + virtualizer.getRowOffset(row, zoom)
          : virtualizer.getRowOffset(row, zoom);
        const height = virtualizer.getRowHeight(row, zoom);
        const isHighlighted = isHeaderHighlighted(row, selectedRange, 'row');
        const isFreezeRowEdge = isFrozen && row === frozenRows - 1;

        return (
          <div
            key={`row-${row}`}
            onClick={() => onSelectEntireRow(row)}
            onContextMenu={(e) => onRowContextMenu(e, row)}
            style={{
              position: 'absolute',
              top,
              width: cornerW,
              height,
              lineHeight: `${height}px`,
              zIndex: isFrozen ? 25 : 10,
            }}
            className={cn(
              'border-b border-border text-center font-mono text-[10px] truncate px-1 transition-colors pointer-events-auto cursor-pointer group',
              isHighlighted
                ? 'bg-accent/15 text-accent font-bold'
                : 'bg-surface-secondary text-foreground-muted hover:bg-surface-tertiary hover:text-foreground',
              isFreezeRowEdge && 'border-b-2 border-b-primary/70'
            )}
            role="rowheader"
            aria-rowindex={row + 1}
            title={`Row ${row + 1}`}
          >
            <span>{row + 1}</span>

            {/* Row Group Outline Collapse / Expand Trigger */}
            {rowGroups?.map((group, gIdx) => {
              if (group.startRow !== row) return null;
              return (
                <button
                  key={`rg-${gIdx}`}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleRowGroup?.(gIdx);
                  }}
                  className="absolute left-1 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded bg-surface border border-border flex items-center justify-center text-[10px] font-bold text-foreground hover:bg-surface-secondary z-20 cursor-pointer shadow-xs leading-none"
                  title={group.isCollapsed ? 'Expand group' : 'Collapse group'}
                >
                  {group.isCollapsed ? '+' : '−'}
                </button>
              );
            })}

            {/* Row Resize Handle */}
            <div
              onMouseDown={(e) => onRowResizeStart(row, e)}
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-0 left-0 w-full h-2 cursor-row-resize hover:bg-accent/60 z-20"
              title="Drag to resize row"
            />
          </div>
        );
      })}
    </div>
  );
};
