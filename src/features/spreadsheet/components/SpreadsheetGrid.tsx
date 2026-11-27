import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Sheet } from '@/types/sheet';
import { CellCoordinates, CellRange, CellBorder, CellBorders } from '@/types/cell';
import { GridVirtualizer } from '@/engine/grid/virtualizer';
import { coordToKey, isCoordInRange } from '@/utils/coordinates';
import { isSingleCell } from '@/engine/grid/selection';
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
import { CellValidationDropdown } from './CellValidationDropdown';
import { evaluateConditionalFormatting } from '@/engine/analysis/conditional-formatting';
import { NamedRange, PivotTableConfig } from '@/types/analysis';
import { ChartConfig, ChartPositionConfig } from '@/types/chart';
import { ChartOverlay } from './ChartOverlay';
import { GridColumnHeaders } from './grid/GridColumnHeaders';
import { GridRowHeaders } from './grid/GridRowHeaders';
import { GridCellEditor } from './grid/GridCellEditor';
import { GridContextMenus } from './grid/GridContextMenus';
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
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void;
  onInsertRow?: (row: number) => void;
  onDeleteRow?: (row: number) => void;
  onInsertColumn?: (col: number) => void;
  onDeleteColumn?: (col: number) => void;
  onOpenFormatCells?: () => void;
  onOpenDefineName?: () => void;
  onQuickSort?: (direction: 'asc' | 'desc', col?: number) => void;
  onExpandGrid?: (targetRowCount: number, targetColCount: number) => void;
  onZoomChange?: (newZoom: number) => void;
  showGridlines?: boolean;
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
  onCopy,
  onCut,
  onPaste,
  onInsertRow,
  onDeleteRow,
  onInsertColumn,
  onDeleteColumn,
  onOpenFormatCells,
  onOpenDefineName,
  onQuickSort,
  onExpandGrid,
  onZoomChange,
  showGridlines = true,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const cellInputRef = useRef<HTMLInputElement>(null);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const [viewportWidth, setViewportWidth] = useState(1000);
  const [viewportHeight, setViewportHeight] = useState(600);
  const [scrollState, setScrollState] = useState({ top: 0, left: 0 });

  const [isMouseDown, setIsMouseDown] = useState(false);
  const [resizeState, setResizeState] = useState<ResizeTarget | null>(null);

  // Right-click context menu states
  const [cellContextMenu, setCellContextMenu] = useState<{
    row: number;
    col: number;
    x: number;
    y: number;
  } | null>(null);

  const [rowContextMenu, setRowContextMenu] = useState<{
    row: number;
    x: number;
    y: number;
  } | null>(null);

  const [colContextMenu, setColContextMenu] = useState<{
    col: number;
    x: number;
    y: number;
  } | null>(null);

  // Close context menus on click or Escape
  useEffect(() => {
    if (!cellContextMenu && !rowContextMenu && !colContextMenu) return;
    const handleClose = () => {
      setCellContextMenu(null);
      setRowContextMenu(null);
      setColContextMenu(null);
    };
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('click', handleClose);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleClose);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [cellContextMenu, rowContextMenu, colContextMenu]);

  const handleCellContextMenu = (e: React.MouseEvent, row: number, col: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedRange || !isCoordInRange({ row, col }, selectedRange)) {
      onSelectCell({ row, col }, false);
    }
    const x = Math.min(e.clientX, window.innerWidth - 210);
    const y = Math.min(e.clientY, window.innerHeight - 380);
    setRowContextMenu(null);
    setColContextMenu(null);
    setCellContextMenu({ row, col, x, y });
  };

  const handleRowContextMenu = (e: React.MouseEvent, row: number) => {
    e.preventDefault();
    e.stopPropagation();
    onSelectEntireRow(row);
    const x = Math.min(e.clientX, window.innerWidth - 210);
    const y = Math.min(e.clientY, window.innerHeight - 300);
    setCellContextMenu(null);
    setColContextMenu(null);
    setRowContextMenu({ row, x, y });
  };

  const handleColContextMenu = (e: React.MouseEvent, col: number) => {
    e.preventDefault();
    e.stopPropagation();
    onSelectEntireColumn(col);
    const x = Math.min(e.clientX, window.innerWidth - 210);
    const y = Math.min(e.clientY, window.innerHeight - 320);
    setCellContextMenu(null);
    setRowContextMenu(null);
    setColContextMenu({ col, x, y });
  };

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

  // Touchpad pinch-to-zoom (Wheel with ctrlKey/metaKey) & touch pinch gesture
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || !onZoomChange) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY;
        const step = delta * 0.003;
        const currentZoom = zoomRef.current;
        const targetZoom = Math.min(3.0, Math.max(0.25, Math.round((currentZoom + step) * 100) / 100));
        if (targetZoom !== currentZoom) {
          onZoomChange(targetZoom);
        }
      }
    };

    let initialDist = 0;
    let initialPinchZoom = 1;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        if (touch1 && touch2) {
          initialDist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
          initialPinchZoom = zoomRef.current;
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialDist > 0) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        if (touch1 && touch2) {
          const currentDist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
          const scale = currentDist / initialDist;
          const targetZoom = Math.min(3.0, Math.max(0.25, Math.round(initialPinchZoom * scale * 100) / 100));
          if (targetZoom !== zoomRef.current) {
            onZoomChange(targetZoom);
          }
        }
      }
    };

    const handleTouchEnd = () => {
      initialDist = 0;
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onZoomChange]);

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

  // Scroll listener (RAF throttled) with infinite scroll expansion
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setScrollState({ top: el.scrollTop, left: el.scrollLeft });

    const maxScrollY = el.scrollHeight - el.clientHeight;
    const maxScrollX = el.scrollWidth - el.clientWidth;

    let targetRows = sheet.rowCount;
    let targetCols = sheet.columnCount;

    if (maxScrollY - el.scrollTop < 600 && sheet.rowCount < 1048576) {
      targetRows = Math.min(1048576, sheet.rowCount + 5000);
    }
    if (maxScrollX - el.scrollLeft < 400 && sheet.columnCount < 16384) {
      targetCols = Math.min(16384, sheet.columnCount + 50);
    }

    if (targetRows !== sheet.rowCount || targetCols !== sheet.columnCount) {
      onExpandGrid?.(targetRows, targetCols);
    }
  }, [sheet.rowCount, sheet.columnCount, onExpandGrid]);

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

    const baseHeaderW = Math.max(
      DEFAULT_GRID_CONFIG.rowHeaderWidth,
      Math.ceil(Math.log10(Math.max(10, sheet.rowCount + 1))) * 8 + 18
    );
    const cornerW = Math.round(baseHeaderW * zoom);
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
  }, [virtualizer, zoom, sheet.rowCount]);

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
      colCount: sheet.columnCount,
      cells: sheet.cells
    });

    if (navResult) {
      e.preventDefault();
      onSelectCell(navResult.nextActiveCell, e.shiftKey && e.key !== 'Tab' && e.key !== 'Enter');
      if (navResult.shouldScroll) {
        scrollToCell(navResult.nextActiveCell);
      }

      // Check if navigation reached near the edge and trigger auto-expansion
      let expandRows = sheet.rowCount;
      let expandCols = sheet.columnCount;
      if (navResult.nextActiveCell.row >= sheet.rowCount - 5 && sheet.rowCount < 1048576) {
        expandRows = Math.min(1048576, sheet.rowCount + 5000);
      }
      if (navResult.nextActiveCell.col >= sheet.columnCount - 3 && sheet.columnCount < 16384) {
        expandCols = Math.min(16384, sheet.columnCount + 50);
      }
      if (expandRows !== sheet.rowCount || expandCols !== sheet.columnCount) {
        onExpandGrid?.(expandRows, expandCols);
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

  const baseHeaderW = Math.max(
    DEFAULT_GRID_CONFIG.rowHeaderWidth,
    Math.ceil(Math.log10(Math.max(10, sheet.rowCount + 1))) * 8 + 18
  );
  const cornerW = Math.round(baseHeaderW * zoom);
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
      {/* 1 & 2: Sticky Column Headers Bar with Corner Header (Horizontally Virtualized) */}
      <GridColumnHeaders
        cornerW={cornerW}
        cornerH={cornerH}
        totalWidth={viewport.totalWidth}
        visibleCols={visibleCols}
        frozenCols={frozenCols}
        scrollLeft={scrollState.left}
        zoom={zoom}
        selectedRange={selectedRange}
        filterConfig={filterConfig}
        virtualizer={virtualizer}
        onSelectAll={onSelectAll}
        onSelectEntireColumn={onSelectEntireColumn}
        onColContextMenu={handleColContextMenu}
        onOpenColumnFilter={onOpenColumnFilter}
        onColResizeStart={handleColResizeStart}
      />

      {/* 3. Sticky Row Headers Rail (Vertically Virtualized) */}
      <GridRowHeaders
        cornerW={cornerW}
        totalHeight={viewport.totalHeight}
        visibleRows={visibleRows}
        frozenRows={frozenRows}
        scrollTop={scrollState.top}
        zoom={zoom}
        selectedRange={selectedRange}
        rowGroups={sheet.metadata?.rowGroups}
        virtualizer={virtualizer}
        onSelectEntireRow={onSelectEntireRow}
        onRowContextMenu={handleRowContextMenu}
        onToggleRowGroup={onToggleRowGroup}
        onRowResizeStart={handleRowResizeStart}
      />

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
                onContextMenu={(e) => handleCellContextMenu(e, row, col)}
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
                  showGridlines ? 'border-r border-b border-border/60' : 'border-r-transparent border-b-transparent',
                  'px-2 overflow-hidden text-ellipsis text-foreground bg-background hover:bg-surface-secondary/40 transition-colors select-none relative',
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
          <GridCellEditor
            editingCell={editingCell}
            editingValue={editingValue}
            zoom={zoom}
            mergedRanges={sheet.mergedRanges}
            virtualizer={virtualizer}
            cellInputRef={cellInputRef}
            cellStyle={sheet.cells[coordToKey(editingCell.row, editingCell.col)]?.style}
            onEditingChange={onEditingChange}
            updateCursorPosition={updateCursorPosition}
            handleCellInputKeyDown={handleCellInputKeyDown}
            handleCellInputBlur={handleCellInputBlur}
            suggestions={suggestions}
            selectedIndex={selectedIndex}
            acceptSuggestion={acceptSuggestion}
            argumentHelpContext={argumentHelpContext}
          />
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

      {/* 10. Context Menus Layer */}
      <GridContextMenus
        cellContextMenu={cellContextMenu}
        rowContextMenu={rowContextMenu}
        colContextMenu={colContextMenu}
        onCloseCellMenu={() => setCellContextMenu(null)}
        onCloseRowMenu={() => setRowContextMenu(null)}
        onCloseColMenu={() => setColContextMenu(null)}
        onCut={onCut}
        onCopy={onCopy}
        onPaste={onPaste}
        onClearCell={onClearCell}
        onInsertRow={onInsertRow}
        onDeleteRow={onDeleteRow}
        onInsertColumn={onInsertColumn}
        onDeleteColumn={onDeleteColumn}
        onQuickSort={onQuickSort}
        onOpenColumnFilter={onOpenColumnFilter}
        onOpenDefineName={onOpenDefineName}
        onOpenFormatCells={onOpenFormatCells}
      />
    </div>
  );
};
