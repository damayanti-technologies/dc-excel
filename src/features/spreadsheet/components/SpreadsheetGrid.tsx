import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
import { useFormulaInputAssist } from '../hooks/useFormulaInputAssist';
import { FormulaAutocomplete } from './FormulaAutocomplete';
import { FormulaArgumentHelp } from './FormulaArgumentHelp';
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
  onClearCell
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

  // Generate visible rows and columns arrays
  const visibleRows = useMemo(() => {
    const list: number[] = [];
    for (let r = viewport.startRow; r <= viewport.endRow; r++) {
      list.push(r);
    }
    return list;
  }, [viewport.startRow, viewport.endRow]);

  const visibleCols = useMemo(() => {
    const list: number[] = [];
    for (let c = viewport.startCol; c <= viewport.endCol; c++) {
      list.push(c);
    }
    return list;
  }, [viewport.startCol, viewport.endCol]);

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
          const left = virtualizer.getColOffset(col, zoom) + cornerW;
          const width = virtualizer.getColWidth(col, zoom);
          const isHighlighted = isHeaderHighlighted(col, selectedRange, 'col');

          return (
            <div
              key={`col-${col}`}
              onClick={() => onSelectEntireColumn(col)}
              style={{
                position: 'absolute',
                left,
                width,
                height: cornerH,
                lineHeight: `${cornerH}px`
              }}
              className={cn(
                'border-r border-border text-center font-semibold text-[11px] truncate px-1 transition-colors pointer-events-auto cursor-pointer group',
                isHighlighted
                  ? 'bg-accent/15 text-accent font-bold'
                  : 'bg-surface-secondary text-foreground-muted hover:bg-surface-tertiary hover:text-foreground'
              )}
              role="columnheader"
              aria-colindex={col + 1}
              title={`Column ${colIndexToName(col)}`}
            >
              <span className="truncate">{colIndexToName(col)}</span>

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
          const top = virtualizer.getRowOffset(row, zoom);
          const height = virtualizer.getRowHeight(row, zoom);
          const isHighlighted = isHeaderHighlighted(row, selectedRange, 'row');

          return (
            <div
              key={`row-${row}`}
              onClick={() => onSelectEntireRow(row)}
              style={{
                position: 'absolute',
                top,
                width: cornerW,
                height,
                lineHeight: `${height}px`
              }}
              className={cn(
                'border-b border-border text-center font-mono text-[10px] truncate px-1 transition-colors pointer-events-auto cursor-pointer group',
                isHighlighted
                  ? 'bg-accent/15 text-accent font-bold'
                  : 'bg-surface-secondary text-foreground-muted hover:bg-surface-tertiary hover:text-foreground'
              )}
              role="rowheader"
              aria-rowindex={row + 1}
              title={`Row ${row + 1}`}
            >
              <span>{row + 1}</span>

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
            const left = virtualizer.getColOffset(col, zoom);
            const top = virtualizer.getRowOffset(row, zoom);
            let width = virtualizer.getColWidth(col, zoom);
            let height = virtualizer.getRowHeight(row, zoom);

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
            const borderCss = getBorderCss(cellStyle?.borders);

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
                  zIndex: isAnchor ? 10 : 1,
                  fontFamily: cellStyle?.fontFamily || cellStyle?.font || undefined,
                  fontSize: cellStyle?.fontSize
                    ? `${Math.round(cellStyle.fontSize * zoom)}px`
                    : `${Math.round(12 * zoom)}px`,
                  fontWeight: cellStyle?.bold ? 700 : undefined,
                  fontStyle: cellStyle?.italic ? 'italic' : undefined,
                  textDecoration: [
                    cellStyle?.underline ? 'underline' : '',
                    cellStyle?.strikethrough ? 'line-through' : ''
                  ]
                    .filter(Boolean)
                    .join(' ') || undefined,
                  color: cellStyle?.textColor || undefined,
                  backgroundColor: cellStyle?.backgroundColor || undefined,
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
                  'border-r border-b border-border/60 px-2 overflow-hidden text-ellipsis text-foreground bg-background hover:bg-surface-secondary/40 transition-colors select-none',
                  isFormatPainterActive ? 'cursor-copy' : 'cursor-cell',
                  isError &&
                    'font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10'
                )}
                role="gridcell"
                aria-rowindex={row + 1}
                aria-colindex={col + 1}
              >
                {cellContent}
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
      </div>
    </div>
  );
};
