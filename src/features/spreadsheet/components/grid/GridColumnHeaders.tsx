import React from 'react';
import { Filter } from 'lucide-react';
import { CellRange } from '@/types/cell';
import { FilterConfig } from '@/types/data-tools';
import { GridVirtualizer } from '@/engine/grid/virtualizer';
import { colIndexToName } from '@/utils/coordinates';
import { isHeaderHighlighted } from '@/engine/grid/selection';
import { cn } from '@/utils/cn';

export interface GridColumnHeadersProps {
  cornerW: number;
  cornerH: number;
  totalWidth: number;
  visibleCols: number[];
  frozenCols: number;
  scrollLeft: number;
  zoom: number;
  selectedRange: CellRange | null;
  filterConfig?: FilterConfig;
  virtualizer: GridVirtualizer;
  onSelectAll: () => void;
  onSelectEntireColumn: (col: number) => void;
  onColContextMenu: (e: React.MouseEvent, col: number) => void;
  onOpenColumnFilter?: (col: number) => void;
  onColResizeStart: (col: number, e: React.MouseEvent) => void;
}

export const GridColumnHeaders: React.FC<GridColumnHeadersProps> = ({
  cornerW,
  cornerH,
  totalWidth,
  visibleCols,
  frozenCols,
  scrollLeft,
  zoom,
  selectedRange,
  filterConfig,
  virtualizer,
  onSelectAll,
  onSelectEntireColumn,
  onColContextMenu,
  onOpenColumnFilter,
  onColResizeStart,
}) => {
  return (
    <div
      style={{
        height: cornerH,
        width: totalWidth + cornerW,
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}
      className="bg-surface-secondary border-b border-border pointer-events-none"
    >
      {/* Top-Left Corner Header (Click to Select All) */}
      <div
        onClick={onSelectAll}
        style={{
          width: cornerW,
          height: cornerH,
          position: 'sticky',
          left: 0,
          zIndex: 30,
          pointerEvents: 'auto',
        }}
        className="bg-surface-secondary border-r border-border flex items-center justify-center cursor-pointer hover:bg-surface-tertiary transition-colors"
        title="Select all cells (Ctrl+A)"
        role="button"
        tabIndex={-1}
      >
        <div className="w-2.5 h-2.5 border-r-2 border-b-2 border-foreground-muted/60 -translate-x-0.5 -translate-y-0.5" />
      </div>

      {visibleCols.map((col) => {
        const isFrozen = col < frozenCols;
        const left = isFrozen
          ? cornerW + scrollLeft + virtualizer.getColOffset(col, zoom)
          : cornerW + virtualizer.getColOffset(col, zoom);
        const width = virtualizer.getColWidth(col, zoom);
        const isHighlighted = isHeaderHighlighted(col, selectedRange, 'col');
        const isFreezeColEdge = isFrozen && col === frozenCols - 1;

        const isFilterCol = Boolean(
          filterConfig &&
            col >= filterConfig.range.startCol &&
            col <= filterConfig.range.endCol
        );
        const hasFilterApplied = Boolean(filterConfig?.columnFilters?.[col]);

        return (
          <div
            key={`col-${col}`}
            onClick={() => onSelectEntireColumn(col)}
            onContextMenu={(e) => onColContextMenu(e, col)}
            style={{
              position: 'absolute',
              top: 0,
              left,
              width,
              height: cornerH,
              lineHeight: `${cornerH}px`,
              zIndex: isFrozen ? 25 : 20,
            }}
            className={cn(
              'border-r border-border text-center font-semibold text-[11px] truncate px-1 transition-colors pointer-events-auto cursor-pointer group flex items-center justify-between',
              isHighlighted
                ? 'bg-accent/15 text-accent font-bold'
                : 'bg-surface-secondary text-foreground-muted hover:bg-surface-tertiary hover:text-foreground',
              isFreezeColEdge && 'border-r-2 border-r-primary/70'
            )}
            role="columnheader"
            aria-colindex={col + 1}
            title={`Column ${colIndexToName(col)}`}
          >
            <span className="truncate flex-1">{colIndexToName(col)}</span>

            {/* Filter Trigger Button */}
            {isFilterCol && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenColumnFilter?.(col);
                }}
                className={cn(
                  'p-0.5 rounded transition-colors shrink-0 mr-1 cursor-pointer',
                  hasFilterApplied
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-surface'
                )}
                title={hasFilterApplied ? 'Active filter on this column' : 'Filter column'}
              >
                <Filter className="w-3 h-3" />
              </button>
            )}

            {/* Column Resize Handle */}
            <div
              onMouseDown={(e) => onColResizeStart(col, e)}
              onClick={(e) => e.stopPropagation()}
              className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-accent/60 z-20"
              title="Drag to resize column"
            />
          </div>
        );
      })}
    </div>
  );
};
