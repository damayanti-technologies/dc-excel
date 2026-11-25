/* global BeforeUnloadEvent */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Workbook } from '@/types/workbook';
import { Sheet } from '@/types/sheet';
import { Cell, CellCoordinates, CellRange, CellStyle, CellValue } from '@/types/cell';
import { BorderPosition, BorderStyleType } from '@/types/formatting';
import { PersistenceStatus } from '@/types/storage';
import { workbookService } from '@/services';
import { useSheetStore } from '@/stores/sheet-store';
import { useSelectionStore } from '@/stores/selection-store';
import { useWorkbookStore } from '@/stores/workbook-store';
import { useFormatPainterStore } from '@/stores/format-painter-store';
import { toast } from '@/stores/toast-store';
import { coordToKey, colIndexToName } from '@/utils/coordinates';
import { formatRangeLabel } from '@/engine/grid/selection';
import { copyRange, applyPasteData, getClipboardText } from '@/engine/grid/clipboard';
import { calculationEngine } from '@/engine/calculation';
import {
  applyStyleToRange,
  applyBordersToRange,
  clearFormattingFromRange
} from '@/engine/formatting/range-formatting';
import {
  canMergeRange,
  checkNonAnchorPopulated,
  mergeRange,
  unmergeRange
} from '@/engine/formatting/merge-cells';
import { SortConfig, ColumnFilter, DataValidationRule } from '@/types/data-tools';
import {
  ConditionalFormatRule,
  NamedRange,
  PivotTableConfig,
  SubtotalConfig,
  Scenario,
} from '@/types/analysis';
import { ChartConfig, ChartPositionConfig } from '@/types/chart';
import {
  resolveNamedRange,
  generatePivotTable,
  applySubtotals,
  removeSubtotals,
  addRowGroup,
  removeRowGroup,
} from '@/engine/analysis';
import { detectTableRange, sortRange } from '@/engine/data-tools/sorting';
import { evaluateFilters } from '@/engine/data-tools/filtering';
import {
  freezeTopRow,
  freezeFirstColumn,
  freezePanesAtCell,
  unfreezePanes
} from '@/engine/data-tools/freeze';
import { trimWhitespace } from '@/engine/data-tools/trim';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SpreadsheetModals } from './components/SpreadsheetModals';
import { useSpreadsheetPaletteCommands } from './hooks/useSpreadsheetPaletteCommands';
import {
  WorkbookHeader,
  SpreadsheetToolbar,
  FormattingToolbar,
  FormulaBar,
  SpreadsheetGrid,
  SheetTabsBar,
  FormulaReferencePanel,
  DataToolbar,
  InsertToolbar,
  MultiTabConflictBanner,
  CrashRecoveryPrompt,
  SpreadsheetStatusBar,
} from './components';
import { useUIPreferencesStore } from '@/stores/ui-preferences-store';
import { saveQueue } from '@/engine/persistence/save-queue';
import { historyManager } from '@/engine/history/history-manager';
import { recoveryService } from '@/services/recovery-service';
import { multiTabService } from '@/services/multi-tab-service';
import { MultiTabMessage, CrashRecoveryRecord } from '@/types/persistence';

export const SpreadsheetPage: React.FC = () => {
  const { workbookId } = useParams<{ workbookId: string }>();

  // Stores
  const activeSheet = useSheetStore((state) => state.activeSheet);
  const setActiveSheet = useSheetStore((state) => state.setActiveSheet);
  const zoom = useSheetStore((state) => state.zoom);
  const setZoom = useSheetStore((state) => state.setZoom);
  const insertRow = useSheetStore((state) => state.insertRow);
  const deleteRow = useSheetStore((state) => state.deleteRow);
  const insertColumn = useSheetStore((state) => state.insertColumn);
  const deleteColumn = useSheetStore((state) => state.deleteColumn);
  const setRowHeight = useSheetStore((state) => state.setRowHeight);
  const setColumnWidth = useSheetStore((state) => state.setColumnWidth);
  const setBatchCells = useSheetStore((state) => state.setBatchCells);
  const setAllCells = useSheetStore((state) => state.setAllCells);
  const updateMetadata = useSheetStore((state) => state.updateMetadata);
  const addConditionalFormat = useSheetStore((state) => state.addConditionalFormat);
  const reorderConditionalFormats = useSheetStore((state) => state.reorderConditionalFormats);
  const setRowGroups = useSheetStore((state) => state.setRowGroups);
  const toggleRowGroupCollapse = useSheetStore((state) => state.toggleRowGroupCollapse);
  const setSubtotals = useSheetStore((state) => state.setSubtotals);
  const addPivotTable = useSheetStore((state) => state.addPivotTable);
  const addChart = useSheetStore((state) => state.addChart);
  const updateChart = useSheetStore((state) => state.updateChart);
  const deleteChart = useSheetStore((state) => state.deleteChart);
  const duplicateChart = useSheetStore((state) => state.duplicateChart);
  const bringChartForward = useSheetStore((state) => state.bringChartForward);
  const sendChartBackward = useSheetStore((state) => state.sendChartBackward);

  const activeCell = useSelectionStore((state) => state.activeCell);
  const anchorCell = useSelectionStore((state) => state.anchorCell);
  const selectedRange = useSelectionStore((state) => state.selectedRange);
  const editingCell = useSelectionStore((state) => state.editingCell);
  const editingValue = useSelectionStore((state) => state.editingValue);
  const setActiveCell = useSelectionStore((state) => state.setActiveCell);
  const setAnchorCell = useSelectionStore((state) => state.setAnchorCell);
  const setSelectedRange = useSelectionStore((state) => state.setSelectedRange);
  const selectRangeFromAnchor = useSelectionStore((state) => state.selectRangeFromAnchor);
  const selectEntireRow = useSelectionStore((state) => state.selectEntireRow);
  const selectEntireColumn = useSelectionStore((state) => state.selectEntireColumn);
  const selectAll = useSelectionStore((state) => state.selectAll);
  const startEditing = useSelectionStore((state) => state.startEditing);
  const setEditingValue = useSelectionStore((state) => state.setEditingValue);
  const stopEditing = useSelectionStore((state) => state.stopEditing);

  const setCurrentWorkbook = useWorkbookStore((state) => state.setCurrentWorkbook);
  const currentWorkbook = useWorkbookStore((state) => state.currentWorkbook);
  const addNamedRange = useWorkbookStore((state) => state.addNamedRange);
  const updateNamedRange = useWorkbookStore((state) => state.updateNamedRange);
  const deleteNamedRange = useWorkbookStore((state) => state.deleteNamedRange);
  const addScenario = useWorkbookStore((state) => state.addScenario);
  const updateScenario = useWorkbookStore((state) => state.updateScenario);
  const deleteScenario = useWorkbookStore((state) => state.deleteScenario);

  // Local state
  const [workbook, setWorkbook] = useState<Workbook | null>(null);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [saveStatus, setSaveStatus] = useState<PersistenceStatus>('idle');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isReferenceOpen, setIsReferenceOpen] = useState(false);
  const [isMergeWarningOpen, setIsMergeWarningOpen] = useState(false);
  const [pendingMergeMode, setPendingMergeMode] = useState<'all' | 'across' | 'center'>('all');
  const [pendingMergeRange, setPendingMergeRange] = useState<CellRange | null>(null);
  const [isMobileFormattingOpen, setIsMobileFormattingOpen] = useState(false);
  const [sheetToDelete, setSheetToDelete] = useState<Sheet | null>(null);
  const [isUnhideDialogOpen, setIsUnhideDialogOpen] = useState(false);

  // Ribbon & Data Tools State
  const [activeRibbonTab, setActiveRibbonTab] = useState<'home' | 'insert' | 'data'>('home');
  const [isCustomSortOpen, setIsCustomSortOpen] = useState(false);
  const [isRemoveDuplicatesOpen, setIsRemoveDuplicatesOpen] = useState(false);
  const [isDataValidationOpen, setIsDataValidationOpen] = useState(false);
  const [isTextToColumnsOpen, setIsTextToColumnsOpen] = useState(false);
  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
  const [findReplaceInitialMode, setFindReplaceInitialMode] = useState<'find' | 'replace'>('find');
  const [activeFilterCol, setActiveFilterCol] = useState<number | null>(null);
  const [isAuditHighlighted, setIsAuditHighlighted] = useState(false);

  // Stage 10 Analysis Tools State
  const [isConditionalFormattingOpen, setIsConditionalFormattingOpen] = useState(false);
  const [isConditionalFormattingManagerOpen, setIsConditionalFormattingManagerOpen] = useState(false);
  const [isNameManagerOpen, setIsNameManagerOpen] = useState(false);
  const [isPivotTableOpen, setIsPivotTableOpen] = useState(false);
  const [isSubtotalsOpen, setIsSubtotalsOpen] = useState(false);
  const [isGoalSeekOpen, setIsGoalSeekOpen] = useState(false);
  const [isScenarioManagerOpen, setIsScenarioManagerOpen] = useState(false);

  // Stage 11 Charts State
  const [isInsertChartOpen, setIsInsertChartOpen] = useState(false);
  const [isChartEditorOpen, setIsChartEditorOpen] = useState(false);
  const [selectedChartId, setSelectedChartId] = useState<string | null>(null);
  const [editingChart, setEditingChart] = useState<ChartConfig | null>(null);

  // Stage 12 Import / Export State
  const navigate = useNavigate();
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Stage 13 Persistence, History & Recovery State
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [isBackupRestoreOpen, setIsBackupRestoreOpen] = useState(false);
  const [isStorageManagementOpen, setIsStorageManagementOpen] = useState(false);
  const [conflictMessage, setConflictMessage] = useState<MultiTabMessage | null>(null);
  const [recoveryRecord, setRecoveryRecord] = useState<CrashRecoveryRecord | null>(null);

  // Stage 14 Productivity, Polish & Accessibility State
  const preferences = useUIPreferencesStore((state) => state.preferences);
  const currentTheme = useUIPreferencesStore((state) => state.theme);
  const setTheme = useUIPreferencesStore((state) => state.setTheme);

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isGoToOpen, setIsGoToOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isWelcomeTourOpen, setIsWelcomeTourOpen] = useState(false);
  const [showGridlines, setShowGridlines] = useState(true);
  const [showFormulaBar, setShowFormulaBar] = useState(true);

  // Sync defaults from preferences
  useEffect(() => {
    if (preferences.applicationPreferences) {
      if (preferences.applicationPreferences.showGridLinesDefault !== undefined) {
        setShowGridlines(preferences.applicationPreferences.showGridLinesDefault);
      }
      if (preferences.applicationPreferences.showFormulaBarDefault !== undefined) {
        setShowFormulaBar(preferences.applicationPreferences.showFormulaBarDefault);
      }
      if (preferences.applicationPreferences.defaultZoom !== undefined) {
        setZoom(preferences.applicationPreferences.defaultZoom);
      }
      if (preferences.applicationPreferences.hasSeenOnboarding === false) {
        setIsWelcomeTourOpen(true);
      }
    }
  }, [preferences.applicationPreferences, setShowGridlines, setShowFormulaBar, setZoom]);

  const handleImportSuccess = useCallback(
    (result: { workbookName: string; sheetCount: number; workbookId?: string }) => {
      toast.success(
        `Imported "${result.workbookName}" (${result.sheetCount} sheet${result.sheetCount === 1 ? '' : 's'})`
      );
      if (result.workbookId) {
        navigate(`/workbook/${result.workbookId}`);
      }
    },
    [navigate]
  );

  const namedRangeResolver = useCallback(
    (name: string) => {
      const nrs = currentWorkbook?.metadata?.namedRanges || workbook?.metadata?.namedRanges || [];
      const res = resolveNamedRange(name, activeSheet?.id || '', nrs);
      return res || null;
    },
    [currentWorkbook?.metadata?.namedRanges, workbook?.metadata?.namedRanges, activeSheet?.id]
  );

  const getCrossSheetCells = useCallback(
    (sheetName: string) => {
      const currentList = sheets.map((s) => (s.id === activeSheet?.id ? activeSheet : s));
      const target = currentList.find(
        (s) => s.name.toLowerCase() === sheetName.toLowerCase()
      );
      return target?.cells;
    },
    [sheets, activeSheet]
  );

  // Format painter store
  const isFormatPainterActive = useFormatPainterStore((state) => state.isActive);
  const formatPainterStyle = useFormatPainterStore((state) => state.sourceStyle);
  const isFormatPainterLocked = useFormatPainterStore((state) => state.isLocked);
  const activateFormatPainter = useFormatPainterStore((state) => state.activate);
  const deactivateFormatPainter = useFormatPainterStore((state) => state.deactivate);

  const handleInsertFunction = useCallback(
    (syntax: string) => {
      if (activeCell) {
        startEditing(activeCell, syntax);
      }
    },
    [activeCell, startEditing]
  );

  // Target range for formatting operations
  const getTargetRange = useCallback((): CellRange | null => {
    if (selectedRange) return selectedRange;
    if (activeCell) {
      return {
        startRow: activeCell.row,
        startCol: activeCell.col,
        endRow: activeCell.row,
        endCol: activeCell.col
      };
    }
    return null;
  }, [selectedRange, activeCell]);

  const handleApplyStyle = useCallback(
    (styleUpdate: Partial<CellStyle>) => {
      if (!activeSheet) return;
      const target = getTargetRange();
      if (!target) return;

      const prevCells = { ...activeSheet.cells };
      const updatedCells = applyStyleToRange(activeSheet.cells, target, styleUpdate);
      setBatchCells(updatedCells);

      historyManager.pushAction({
        type: 'format_style',
        description: 'Format cells',
        undo: () => useSheetStore.getState().setAllCells(prevCells),
        redo: () => useSheetStore.getState().setAllCells(updatedCells),
      });
    },
    [activeSheet, getTargetRange, setBatchCells]
  );

  const handleApplyBorders = useCallback(
    (position: BorderPosition, style: BorderStyleType, color: string) => {
      if (!activeSheet) return;
      const target = getTargetRange();
      if (!target) return;

      const prevCells = { ...activeSheet.cells };
      const updatedCells = applyBordersToRange(activeSheet.cells, target, position, style, color);
      setBatchCells(updatedCells);

      historyManager.pushAction({
        type: 'borders',
        description: 'Apply borders',
        undo: () => useSheetStore.getState().setAllCells(prevCells),
        redo: () => useSheetStore.getState().setAllCells(updatedCells),
      });
    },
    [activeSheet, getTargetRange, setBatchCells]
  );

  const handleClearFormatting = useCallback(() => {
    if (!activeSheet) return;
    const target = getTargetRange();
    if (!target) return;

    const prevCells = { ...activeSheet.cells };
    const updatedCells = clearFormattingFromRange(activeSheet.cells, target);
    setAllCells(updatedCells);

    historyManager.pushAction({
      type: 'clear_formatting',
      description: 'Clear formatting',
      undo: () => useSheetStore.getState().setAllCells(prevCells),
      redo: () => useSheetStore.getState().setAllCells(updatedCells),
    });

    toast.info('Formatting Cleared', 'Cell formatting has been reset to default.');
  }, [activeSheet, getTargetRange, setAllCells]);

  const handleToggleFormatPainter = useCallback(() => {
    if (isFormatPainterActive) {
      deactivateFormatPainter();
    } else if (activeSheet && activeCell) {
      const key = coordToKey(activeCell.row, activeCell.col);
      const cell = activeSheet.cells[key];
      activateFormatPainter(cell?.style);
      toast.info('Format Painter Active', 'Click a cell or drag across a range to apply formatting.');
    }
  }, [isFormatPainterActive, deactivateFormatPainter, activeSheet, activeCell, activateFormatPainter]);

  const handleApplyFormatPainter = useCallback(() => {
    if (!activeSheet || !formatPainterStyle) return;
    const target = getTargetRange();
    if (!target) return;

    const updatedCells = applyStyleToRange(activeSheet.cells, target, formatPainterStyle);
    setBatchCells(updatedCells);

    if (!isFormatPainterLocked) {
      deactivateFormatPainter();
    }
  }, [activeSheet, formatPainterStyle, getTargetRange, setBatchCells, isFormatPainterLocked, deactivateFormatPainter]);

  const handleMerge = useCallback(
    (mode: 'all' | 'across' | 'center') => {
      if (!activeSheet) return;
      const target = getTargetRange();
      if (!target) return;

      const { canMerge, reason } = canMergeRange(activeSheet.mergedRanges, target);
      if (!canMerge) {
        toast.warning('Cannot Merge', reason || 'Invalid merge selection.');
        return;
      }

      const { hasPopulated } = checkNonAnchorPopulated(activeSheet.cells, target);
      if (hasPopulated) {
        setPendingMergeMode(mode);
        setPendingMergeRange(target);
        setIsMergeWarningOpen(true);
      } else {
        const { updatedSheet } = mergeRange(activeSheet, target, mode);
        setActiveSheet(updatedSheet);
      }
    },
    [activeSheet, getTargetRange, setActiveSheet]
  );

  const handleConfirmMerge = useCallback(() => {
    if (!activeSheet || !pendingMergeRange) return;
    const { updatedSheet } = mergeRange(activeSheet, pendingMergeRange, pendingMergeMode);
    setActiveSheet(updatedSheet);
    setIsMergeWarningOpen(false);
    setPendingMergeRange(null);
  }, [activeSheet, pendingMergeRange, pendingMergeMode, setActiveSheet]);

  const handleUnmerge = useCallback(() => {
    if (!activeSheet) return;
    const target = getTargetRange();
    if (!target) return;

    const { updatedSheet, unmergedCount } = unmergeRange(activeSheet, target);
    setActiveSheet(updatedSheet);
    if (unmergedCount > 0) {
      toast.info('Unmerged Cells', `Unmerged ${unmergedCount} cell range(s).`);
    }
  }, [activeSheet, getTargetRange, setActiveSheet]);

  // Data Tools: Contiguous range or current selection
  const getDataRange = useCallback((): CellRange => {
    if (
      selectedRange &&
      (selectedRange.startRow !== selectedRange.endRow ||
        selectedRange.startCol !== selectedRange.endCol)
    ) {
      return selectedRange;
    }
    if (activeCell && activeSheet) {
      return detectTableRange(
        activeSheet.cells,
        activeCell,
        activeSheet.rowCount,
        activeSheet.columnCount
      );
    }
    return {
      startRow: 0,
      startCol: 0,
      endRow: Math.min(10, (activeSheet?.rowCount || 10) - 1),
      endCol: Math.min(5, (activeSheet?.columnCount || 5) - 1)
    };
  }, [selectedRange, activeCell, activeSheet]);

  // Data Tools: Quick Sort (Asc / Desc)
  const handleQuickSort = useCallback(
    (direction: 'asc' | 'desc', targetCol?: number) => {
      if (!activeSheet) return;
      const colToSort = targetCol !== undefined ? targetCol : (activeCell?.col ?? 0);
      const range = getDataRange();
      const sortConfig: SortConfig = {
        range,
        levels: [{ col: colToSort, direction }],
        hasHeaders: true
      };
      const updatedCells = sortRange(activeSheet.cells, sortConfig);
      const updatedSheet = { ...activeSheet, cells: updatedCells };
      const { updatedCells: recalcedCells } = calculationEngine.recalculateSheet(updatedSheet);
      setActiveSheet({ ...updatedSheet, cells: recalcedCells });
      toast.success(
        'Sorted',
        `Column ${colIndexToName(colToSort)} sorted ${direction === 'asc' ? 'A to Z' : 'Z to A'}.`
      );
    },
    [activeSheet, activeCell, getDataRange, setActiveSheet]
  );

  // Data Tools: Custom Multi-Level Sort
  const handleCustomSort = useCallback(
    (config: SortConfig) => {
      if (!activeSheet) return;
      const updatedCells = sortRange(activeSheet.cells, config);
      const updatedSheet = { ...activeSheet, cells: updatedCells };
      const { updatedCells: recalcedCells } = calculationEngine.recalculateSheet(updatedSheet);
      setActiveSheet({ ...updatedSheet, cells: recalcedCells });
      toast.success('Sorted', 'Custom multi-level sort applied successfully.');
    },
    [activeSheet, setActiveSheet]
  );

  // Data Tools: Filter Toggle
  const handleToggleFilter = useCallback(() => {
    if (!activeSheet) return;
    const currentConfig = activeSheet.metadata?.filterConfig;
    if (currentConfig) {
      updateMetadata({ filterConfig: undefined, hiddenRows: [] });
      toast.info('Filter Removed', 'All rows are now visible.');
    } else {
      const range = getDataRange();
      updateMetadata({
        filterConfig: { range, columnFilters: {} },
        hiddenRows: []
      });
      toast.success('Filter Created', 'Use header filter buttons to filter records.');
    }
  }, [activeSheet, getDataRange, updateMetadata]);

  // Data Tools: Apply Column Filter
  const handleApplyColumnFilter = useCallback(
    (col: number, filter: ColumnFilter | null) => {
      if (!activeSheet) return;
      const currentConfig = activeSheet.metadata?.filterConfig;
      const range = currentConfig?.range || getDataRange();

      const nextColumnFilters = { ...(currentConfig?.columnFilters || {}) };
      if (filter) {
        nextColumnFilters[col] = filter;
      } else {
        delete nextColumnFilters[col];
      }

      const updatedConfig = { range, columnFilters: nextColumnFilters };
      const hiddenRows = evaluateFilters(activeSheet.cells, updatedConfig);

      updateMetadata({
        filterConfig: updatedConfig,
        hiddenRows
      });
      toast.info('Filter Updated', `${hiddenRows.length} rows hidden by active filter.`);
    },
    [activeSheet, getDataRange, updateMetadata]
  );

  // Data Tools: Clear Filter
  const handleClearFilter = useCallback(() => {
    if (!activeSheet || !activeSheet.metadata?.filterConfig) return;
    updateMetadata({
      filterConfig: {
        range: activeSheet.metadata.filterConfig.range,
        columnFilters: {}
      },
      hiddenRows: []
    });
    toast.info('Filters Cleared', 'All column filters have been cleared.');
  }, [activeSheet, updateMetadata]);

  // Data Tools: Reapply Filter
  const handleReapplyFilter = useCallback(() => {
    if (!activeSheet || !activeSheet.metadata?.filterConfig) return;
    const hiddenRows = evaluateFilters(activeSheet.cells, activeSheet.metadata.filterConfig);
    updateMetadata({ hiddenRows });
    toast.info('Filters Reapplied', `${hiddenRows.length} rows hidden.`);
  }, [activeSheet, updateMetadata]);

  // Data Tools: Freeze Panes
  const handleFreezeTopRow = useCallback(() => {
    const cfg = freezeTopRow();
    updateMetadata({ freezePanes: cfg });
    toast.success('Frozen', 'Top row pinned at top.');
  }, [updateMetadata]);

  const handleFreezeFirstColumn = useCallback(() => {
    const cfg = freezeFirstColumn();
    updateMetadata({ freezePanes: cfg });
    toast.success('Frozen', 'First column pinned at left.');
  }, [updateMetadata]);

  const handleFreezeAtSelection = useCallback(() => {
    if (!activeCell) return;
    const cfg = freezePanesAtCell(activeCell.row, activeCell.col);
    updateMetadata({ freezePanes: cfg });
    toast.success(
      'Frozen',
      `Panes frozen at row ${activeCell.row + 1}, column ${colIndexToName(activeCell.col)}.`
    );
  }, [activeCell, updateMetadata]);

  const handleUnfreezePanes = useCallback(() => {
    const cfg = unfreezePanes();
    updateMetadata({ freezePanes: cfg });
    toast.info('Unfrozen', 'All panes unfrozen.');
  }, [updateMetadata]);

  // Data Tools: Remove Duplicates
  const handleApplyRemoveDuplicates = useCallback(
    (updatedCells: Sheet['cells'], removedCount: number, remainingCount: number) => {
      if (!activeSheet) return;
      setActiveSheet({
        ...activeSheet,
        cells: updatedCells
      });
      toast.success(
        'Duplicates Removed',
        `Removed ${removedCount} duplicate row${removedCount === 1 ? '' : 's'}; ${remainingCount} unique row${remainingCount === 1 ? '' : 's'} remain.`
      );
    },
    [activeSheet, setActiveSheet]
  );

  // Data Tools: Text to Columns
  const handleApplyTextToColumns = useCallback(
    (newCells: Record<string, Cell>) => {
      if (!activeSheet) return;
      setBatchCells(newCells);
      toast.success('Text to Columns', 'Text converted to columns successfully.');
    },
    [activeSheet, setBatchCells]
  );

  // Data Tools: Trim Whitespace
  const handleTrimWhitespace = useCallback(() => {
    if (!activeSheet) return;
    const range = getTargetRange() || getDataRange();
    const { updatedCells, modifiedCount } = trimWhitespace(activeSheet.cells, range);
    if (modifiedCount > 0) {
      setBatchCells(updatedCells);
      toast.success(
        'Whitespace Trimmed',
        `Cleaned whitespace in ${modifiedCount} cell${modifiedCount === 1 ? '' : 's'}.`
      );
    } else {
      toast.info('No Whitespace Found', 'All cells in selection are already trimmed.');
    }
  }, [activeSheet, getTargetRange, getDataRange, setBatchCells]);

  // Data Tools: Data Validation
  const handleApplyValidationRule = useCallback(
    (rule: DataValidationRule) => {
      if (!activeSheet) return;
      const currentRules = activeSheet.metadata?.dataValidations || [];
      const otherRules = currentRules.filter((r) => r.id !== rule.id);
      updateMetadata({
        dataValidations: [...otherRules, rule]
      });
      toast.success('Validation Applied', 'Validation criteria saved.');
    },
    [activeSheet, updateMetadata]
  );

  const handleClearValidation = useCallback(() => {
    if (!activeSheet) return;
    const target = getTargetRange();
    if (!target) return;
    const currentRules = activeSheet.metadata?.dataValidations || [];
    const remaining = currentRules.filter((r) => {
      const overlaps =
        Math.max(r.range.startRow, target.startRow) <= Math.min(r.range.endRow, target.endRow) &&
        Math.max(r.range.startCol, target.startCol) <= Math.min(r.range.endCol, target.endCol);
      return !overlaps;
    });
    updateMetadata({ dataValidations: remaining });
    toast.info('Validation Cleared', 'Validation rules removed from selection.');
  }, [activeSheet, getTargetRange, updateMetadata]);

  // Data Tools: Direct cell update from in-cell validation dropdown
  const handleUpdateCellValue = useCallback(
    (row: number, col: number, value: string | number) => {
      if (!activeSheet) return;
      const key = coordToKey(row, col);
      const existing = activeSheet.cells[key];
      const newCell: Cell = {
        value,
        dataType: typeof value === 'number' ? 'number' : 'string',
        style: existing?.style
      };
      const updatedSheet = {
        ...activeSheet,
        cells: {
          ...activeSheet.cells,
          [key]: newCell
        }
      };
      const { updatedCells } = calculationEngine.recalculateSheet(updatedSheet);
      setActiveSheet({ ...updatedSheet, cells: updatedCells });
    },
    [activeSheet, setActiveSheet]
  );

  // Data Tools: Find & Replace Navigation and Updates
  const handleNavigateToMatch = useCallback(
    (sheetId: string, row: number, col: number) => {
      if (activeSheet?.id !== sheetId) {
        const target = sheets.find((s) => s.id === sheetId);
        if (target) {
          setActiveSheet(target);
        }
      }
      setActiveCell({ row, col });
    },
    [activeSheet, sheets, setActiveSheet, setActiveCell]
  );

  const handleUpdateFindSheet = useCallback(
    (updatedSheet: Sheet) => {
      setActiveSheet(updatedSheet);
      setSheets((prev) => prev.map((s) => (s.id === updatedSheet.id ? updatedSheet : s)));
    },
    [setActiveSheet]
  );

  const handleUpdateFindSheets = useCallback(
    (updatedSheetsList: Sheet[]) => {
      setSheets(updatedSheetsList);
      const current = updatedSheetsList.find((s) => s.id === activeSheet?.id);
      if (current) {
        setActiveSheet(current);
      }
    },
    [activeSheet, setActiveSheet]
  );

  // Keyboard shortcut listener for Ctrl+F and Ctrl+H
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        setFindReplaceInitialMode('find');
        setIsFindReplaceOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        setFindReplaceInitialMode('replace');
        setIsFindReplaceOpen(true);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // --- Stage 10 Analysis Tool Handlers ---

  // 1. Conditional Formatting
  const handleSaveConditionalFormat = useCallback(
    (rule: ConditionalFormatRule) => {
      addConditionalFormat(rule);
      toast.success('Formatting Applied', 'Conditional formatting rule saved.');
    },
    [addConditionalFormat]
  );

  const handleUpdateConditionalFormats = useCallback(
    (rules: ConditionalFormatRule[]) => {
      reorderConditionalFormats(rules);
      toast.success('Rules Updated', 'Conditional formatting rules updated.');
    },
    [reorderConditionalFormats]
  );

  const handleClearConditionalFormattingSelection = useCallback(() => {
    if (!activeSheet) return;
    const target = getTargetRange() || getDataRange();
    const currentRules = activeSheet.metadata?.conditionalFormats || [];
    const remaining = currentRules.filter((r) => {
      const overlaps =
        r.range.startRow <= target.endRow &&
        r.range.endRow >= target.startRow &&
        r.range.startCol <= target.endCol &&
        r.range.endCol >= target.startCol;
      return !overlaps;
    });
    reorderConditionalFormats(remaining);
    toast.info('Rules Cleared', 'Removed conditional formatting from selected area.');
  }, [activeSheet, getTargetRange, getDataRange, reorderConditionalFormats]);

  const handleClearConditionalFormattingSheet = useCallback(() => {
    reorderConditionalFormats([]);
    toast.info('Rules Cleared', 'Removed all conditional formatting rules from worksheet.');
  }, [reorderConditionalFormats]);

  // 2. Named Ranges
  const handleAddNamedRange = useCallback(
    (nr: NamedRange) => {
      addNamedRange(nr);
      toast.success('Name Defined', `Named range "${nr.name}" created.`);
    },
    [addNamedRange]
  );

  const handleUpdateNamedRange = useCallback(
    (nr: NamedRange) => {
      updateNamedRange(nr);
      toast.success('Name Updated', `Named range "${nr.name}" updated.`);
    },
    [updateNamedRange]
  );

  const handleDeleteNamedRange = useCallback(
    (id: string) => {
      deleteNamedRange(id);
      toast.info('Name Deleted', 'Named range removed.');
    },
    [deleteNamedRange]
  );

  // 3. Pivot Tables
  const handleApplyPivotTable = useCallback(
    (config: PivotTableConfig) => {
      if (!activeSheet) return;
      const pivotResult = generatePivotTable(config, (r, c) => activeSheet.cells[coordToKey(r, c)]);
      
      const batchCells: Record<string, Cell> = {};
      for (const [key, pCell] of Object.entries(pivotResult.cells)) {
        batchCells[key] = {
          value: pCell.value,
          dataType: typeof pCell.value === 'number' ? 'number' : 'string',
          style: pCell.style,
        };
      }

      setBatchCells(
        batchCells,
        config.destinationCoord.row + pivotResult.rowCount,
        config.destinationCoord.col + pivotResult.colCount
      );
      addPivotTable(config);
      toast.success('Pivot Table Created', `Generated ${pivotResult.rowCount} rows by ${pivotResult.colCount} columns.`);
    },
    [activeSheet, setBatchCells, addPivotTable]
  );

  // 4. Subtotals
  const handleApplySubtotals = useCallback(
    (config: SubtotalConfig) => {
      if (!activeSheet) return;
      const subResult = applySubtotals(config, activeSheet.cells);
      setBatchCells(subResult.newCells);
      setRowGroups(subResult.newRowGroups);
      setSubtotals(config);
      toast.success('Subtotals Applied', `Added ${subResult.rowsAdded} subtotal and grand total rows.`);
    },
    [activeSheet, setBatchCells, setRowGroups, setSubtotals]
  );

  const handleRemoveSubtotals = useCallback(() => {
    if (!activeSheet) return;
    const { newCells } = removeSubtotals(activeSheet.cells);
    setBatchCells(newCells);
    setRowGroups([]);
    setSubtotals(undefined);
    toast.info('Subtotals Removed', 'All subtotals and outline groups removed.');
  }, [activeSheet, setBatchCells, setRowGroups, setSubtotals]);

  // 5. Row Grouping
  const handleGroupSelectedRows = useCallback(() => {
    if (!activeSheet) return;
    const target = getTargetRange() || getDataRange();
    const updated = addRowGroup(activeSheet.metadata?.rowGroups || [], target.startRow, target.endRow);
    setRowGroups(updated);
    toast.success('Rows Grouped', `Grouped rows ${target.startRow + 1} to ${target.endRow + 1}.`);
  }, [activeSheet, getTargetRange, getDataRange, setRowGroups]);

  const handleUngroupSelectedRows = useCallback(() => {
    if (!activeSheet) return;
    const target = getTargetRange() || getDataRange();
    const updated = removeRowGroup(activeSheet.metadata?.rowGroups || [], target.startRow, target.endRow);
    setRowGroups(updated);
    toast.info('Rows Ungrouped', `Removed outline for rows ${target.startRow + 1} to ${target.endRow + 1}.`);
  }, [activeSheet, getTargetRange, getDataRange, setRowGroups]);

  const handleToggleRowGroup = useCallback(
    (groupIndex: number) => {
      toggleRowGroupCollapse(groupIndex);
    },
    [toggleRowGroupCollapse]
  );

  // 6. What-If: Goal Seek
  const handleRunGoalSeek = useCallback(
    (targetCoord: CellCoordinates, _targetValue: number, variableCoord: CellCoordinates) => {
      const evaluateWithVariable = (x: number): number => {
        if (!activeSheet) return NaN;
        const tempCells = {
          ...activeSheet.cells,
          [coordToKey(variableCoord.row, variableCoord.col)]: {
            value: x,
            dataType: 'number' as const,
          },
        };
        const tempSheet = { ...activeSheet, cells: tempCells };
        const { updatedCells } = calculationEngine.recalculateSheet(tempSheet, namedRangeResolver, getCrossSheetCells);
        const targetCell = updatedCells[coordToKey(targetCoord.row, targetCoord.col)];
        return typeof targetCell?.value === 'number'
          ? targetCell.value
          : parseFloat(String(targetCell?.value)) || NaN;
      };

      const commitVariableValue = (x: number) => {
        if (!activeSheet) return;
        const { updatedCells } = calculationEngine.updateCellInput(
          activeSheet.cells,
          variableCoord,
          String(x),
          namedRangeResolver,
          getCrossSheetCells,
          activeSheet.name
        );
        setBatchCells(updatedCells);
        toast.success('Goal Seek Committed', `Variable cell set to ${x.toFixed(4)}.`);
      };

      return { evaluateWithVariable, commitVariableValue };
    },
    [activeSheet, namedRangeResolver, getCrossSheetCells, setBatchCells]
  );

  // 7. What-If: Scenarios
  const handleAddScenario = useCallback(
    (scenario: Scenario) => {
      addScenario(scenario);
      toast.success('Scenario Saved', `Scenario "${scenario.name}" created.`);
    },
    [addScenario]
  );

  const handleUpdateScenario = useCallback(
    (scenario: Scenario) => {
      updateScenario(scenario);
      toast.success('Scenario Updated', `Scenario "${scenario.name}" updated.`);
    },
    [updateScenario]
  );

  const handleDeleteScenario = useCallback(
    (id: string) => {
      deleteScenario(id);
      toast.info('Scenario Deleted', 'Scenario removed.');
    },
    [deleteScenario]
  );

  const handleApplyScenario = useCallback(
    (scenario: Scenario) => {
      if (!activeSheet) return;
      let workingCells = { ...activeSheet.cells };
      for (const v of scenario.variables) {
        workingCells = calculationEngine.updateCellInput(
          workingCells,
          v.coord,
          String(v.value ?? ''),
          namedRangeResolver,
          getCrossSheetCells,
          activeSheet.name
        ).updatedCells;
      }
      setBatchCells(workingCells);
      toast.success('Scenario Applied', `Applied scenario "${scenario.name}".`);
    },
    [activeSheet, namedRangeResolver, getCrossSheetCells, setBatchCells]
  );

  const handleComputeScenarioResults = useCallback(
    (scenario: Scenario) => {
      if (!activeSheet) return {};
      let workingCells = { ...activeSheet.cells };
      for (const v of scenario.variables) {
        workingCells = calculationEngine.updateCellInput(
          workingCells,
          v.coord,
          String(v.value ?? ''),
          namedRangeResolver,
          getCrossSheetCells,
          activeSheet.name
        ).updatedCells;
      }
      const results: Record<string, CellValue> = {};
      for (const [key, cell] of Object.entries(workingCells)) {
        if (cell.formula) {
          results[key] = cell.value;
        }
      }
      return results;
    },
    [activeSheet, namedRangeResolver, getCrossSheetCells]
  );

  const isInitialLoadRef = useRef(true);

  // 1. Load or provision workbook and sheets on mount
  const loadWorkbookData = useCallback(async () => {
    if (!workbookId) return;

    try {
      setIsLoading(true);
      setLoadError(null);

      let wb = await workbookService.openWorkbook(workbookId);

      // If workbook doesn't exist yet, provision a clean local one
      if (!wb) {
        const result = await workbookService.createWorkbook(`Workbook (${workbookId})`);
        wb = result.workbook;
      }

      setWorkbook(wb);
      setCurrentWorkbook(wb);

      // Multi-Tab & SaveQueue initialization
      multiTabService.registerActiveWorkbook(wb.id, wb.revision || 1);
      saveQueue.setRevision(wb.revision || 1);

      const loadedSheets = await workbookService.getSheetsForWorkbook(wb.id);
      setSheets(loadedSheets);

      let targetSheet =
        loadedSheets.find((s) => s.id === wb?.activeSheetId) || loadedSheets[0] || null;

      if (targetSheet) {
        const { updatedCells } = calculationEngine.recalculateSheet(targetSheet);
        targetSheet = {
          ...targetSheet,
          cells: updatedCells
        };
      }

      setActiveSheet(targetSheet);
      setActiveCell({ row: 0, col: 0 });
      setSaveStatus('saved');
      setIsLoading(false);
      isInitialLoadRef.current = false;
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load workbook');
      setIsLoading(false);
    }
  }, [workbookId, setCurrentWorkbook, setActiveSheet, setActiveCell]);

  useEffect(() => {
    void loadWorkbookData();
  }, [loadWorkbookData]);

  // Stage 13: Check for crash recovery on mount / workbook change
  useEffect(() => {
    if (!workbookId) return;
    void (async () => {
      const rec = await recoveryService.checkRecovery(workbookId);
      if (rec) {
        setRecoveryRecord(rec);
      }
    })();
  }, [workbookId]);

  // Stage 13: Multi-Tab conflict detection listener & auto broadcast sync
  useEffect(() => {
    saveQueue.setOnSaveSuccess((wb, rev) => {
      multiTabService.notifyWorkbookSaved(wb.id, rev);
    });

    const unsubscribe = multiTabService.onConflict((msg) => {
      setConflictMessage(msg);
      saveQueue.pause(); // Block writes to prevent silent overwrite of the other tab
    });
    return () => unsubscribe();
  }, []);

  // Stage 13: SaveQueue status subscription
  useEffect(() => {
    const unsubscribe = saveQueue.subscribe((state) => {
      setSaveStatus(state.status);
      if (state.lastSavedAt) {
        setLastSavedAt(state.lastSavedAt);
      }
    });
    return () => unsubscribe();
  }, []);

  // Stage 13: Prompt on tab close / reload if dirty & attempt emergency synchronous backup
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveQueue.currentStatus === 'dirty') {
        if (workbook && activeSheet) {
          try {
            localStorage.setItem(
              `omnisheet_emergency_draft_${workbook.id}`,
              JSON.stringify({
                workbook,
                sheet: activeSheet,
                timestamp: Date.now()
              })
            );
          } catch {
            // Storage quota full or private browsing
          }
        }
        void saveQueue.flush();
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [workbook, activeSheet]);

  // Clear emergency draft when workbook is successfully persisted
  useEffect(() => {
    const unsubscribe = saveQueue.subscribe((state) => {
      if (state.status === 'saved' && workbook) {
        try {
          localStorage.removeItem(`omnisheet_emergency_draft_${workbook.id}`);
        } catch {
          // Ignore
        }
      }
    });
    return () => unsubscribe();
  }, [workbook]);

  // 2. Debounced auto-save via SaveQueue (only persists the modified dirty sheet)
  useEffect(() => {
    if (isInitialLoadRef.current || !activeSheet || !workbook) return;

    saveQueue.enqueue(workbook, [activeSheet], false);
  }, [activeSheet, workbook]);

  // Stage 13: Manual Save handler
  const handleManualSave = useCallback(async () => {
    if (!workbook || !activeSheet) return;
    const updatedSheets = sheets.map((s) => (s.id === activeSheet.id ? activeSheet : s));
    saveQueue.enqueue(workbook, updatedSheets, true);
    const ok = await saveQueue.flush();
    if (ok) {
      multiTabService.notifyWorkbookSaved(workbook.id, saveQueue.currentRevisionNumber);
      toast.success('Saved', 'Workbook saved locally.');
    }
  }, [workbook, activeSheet, sheets]);

  // Stage 13: Crash Recovery handlers
  const handleAcceptRecovery = async () => {
    if (!workbookId) return;
    try {
      const restored = await recoveryService.restoreRecovery(workbookId);
      if (restored) {
        setWorkbook(restored.workbook);
        setCurrentWorkbook(restored.workbook);
        setSheets(restored.sheets);
        const targetSheet =
          restored.sheets.find((s) => s.id === restored.workbook.activeSheetId) || restored.sheets[0];
        if (targetSheet) {
          const { updatedCells } = calculationEngine.recalculateSheet(targetSheet);
          setActiveSheet({ ...targetSheet, cells: updatedCells });
        }
        setRecoveryRecord(null);
        toast.success('Recovered', 'Unsaved changes restored from backup checkpoint.');
      }
    } catch {
      toast.error('Recovery Failed', 'Unable to restore recovered checkpoint.');
    }
  };

  const handleDiscardRecovery = async () => {
    if (!workbookId) return;
    await recoveryService.discardRecovery(workbookId);
    setRecoveryRecord(null);
    toast.info('Discarded', 'Unsaved recovery checkpoint removed.');
  };

  // 3. User operations: Rename workbook
  const handleRenameWorkbook = async (newName: string) => {
    if (!workbook) return;
    try {
      const updated = await workbookService.renameWorkbook(workbook.id, newName);
      setWorkbook(updated);
      setCurrentWorkbook(updated);
      toast.success('Workbook Renamed', `Renamed to "${updated.name}".`);
    } catch {
      toast.error('Rename Failed', 'Could not rename workbook.');
    }
  };

  // 4. Add new sheet
  const handleAddSheet = useCallback(
    async (insertAfterSheetId?: string) => {
      if (!workbook) return;
      try {
        if (activeSheet) {
          await workbookService.saveSheet(activeSheet);
        }

        const newSheet = await workbookService.addSheet(workbook.id, undefined, insertAfterSheetId);
        const updatedSheets = await workbookService.getSheetsForWorkbook(workbook.id);
        setSheets(updatedSheets);

        const updatedWb = await workbookService.getWorkbook(workbook.id);
        if (updatedWb) {
          setWorkbook(updatedWb);
          setCurrentWorkbook(updatedWb);
        }

        setActiveSheet(newSheet);
        setActiveCell({ row: 0, col: 0 });
        toast.success('Sheet Added', `Created "${newSheet.name}".`);
      } catch (err) {
        toast.error('Error', err instanceof Error ? err.message : 'Could not add new sheet.');
      }
    },
    [workbook, activeSheet, setCurrentWorkbook, setActiveSheet, setActiveCell]
  );

  // 4b. Rename sheet
  const handleRenameSheet = async (sheetId: string, newName: string) => {
    if (!workbook) return;
    try {
      const renamed = await workbookService.renameSheet(workbook.id, sheetId, newName);
      const updatedSheets = await workbookService.getSheetsForWorkbook(workbook.id);
      setSheets(updatedSheets);

      if (activeSheet && activeSheet.id === sheetId) {
        setActiveSheet({ ...activeSheet, name: renamed.name });
      }
      toast.success('Sheet Renamed', `Renamed to "${renamed.name}".`);
    } catch (err) {
      toast.error('Rename Failed', err instanceof Error ? err.message : 'Could not rename sheet.');
      throw err;
    }
  };

  // 4c. Duplicate sheet
  const handleDuplicateSheet = async (sheetId: string) => {
    if (!workbook) return;
    try {
      if (activeSheet) {
        await workbookService.saveSheet(activeSheet);
      }

      const duplicated = await workbookService.duplicateSheet(workbook.id, sheetId);
      const updatedSheets = await workbookService.getSheetsForWorkbook(workbook.id);
      setSheets(updatedSheets);

      const updatedWb = await workbookService.getWorkbook(workbook.id);
      if (updatedWb) {
        setWorkbook(updatedWb);
        setCurrentWorkbook(updatedWb);
      }

      const { updatedCells } = calculationEngine.recalculateSheet(duplicated);
      const target = { ...duplicated, cells: updatedCells };
      setActiveSheet(target);
      setActiveCell({ row: 0, col: 0 });
      toast.success('Sheet Duplicated', `Created "${duplicated.name}".`);
    } catch (err) {
      toast.error('Duplicate Failed', err instanceof Error ? err.message : 'Could not duplicate sheet.');
    }
  };

  // 4d. Confirm and delete sheet
  const handleConfirmDeleteSheet = async () => {
    if (!workbook || !sheetToDelete) return;
    try {
      const deletedName = sheetToDelete.name;
      const { remainingSheets, nextActiveSheetId } = await workbookService.deleteSheet(
        workbook.id,
        sheetToDelete.id
      );

      setSheets(remainingSheets);

      const updatedWb = await workbookService.getWorkbook(workbook.id);
      if (updatedWb) {
        setWorkbook(updatedWb);
        setCurrentWorkbook(updatedWb);
      }

      if (activeSheet && activeSheet.id === sheetToDelete.id) {
        let next = remainingSheets.find((s) => s.id === nextActiveSheetId) || remainingSheets[0];
        if (next) {
          const { updatedCells } = calculationEngine.recalculateSheet(next);
          next = { ...next, cells: updatedCells };
          setActiveSheet(next);
          setActiveCell({ row: 0, col: 0 });
        }
      }

      setSheetToDelete(null);
      toast.success('Sheet Deleted', `Deleted "${deletedName}".`);
    } catch (err) {
      toast.error('Delete Failed', err instanceof Error ? err.message : 'Could not delete sheet.');
    }
  };

  // 4e. Move sheet left/right
  const handleMoveSheet = async (sheetId: string, direction: 'left' | 'right') => {
    if (!workbook) return;
    try {
      const updated = await workbookService.moveSheet(workbook.id, sheetId, direction);
      setSheets(updated);

      const updatedWb = await workbookService.getWorkbook(workbook.id);
      if (updatedWb) {
        setWorkbook(updatedWb);
        setCurrentWorkbook(updatedWb);
      }
    } catch (err) {
      toast.error('Move Failed', err instanceof Error ? err.message : 'Could not reorder sheet.');
    }
  };

  // 4f. Drag & Drop reorder sheets
  const handleReorderSheets = async (reorderedIds: string[]) => {
    if (!workbook) return;
    try {
      const updated = await workbookService.reorderSheets(workbook.id, reorderedIds);
      setSheets(updated);

      const updatedWb = await workbookService.getWorkbook(workbook.id);
      if (updatedWb) {
        setWorkbook(updatedWb);
        setCurrentWorkbook(updatedWb);
      }
    } catch (err) {
      toast.error('Reorder Failed', err instanceof Error ? err.message : 'Could not reorder sheets.');
    }
  };

  // 4g. Set tab color
  const handleSetTabColor = async (sheetId: string, color: string | null) => {
    try {
      const updated = await workbookService.setSheetTabColor(sheetId, color);
      setSheets((prev) => prev.map((s) => (s.id === sheetId ? updated : s)));

      if (activeSheet && activeSheet.id === sheetId) {
        setActiveSheet({
          ...activeSheet,
          metadata: {
            ...(activeSheet.metadata || {}),
            tabColor: color || undefined
          }
        });
      }
      toast.success('Tab Color', color ? 'Worksheet tab color updated.' : 'Tab color reset.');
    } catch (err) {
      toast.error('Color Failed', err instanceof Error ? err.message : 'Could not set tab color.');
    }
  };

  // 4h. Hide sheet
  const handleHideSheet = async (sheetId: string) => {
    if (!workbook) return;
    try {
      const { updatedSheet, nextActiveSheetId } = await workbookService.hideSheet(
        workbook.id,
        sheetId
      );

      const updatedSheets = await workbookService.getSheetsForWorkbook(workbook.id);
      setSheets(updatedSheets);

      const updatedWb = await workbookService.getWorkbook(workbook.id);
      if (updatedWb) {
        setWorkbook(updatedWb);
        setCurrentWorkbook(updatedWb);
      }

      if (activeSheet && activeSheet.id === sheetId) {
        let next = updatedSheets.find((s) => s.id === nextActiveSheetId);
        if (next) {
          const { updatedCells } = calculationEngine.recalculateSheet(next);
          next = { ...next, cells: updatedCells };
          setActiveSheet(next);
          setActiveCell({ row: 0, col: 0 });
        }
      }

      toast.success('Sheet Hidden', `"${updatedSheet.name}" is now hidden.`);
    } catch (err) {
      toast.error('Hide Failed', err instanceof Error ? err.message : 'Could not hide sheet.');
    }
  };

  // 4i. Unhide sheet
  const handleUnhideSheet = async (sheetId: string) => {
    if (!workbook) return;
    try {
      const unhidden = await workbookService.unhideSheet(workbook.id, sheetId);
      const updatedSheets = await workbookService.getSheetsForWorkbook(workbook.id);
      setSheets(updatedSheets);

      const updatedWb = await workbookService.getWorkbook(workbook.id);
      if (updatedWb) {
        setWorkbook(updatedWb);
        setCurrentWorkbook(updatedWb);
      }

      const { updatedCells } = calculationEngine.recalculateSheet(unhidden);
      const target = { ...unhidden, cells: updatedCells };
      setActiveSheet(target);
      setActiveCell({ row: 0, col: 0 });
      toast.success('Sheet Restored', `"${unhidden.name}" is now visible.`);
    } catch (err) {
      toast.error('Unhide Failed', err instanceof Error ? err.message : 'Could not unhide sheet.');
    }
  };

  // 5. Switch active sheet tab
  const handleSelectSheet = useCallback(
    async (sheetId: string) => {
      if (sheetId === activeSheet?.id) return;
      try {
        if (activeSheet) {
          await workbookService.saveSheet(activeSheet);
        }

        let target = sheets.find((s) => s.id === sheetId);
        if (target) {
          const { updatedCells } = calculationEngine.recalculateSheet(target);
          target = { ...target, cells: updatedCells };
          setActiveSheet(target);
          setActiveCell({ row: 0, col: 0 });

          // Update activeSheetId on workbook in store/storage
          if (workbook) {
            const updatedWb: Workbook = {
              ...workbook,
              activeSheetId: sheetId,
              updatedAt: Date.now()
            };
            await workbookService.saveSheet(target);
            setWorkbook(updatedWb);
            setCurrentWorkbook(updatedWb);
          }
        }
      } catch {
        toast.error('Error', 'Could not switch sheet.');
      }
    },
    [activeSheet, sheets, workbook, setActiveSheet, setActiveCell, setCurrentWorkbook]
  );

  // 6. Cell Editing Commit & Recalculation Handler
  const handleCommitEditing = useCallback(
    (moveTo: 'down' | 'up' | 'right' | 'left' | 'none' = 'none') => {
      if (!activeSheet || !editingCell) return;

      const targetCoord = { ...editingCell };
      const prevKey = coordToKey(targetCoord.row, targetCoord.col);
      const prevCell = activeSheet.cells[prevKey];
      const prevInput = prevCell ? (prevCell.formula || (prevCell.value !== null && prevCell.value !== undefined ? String(prevCell.value) : '')) : '';
      const currentInput = editingValue;

      const { updatedCells } = calculationEngine.updateCellInput(
        activeSheet.cells,
        targetCoord,
        editingValue,
        namedRangeResolver,
        getCrossSheetCells,
        activeSheet.name
      );

      setAllCells(updatedCells);
      stopEditing();

      if (prevInput !== currentInput) {
        historyManager.pushAction({
          type: 'cell_edit',
          description: `Edit ${colIndexToName(targetCoord.col)}${targetCoord.row + 1}`,
          undo: () => {
            const currentSheet = useSheetStore.getState().activeSheet;
            if (!currentSheet) return;
            const { updatedCells: restoredCells } = calculationEngine.updateCellInput(
              currentSheet.cells,
              targetCoord,
              prevInput,
              namedRangeResolver,
              getCrossSheetCells,
              currentSheet.name
            );
            useSheetStore.getState().setAllCells(restoredCells);
          },
          redo: () => {
            const currentSheet = useSheetStore.getState().activeSheet;
            if (!currentSheet) return;
            const { updatedCells: reappliedCells } = calculationEngine.updateCellInput(
              currentSheet.cells,
              targetCoord,
              currentInput,
              namedRangeResolver,
              getCrossSheetCells,
              currentSheet.name
            );
            useSheetStore.getState().setAllCells(reappliedCells);
          }
        });
      }

      if (moveTo === 'down') {
        setActiveCell({
          row: Math.min(activeSheet.rowCount - 1, targetCoord.row + 1),
          col: targetCoord.col
        });
      } else if (moveTo === 'up') {
        setActiveCell({
          row: Math.max(0, targetCoord.row - 1),
          col: targetCoord.col
        });
      } else if (moveTo === 'right') {
        setActiveCell({
          row: targetCoord.row,
          col: Math.min(activeSheet.columnCount - 1, targetCoord.col + 1)
        });
      } else if (moveTo === 'left') {
        setActiveCell({
          row: targetCoord.row,
          col: Math.max(0, targetCoord.col - 1)
        });
      }
    },
    [activeSheet, editingCell, editingValue, setAllCells, stopEditing, setActiveCell, namedRangeResolver, getCrossSheetCells]
  );

  // 7. Clear Cell Contents (Delete / Backspace)
  const handleClearCell = useCallback(
    (coord: CellCoordinates) => {
      if (!activeSheet) return;
      const key = coordToKey(coord.row, coord.col);
      const prevCell = activeSheet.cells[key];
      const prevInput = prevCell ? (prevCell.formula || (prevCell.value !== null && prevCell.value !== undefined ? String(prevCell.value) : '')) : '';

      const { updatedCells } = calculationEngine.updateCellInput(
        activeSheet.cells,
        coord,
        '',
        namedRangeResolver,
        getCrossSheetCells,
        activeSheet.name
      );
      setAllCells(updatedCells);

      if (prevInput) {
        historyManager.pushAction({
          type: 'clear_cell',
          description: `Clear ${colIndexToName(coord.col)}${coord.row + 1}`,
          undo: () => {
            const currentSheet = useSheetStore.getState().activeSheet;
            if (!currentSheet) return;
            const { updatedCells: restoredCells } = calculationEngine.updateCellInput(
              currentSheet.cells,
              coord,
              prevInput,
              namedRangeResolver,
              getCrossSheetCells,
              currentSheet.name
            );
            useSheetStore.getState().setAllCells(restoredCells);
          },
          redo: () => {
            const currentSheet = useSheetStore.getState().activeSheet;
            if (!currentSheet) return;
            const { updatedCells: clearedCells } = calculationEngine.updateCellInput(
              currentSheet.cells,
              coord,
              '',
              namedRangeResolver,
              getCrossSheetCells,
              currentSheet.name
            );
            useSheetStore.getState().setAllCells(clearedCells);
          }
        });
      }
    },
    [activeSheet, setAllCells, namedRangeResolver, getCrossSheetCells]
  );

  // 8. Clipboard: Copy
  const handleCopy = useCallback(async () => {
    if (!activeSheet || !selectedRange) return;
    try {
      const payload = await copyRange(selectedRange, activeSheet.cells);
      toast.info('Copied', `Copied ${payload.rowCount} × ${payload.colCount} range to clipboard.`);
    } catch {
      toast.error('Copy Failed', 'Could not copy to clipboard.');
    }
  }, [activeSheet, selectedRange]);

  // 9. Clipboard: Cut
  const handleCut = useCallback(async () => {
    if (!activeSheet || !selectedRange) return;
    try {
      const payload = await copyRange(selectedRange, activeSheet.cells);
      toast.info('Cut', `Cut ${payload.rowCount} × ${payload.colCount} range.`);
    } catch {
      toast.error('Cut Failed', 'Could not cut cells.');
    }
  }, [activeSheet, selectedRange]);

  // 10. Clipboard: Paste
  const handlePaste = useCallback(async () => {
    if (!activeSheet || !activeCell) return;
    try {
      const text = await getClipboardText();
      if (!text) {
        toast.info('Clipboard Empty', 'No spreadsheet content found in clipboard.');
        return;
      }

      const result = applyPasteData(activeCell, text, activeSheet);
      const tempSheet: Sheet = {
        ...activeSheet,
        rowCount: result.newRowCount ? Math.max(activeSheet.rowCount, result.newRowCount) : activeSheet.rowCount,
        columnCount: result.newColCount ? Math.max(activeSheet.columnCount, result.newColCount) : activeSheet.columnCount,
        cells: {
          ...activeSheet.cells,
          ...result.updatedCells
        }
      };
      const { updatedCells } = calculationEngine.recalculateSheet(tempSheet, namedRangeResolver, getCrossSheetCells);
      setBatchCells(updatedCells, result.newRowCount, result.newColCount);
      toast.success('Pasted', 'Pasted content from clipboard.');
    } catch {
      toast.error('Paste Failed', 'Could not paste from clipboard.');
    }
  }, [activeSheet, activeCell, setBatchCells, namedRangeResolver, getCrossSheetCells]);

  // 11. Row & Column actions
  const handleInsertRowAbove = () => {
    if (!activeCell) return;
    insertRow(activeCell.row, 'above');
    toast.info('Row Inserted', `Inserted row above row ${activeCell.row + 1}.`);
  };

  const handleInsertRowBelow = () => {
    if (!activeCell) return;
    insertRow(activeCell.row, 'below');
    toast.info('Row Inserted', `Inserted row below row ${activeCell.row + 1}.`);
  };

  const handleDeleteRow = () => {
    if (!activeCell || !activeSheet) return;
    if (activeSheet.rowCount <= 1) {
      toast.warning('Action Blocked', 'Cannot delete the only row.');
      return;
    }
    deleteRow(activeCell.row);
    toast.info('Row Deleted', `Deleted row ${activeCell.row + 1}.`);
  };

  const handleInsertColBefore = () => {
    if (!activeCell) return;
    insertColumn(activeCell.col, 'before');
    toast.info('Column Inserted', 'Inserted column before active cell.');
  };

  const handleInsertColAfter = () => {
    if (!activeCell) return;
    insertColumn(activeCell.col, 'after');
    toast.info('Column Inserted', 'Inserted column after active cell.');
  };

  const handleDeleteCol = () => {
    if (!activeCell || !activeSheet) return;
    if (activeSheet.columnCount <= 1) {
      toast.warning('Action Blocked', 'Cannot delete the only column.');
      return;
    }
    deleteColumn(activeCell.col);
    toast.info('Column Deleted', 'Deleted active column.');
  };

  const handleInsertRowAt = useCallback((row: number) => {
    insertRow(row, 'above');
    toast.info('Row Inserted', `Inserted row above row ${row + 1}.`);
  }, [insertRow]);

  const handleDeleteRowAt = useCallback((row: number) => {
    if (!activeSheet || activeSheet.rowCount <= 1) {
      toast.warning('Action Blocked', 'Cannot delete the only row.');
      return;
    }
    deleteRow(row);
    toast.info('Row Deleted', `Deleted row ${row + 1}.`);
  }, [activeSheet, deleteRow]);

  const handleInsertColumnAt = useCallback((col: number) => {
    insertColumn(col, 'before');
    toast.info('Column Inserted', 'Inserted column.');
  }, [insertColumn]);

  const handleDeleteColumnAt = useCallback((col: number) => {
    if (!activeSheet || activeSheet.columnCount <= 1) {
      toast.warning('Action Blocked', 'Cannot delete the only column.');
      return;
    }
    deleteColumn(col);
    toast.info('Column Deleted', 'Deleted column.');
  }, [activeSheet, deleteColumn]);

  // Stage 14: Date & Time Insert Handlers
  const handleInsertCurrentDate = useCallback(() => {
    if (!activeCell || !activeSheet) return;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]!;
    handleUpdateCellValue(activeCell.row, activeCell.col, dateStr);
  }, [activeCell, activeSheet, handleUpdateCellValue]);

  const handleInsertCurrentTime = useCallback(() => {
    if (!activeCell || !activeSheet) return;
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0]!;
    handleUpdateCellValue(activeCell.row, activeCell.col, timeStr);
  }, [activeCell, activeSheet, handleUpdateCellValue]);

  // Stage 14: Navigation & Go To Handlers
  const handleNavigateToRange = useCallback(
    (range: CellRange) => {
      setActiveCell({ row: range.startRow, col: range.startCol });
      setAnchorCell({ row: range.startRow, col: range.startCol });
      setSelectedRange(range);
    },
    [setActiveCell, setAnchorCell, setSelectedRange]
  );

  const handleNavigateToNamedRange = useCallback(
    (namedRange: NamedRange) => {
      if (namedRange.scope === 'sheet' && namedRange.sheetId && namedRange.sheetId !== activeSheet?.id) {
        void handleSelectSheet(namedRange.sheetId);
      }
      handleNavigateToRange(namedRange.range);
    },
    [activeSheet, handleSelectSheet, handleNavigateToRange]
  );

  const handleGoToNavigate = useCallback(
    (sheetId: string, range: CellRange) => {
      if (sheetId !== activeSheet?.id) {
        void handleSelectSheet(sheetId);
      }
      handleNavigateToRange(range);
    },
    [activeSheet, handleSelectSheet, handleNavigateToRange]
  );

  // 12. Selection actions
  const handleSelectCell = (coord: CellCoordinates, isShift: boolean) => {
    if (isShift) {
      selectRangeFromAnchor(coord);
    } else {
      setActiveCell(coord);
    }
  };

  const handleSelectAll = useCallback(() => {
    if (!activeSheet) return;
    selectAll(activeSheet.rowCount, activeSheet.columnCount);
  }, [activeSheet, selectAll]);

  const handleSelectEntireRow = (row: number) => {
    if (!activeSheet) return;
    selectEntireRow(row, activeSheet.columnCount);
  };

  const handleSelectEntireColumn = (col: number) => {
    if (!activeSheet) return;
    selectEntireColumn(col, activeSheet.rowCount);
  };

  // 13. Global Keyboard Shortcuts (Ctrl+C, Ctrl+X, Ctrl+V, Ctrl+A, Ctrl+B, Ctrl+I, Ctrl+U)
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      const targetTag = (e.target as HTMLElement).tagName.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select') {
        return;
      }

      if (isCtrl && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void handleManualSave();
      } else if (isCtrl && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        void historyManager.undo();
      } else if ((isCtrl && e.key.toLowerCase() === 'y') || (isCtrl && e.shiftKey && e.key.toLowerCase() === 'z')) {
        e.preventDefault();
        void historyManager.redo();
      } else if (isCtrl && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        void handleCopy();
      } else if (isCtrl && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        void handleCut();
      } else if (isCtrl && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        void handlePaste();
      } else if (isCtrl && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleSelectAll();
      } else if (isCtrl && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        const activeCellKey = activeCell ? coordToKey(activeCell.row, activeCell.col) : null;
        const currentStyle = activeCellKey && activeSheet ? activeSheet.cells[activeCellKey]?.style : undefined;
        handleApplyStyle({ bold: !currentStyle?.bold });
      } else if (isCtrl && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        const activeCellKey = activeCell ? coordToKey(activeCell.row, activeCell.col) : null;
        const currentStyle = activeCellKey && activeSheet ? activeSheet.cells[activeCellKey]?.style : undefined;
        handleApplyStyle({ italic: !currentStyle?.italic });
      } else if (isCtrl && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        const activeCellKey = activeCell ? coordToKey(activeCell.row, activeCell.col) : null;
        const currentStyle = activeCellKey && activeSheet ? activeSheet.cells[activeCellKey]?.style : undefined;
        handleApplyStyle({ underline: !currentStyle?.underline });
      } else if (isCtrl && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      } else if (isCtrl && !e.shiftKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        setIsPrintOpen(true);
      } else if ((isCtrl && (e.key === 'g' || e.key === 'G')) || e.key === 'F5') {
        e.preventDefault();
        setIsGoToOpen(true);
      } else if (e.key === 'F1') {
        e.preventDefault();
        setIsHelpOpen(true);
      } else if (isCtrl && !e.shiftKey && e.key === ';') {
        e.preventDefault();
        handleInsertCurrentDate();
      } else if (isCtrl && (e.key === ':' || (e.shiftKey && e.key === ';'))) {
        e.preventDefault();
        handleInsertCurrentTime();
      } else if (e.key === 'Escape' && isFormatPainterActive) {
        e.preventDefault();
        deactivateFormatPainter();
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [
    handleManualSave,
    handleCopy,
    handleCut,
    handlePaste,
    handleSelectAll,
    handleApplyStyle,
    handleInsertCurrentDate,
    handleInsertCurrentTime,
    activeCell,
    activeSheet,
    isFormatPainterActive,
    deactivateFormatPainter
  ]);

  // Stage 11: Chart Handlers
  const handleInsertChart = useCallback(
    (chart: ChartConfig) => {
      addChart(chart);
      setSelectedChartId(chart.id);
      toast.success('Chart Inserted', `Added ${chart.title.text || chart.chartType} to sheet.`);
    },
    [addChart]
  );

  const handleUpdateChartPosition = useCallback(
    (chartId: string, position: ChartPositionConfig) => {
      updateChart(chartId, { position });
    },
    [updateChart]
  );

  const handleEditChart = useCallback((chart: ChartConfig) => {
    setEditingChart(chart);
    setIsChartEditorOpen(true);
  }, []);

  const handleDeleteChart = useCallback(
    (chartId: string) => {
      deleteChart(chartId);
      if (selectedChartId === chartId) setSelectedChartId(null);
      toast.info('Chart Deleted', 'Chart removed from worksheet.');
    },
    [deleteChart, selectedChartId]
  );

  const handleDuplicateChart = useCallback(
    (chartId: string) => {
      duplicateChart(chartId);
      toast.success('Chart Duplicated', 'Created copy of chart.');
    },
    [duplicateChart]
  );

  const handleBringForwardChart = useCallback(
    (chartId: string) => {
      bringChartForward(chartId);
    },
    [bringChartForward]
  );

  const handleSendBackwardChart = useCallback(
    (chartId: string) => {
      sendChartBackward(chartId);
    },
    [sendChartBackward]
  );

  const handleExportChart = useCallback((chart: ChartConfig) => {
    setEditingChart(chart);
    setIsChartEditorOpen(true);
  }, []);

  // Keyboard shortcut: Delete selected chart with Delete/Backspace key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedChartId && !editingCell) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          const activeTag = document.activeElement?.tagName;
          if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
            e.preventDefault();
            handleDeleteChart(selectedChartId);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedChartId, editingCell, handleDeleteChart]);

  // Stage 14: Command Palette Commands List
  const paletteCommands = useSpreadsheetPaletteCommands({
    activeSheet,
    activeCell,
    currentTheme,
    showGridlines,
    setShowGridlines,
    showFormulaBar,
    setShowFormulaBar,
    zoom,
    setZoom,
    setTheme,
    handleManualSave,
    handleCut,
    handleCopy,
    handlePaste,
    handleSelectAll,
    handleInsertCurrentDate,
    handleInsertCurrentTime,
    handleApplyStyle,
    handleQuickSort,
    handleToggleFilter,
    handleAddSheet,
    setIsPrintOpen,
    setIsImportOpen,
    setIsExportOpen,
    setIsVersionHistoryOpen,
    setIsBackupRestoreOpen,
    setIsFindReplaceOpen,
    setFindReplaceInitialMode,
    setIsMobileFormattingOpen,
    setIsConditionalFormattingManagerOpen,
    setIsRemoveDuplicatesOpen,
    setIsDataValidationOpen,
    setIsTextToColumnsOpen,
    setIsInsertChartOpen,
    setIsPivotTableOpen,
    setIsNameManagerOpen,
    setIsGoToOpen,
    setIsHelpOpen,
    setIsPreferencesOpen,
  });

  if (isLoading) {
    return <LoadingState message="Loading spreadsheet grid..." />;
  }

  if (loadError || !activeSheet) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <ErrorState
          title="Could Not Open Spreadsheet"
          message={loadError || 'The requested sheet could not be located in local storage.'}
          onRetry={() => void loadWorkbookData()}
        />
      </div>
    );
  }

  // Active cell details for formula bar
  const activeCellKey = activeCell ? coordToKey(activeCell.row, activeCell.col) : '0:0';
  const currentCellData = activeSheet.cells[activeCellKey];
  const rangeDisplayLabel = formatRangeLabel(selectedRange);

  return (
    <div className="flex-1 flex flex-col h-full w-full overflow-hidden bg-background text-foreground select-none">
      {/* Stage 13: Multi-Tab Conflict Alert Banner */}
      {conflictMessage && (
        <MultiTabConflictBanner
          externalRevision={conflictMessage.revision}
          onReload={() => {
            saveQueue.reset();
            window.location.reload();
          }}
          onDismiss={() => {
            setConflictMessage(null);
            saveQueue.resume();
          }}
        />
      )}

      {/* Stage 13: Crash Recovery Notification Banner */}
      {recoveryRecord && (
        <CrashRecoveryPrompt
          recoveryRecord={recoveryRecord}
          onRestore={() => void handleAcceptRecovery()}
          onDiscard={() => void handleDiscardRecovery()}
        />
      )}

      {/* 1. Top Header */}
      <WorkbookHeader
        workbook={workbook}
        saveStatus={saveStatus}
        lastSavedAt={lastSavedAt}
        onRename={handleRenameWorkbook}
        onManualSave={() => void handleManualSave()}
        onRetrySave={() => void saveQueue.retry()}
        onOpenImport={() => setIsImportOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenVersionHistory={() => setIsVersionHistoryOpen(true)}
        onOpenBackupRestore={() => setIsBackupRestoreOpen(true)}
        onOpenStorageManagement={() => setIsStorageManagementOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenPrint={() => setIsPrintOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        onOpenPreferences={() => setIsPreferencesOpen(true)}
        onNewWorkbook={() => { window.location.href = '/'; }}
        onFind={() => {
          setFindReplaceInitialMode('find');
          setIsFindReplaceOpen(true);
        }}
        onCut={handleCut}
        onCopy={handleCopy}
        onPaste={handlePaste}
        onBold={() => {
          const cell = activeCell && activeSheet ? activeSheet.cells[coordToKey(activeCell.row, activeCell.col)] : undefined;
          handleApplyStyle({ bold: !cell?.style?.bold });
        }}
        onItalic={() => {
          const cell = activeCell && activeSheet ? activeSheet.cells[coordToKey(activeCell.row, activeCell.col)] : undefined;
          handleApplyStyle({ italic: !cell?.style?.italic });
        }}
        onSortAsc={() => handleQuickSort('asc', activeCell?.col)}
        onFilter={handleToggleFilter}
      />

      {/* 2. Ribbon Tabs Switcher */}
      <div className="flex items-center gap-1 px-3 pt-1 border-b border-border bg-surface-secondary text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveRibbonTab('home')}
          className={`px-3 py-1.5 rounded-t-md transition-all font-medium ${
            activeRibbonTab === 'home'
              ? 'bg-surface text-accent border-t-2 border-t-accent border-l border-r border-border font-semibold shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-surface-tertiary/50'
          }`}
        >
          Home
        </button>
        <button
          type="button"
          onClick={() => setActiveRibbonTab('insert')}
          className={`px-3 py-1.5 rounded-t-md transition-all font-medium ${
            activeRibbonTab === 'insert'
              ? 'bg-surface text-accent border-t-2 border-t-accent border-l border-r border-border font-semibold shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-surface-tertiary/50'
          }`}
        >
          Insert
        </button>
        <button
          type="button"
          onClick={() => setActiveRibbonTab('data')}
          className={`px-3 py-1.5 rounded-t-md transition-all font-medium ${
            activeRibbonTab === 'data'
              ? 'bg-surface text-accent border-t-2 border-t-accent border-l border-r border-border font-semibold shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-surface-tertiary/50'
          }`}
        >
          Data
        </button>
      </div>

      {/* 2b. Spreadsheet Toolbar */}
      <SpreadsheetToolbar
        rangeLabel={rangeDisplayLabel}
        zoom={zoom}
        onZoomChange={setZoom}
        onCopy={() => void handleCopy()}
        onCut={() => void handleCut()}
        onPaste={() => void handlePaste()}
        onSelectAll={handleSelectAll}
        onInsertRowAbove={handleInsertRowAbove}
        onInsertRowBelow={handleInsertRowBelow}
        onDeleteRow={handleDeleteRow}
        onInsertColBefore={handleInsertColBefore}
        onInsertColAfter={handleInsertColAfter}
        onDeleteCol={handleDeleteCol}
      />

      {/* 3. Conditional Ribbon Toolbar: Home vs Insert vs Data */}
      {activeRibbonTab === 'home' ? (
        <FormattingToolbar
          activeStyle={currentCellData?.style}
          isFormatPainterActive={isFormatPainterActive}
          onApplyStyle={handleApplyStyle}
          onApplyBorders={handleApplyBorders}
          onClearFormatting={handleClearFormatting}
          onToggleFormatPainter={handleToggleFormatPainter}
          onMerge={handleMerge}
          onUnmerge={handleUnmerge}
          onOpenMobilePanel={() => setIsMobileFormattingOpen(true)}
        />
      ) : activeRibbonTab === 'insert' ? (
        <InsertToolbar
          onOpenInsertChart={() => setIsInsertChartOpen(true)}
          onOpenPivotTable={() => setIsPivotTableOpen(true)}
          onOpenFormulaReference={() => setIsReferenceOpen(true)}
        />
      ) : (
        <DataToolbar
          isFilterActive={Boolean(activeSheet.metadata?.filterConfig)}
          hasFilterConditions={Boolean(
            activeSheet.metadata?.filterConfig &&
              Object.keys(activeSheet.metadata.filterConfig.columnFilters || {}).length > 0
          )}
          frozenRows={activeSheet.metadata?.freezePanes?.frozenRows || 0}
          frozenCols={activeSheet.metadata?.freezePanes?.frozenCols || 0}
          isAuditHighlighted={isAuditHighlighted}
          onQuickSortAsc={() => handleQuickSort('asc')}
          onQuickSortDesc={() => handleQuickSort('desc')}
          onOpenCustomSort={() => setIsCustomSortOpen(true)}
          onToggleFilter={handleToggleFilter}
          onClearFilter={handleClearFilter}
          onReapplyFilter={handleReapplyFilter}
          onOpenRemoveDuplicates={() => setIsRemoveDuplicatesOpen(true)}
          onOpenTextToColumns={() => setIsTextToColumnsOpen(true)}
          onTrimWhitespace={handleTrimWhitespace}
          onOpenDataValidation={() => setIsDataValidationOpen(true)}
          onClearDataValidation={handleClearValidation}
          onToggleCircleInvalid={() => setIsAuditHighlighted(!isAuditHighlighted)}
          onFreezeTopRow={handleFreezeTopRow}
          onFreezeFirstColumn={handleFreezeFirstColumn}
          onFreezeAtSelection={handleFreezeAtSelection}
          onUnfreezePanes={handleUnfreezePanes}
          onOpenFind={() => {
            setFindReplaceInitialMode('find');
            setIsFindReplaceOpen(true);
          }}
          onOpenReplace={() => {
            setFindReplaceInitialMode('replace');
            setIsFindReplaceOpen(true);
          }}
          onOpenConditionalFormatting={() => setIsConditionalFormattingOpen(true)}
          onOpenConditionalFormattingManager={() => setIsConditionalFormattingManagerOpen(true)}
          onClearConditionalFormattingSelection={handleClearConditionalFormattingSelection}
          onClearConditionalFormattingSheet={handleClearConditionalFormattingSheet}
          onOpenNameManager={() => setIsNameManagerOpen(true)}
          onOpenPivotTable={() => setIsPivotTableOpen(true)}
          onOpenSubtotals={() => setIsSubtotalsOpen(true)}
          onGroupSelectedRows={handleGroupSelectedRows}
          onUngroupSelectedRows={handleUngroupSelectedRows}
          onOpenGoalSeek={() => setIsGoalSeekOpen(true)}
          onOpenScenarioManager={() => setIsScenarioManagerOpen(true)}
          onOpenImport={() => setIsImportOpen(true)}
          onOpenExport={() => setIsExportOpen(true)}
        />
      )}

      {/* 4. Formula Bar */}
      {showFormulaBar && (
        <FormulaBar
          activeCell={activeCell}
          cell={currentCellData}
          isEditing={!!editingCell}
          editingValue={editingValue}
          selectedRange={selectedRange}
          namedRanges={currentWorkbook?.metadata?.namedRanges || workbook?.metadata?.namedRanges || []}
          onStartEditing={(initVal) => activeCell && startEditing(activeCell, initVal)}
          onEditingChange={setEditingValue}
          onCommitEditing={handleCommitEditing}
          onCancelEditing={stopEditing}
          onOpenReference={() => setIsReferenceOpen(true)}
          onNavigateToRange={handleNavigateToRange}
          onNavigateToNamedRange={handleNavigateToNamedRange}
        />
      )}

      {/* 5. Virtualized Spreadsheet Grid Viewport */}
      <div className="flex-1 relative overflow-hidden flex flex-col min-h-0 min-w-0">
        <SpreadsheetGrid
          sheet={activeSheet}
          activeCell={activeCell}
          selectedRange={selectedRange}
          anchorCell={anchorCell}
          zoom={zoom}
          editingCell={editingCell}
          editingValue={editingValue}
          isFormatPainterActive={isFormatPainterActive}
          isAuditHighlighted={isAuditHighlighted}
          showGridlines={showGridlines}
          onApplyFormatPainter={handleApplyFormatPainter}
          onSelectCell={handleSelectCell}
          onDragSelect={selectRangeFromAnchor}
          onSelectEntireRow={handleSelectEntireRow}
          onSelectEntireColumn={handleSelectEntireColumn}
          onSelectAll={handleSelectAll}
          onResizeRow={setRowHeight}
          onResizeColumn={setColumnWidth}
          onStartEditing={startEditing}
          onEditingChange={setEditingValue}
          onCommitEditing={handleCommitEditing}
          onCancelEditing={stopEditing}
          onClearCell={handleClearCell}
          onOpenColumnFilter={(col) => setActiveFilterCol(col)}
          onUpdateCellValue={handleUpdateCellValue}
          onToggleRowGroup={handleToggleRowGroup}
          selectedChartId={selectedChartId}
          onSelectChart={setSelectedChartId}
          onEditChart={handleEditChart}
          onDeleteChart={handleDeleteChart}
          onDuplicateChart={handleDuplicateChart}
          onBringForwardChart={handleBringForwardChart}
          onSendBackwardChart={handleSendBackwardChart}
          onUpdateChartPosition={handleUpdateChartPosition}
          onExportChart={handleExportChart}
          namedRangeResolver={namedRangeResolver}
          pivotTables={activeSheet.metadata?.pivotTables}
          onCopy={handleCopy}
          onCut={handleCut}
          onPaste={handlePaste}
          onInsertRow={handleInsertRowAt}
          onDeleteRow={handleDeleteRowAt}
          onInsertColumn={handleInsertColumnAt}
          onDeleteColumn={handleDeleteColumnAt}
          onOpenFormatCells={() => setIsMobileFormattingOpen(true)}
          onOpenDefineName={() => setIsNameManagerOpen(true)}
          onQuickSort={handleQuickSort}
        />
      </div>

      {/* 6. Bottom Sheet Tabs Bar */}
      <SheetTabsBar
        sheets={sheets}
        activeSheetId={activeSheet.id}
        onSelectSheet={(sheetId) => void handleSelectSheet(sheetId)}
        onAddSheet={(insertAfterSheetId) => void handleAddSheet(insertAfterSheetId)}
        onRenameSheet={handleRenameSheet}
        onDuplicateSheet={handleDuplicateSheet}
        onDeleteSheetRequest={(sheet) => setSheetToDelete(sheet)}
        onMoveSheet={handleMoveSheet}
        onReorderSheets={handleReorderSheets}
        onSetTabColor={handleSetTabColor}
        onHideSheet={handleHideSheet}
        onOpenUnhideDialog={() => setIsUnhideDialogOpen(true)}
      />

      {/* 6b. Stage 14: Bottom Status Bar */}
      <SpreadsheetStatusBar
        isEditing={Boolean(editingCell)}
        activeCell={activeCell}
        selectedRange={selectedRange}
        cells={activeSheet.cells}
        zoom={Math.round(zoom * 100)}
        onZoomChange={(newZoomPct) => setZoom(newZoomPct / 100)}
        showGridlines={showGridlines}
        onToggleGridlines={() => setShowGridlines(!showGridlines)}
        showFormulaBar={showFormulaBar}
        onToggleFormulaBar={() => setShowFormulaBar(!showFormulaBar)}
      />

      {/* 7. Formula Reference Panel Modal */}
      <FormulaReferencePanel
        isOpen={isReferenceOpen}
        onClose={() => setIsReferenceOpen(false)}
        onInsertFunction={handleInsertFunction}
      />

      {/* 8-37. Dialog Modals, Drawers & Popovers */}
      <SpreadsheetModals
        isMergeWarningOpen={isMergeWarningOpen}
        setIsMergeWarningOpen={setIsMergeWarningOpen}
        isMobileFormattingOpen={isMobileFormattingOpen}
        setIsMobileFormattingOpen={setIsMobileFormattingOpen}
        sheetToDelete={sheetToDelete}
        setSheetToDelete={setSheetToDelete}
        isUnhideDialogOpen={isUnhideDialogOpen}
        setIsUnhideDialogOpen={setIsUnhideDialogOpen}
        isCustomSortOpen={isCustomSortOpen}
        setIsCustomSortOpen={setIsCustomSortOpen}
        activeFilterCol={activeFilterCol}
        setActiveFilterCol={setActiveFilterCol}
        isFindReplaceOpen={isFindReplaceOpen}
        setIsFindReplaceOpen={setIsFindReplaceOpen}
        findReplaceInitialMode={findReplaceInitialMode}
        isRemoveDuplicatesOpen={isRemoveDuplicatesOpen}
        setIsRemoveDuplicatesOpen={setIsRemoveDuplicatesOpen}
        isDataValidationOpen={isDataValidationOpen}
        setIsDataValidationOpen={setIsDataValidationOpen}
        isTextToColumnsOpen={isTextToColumnsOpen}
        setIsTextToColumnsOpen={setIsTextToColumnsOpen}
        isConditionalFormattingOpen={isConditionalFormattingOpen}
        setIsConditionalFormattingOpen={setIsConditionalFormattingOpen}
        isConditionalFormattingManagerOpen={isConditionalFormattingManagerOpen}
        setIsConditionalFormattingManagerOpen={setIsConditionalFormattingManagerOpen}
        isNameManagerOpen={isNameManagerOpen}
        setIsNameManagerOpen={setIsNameManagerOpen}
        isPivotTableOpen={isPivotTableOpen}
        setIsPivotTableOpen={setIsPivotTableOpen}
        isSubtotalsOpen={isSubtotalsOpen}
        setIsSubtotalsOpen={setIsSubtotalsOpen}
        isGoalSeekOpen={isGoalSeekOpen}
        setIsGoalSeekOpen={setIsGoalSeekOpen}
        isScenarioManagerOpen={isScenarioManagerOpen}
        setIsScenarioManagerOpen={setIsScenarioManagerOpen}
        isInsertChartOpen={isInsertChartOpen}
        setIsInsertChartOpen={setIsInsertChartOpen}
        isChartEditorOpen={isChartEditorOpen}
        setIsChartEditorOpen={setIsChartEditorOpen}
        editingChart={editingChart}
        setEditingChart={setEditingChart}
        isImportOpen={isImportOpen}
        setIsImportOpen={setIsImportOpen}
        isExportOpen={isExportOpen}
        setIsExportOpen={setIsExportOpen}
        isVersionHistoryOpen={isVersionHistoryOpen}
        setIsVersionHistoryOpen={setIsVersionHistoryOpen}
        isBackupRestoreOpen={isBackupRestoreOpen}
        setIsBackupRestoreOpen={setIsBackupRestoreOpen}
        isStorageManagementOpen={isStorageManagementOpen}
        setIsStorageManagementOpen={setIsStorageManagementOpen}
        isCommandPaletteOpen={isCommandPaletteOpen}
        setIsCommandPaletteOpen={setIsCommandPaletteOpen}
        isGoToOpen={isGoToOpen}
        setIsGoToOpen={setIsGoToOpen}
        isPrintOpen={isPrintOpen}
        setIsPrintOpen={setIsPrintOpen}
        isHelpOpen={isHelpOpen}
        setIsHelpOpen={setIsHelpOpen}
        isPreferencesOpen={isPreferencesOpen}
        setIsPreferencesOpen={setIsPreferencesOpen}
        isWelcomeTourOpen={isWelcomeTourOpen}
        setIsWelcomeTourOpen={setIsWelcomeTourOpen}
        workbook={workbook}
        currentWorkbook={currentWorkbook}
        activeSheet={activeSheet}
        sheets={sheets}
        activeCell={activeCell}
        selectedRange={selectedRange}
        currentCellData={currentCellData}
        paletteCommands={paletteCommands}
        getDataRange={getDataRange}
        getTargetRange={getTargetRange}
        namedRangeResolver={namedRangeResolver}
        handleConfirmMerge={handleConfirmMerge}
        handleApplyStyle={handleApplyStyle}
        handleClearFormatting={handleClearFormatting}
        handleConfirmDeleteSheet={handleConfirmDeleteSheet}
        handleUnhideSheet={handleUnhideSheet}
        handleCustomSort={handleCustomSort}
        handleApplyColumnFilter={handleApplyColumnFilter}
        handleQuickSort={handleQuickSort}
        handleNavigateToMatch={handleNavigateToMatch}
        handleUpdateFindSheet={handleUpdateFindSheet}
        handleUpdateFindSheets={handleUpdateFindSheets}
        handleApplyRemoveDuplicates={handleApplyRemoveDuplicates}
        handleApplyValidationRule={handleApplyValidationRule}
        handleClearValidation={handleClearValidation}
        handleApplyTextToColumns={handleApplyTextToColumns}
        handleSaveConditionalFormat={handleSaveConditionalFormat}
        handleUpdateConditionalFormats={handleUpdateConditionalFormats}
        handleAddNamedRange={handleAddNamedRange}
        handleUpdateNamedRange={handleUpdateNamedRange}
        handleDeleteNamedRange={handleDeleteNamedRange}
        handleApplyPivotTable={handleApplyPivotTable}
        handleApplySubtotals={handleApplySubtotals}
        handleRemoveSubtotals={handleRemoveSubtotals}
        handleRunGoalSeek={handleRunGoalSeek}
        handleAddScenario={handleAddScenario}
        handleUpdateScenario={handleUpdateScenario}
        handleDeleteScenario={handleDeleteScenario}
        handleApplyScenario={handleApplyScenario}
        handleComputeScenarioResults={handleComputeScenarioResults}
        handleInsertChart={handleInsertChart}
        updateChart={updateChart}
        handleImportSuccess={handleImportSuccess}
        onRestoreVersionSuccess={(restoredWb: Workbook, restoredSheets: Sheet[]) => {
          setWorkbook(restoredWb);
          setCurrentWorkbook(restoredWb);
          setSheets(restoredSheets);
          const targetSheet =
            restoredSheets.find((s) => s.id === restoredWb.activeSheetId) || restoredSheets[0];
          if (targetSheet) {
            const { updatedCells } = calculationEngine.recalculateSheet(targetSheet);
            setActiveSheet({ ...targetSheet, cells: updatedCells });
          }
        }}
        onRestoreBackupSuccess={() => {
          void loadWorkbookData();
        }}
        handleGoToNavigate={handleGoToNavigate}
      />
    </div>
  );
};
