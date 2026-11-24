import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Workbook } from '@/types/workbook';
import { Sheet } from '@/types/sheet';
import { CellCoordinates, CellRange, CellStyle } from '@/types/cell';
import { BorderPosition, BorderStyleType } from '@/types/formatting';
import { PersistenceStatus } from '@/types/storage';
import { workbookService } from '@/services';
import { useSheetStore } from '@/stores/sheet-store';
import { useSelectionStore } from '@/stores/selection-store';
import { useWorkbookStore } from '@/stores/workbook-store';
import { useFormatPainterStore } from '@/stores/format-painter-store';
import { toast } from '@/stores/toast-store';
import { coordToKey } from '@/utils/coordinates';
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
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import {
  WorkbookHeader,
  SpreadsheetToolbar,
  FormattingToolbar,
  FormulaBar,
  SpreadsheetGrid,
  SheetTabsBar,
  FormulaReferencePanel,
  MergeConfirmDialog,
  MobileFormattingPanel,
  UnhideSheetsDialog
} from './components';

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

  const activeCell = useSelectionStore((state) => state.activeCell);
  const anchorCell = useSelectionStore((state) => state.anchorCell);
  const selectedRange = useSelectionStore((state) => state.selectedRange);
  const editingCell = useSelectionStore((state) => state.editingCell);
  const editingValue = useSelectionStore((state) => state.editingValue);
  const setActiveCell = useSelectionStore((state) => state.setActiveCell);
  const selectRangeFromAnchor = useSelectionStore((state) => state.selectRangeFromAnchor);
  const selectEntireRow = useSelectionStore((state) => state.selectEntireRow);
  const selectEntireColumn = useSelectionStore((state) => state.selectEntireColumn);
  const selectAll = useSelectionStore((state) => state.selectAll);
  const startEditing = useSelectionStore((state) => state.startEditing);
  const setEditingValue = useSelectionStore((state) => state.setEditingValue);
  const stopEditing = useSelectionStore((state) => state.stopEditing);

  const setCurrentWorkbook = useWorkbookStore((state) => state.setCurrentWorkbook);

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

      const updatedCells = applyStyleToRange(activeSheet.cells, target, styleUpdate);
      setBatchCells(updatedCells);
    },
    [activeSheet, getTargetRange, setBatchCells]
  );

  const handleApplyBorders = useCallback(
    (position: BorderPosition, style: BorderStyleType, color: string) => {
      if (!activeSheet) return;
      const target = getTargetRange();
      if (!target) return;

      const updatedCells = applyBordersToRange(activeSheet.cells, target, position, style, color);
      setBatchCells(updatedCells);
    },
    [activeSheet, getTargetRange, setBatchCells]
  );

  const handleClearFormatting = useCallback(() => {
    if (!activeSheet) return;
    const target = getTargetRange();
    if (!target) return;

    const updatedCells = clearFormattingFromRange(activeSheet.cells, target);
    setBatchCells(updatedCells);
    toast.info('Formatting Cleared', 'Cell formatting has been reset to default.');
  }, [activeSheet, getTargetRange, setBatchCells]);

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

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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

  // 2. Debounced auto-save when activeSheet changes
  useEffect(() => {
    if (isInitialLoadRef.current || !activeSheet) return;

    setSaveStatus('saving');

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await workbookService.saveSheet(activeSheet);
        setSaveStatus('saved');
      } catch {
        setSaveStatus('error');
        toast.error('Save Failed', 'Unable to persist changes to IndexedDB.');
      }
    }, 400);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [activeSheet]);

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
  const handleAddSheet = async (insertAfterSheetId?: string) => {
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
  };

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
  const handleSelectSheet = async (sheetId: string) => {
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
  };

  // 6. Cell Editing Commit & Recalculation Handler
  const handleCommitEditing = useCallback(
    (moveTo: 'down' | 'up' | 'right' | 'left' | 'none' = 'none') => {
      if (!activeSheet || !editingCell) return;

      const targetCoord = { ...editingCell };
      const { updatedCells } = calculationEngine.updateCellInput(
        activeSheet.cells,
        targetCoord,
        editingValue
      );

      setBatchCells(updatedCells);
      stopEditing();

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
    [activeSheet, editingCell, editingValue, setBatchCells, stopEditing, setActiveCell]
  );

  // 7. Clear Cell Contents (Delete / Backspace)
  const handleClearCell = useCallback(
    (coord: CellCoordinates) => {
      if (!activeSheet) return;
      const { updatedCells } = calculationEngine.updateCellInput(
        activeSheet.cells,
        coord,
        ''
      );
      setBatchCells(updatedCells);
    },
    [activeSheet, setBatchCells]
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
      const { updatedCells } = calculationEngine.recalculateSheet(tempSheet);
      setBatchCells(updatedCells, result.newRowCount, result.newColCount);
      toast.success('Pasted', 'Pasted content from clipboard.');
    } catch {
      toast.error('Paste Failed', 'Could not paste from clipboard.');
    }
  }, [activeSheet, activeCell, setBatchCells]);

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

      if (isCtrl && e.key.toLowerCase() === 'c') {
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
      } else if (e.key === 'Escape' && isFormatPainterActive) {
        e.preventDefault();
        deactivateFormatPainter();
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [
    handleCopy,
    handleCut,
    handlePaste,
    handleSelectAll,
    handleApplyStyle,
    activeCell,
    activeSheet,
    isFormatPainterActive,
    deactivateFormatPainter
  ]);

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
      {/* 1. Top Header */}
      <WorkbookHeader
        workbook={workbook}
        saveStatus={saveStatus}
        onRename={handleRenameWorkbook}
      />

      {/* 2. Spreadsheet Toolbar */}
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

      {/* 3. Formatting Toolbar */}
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

      {/* 4. Formula Bar */}
      <FormulaBar
        activeCell={activeCell}
        cell={currentCellData}
        isEditing={!!editingCell}
        editingValue={editingValue}
        onStartEditing={(initVal) => activeCell && startEditing(activeCell, initVal)}
        onEditingChange={setEditingValue}
        onCommitEditing={handleCommitEditing}
        onCancelEditing={stopEditing}
        onOpenReference={() => setIsReferenceOpen(true)}
      />

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

      {/* 7. Formula Reference Panel Modal */}
      <FormulaReferencePanel
        isOpen={isReferenceOpen}
        onClose={() => setIsReferenceOpen(false)}
        onInsertFunction={handleInsertFunction}
      />

      {/* 8. Merge Confirmation Warning Dialog */}
      <MergeConfirmDialog
        isOpen={isMergeWarningOpen}
        onConfirm={handleConfirmMerge}
        onCancel={() => setIsMergeWarningOpen(false)}
      />

      {/* 9. Mobile Formatting Drawer Panel */}
      <MobileFormattingPanel
        isOpen={isMobileFormattingOpen}
        onClose={() => setIsMobileFormattingOpen(false)}
        activeStyle={currentCellData?.style}
        onApplyStyle={handleApplyStyle}
        onClearFormatting={handleClearFormatting}
      />

      {/* 10. Delete Worksheet Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={Boolean(sheetToDelete)}
        onClose={() => setSheetToDelete(null)}
        onConfirm={handleConfirmDeleteSheet}
        title="Delete Worksheet"
        message={
          <span>
            Are you sure you want to permanently delete{' '}
            <strong className="text-foreground">{sheetToDelete?.name}</strong>?
            All data, cells, and formatting in this sheet will be permanently removed.
          </span>
        }
        confirmLabel="Delete"
        isDestructive={true}
      />

      {/* 11. Unhide Worksheets Dialog */}
      <UnhideSheetsDialog
        isOpen={isUnhideDialogOpen}
        onClose={() => setIsUnhideDialogOpen(false)}
        hiddenSheets={sheets.filter((s) => s.metadata?.isHidden)}
        onUnhide={(sheetId) => void handleUnhideSheet(sheetId)}
      />
    </div>
  );
};
