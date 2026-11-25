import React from 'react';
import { Sheet } from '@/types/sheet';
import { Workbook } from '@/types/workbook';
import { Cell, CellCoordinates, CellRange, CellStyle, CellValue } from '@/types/cell';
import {
  NamedRange,
  PivotTableConfig,
  SubtotalConfig,
  Scenario,
  ConditionalFormatRule,
} from '@/types/analysis';
import { SortConfig, ColumnFilter, DataValidationRule } from '@/types/data-tools';
import { ChartConfig } from '@/types/chart';
import { MergeConfirmDialog } from './MergeConfirmDialog';
import { MobileFormattingPanel } from './MobileFormattingPanel';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { UnhideSheetsDialog } from './UnhideSheetsDialog';
import { CustomSortDialog } from './CustomSortDialog';
import { ColumnFilterPopover } from './ColumnFilterPopover';
import { FindReplaceDialog } from './FindReplaceDialog';
import { RemoveDuplicatesDialog } from './RemoveDuplicatesDialog';
import { DataValidationDialog } from './DataValidationDialog';
import { TextToColumnsDialog } from './TextToColumnsDialog';
import { ConditionalFormattingDialog } from './ConditionalFormattingDialog';
import { ConditionalFormattingManagerDialog } from './ConditionalFormattingManagerDialog';
import { NameManagerDialog } from './NameManagerDialog';
import { PivotTableDialog } from './PivotTableDialog';
import { SubtotalsDialog } from './SubtotalsDialog';
import { GoalSeekDialog } from './GoalSeekDialog';
import { ScenarioManagerDialog } from './ScenarioManagerDialog';
import { InsertChartDialog } from './InsertChartDialog';
import { ChartEditorDialog } from './ChartEditorDialog';
import { ImportDialog } from './ImportDialog';
import { ExportDialog } from './ExportDialog';
import { VersionHistoryDialog } from './VersionHistoryDialog';
import { BackupRestoreDialog } from './BackupRestoreDialog';
import { StorageManagementDialog } from './StorageManagementDialog';
import { CommandPaletteDialog, CommandPaletteAction } from './CommandPaletteDialog';
import { GoToDialog } from './GoToDialog';
import { PrintDialog } from './PrintDialog';
import { HelpShortcutsDialog } from './HelpShortcutsDialog';
import { PreferencesDialog } from './PreferencesDialog';
import { WelcomeTourModal } from './WelcomeTourModal';
import { ImportResult } from '@/types/io';

export interface SpreadsheetModalsProps {
  // Dialog Open States
  isMergeWarningOpen: boolean;
  setIsMergeWarningOpen: (open: boolean) => void;
  isMobileFormattingOpen: boolean;
  setIsMobileFormattingOpen: (open: boolean) => void;
  sheetToDelete: Sheet | null;
  setSheetToDelete: (sheet: Sheet | null) => void;
  isUnhideDialogOpen: boolean;
  setIsUnhideDialogOpen: (open: boolean) => void;
  isCustomSortOpen: boolean;
  setIsCustomSortOpen: (open: boolean) => void;
  activeFilterCol: number | null;
  setActiveFilterCol: (col: number | null) => void;
  isFindReplaceOpen: boolean;
  setIsFindReplaceOpen: (open: boolean) => void;
  findReplaceInitialMode: 'find' | 'replace';
  isRemoveDuplicatesOpen: boolean;
  setIsRemoveDuplicatesOpen: (open: boolean) => void;
  isDataValidationOpen: boolean;
  setIsDataValidationOpen: (open: boolean) => void;
  isTextToColumnsOpen: boolean;
  setIsTextToColumnsOpen: (open: boolean) => void;
  isConditionalFormattingOpen: boolean;
  setIsConditionalFormattingOpen: (open: boolean) => void;
  isConditionalFormattingManagerOpen: boolean;
  setIsConditionalFormattingManagerOpen: (open: boolean) => void;
  isNameManagerOpen: boolean;
  setIsNameManagerOpen: (open: boolean) => void;
  isPivotTableOpen: boolean;
  setIsPivotTableOpen: (open: boolean) => void;
  isSubtotalsOpen: boolean;
  setIsSubtotalsOpen: (open: boolean) => void;
  isGoalSeekOpen: boolean;
  setIsGoalSeekOpen: (open: boolean) => void;
  isScenarioManagerOpen: boolean;
  setIsScenarioManagerOpen: (open: boolean) => void;
  isInsertChartOpen: boolean;
  setIsInsertChartOpen: (open: boolean) => void;
  isChartEditorOpen: boolean;
  setIsChartEditorOpen: (open: boolean) => void;
  editingChart: ChartConfig | null;
  setEditingChart: (chart: ChartConfig | null) => void;
  isImportOpen: boolean;
  setIsImportOpen: (open: boolean) => void;
  isExportOpen: boolean;
  setIsExportOpen: (open: boolean) => void;
  isVersionHistoryOpen: boolean;
  setIsVersionHistoryOpen: (open: boolean) => void;
  isBackupRestoreOpen: boolean;
  setIsBackupRestoreOpen: (open: boolean) => void;
  isStorageManagementOpen: boolean;
  setIsStorageManagementOpen: (open: boolean) => void;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  isGoToOpen: boolean;
  setIsGoToOpen: (open: boolean) => void;
  isPrintOpen: boolean;
  setIsPrintOpen: (open: boolean) => void;
  isHelpOpen: boolean;
  setIsHelpOpen: (open: boolean) => void;
  isPreferencesOpen: boolean;
  setIsPreferencesOpen: (open: boolean) => void;
  isWelcomeTourOpen: boolean;
  setIsWelcomeTourOpen: (open: boolean) => void;

  // Context & Entities
  workbook: Workbook | null;
  currentWorkbook: Workbook | null;
  activeSheet: Sheet;
  sheets: Sheet[];
  activeCell: CellCoordinates | null;
  selectedRange: CellRange | null;
  currentCellData?: { style?: CellStyle };
  paletteCommands: CommandPaletteAction[];

  // Helpers
  getDataRange: () => CellRange;
  getTargetRange: () => CellRange | null;
  namedRangeResolver: (name: string) => NamedRange | null;

  // Handlers
  handleConfirmMerge: () => void;
  handleApplyStyle: (style: Partial<CellStyle>) => void;
  handleClearFormatting: () => void;
  handleConfirmDeleteSheet: () => Promise<void>;
  handleUnhideSheet: (sheetId: string) => Promise<void>;
  handleCustomSort: (config: SortConfig) => void;
  handleApplyColumnFilter: (col: number, filter: ColumnFilter | null) => void;
  handleQuickSort: (direction: 'asc' | 'desc', col?: number) => void;
  handleNavigateToMatch: (sheetId: string, row: number, col: number) => void;
  handleUpdateFindSheet: (sheet: Sheet) => void;
  handleUpdateFindSheets: (sheets: Sheet[]) => void;
  handleApplyRemoveDuplicates: (updatedCells: Sheet['cells'], removedCount: number, remainingCount: number) => void;
  handleApplyValidationRule: (rule: DataValidationRule) => void;
  handleClearValidation: () => void;
  handleApplyTextToColumns: (newCells: Record<string, Cell>) => void;
  handleSaveConditionalFormat: (rule: ConditionalFormatRule) => void;
  handleUpdateConditionalFormats: (rules: ConditionalFormatRule[]) => void;
  handleAddNamedRange: (namedRange: NamedRange) => void;
  handleUpdateNamedRange: (namedRange: NamedRange) => void;
  handleDeleteNamedRange: (id: string) => void;
  handleApplyPivotTable: (config: PivotTableConfig) => void;
  handleApplySubtotals: (config: SubtotalConfig) => void;
  handleRemoveSubtotals: () => void;
  handleRunGoalSeek: (targetCoord: CellCoordinates, targetValue: number, variableCoord: CellCoordinates) => { evaluateWithVariable: (x: number) => number; commitVariableValue: (x: number) => void };
  handleAddScenario: (scenario: Scenario) => void;
  handleUpdateScenario: (scenario: Scenario) => void;
  handleDeleteScenario: (id: string) => void;
  handleApplyScenario: (scenario: Scenario) => void;
  handleComputeScenarioResults: (scenario: Scenario) => Record<string, CellValue>;
  handleInsertChart: (chart: ChartConfig) => void;
  updateChart: (chartId: string, updates: Partial<ChartConfig>) => void;
  handleImportSuccess: (result: ImportResult) => void;
  onRestoreVersionSuccess: (restoredWb: Workbook, restoredSheets: Sheet[]) => void;
  onRestoreBackupSuccess: () => void;
  handleGoToNavigate: (sheetId: string, range: CellRange) => void;
}

export const SpreadsheetModals: React.FC<SpreadsheetModalsProps> = (props) => {
  const {
    isMergeWarningOpen,
    setIsMergeWarningOpen,
    isMobileFormattingOpen,
    setIsMobileFormattingOpen,
    sheetToDelete,
    setSheetToDelete,
    isUnhideDialogOpen,
    setIsUnhideDialogOpen,
    isCustomSortOpen,
    setIsCustomSortOpen,
    activeFilterCol,
    setActiveFilterCol,
    isFindReplaceOpen,
    setIsFindReplaceOpen,
    findReplaceInitialMode,
    isRemoveDuplicatesOpen,
    setIsRemoveDuplicatesOpen,
    isDataValidationOpen,
    setIsDataValidationOpen,
    isTextToColumnsOpen,
    setIsTextToColumnsOpen,
    isConditionalFormattingOpen,
    setIsConditionalFormattingOpen,
    isConditionalFormattingManagerOpen,
    setIsConditionalFormattingManagerOpen,
    isNameManagerOpen,
    setIsNameManagerOpen,
    isPivotTableOpen,
    setIsPivotTableOpen,
    isSubtotalsOpen,
    setIsSubtotalsOpen,
    isGoalSeekOpen,
    setIsGoalSeekOpen,
    isScenarioManagerOpen,
    setIsScenarioManagerOpen,
    isInsertChartOpen,
    setIsInsertChartOpen,
    isChartEditorOpen,
    setIsChartEditorOpen,
    editingChart,
    setEditingChart,
    isImportOpen,
    setIsImportOpen,
    isExportOpen,
    setIsExportOpen,
    isVersionHistoryOpen,
    setIsVersionHistoryOpen,
    isBackupRestoreOpen,
    setIsBackupRestoreOpen,
    isStorageManagementOpen,
    setIsStorageManagementOpen,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    isGoToOpen,
    setIsGoToOpen,
    isPrintOpen,
    setIsPrintOpen,
    isHelpOpen,
    setIsHelpOpen,
    isPreferencesOpen,
    setIsPreferencesOpen,
    isWelcomeTourOpen,
    setIsWelcomeTourOpen,
    workbook,
    currentWorkbook,
    activeSheet,
    sheets,
    activeCell,
    selectedRange,
    currentCellData,
    paletteCommands,
    getDataRange,
    getTargetRange,
    namedRangeResolver,
    handleConfirmMerge,
    handleApplyStyle,
    handleClearFormatting,
    handleConfirmDeleteSheet,
    handleUnhideSheet,
    handleCustomSort,
    handleApplyColumnFilter,
    handleQuickSort,
    handleNavigateToMatch,
    handleUpdateFindSheet,
    handleUpdateFindSheets,
    handleApplyRemoveDuplicates,
    handleApplyValidationRule,
    handleClearValidation,
    handleApplyTextToColumns,
    handleSaveConditionalFormat,
    handleUpdateConditionalFormats,
    handleAddNamedRange,
    handleUpdateNamedRange,
    handleDeleteNamedRange,
    handleApplyPivotTable,
    handleApplySubtotals,
    handleRemoveSubtotals,
    handleRunGoalSeek,
    handleAddScenario,
    handleUpdateScenario,
    handleDeleteScenario,
    handleApplyScenario,
    handleComputeScenarioResults,
    handleInsertChart,
    updateChart,
    handleImportSuccess,
    onRestoreVersionSuccess,
    onRestoreBackupSuccess,
    handleGoToNavigate,
  } = props;

  return (
    <>
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

      {/* 12. Custom Multi-Level Sort Dialog */}
      <CustomSortDialog
        isOpen={isCustomSortOpen}
        onClose={() => setIsCustomSortOpen(false)}
        onSort={handleCustomSort}
        sheet={activeSheet}
        range={getDataRange()}
      />

      {/* 13. Column Filter Popover */}
      {activeFilterCol !== null && (
        <ColumnFilterPopover
          isOpen={activeFilterCol !== null}
          onClose={() => setActiveFilterCol(null)}
          col={activeFilterCol}
          sheet={activeSheet}
          range={activeSheet.metadata?.filterConfig?.range || getDataRange()}
          currentFilter={activeSheet.metadata?.filterConfig?.columnFilters?.[activeFilterCol]}
          onApplyFilter={handleApplyColumnFilter}
          onQuickSort={(dir) => handleQuickSort(dir, activeFilterCol)}
        />
      )}

      {/* 14. Find and Replace Dialog */}
      <FindReplaceDialog
        isOpen={isFindReplaceOpen}
        onClose={() => setIsFindReplaceOpen(false)}
        activeSheet={activeSheet}
        sheets={sheets}
        initialMode={findReplaceInitialMode}
        onNavigateToCell={handleNavigateToMatch}
        onUpdateSheet={handleUpdateFindSheet}
        onUpdateSheets={handleUpdateFindSheets}
      />

      {/* 15. Remove Duplicates Dialog */}
      <RemoveDuplicatesDialog
        isOpen={isRemoveDuplicatesOpen}
        onClose={() => setIsRemoveDuplicatesOpen(false)}
        sheet={activeSheet}
        range={getDataRange()}
        onApplyRemoveDuplicates={handleApplyRemoveDuplicates}
      />

      {/* 16. Data Validation Dialog */}
      <DataValidationDialog
        isOpen={isDataValidationOpen}
        onClose={() => setIsDataValidationOpen(false)}
        range={getTargetRange() || getDataRange()}
        existingRule={activeSheet.metadata?.dataValidations?.find((r) => {
          const target = getTargetRange() || getDataRange();
          return (
            Math.max(r.range.startRow, target.startRow) <= Math.min(r.range.endRow, target.endRow) &&
            Math.max(r.range.startCol, target.startCol) <= Math.min(r.range.endCol, target.endCol)
          );
        })}
        onApplyRule={handleApplyValidationRule}
        onClearRule={handleClearValidation}
      />

      {/* 17. Convert Text to Columns Dialog */}
      <TextToColumnsDialog
        isOpen={isTextToColumnsOpen}
        onClose={() => setIsTextToColumnsOpen(false)}
        sheet={activeSheet}
        range={getTargetRange() || getDataRange()}
        onApplyTextToColumns={handleApplyTextToColumns}
      />

      {/* 18. Conditional Formatting Dialog (New Rule) */}
      <ConditionalFormattingDialog
        isOpen={isConditionalFormattingOpen}
        initialRange={getTargetRange() || getDataRange()}
        onSaveRule={handleSaveConditionalFormat}
        onClose={() => setIsConditionalFormattingOpen(false)}
      />

      {/* 19. Conditional Formatting Rules Manager Dialog */}
      <ConditionalFormattingManagerDialog
        isOpen={isConditionalFormattingManagerOpen}
        rules={activeSheet.metadata?.conditionalFormats || []}
        currentSelection={getTargetRange() || undefined}
        onUpdateRules={handleUpdateConditionalFormats}
        onClose={() => setIsConditionalFormattingManagerOpen(false)}
      />

      {/* 20. Name Manager Dialog */}
      <NameManagerDialog
        isOpen={isNameManagerOpen}
        namedRanges={currentWorkbook?.metadata?.namedRanges || workbook?.metadata?.namedRanges || []}
        currentSheetId={activeSheet.id}
        currentSheetName={activeSheet.name}
        sheets={sheets}
        currentSelection={getTargetRange() || undefined}
        onAddNamedRange={handleAddNamedRange}
        onUpdateNamedRange={handleUpdateNamedRange}
        onDeleteNamedRange={handleDeleteNamedRange}
        onClose={() => setIsNameManagerOpen(false)}
      />

      {/* 21. Pivot Table Dialog */}
      <PivotTableDialog
        isOpen={isPivotTableOpen}
        activeSheetId={activeSheet.id}
        sheets={sheets}
        cells={activeSheet.cells}
        currentSelection={getTargetRange() || getDataRange()}
        onApplyPivotTable={handleApplyPivotTable}
        onClose={() => setIsPivotTableOpen(false)}
      />

      {/* 22. Subtotals Dialog */}
      <SubtotalsDialog
        isOpen={isSubtotalsOpen}
        cells={activeSheet.cells}
        currentSelection={getTargetRange() || getDataRange()}
        hasExistingSubtotals={Boolean(
          activeSheet.metadata?.subtotals ||
          (activeSheet.metadata?.rowGroups && activeSheet.metadata.rowGroups.length > 0)
        )}
        onApplySubtotals={handleApplySubtotals}
        onRemoveSubtotals={handleRemoveSubtotals}
        onClose={() => setIsSubtotalsOpen(false)}
      />

      {/* 23. Goal Seek Dialog */}
      <GoalSeekDialog
        isOpen={isGoalSeekOpen}
        activeCell={activeCell}
        onRunGoalSeek={handleRunGoalSeek}
        onClose={() => setIsGoalSeekOpen(false)}
      />

      {/* 24. Scenario Manager Dialog */}
      <ScenarioManagerDialog
        isOpen={isScenarioManagerOpen}
        scenarios={currentWorkbook?.metadata?.scenarios || workbook?.metadata?.scenarios || []}
        onAddScenario={handleAddScenario}
        onUpdateScenario={handleUpdateScenario}
        onDeleteScenario={handleDeleteScenario}
        onApplyScenario={handleApplyScenario}
        onComputeScenarioResults={handleComputeScenarioResults}
        onClose={() => setIsScenarioManagerOpen(false)}
      />

      {/* 25. Insert Chart Dialog (Stage 11) */}
      <InsertChartDialog
        isOpen={isInsertChartOpen}
        onClose={() => setIsInsertChartOpen(false)}
        onInsert={handleInsertChart}
        activeSheet={activeSheet}
        activeCell={activeCell}
        selectedRange={selectedRange}
        namedRanges={currentWorkbook?.metadata?.namedRanges || workbook?.metadata?.namedRanges || []}
        pivotTables={activeSheet.metadata?.pivotTables || []}
        namedRangeResolver={namedRangeResolver}
      />

      {/* 26. Chart Editor Dialog (Stage 11) */}
      <ChartEditorDialog
        isOpen={isChartEditorOpen}
        onClose={() => {
          setIsChartEditorOpen(false);
          setEditingChart(null);
        }}
        chart={editingChart}
        onUpdateChart={(chartId, updates) => updateChart(chartId, updates)}
        activeSheet={activeSheet}
        namedRangeResolver={namedRangeResolver}
        pivotTables={activeSheet.metadata?.pivotTables || []}
      />

      {/* 27. Import Dialog (Stage 12) */}
      <ImportDialog
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportSuccess={handleImportSuccess}
      />

      {/* 28. Export Dialog (Stage 12) */}
      {workbook && (
        <ExportDialog
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          workbook={workbook}
          sheets={sheets.map((s) => (s.id === activeSheet.id ? activeSheet : s))}
          activeSheetId={activeSheet.id}
          selectedRange={selectedRange || undefined}
        />
      )}

      {/* 29. Version History Dialog (Stage 13) */}
      {workbook && (
        <VersionHistoryDialog
          isOpen={isVersionHistoryOpen}
          onClose={() => setIsVersionHistoryOpen(false)}
          workbook={workbook}
          sheets={sheets.map((s) => (s.id === activeSheet.id ? activeSheet : s))}
          onRestoreSuccess={onRestoreVersionSuccess}
        />
      )}

      {/* 30. Backup & Restore Dialog (Stage 13) */}
      <BackupRestoreDialog
        isOpen={isBackupRestoreOpen}
        onClose={() => setIsBackupRestoreOpen(false)}
        currentWorkbook={workbook || undefined}
        currentSheets={sheets.map((s) => (s.id === activeSheet.id ? activeSheet : s))}
        onRestoreSuccess={onRestoreBackupSuccess}
      />

      {/* 31. Storage Management & Diagnostics Dialog (Stage 13) */}
      <StorageManagementDialog
        isOpen={isStorageManagementOpen}
        onClose={() => setIsStorageManagementOpen(false)}
      />

      {/* 32. Command Palette Dialog (Stage 14) */}
      <CommandPaletteDialog
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        commands={paletteCommands}
      />

      {/* 33. Go To Reference Dialog (Stage 14) */}
      <GoToDialog
        isOpen={isGoToOpen}
        onClose={() => setIsGoToOpen(false)}
        activeCell={activeCell}
        currentSheetId={activeSheet.id}
        sheets={sheets}
        namedRanges={currentWorkbook?.metadata?.namedRanges || workbook?.metadata?.namedRanges || []}
        onNavigate={handleGoToNavigate}
      />

      {/* 34. Print & PDF Export Setup Dialog (Stage 14) */}
      {workbook && (
        <PrintDialog
          isOpen={isPrintOpen}
          onClose={() => setIsPrintOpen(false)}
          workbookName={workbook.name}
          activeSheet={activeSheet}
          sheets={sheets}
          selectedRange={selectedRange}
          charts={activeSheet.metadata?.charts}
        />
      )}

      {/* 35. Help & Keyboard Shortcuts Reference Dialog (Stage 14) */}
      <HelpShortcutsDialog
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      {/* 36. User Preferences & Settings Dialog (Stage 14) */}
      <PreferencesDialog
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
      />

      {/* 37. First-Time Welcome Tour Modal (Stage 14) */}
      <WelcomeTourModal
        isOpen={isWelcomeTourOpen}
        onClose={() => setIsWelcomeTourOpen(false)}
        onNewWorkbook={() => { window.location.href = '/'; }}
        onImportFile={() => setIsImportOpen(true)}
      />
    </>
  );
};
