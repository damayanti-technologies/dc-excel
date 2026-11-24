import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Filter } from 'lucide-react';
import { Sheet } from '@/types/sheet';
import { CellCoordinates, CellRange, CellBorder, CellBorders } from '@/types/cell';
import { GridVirtualizer } from '@/engine/grid/virtualizer';
import { colIndexToName, coordToKey } from '@/utils/coordinates';
import { isHeaderHighlighted, isSingleCell } from '@/engine/grid/selection';
import { handleGridKeyboardNavigation } from '@/engine/grid/keyboard';
import { DEFAULT_GRID_CONFIG } from '@/engine/grid/constants';
import { ResizeTarget } from '@/engine/grid/types';
import { isFormulaError } from '@/engine/calculation/errors';
import {
  isCellCoveredByMerge,
  getMergedRangeForCell,
  isMergeAnchor
} from '@/engine/formatting/merge-cells';
import { numberFormatter } from '@/engine/formatting/number-formatter';
import { getValidationRuleForCell, validateCellValue } from '@/engine/data-tools/validation';
import { useFormulaInputAssist } from '../hooks/useFormulaInputAssist';
import { FormulaAutocomplete } from './FormulaAutocomplete';
import { FormulaArgumentHelp } from './FormulaArgumentHelp';
import { CellValidationDropdown } from './CellValidationDropdown';
import { evaluateConditionalFormatting } from '@/engine/analysis/conditional-formatting';
import { NamedRange, PivotTableConfig } from '@/types/analysis';
import { ChartConfig, ChartPositionConfig } from '@/types/chart';
import { ChartOverlay } from './ChartOverlay';
import { cn } from '@/utils/cn';

function getBorderCss(borders?: CellBorders): React.CSSProperties {
  const css: React.CSSProperties = {};
  if (!borders) return css;

  const mapSide = (side?: CellBorder) => {
    if (!side || side.style === 'none') return undefined;
    const w = side.style === 'thin' ? '1px' : side.style === 'medium' ? '2px' : '3px';
    const s = side.style === 'dashed' ? 'dashed' : side.style === 'double' ? 'double' : 'solid';
    return `${w} ${s} ${side.color}`;
  };

  if (borders.top) css.borderTop = mapSide(borders.top);
  if (borders.bottom) css.borderBottom = mapSide(borders.bottom);
  if (borders.left) css.borderLeft = mapSide(borders.left);
  if (borders.right) css.borderRight = mapSide(borders.right);
  return css;
}

interface SpreadsheetGridProps {
  sheet: Sheet;
  activeCell: CellCoordinates | null;
  selectedRange: CellRange | null;
  anchorCell: CellCoordinates | null;
  zoom: number;
  editingCell: CellCoordinates | null;
  editingValue: string;
  isFormatPainterActive?: boolean;
  onApplyFormatPainter?: () => void;
  onSelectCell: (coord: CellCoordinates, isShift: boolean) => void;
  onDragSelect: (coord: CellCoordinates) => void;
  onSelectEntireRow: (row: number) => void;
  onSelectEntireColumn: (col: number) => void;
  onSelectAll: () => void;
  onResizeRow: (row: number, newHeight: number) => void;
  onResizeColumn: (col: number, newWidth: number) => void;
  onStartEditing: (coord: CellCoordinates, initialValue?: string) => void;
  onEditingChange: (value: string) => void;
  onCommitEditing: (moveTo?: 'down' | 'up' | 'right' | 'left' | 'none') => void;
  onCancelEditing: () => void;
  onClearCell: (coord: CellCoordinates) => void;
  onKeyDownNav?: (result: { nextActive: CellCoordinates; nextRange: CellRange }) => void;
  isAuditHighlighted?: boolean;
  onOpenColumnFilter?: (col: number) => void;
  onUpdateCellValue?: (row: number, col: number, value: string | number) => void;
  onToggleRowGroup?: (groupIndex: number) => void;
  // Chart integration (Stage 11)
  selectedChartId?: string | null;
  onSelectChart?: (chartId: string | null) => void;
  onEditChart?: (chart: ChartConfig) => void;
  onDeleteChart?: (chartId: string) => void;
  onDuplicateChart?: (chartId: string) => void;
  onBringForwardChart?: (chartId: string) => void;
  onSendBackwardChart?: (chartId: string) => void;
  onUpdateChartPosition?: (chartId: string, position: ChartPositionConfig) => void;
  onExportChart?: (chart: ChartConfig) => void;
  namedRangeResolver?: (name: string) => NamedRange | null;
  pivotTables?: PivotTableConfig[];
}

export const SpreadsheetGrid: React.FC<SpreadsheetGridProps> = ({
  sheet,
  activeCell,
  selectedRange,
  anchorCell,
  zoom,
  editingCell,
  editingValue,
  isFormatPainterActive = false,
  isAuditHighlighted = false,
  onApplyFormatPainter,
  onSelectCell,
  onDragSelect,
  onSelectEntireRow,
  onSelectEntireColumn,
  onSelectAll,
  onResizeRow,
  onResizeColumn,
  onStartEditing,
  onEditingChange,
  onCommitEditing,
  onCancelEditing,
  onClearCell,
  onOpenColumnFilter,
  onUpdateCellValue,
  onToggleRowGroup,
  selectedChartId,
  onSelectChart,
  onEditChart,
  onDeleteChart,
  onDuplicateChart,
  onBringForwardChart,
  onSendBackwardChart,
  onUpdateChartPosition,
  onExportChart,
  namedRangeResolver,
  pivotTables,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const cellInputRef = useRef<HTMLInputElement>(null);
  const [viewportWidth, setViewportWidth] = useState(1000);
  const [viewportHeight, setViewportHeight] = useState(600);
  const [scrollState, setScrollState] = useState({ top: 0, left: 0 });

  const [isMouseDown, setIsMouseDown] = useState(false);
  const [resizeState, setResizeState] = useState<ResizeTarget | null>(null);

  // Virtualizer instance
  const virtualizer = useMemo(() => {
    return new GridVirtualizer(
      sheet.rowCount,
      sheet.columnCount,
      sheet.rowHeights,
      sheet.columnWidths
    );
  }, [sheet.rowCount, sheet.columnCount, sheet.rowHeights, sheet.columnWidths]);

  // Focus editing input when edit mode starts
  useEffect(() => {
    if (editingCell && cellInputRef.current) {
      cellInputRef.current.focus();
      const len = cellInputRef.current.value.length;
      cellInputRef.current.setSelectionRange(len, len);
    }
  }, [editingCell]);

  // Measure container dimensions
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    if (typeof ResizeObserver === 'undefined') {
      setViewportWidth(el.clientWidth || 1000);
      setViewportHeight(el.clientHeight || 600);
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setViewportWidth(entry.contentRect.width);
        setViewportHeight(entry.contentRect.height);
      }
    });

    observer.observe(el);
    setViewportWidth(el.clientWidth || 1000);
    setViewportHeight(el.clientHeight || 600);

    return () => observer.disconnect();
  }, []);

  // Scroll listener (RAF throttled)
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setScrollState({ top: el.scrollTop, left: el.scrollLeft });
  }, []);

  // Compute 2D virtualized viewport
  const viewport = useMemo(() => {
    return virtualizer.computeVisibleRange(
      scrollState.top,
      scrollState.left,
      viewportWidth,
      viewportHeight,
      zoom
    );
  }, [virtualizer, scrollState.top, scrollState.left, viewportWidth, viewportHeight, zoom]);

  // Auto-scroll target cell into view
  const scrollToCell = useCallback((coord: CellCoordinates) => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const cornerW = Math.round(DEFAULT_GRID_CONFIG.rowHeaderWidth * zoom);
    const cornerH = Math.round(DEFAULT_GRID_CONFIG.colHeaderHeight * zoom);

    const cellRect = virtualizer.getCellRect(coord.row, coord.col, zoom);
    const visibleLeft = el.scrollLeft + cornerW;
    const visibleRight = el.scrollLeft + el.clientWidth;
    const visibleTop = el.scrollTop + cornerH;
    const visibleBottom = el.scrollTop + el.clientHeight;

    // Horizontal check
    if (cellRect.x < visibleLeft) {
      el.scrollLeft = cellRect.x - cornerW;
    } else if (cellRect.x + cellRect.width > visibleRight) {
      el.scrollLeft = cellRect.x + cellRect.width - el.clientWidth + 16;
    }

    // Vertical check
    if (cellRect.y < visibleTop) {
      el.scrollTop = cellRect.y - cornerH;
    } else if (cellRect.y + cellRect.height > visibleBottom) {
      el.scrollTop = cellRect.y + cellRect.height - el.clientHeight + 16;
    }
  }, [virtualizer, zoom]);

  // Ensure active cell scrolls into view
  useEffect(() => {
    if (activeCell) {
      scrollToCell(activeCell);
    }
  }, [activeCell, scrollToCell]);

  // Keyboard navigation & editing trigger handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!activeCell) return;

    // Do not intercept if editing cell is already open
    if (editingCell) return;

    // Check if target is an editable input outside the grid
    const targetTag = (e.target as HTMLElement).tagName.toLowerCase();
    if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select') {
      return;
    }

    const key = coordToKey(activeCell.row, activeCell.col);
    const cell = sheet.cells[key];
    const cellText = cell?.formula ?? (cell?.value !== null && cell?.value !== undefined ? String(cell.value) : '');

    // 1. F2: Enter edit mode preserving existing content
    if (e.key === 'F2') {
      e.preventDefault();
      onStartEditing(activeCell, cellText);
      return;
    }

    // 2. Delete / Backspace: Clear cell contents
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      onClearCell(activeCell);
      return;
    }

    // 3. Enter: Start editing or move down
    if (e.key === 'Enter') {
      e.preventDefault();
      onStartEditing(activeCell, cellText);
      return;
    }

    // 4. Printable characters (letters, numbers, '=', symbols): Enter edit mode replacing content
    if (
      e.key.length === 1 &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      e.key !== 'Escape' &&
      e.key !== 'Tab'
    ) {
      e.preventDefault();
      onStartEditing(activeCell, e.key);
      return;
    }

    // 5. Standard Grid Keyboard Navigation
    const currentAnchor = anchorCell || activeCell;
    const currentRange = selectedRange || {
      startRow: activeCell.row,
      startCol: activeCell.col,
      endRow: activeCell.row,
      endCol: activeCell.col
    };

    const navResult = handleGridKeyboardNavigation({
      key: e.key,
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey,
      altKey: e.altKey,
      activeCell,
      anchorCell: currentAnchor,
      selectedRange: currentRange,
      rowCount: sheet.rowCount,
      colCount: sheet.columnCount
    });

    if (navResult) {
      e.preventDefault();
      onSelectCell(navResult.nextActiveCell, e.shiftKey && e.key !== 'Tab' && e.key !== 'Enter');
      if (navResult.shouldScroll) {
        scrollToCell(navResult.nextActiveCell);
      }
    }
  };

  const {
    suggestions,
    selectedIndex,
    argumentHelpContext,
    acceptSuggestion,
    handleAssistKeyDown,
    updateCursorPosition
  } = useFormulaInputAssist({
    value: editingValue,
    onChange: onEditingChange,
    inputRef: cellInputRef
  });

  // Cell editor input key events
  const handleCellInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (handleAssistKeyDown(e)) {
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      onCommitEditing(e.shiftKey ? 'up' : 'down');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      onCommitEditing(e.shiftKey ? 'left' : 'right');
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancelEditing();
    } else if (e.key.startsWith('Arrow')) {
      // Allow natural cursor navigation inside the input text
      e.stopPropagation();
    }
  };

  const handleCellInputBlur = (e: React.FocusEvent) => {
    const related = e.relatedTarget as HTMLElement | null;
    if (
      related &&
      (related.getAttribute('aria-label') === 'Formula Bar' ||
        related.closest('[role="listbox"]') ||
        related.closest('[role="tooltip"]') ||
        related.closest('[role="dialog"]'))
    ) {
      return;
    }
    onCommitEditing('none');
  };

  // Mouse drag selection handling
  const handleCellMouseDown = (row: number, col: number, e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only primary button
    e.preventDefault();

    let targetRow = row;
    let targetCol = col;
    const merged = getMergedRangeForCell(sheet.mergedRanges, row, col);
    if (merged) {
      targetRow = merged.startRow;
      targetCol = merged.startCol;
    }

    if (isFormatPainterActive && onApplyFormatPainter) {
      onSelectCell({ row: targetRow, col: targetCol }, e.shiftKey);
      onApplyFormatPainter();
      return;
    }

    // If currently editing another cell, commit it first
    if (editingCell && (editingCell.row !== targetRow || editingCell.col !== targetCol)) {
      onCommitEditing('none');
    }

    onSelectCell({ row: targetRow, col: targetCol }, e.shiftKey);
    setIsMouseDown(true);
    scrollContainerRef.current?.focus();
  };

  // Double-click to start direct cell editing
  const handleCellDoubleClick = (row: number, col: number, e: React.MouseEvent) => {
    e.stopPropagation();
    let targetRow = row;
    let targetCol = col;
    const merged = getMergedRangeForCell(sheet.mergedRanges, row, col);
    if (merged) {
      targetRow = merged.startRow;
      targetCol = merged.startCol;
    }

    const key = coordToKey(targetRow, targetCol);
    const cell = sheet.cells[key];
    const initialText = cell?.formula ?? (cell?.value !== null && cell?.value !== undefined ? String(cell.value) : '');
    onStartEditing({ row: targetRow, col: targetCol }, initialText);
  };

  const handleCellMouseEnter = (row: number, col: number) => {
    if (isMouseDown && !editingCell) {
      onDragSelect({ row, col });
    }
  };

  // Global mouse up to end selection or resizing
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsMouseDown(false);
      if (resizeState) {
        if (resizeState.type === 'col') {
          onResizeColumn(resizeState.index, resizeState.currentSize);
        } else {
          onResizeRow(resizeState.index, resizeState.currentSize);
        }
        setResizeState(null);
      }
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!resizeState) return;
      if (resizeState.type === 'col') {
        const delta = (e.clientX - resizeState.startPos) / zoom;
        const newSize = Math.max(
          DEFAULT_GRID_CONFIG.minColWidth,
          Math.min(DEFAULT_GRID_CONFIG.maxColWidth, Math.round(resizeState.initialSize + delta))
        );
        setResizeState((prev) => (prev ? { ...prev, currentSize: newSize } : null));
      } else {
        const delta = (e.clientY - resizeState.startPos) / zoom;
        const newSize = Math.max(
          DEFAULT_GRID_CONFIG.minRowHeight,
          Math.min(DEFAULT_GRID_CONFIG.maxRowHeight, Math.round(resizeState.initialSize + delta))
        );
        setResizeState((prev) => (prev ? { ...prev, currentSize: newSize } : null));
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('mousemove', handleGlobalMouseMove);

    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [isMouseDown, resizeState, onResizeColumn, onResizeRow, zoom]);

  // Column resize handle start
  const handleColResizeStart = (col: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const currentW = sheet.columnWidths?.[col] ?? DEFAULT_GRID_CONFIG.defaultColWidth;
    setResizeState({
      type: 'col',
      index: col,
      startPos: e.clientX,
      initialSize: currentW,
      currentSize: currentW
    });
  };

  // Row resize handle start
  const handleRowResizeStart = (row: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const currentH = sheet.rowHeights?.[row] ?? DEFAULT_GRID_CONFIG.defaultRowHeight;
    setResizeState({
      type: 'row',
      index: row,
      startPos: e.clientY,
      initialSize: currentH,
      currentSize: currentH
    });
  };

  // Compute selection overlay bounding box
  const selectionBox = useMemo(() => {
    if (!selectedRange) return null;
    if (isSingleCell(selectedRange)) {
      const merged = getMergedRangeForCell(sheet.mergedRanges, selectedRange.startRow, selectedRange.startCol);
      if (merged) {
        return virtualizer.getRangeRect(merged, zoom);
      }
    }
    return virtualizer.getRangeRect(selectedRange, zoom);
  }, [virtualizer, selectedRange, zoom, sheet.mergedRanges]);

  const activeCellBox = useMemo(() => {
    if (!activeCell) return null;
    const merged = getMergedRangeForCell(sheet.mergedRanges, activeCell.row, activeCell.col);
    if (merged) {
      return virtualizer.getRangeRect(merged, zoom);
    }
    return virtualizer.getCellRect(activeCell.row, activeCell.col, zoom);
  }, [virtualizer, activeCell, zoom, sheet.mergedRanges]);

  const cornerW = Math.round(DEFAULT_GRID_CONFIG.rowHeaderWidth * zoom);
  const cornerH = Math.round(DEFAULT_GRID_CONFIG.colHeaderHeight * zoom);

  // Freeze panes and filter metadata
  const frozenRows = sheet.metadata?.freezePanes?.frozenRows || 0;
  const frozenCols = sheet.metadata?.freezePanes?.frozenCols || 0;
  // Conditional formatting evaluations
  const conditionalFormatMap = useMemo(() => {
    return evaluateConditionalFormatting(sheet.cells, sheet.metadata?.conditionalFormats || []);
  }, [sheet.cells, sheet.metadata?.conditionalFormats]);

  const hiddenRowsSet = useMemo(() => {
    const set = new Set(sheet.metadata?.hiddenRows || []);
    const groups = sheet.metadata?.rowGroups || [];
    for (const g of groups) {
      if (g.isCollapsed) {
        for (let r = g.startRow; r <= g.endRow; r++) {
          set.add(r);
        }
      }
    }
    return set;
  }, [sheet.metadata?.hiddenRows, sheet.metadata?.rowGroups]);
  const filterConfig = sheet.metadata?.filterConfig;

  // Generate visible rows and columns arrays (pinned frozen rows/cols prepended)
  const visibleRows = useMemo(() => {
    const rowSet = new Set<number>();
    for (let r = 0; r < frozenRows && r < sheet.rowCount; r++) {
      if (!hiddenRowsSet.has(r)) rowSet.add(r);
    }
    for (let r = viewport.startRow; r <= viewport.endRow; r++) {
      if (!hiddenRowsSet.has(r)) rowSet.add(r);
    }
    return Array.from(rowSet).sort((a, b) => a - b);
  }, [viewport.startRow, viewport.endRow, frozenRows, sheet.rowCount, hiddenRowsSet]);

  const visibleCols = useMemo(() => {
    const colSet = new Set<number>();
    for (let c = 0; c < frozenCols && c < sheet.columnCount; c++) {
      colSet.add(c);
    }
    for (let c = viewport.startCol; c <= viewport.endCol; c++) {
      colSet.add(c);
    }
    return Array.from(colSet).sort((a, b) => a - b);
  }, [viewport.startCol, viewport.endCol, frozenCols, sheet.columnCount]);

  return (
    <div
      ref={scrollContainerRef}
      tabIndex={0}
      onScroll={handleScroll}
      onKeyDown={handleKeyDown}
      role="grid"
      aria-label="Spreadsheet grid"
      aria-rowcount={sheet.rowCount}
      aria-colcount={sheet.columnCount}
      className="flex-1 w-full h-full overflow-auto bg-background outline-none relative select-none"
    >
      {/* 1. Top-Left Corner Header (Click to Select All) */}
      <div
        onClick={onSelectAll}
        style={{ width: cornerW, height: cornerH }}
        className="sticky top-0 left-0 z-30 bg-surface-secondary border-r border-b border-border flex items-center justify-center cursor-pointer hover:bg-surface-tertiary transition-colors"
        title="Select all cells (Ctrl+A)"
        role="button"
        tabIndex={-1}
      >
        <div className="w-2.5 h-2.5 border-r-2 border-b-2 border-foreground-muted/60 -translate-x-0.5 -translate-y-0.5" />
      </div>

      {/* 2. Sticky Column Headers Bar (Horizontally Virtualized) */}
      <div
        style={{
          height: cornerH,
          width: viewport.totalWidth + cornerW,
          position: 'sticky',
          top: 0,
          zIndex: 20
        }}
        className="bg-surface-secondary border-b border-border pointer-events-none"
      >
        {visibleCols.map((col) => {
          const isFrozen = col < frozenCols;
          const left = isFrozen
            ? cornerW + scrollState.left + virtualizer.getColOffset(col, zoom)
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
              style={{
                position: 'absolute',
                left,
                width,
                height: cornerH,
                lineHeight: `${cornerH}px`,
                zIndex: isFrozen ? 25 : 20
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
                onMouseDown={(e) => handleColResizeStart(col, e)}
                onClick={(e) => e.stopPropagation()}
                className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-accent/60 z-20"
                title="Drag to resize column"
              />
            </div>
          );
        })}
      </div>

      {/* 3. Sticky Row Headers Rail (Vertically Virtualized) */}
      <div
        style={{
          width: cornerW,
          height: viewport.totalHeight,
          position: 'sticky',
          left: 0,
          zIndex: 10
        }}
        className="bg-surface-secondary border-r border-border pointer-events-none"
      >
        {visibleRows.map((row) => {
          const isFrozen = row < frozenRows;
          const top = isFrozen
            ? scrollState.top + virtualizer.getRowOffset(row, zoom)
            : virtualizer.getRowOffset(row, zoom);
          const height = virtualizer.getRowHeight(row, zoom);
          const isHighlighted = isHeaderHighlighted(row, selectedRange, 'row');
          const isFreezeRowEdge = isFrozen && row === frozenRows - 1;

          return (
            <div
              key={`row-${row}`}
              onClick={() => onSelectEntireRow(row)}
              style={{
                position: 'absolute',
                top,
                width: cornerW,
                height,
                lineHeight: `${height}px`,
                zIndex: isFrozen ? 25 : 10
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
              {sheet.metadata?.rowGroups?.map((group, gIdx) => {
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
                onMouseDown={(e) => handleRowResizeStart(row, e)}
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-0 left-0 w-full h-2 cursor-row-resize hover:bg-accent/60 z-20"
                title="Drag to resize row"
              />
            </div>
          );
        })}
      </div>

      {/* 4. Virtualized Main Cell Grid Canvas */}
      <div
        style={{
          position: 'absolute',
          top: cornerH,
          left: cornerW,
          width: viewport.totalWidth,
          height: viewport.totalHeight
        }}
        className="relative"
      >
        {/* Render visible cells */}
        {visibleRows.map((row) =>
          visibleCols.map((col) => {
            if (isCellCoveredByMerge(sheet.mergedRanges, row, col)) {
              return null;
            }

            const key = coordToKey(row, col);
            const cell = sheet.cells[key];
            const isFrozenRow = row < frozenRows;
            const isFrozenCol = col < frozenCols;
            const left = isFrozenCol
              ? scrollState.left + virtualizer.getColOffset(col, zoom)
              : virtualizer.getColOffset(col, zoom);
            const top = isFrozenRow
              ? scrollState.top + virtualizer.getRowOffset(row, zoom)
              : virtualizer.getRowOffset(row, zoom);
            let width = virtualizer.getColWidth(col, zoom);
            let height = virtualizer.getRowHeight(row, zoom);

            const isFreezeRowEdge = isFrozenRow && row === frozenRows - 1;
            const isFreezeColEdge = isFrozenCol && col === frozenCols - 1;

            const validationRule = getValidationRuleForCell(sheet.metadata?.dataValidations, row, col);
            const hasDropdown = validationRule?.type === 'list' && validationRule.showDropdown;
            const isCellActive = activeCell?.row === row && activeCell?.col === col;

            let isInvalidAudit = false;
            if (isAuditHighlighted && cell && validationRule) {
              const check = validateCellValue(cell.value, validationRule);
              isInvalidAudit = !check.isValid;
            }

            const merged = getMergedRangeForCell(sheet.mergedRanges, row, col);
            let isAnchor = false;

            if (merged && isMergeAnchor(merged, row, col)) {
              isAnchor = true;
              let mw = 0;
              for (let c = merged.startCol; c <= merged.endCol; c++) {
                mw += virtualizer.getColWidth(c, zoom);
              }
              let mh = 0;
              for (let r = merged.startRow; r <= merged.endRow; r++) {
                mh += virtualizer.getRowHeight(r, zoom);
              }
              width = mw;
              height = mh;
            }

            const cellZIndex = isFrozenRow && isFrozenCol
              ? 18
              : isFrozenRow
              ? 15
              : isFrozenCol
              ? 14
              : isAnchor
              ? 10
              : 1;

            let cellContent = '';
            let isError = false;

            if (cell) {
              if (cell.dataType === 'error' || isFormulaError(cell.value)) {
                cellContent = String(cell.value);
                isError = true;
              } else if (cell.value !== null && cell.value !== undefined) {
                cellContent = numberFormatter.format(cell.value, cell?.style?.numberFormat);
              }
            }

            const cellStyle = cell?.style;
            const cf = conditionalFormatMap.get(key);
            const cfStyle = cf?.style;

            // Merge styles with conditional formatting precedence
            const finalBgColor =
              cf?.colorScaleColor ||
              cfStyle?.backgroundColor ||
              cellStyle?.backgroundColor ||
              undefined;
            const finalTextColor = cfStyle?.textColor || cellStyle?.textColor || undefined;
            const finalBold = cfStyle?.bold !== undefined ? cfStyle.bold : cellStyle?.bold;
            const finalItalic = cfStyle?.italic !== undefined ? cfStyle.italic : cellStyle?.italic;
            const finalUnderline = cfStyle?.underline !== undefined ? cfStyle.underline : cellStyle?.underline;
            const finalBorders = cfStyle?.borders
              ? { ...cellStyle?.borders, ...cfStyle.borders }
              : cellStyle?.borders;

            const hAlign =
              cellStyle?.horizontalAlignment ||
              (isError
                ? 'center'
                : cell?.dataType === 'number' || typeof cell?.value === 'number'
                ? 'right'
                : typeof cell?.value === 'boolean'
                ? 'center'
                : 'left');

            const vAlign = cellStyle?.verticalAlignment || 'middle';
            const isWrap = !!cellStyle?.wrapText;
            const borderCss = getBorderCss(finalBorders);
            const showText = !(cf?.dataBar?.showBarOnly || cf?.icon?.showIconOnly);

            return (
              <div
                key={key}
                onMouseDown={(e) => handleCellMouseDown(row, col, e)}
                onDoubleClick={(e) => handleCellDoubleClick(row, col, e)}
                onMouseEnter={() => handleCellMouseEnter(row, col)}
                style={{
                  position: 'absolute',
                  left,
                  top,
                  width,
                  height,
                  zIndex: cellZIndex,
                  fontFamily: cellStyle?.fontFamily || cellStyle?.font || undefined,
                  fontSize: cellStyle?.fontSize
                    ? `${Math.round(cellStyle.fontSize * zoom)}px`
                    : `${Math.round(12 * zoom)}px`,
                  fontWeight: finalBold ? 700 : undefined,
                  fontStyle: finalItalic ? 'italic' : undefined,
                  textDecoration: [
                    finalUnderline ? 'underline' : '',
                    cellStyle?.strikethrough ? 'line-through' : ''
                  ]
                    .filter(Boolean)
                    .join(' ') || undefined,
                  color: finalTextColor,
                  backgroundColor: finalBgColor,
                  textAlign: hAlign,
                  paddingLeft: cellStyle?.indentation
                    ? `${Math.round((cellStyle.indentation * 16 + 8) * zoom)}px`
                    : undefined,
                  whiteSpace: isWrap ? 'pre-wrap' : 'nowrap',
                  wordBreak: isWrap ? 'break-word' : undefined,
                  lineHeight: isWrap ? 'normal' : `${height - 2}px`,
                  display: isWrap || vAlign !== 'middle' ? 'flex' : undefined,
                  flexDirection: 'column',
                  justifyContent:
                    vAlign === 'top'
                      ? 'flex-start'
                      : vAlign === 'bottom'
                      ? 'flex-end'
                      : 'center',
                  alignItems:
                    hAlign === 'right'
                      ? 'flex-end'
                      : hAlign === 'center'
                      ? 'center'
                      : 'flex-start',
                  ...borderCss
                }}
                className={cn(
                  'border-r border-b border-border/60 px-2 overflow-hidden text-ellipsis text-foreground bg-background hover:bg-surface-secondary/40 transition-colors select-none relative',
                  isFormatPainterActive ? 'cursor-copy' : 'cursor-cell',
                  isFreezeRowEdge && 'border-b-2 border-b-primary/70',
                  isFreezeColEdge && 'border-r-2 border-r-primary/70',
                  isInvalidAudit && 'ring-2 ring-rose-500/80 rounded-xs bg-rose-500/10',
                  isError &&
                    'font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10'
                )}
                role="gridcell"
                aria-rowindex={row + 1}
                aria-colindex={col + 1}
              >
                {/* Data Bar rendering */}
                {cf?.dataBar && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 1,
                      bottom: 1,
                      width: `${cf.dataBar.widthPercent}%`,
                      backgroundColor: cf.dataBar.color,
                      opacity: 0.35,
                      left: cf.dataBar.isNegative ? undefined : 0,
                      right: cf.dataBar.isNegative ? 0 : undefined,
                      pointerEvents: 'none',
                      borderRadius: 2,
                      zIndex: 1,
                    }}
                  />
                )}

                {/* Content with optional Icon */}
                <div className="flex items-center w-full z-10 relative">
                  {cf?.icon && (
                    <span
                      className="inline-flex items-center shrink-0 mr-1.5"
                      title={cf.icon.label}
                    >
                      {cf.icon.iconSet.startsWith('arrows') ? (
                        cf.icon.iconIndex === 0 ? (
                          <span className="text-emerald-500 font-bold text-xs leading-none">▲</span>
                        ) : cf.icon.iconIndex === 1 ? (
                          <span className="text-amber-500 font-bold text-xs leading-none">▶</span>
                        ) : (
                          <span className="text-rose-500 font-bold text-xs leading-none">▼</span>
                        )
                      ) : cf.icon.iconSet.startsWith('traffic_lights') ? (
                        <span
                          className={`w-2.5 h-2.5 rounded-full inline-block ${
                            cf.icon.iconIndex === 0
                              ? 'bg-emerald-500'
                              : cf.icon.iconIndex === 1
                              ? 'bg-amber-400'
                              : 'bg-rose-500'
                          }`}
                        />
                      ) : cf.icon.iconSet.startsWith('ratings') ? (
                        <span className="text-amber-500 text-[11px] font-bold leading-none">
                          {'★'.repeat(Math.max(1, 3 - cf.icon.iconIndex))}
                        </span>
                      ) : cf.icon.iconSet.startsWith('flags') ? (
                        <span
                          className={`text-xs ${
                            cf.icon.iconIndex === 0
                              ? 'text-emerald-500'
                              : cf.icon.iconIndex === 1
                              ? 'text-amber-500'
                              : 'text-rose-500'
                          }`}
                        >
                          🚩
                        </span>
                      ) : (
                        <span
                          className={`w-2 h-2 rounded-xs inline-block ${
                            cf.icon.iconIndex === 0
                              ? 'bg-emerald-500'
                              : cf.icon.iconIndex === 1
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                        />
                      )}
                    </span>
                  )}
                  {showText && <span className="truncate flex-1">{cellContent}</span>}
                </div>

                {/* In-Cell Validation List Dropdown Trigger */}
                {hasDropdown && isCellActive && (
                  <CellValidationDropdown
                    listValues={validationRule?.listValues || []}
                    currentValue={
                      cell?.value == null
                        ? null
                        : typeof cell.value === 'string' || typeof cell.value === 'number'
                        ? cell.value
                        : String(cell.value)
                    }
                    onSelect={(val) => onUpdateCellValue?.(row, col, val)}
                  />
                )}
              </div>
            );
          })
        )}

        {/* 5. Direct In-Cell Editing Input Overlay with Autocomplete & Argument Help */}
        {editingCell && (
          <div
            style={{
              position: 'absolute',
              left: virtualizer.getColOffset(editingCell.col, zoom),
              top: virtualizer.getRowOffset(editingCell.row, zoom),
              zIndex: 35
            }}
            className="relative"
          >
            <input
              ref={cellInputRef}
              type="text"
              value={editingValue}
              onChange={(e) => onEditingChange(e.target.value)}
              onClick={updateCursorPosition}
              onKeyUp={updateCursorPosition}
              onKeyDown={handleCellInputKeyDown}
              onBlur={handleCellInputBlur}
              style={{
                width: Math.max(
                  (() => {
                    const m = getMergedRangeForCell(sheet.mergedRanges, editingCell.row, editingCell.col);
                    if (m && isMergeAnchor(m, editingCell.row, editingCell.col)) {
                      let mw = 0;
                      for (let c = m.startCol; c <= m.endCol; c++) mw += virtualizer.getColWidth(c, zoom);
                      return mw;
                    }
                    return virtualizer.getColWidth(editingCell.col, zoom);
                  })(),
                  140
                ),
                height: (() => {
                  const m = getMergedRangeForCell(sheet.mergedRanges, editingCell.row, editingCell.col);
                  if (m && isMergeAnchor(m, editingCell.row, editingCell.col)) {
                    let mh = 0;
                    for (let r = m.startRow; r <= m.endRow; r++) mh += virtualizer.getRowHeight(r, zoom);
                    return mh;
                  }
                  return virtualizer.getRowHeight(editingCell.row, zoom);
                })(),
                fontSize: `${Math.round(12 * zoom)}px`
              }}
              className="px-2 font-mono bg-background text-foreground border-2 border-accent ring-1 ring-accent outline-none shadow-md"
              aria-label="Direct Cell Editor"
            />

            {/* In-Cell Floating Autocomplete Suggestions */}
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 mt-1 z-50">
                <FormulaAutocomplete
                  suggestions={suggestions}
                  selectedIndex={selectedIndex}
                  onSelect={acceptSuggestion}
                />
              </div>
            )}

            {/* In-Cell Floating Argument Helper Tooltip */}
            {argumentHelpContext && (
              <div className="absolute top-full left-0 mt-1 z-50">
                <FormulaArgumentHelp context={argumentHelpContext} />
              </div>
            )}
          </div>
        )}

        {/* 6. Selection Box Bounding Overlay */}
        {selectionBox && !editingCell && (
          <div
            style={{
              position: 'absolute',
              left: selectionBox.x,
              top: selectionBox.y,
              width: selectionBox.width,
              height: selectionBox.height
            }}
            className="border-2 border-accent bg-accent/10 pointer-events-none z-5 transition-all duration-75"
          />
        )}

        {/* 7. Active Cell Outline Highlight (Distinct from range) */}
        {activeCellBox && !editingCell && !isSingleCell(selectedRange) && (
          <div
            style={{
              position: 'absolute',
              left: activeCellBox.x,
              top: activeCellBox.y,
              width: activeCellBox.width,
              height: activeCellBox.height
            }}
            className="ring-2 ring-accent ring-inset bg-white/10 pointer-events-none z-6"
          />
        )}

        {/* 8. Live Drag Resize Guide Line */}
        {resizeState && resizeState.type === 'col' && (
          <div
            style={{
              position: 'absolute',
              left: virtualizer.getColOffset(resizeState.index, zoom) + Math.round(resizeState.currentSize * zoom),
              top: 0,
              width: 2,
              height: viewport.totalHeight
            }}
            className="bg-accent shadow-xs z-30 pointer-events-none border-r border-dashed border-accent"
          />
        )}

        {resizeState && resizeState.type === 'row' && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: virtualizer.getRowOffset(resizeState.index, zoom) + Math.round(resizeState.currentSize * zoom),
              width: viewport.totalWidth,
              height: 2
            }}
            className="bg-accent shadow-xs z-30 pointer-events-none border-b border-dashed border-accent"
          />
        )}

        {/* 9. Floating Chart Object Layer (Stage 11) */}
        {sheet.metadata?.charts && sheet.metadata.charts.length > 0 && (
          <ChartOverlay
            sheet={sheet}
            zoom={zoom}
            selectedChartId={selectedChartId || null}
            onSelectChart={onSelectChart || (() => {})}
            onEditChart={onEditChart || (() => {})}
            onDeleteChart={onDeleteChart || (() => {})}
            onDuplicateChart={onDuplicateChart || (() => {})}
            onBringForward={onBringForwardChart || (() => {})}
            onSendBackward={onSendBackwardChart || (() => {})}
            onUpdatePosition={onUpdateChartPosition || (() => {})}
            onExportChart={onExportChart || (() => {})}
            namedRangeResolver={namedRangeResolver}
            pivotTables={pivotTables}
            getColOffset={(col, z) => virtualizer.getColOffset(col, z)}
            getRowOffset={(row, z) => virtualizer.getRowOffset(row, z)}
          />
        )}
      </div>
    </div>
  );
};
