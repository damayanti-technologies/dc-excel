import { useMemo } from 'react';
import {
  FileSpreadsheet,
  Save,
  Printer,
  Upload,
  Download,
  History,
  FolderArchive,
  Undo2,
  Redo2,
  Scissors,
  Copy,
  Clipboard,
  Search,
  SearchCode,
  CheckSquare,
  Table,
  Bold,
  Italic,
  Underline,
  Palette,
  Sparkles,
  ArrowUpDown,
  Filter,
  Trash2,
  FileText,
  PlusSquare,
  BarChart2,
  Tag,
  SunMoon,
  ZoomIn,
  ZoomOut,
  Grid,
  Eye,
  Navigation,
  HelpCircle,
  SlidersHorizontal,
} from 'lucide-react';
import { Sheet } from '@/types/sheet';
import { CellCoordinates, CellStyle } from '@/types/cell';
import { CommandPaletteAction } from '../components/CommandPaletteDialog';
import { historyManager } from '@/engine/history/history-manager';
import { coordToKey } from '@/utils/coordinates';

export interface UseSpreadsheetPaletteCommandsOptions {
  activeSheet: Sheet | null;
  activeCell: CellCoordinates | null;
  currentTheme: 'light' | 'dark' | 'system';
  showGridlines: boolean;
  setShowGridlines: (show: boolean) => void;
  showFormulaBar: boolean;
  setShowFormulaBar: (show: boolean) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  handleManualSave: () => Promise<void>;
  handleCut: () => void;
  handleCopy: () => void;
  handlePaste: () => Promise<void>;
  handleSelectAll: () => void;
  handleInsertCurrentDate: () => void;
  handleInsertCurrentTime: () => void;
  handleApplyStyle: (style: Partial<CellStyle>) => void;
  handleQuickSort: (direction: 'asc' | 'desc', col?: number) => void;
  handleToggleFilter: () => void;
  handleAddSheet: () => Promise<void>;
  setIsPrintOpen: (open: boolean) => void;
  setIsImportOpen: (open: boolean) => void;
  setIsExportOpen: (open: boolean) => void;
  setIsVersionHistoryOpen: (open: boolean) => void;
  setIsBackupRestoreOpen: (open: boolean) => void;
  setIsFindReplaceOpen: (open: boolean) => void;
  setFindReplaceInitialMode: (mode: 'find' | 'replace') => void;
  setIsMobileFormattingOpen: (open: boolean) => void;
  setIsConditionalFormattingManagerOpen: (open: boolean) => void;
  setIsRemoveDuplicatesOpen: (open: boolean) => void;
  setIsDataValidationOpen: (open: boolean) => void;
  setIsTextToColumnsOpen: (open: boolean) => void;
  setIsInsertChartOpen: (open: boolean) => void;
  setIsPivotTableOpen: (open: boolean) => void;
  setIsNameManagerOpen: (open: boolean) => void;
  setIsGoToOpen: (open: boolean) => void;
  setIsHelpOpen: (open: boolean) => void;
  setIsPreferencesOpen: (open: boolean) => void;
}

export function useSpreadsheetPaletteCommands(options: UseSpreadsheetPaletteCommandsOptions): CommandPaletteAction[] {
  const {
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
  } = options;

  return useMemo<CommandPaletteAction[]>(() => [
    // File
    {
      id: 'cmd-new-workbook',
      title: 'New Workbook',
      category: 'File',
      icon: <FileSpreadsheet className="w-4 h-4" />,
      onExecute: () => { window.location.href = '/'; }
    },
    {
      id: 'cmd-save-workbook',
      title: 'Save Workbook',
      category: 'File',
      shortcut: 'Ctrl + S',
      icon: <Save className="w-4 h-4" />,
      onExecute: () => void handleManualSave()
    },
    {
      id: 'cmd-print',
      title: 'Print / Export PDF',
      category: 'File',
      shortcut: 'Ctrl + P',
      icon: <Printer className="w-4 h-4" />,
      onExecute: () => setIsPrintOpen(true)
    },
    {
      id: 'cmd-import-file',
      title: 'Import File (.xlsx, .csv)',
      category: 'File',
      icon: <Upload className="w-4 h-4" />,
      onExecute: () => setIsImportOpen(true)
    },
    {
      id: 'cmd-export-file',
      title: 'Export Workbook (.xlsx, .csv)',
      category: 'File',
      icon: <Download className="w-4 h-4" />,
      onExecute: () => setIsExportOpen(true)
    },
    {
      id: 'cmd-version-history',
      title: 'Workbook Version History',
      category: 'File',
      icon: <History className="w-4 h-4" />,
      onExecute: () => setIsVersionHistoryOpen(true)
    },
    {
      id: 'cmd-backup-restore',
      title: 'Backup & Restore (.omni)',
      category: 'File',
      icon: <FolderArchive className="w-4 h-4" />,
      onExecute: () => setIsBackupRestoreOpen(true)
    },

    // Editing
    {
      id: 'cmd-undo',
      title: 'Undo',
      category: 'Editing',
      shortcut: 'Ctrl + Z',
      icon: <Undo2 className="w-4 h-4" />,
      onExecute: () => void historyManager.undo()
    },
    {
      id: 'cmd-redo',
      title: 'Redo',
      category: 'Editing',
      shortcut: 'Ctrl + Y',
      icon: <Redo2 className="w-4 h-4" />,
      onExecute: () => void historyManager.redo()
    },
    {
      id: 'cmd-cut',
      title: 'Cut',
      category: 'Editing',
      shortcut: 'Ctrl + X',
      icon: <Scissors className="w-4 h-4" />,
      onExecute: () => void handleCut()
    },
    {
      id: 'cmd-copy',
      title: 'Copy',
      category: 'Editing',
      shortcut: 'Ctrl + C',
      icon: <Copy className="w-4 h-4" />,
      onExecute: () => void handleCopy()
    },
    {
      id: 'cmd-paste',
      title: 'Paste',
      category: 'Editing',
      shortcut: 'Ctrl + V',
      icon: <Clipboard className="w-4 h-4" />,
      onExecute: () => void handlePaste()
    },
    {
      id: 'cmd-find',
      title: 'Find',
      category: 'Editing',
      shortcut: 'Ctrl + F',
      icon: <Search className="w-4 h-4" />,
      onExecute: () => { setFindReplaceInitialMode('find'); setIsFindReplaceOpen(true); }
    },
    {
      id: 'cmd-replace',
      title: 'Replace',
      category: 'Editing',
      shortcut: 'Ctrl + H',
      icon: <SearchCode className="w-4 h-4" />,
      onExecute: () => { setFindReplaceInitialMode('replace'); setIsFindReplaceOpen(true); }
    },
    {
      id: 'cmd-select-all',
      title: 'Select All Cells',
      category: 'Editing',
      shortcut: 'Ctrl + A',
      icon: <CheckSquare className="w-4 h-4" />,
      onExecute: () => handleSelectAll()
    },
    {
      id: 'cmd-insert-date',
      title: 'Insert Current Date',
      category: 'Editing',
      shortcut: 'Ctrl + ;',
      icon: <Table className="w-4 h-4" />,
      onExecute: handleInsertCurrentDate
    },
    {
      id: 'cmd-insert-time',
      title: 'Insert Current Time',
      category: 'Editing',
      shortcut: 'Ctrl + Shift + ;',
      icon: <Table className="w-4 h-4" />,
      onExecute: handleInsertCurrentTime
    },

    // Formatting
    {
      id: 'cmd-bold',
      title: 'Toggle Bold',
      category: 'Formatting',
      shortcut: 'Ctrl + B',
      icon: <Bold className="w-4 h-4" />,
      onExecute: () => {
        const cell = activeCell && activeSheet ? activeSheet.cells[coordToKey(activeCell.row, activeCell.col)] : undefined;
        handleApplyStyle({ bold: !cell?.style?.bold });
      }
    },
    {
      id: 'cmd-italic',
      title: 'Toggle Italic',
      category: 'Formatting',
      shortcut: 'Ctrl + I',
      icon: <Italic className="w-4 h-4" />,
      onExecute: () => {
        const cell = activeCell && activeSheet ? activeSheet.cells[coordToKey(activeCell.row, activeCell.col)] : undefined;
        handleApplyStyle({ italic: !cell?.style?.italic });
      }
    },
    {
      id: 'cmd-underline',
      title: 'Toggle Underline',
      category: 'Formatting',
      shortcut: 'Ctrl + U',
      icon: <Underline className="w-4 h-4" />,
      onExecute: () => {
        const cell = activeCell && activeSheet ? activeSheet.cells[coordToKey(activeCell.row, activeCell.col)] : undefined;
        handleApplyStyle({ underline: !cell?.style?.underline });
      }
    },
    {
      id: 'cmd-format-cells',
      title: 'Format Cells...',
      category: 'Formatting',
      icon: <Palette className="w-4 h-4" />,
      onExecute: () => setIsMobileFormattingOpen(true)
    },
    {
      id: 'cmd-conditional-formatting',
      title: 'Conditional Formatting Rules',
      category: 'Formatting',
      icon: <Sparkles className="w-4 h-4" />,
      onExecute: () => setIsConditionalFormattingManagerOpen(true)
    },

    // Data
    {
      id: 'cmd-sort-asc',
      title: 'Sort Ascending (A to Z)',
      category: 'Data',
      icon: <ArrowUpDown className="w-4 h-4" />,
      onExecute: () => handleQuickSort('asc', activeCell?.col)
    },
    {
      id: 'cmd-sort-desc',
      title: 'Sort Descending (Z to A)',
      category: 'Data',
      icon: <ArrowUpDown className="w-4 h-4" />,
      onExecute: () => handleQuickSort('desc', activeCell?.col)
    },
    {
      id: 'cmd-filter',
      title: 'Toggle Filter',
      category: 'Data',
      icon: <Filter className="w-4 h-4" />,
      onExecute: () => handleToggleFilter()
    },
    {
      id: 'cmd-remove-duplicates',
      title: 'Remove Duplicates',
      category: 'Data',
      icon: <Trash2 className="w-4 h-4" />,
      onExecute: () => setIsRemoveDuplicatesOpen(true)
    },
    {
      id: 'cmd-data-validation',
      title: 'Data Validation',
      category: 'Data',
      icon: <FileText className="w-4 h-4" />,
      onExecute: () => setIsDataValidationOpen(true)
    },
    {
      id: 'cmd-text-to-columns',
      title: 'Text to Columns',
      category: 'Data',
      icon: <Table className="w-4 h-4" />,
      onExecute: () => setIsTextToColumnsOpen(true)
    },

    // Insert
    {
      id: 'cmd-insert-sheet',
      title: 'Insert Worksheet',
      category: 'Insert',
      icon: <PlusSquare className="w-4 h-4" />,
      onExecute: () => void handleAddSheet()
    },
    {
      id: 'cmd-insert-chart',
      title: 'Insert Chart',
      category: 'Insert',
      icon: <BarChart2 className="w-4 h-4" />,
      onExecute: () => setIsInsertChartOpen(true)
    },
    {
      id: 'cmd-insert-pivot',
      title: 'Insert Pivot Table',
      category: 'Insert',
      icon: <Table className="w-4 h-4" />,
      onExecute: () => setIsPivotTableOpen(true)
    },
    {
      id: 'cmd-name-manager',
      title: 'Name Manager / Define Range',
      category: 'Insert',
      icon: <Tag className="w-4 h-4" />,
      onExecute: () => setIsNameManagerOpen(true)
    },

    // View
    {
      id: 'cmd-toggle-theme',
      title: 'Toggle Dark / Light Theme',
      category: 'View',
      icon: <SunMoon className="w-4 h-4" />,
      onExecute: () => void setTheme(currentTheme === 'dark' ? 'light' : 'dark')
    },
    {
      id: 'cmd-zoom-in',
      title: 'Zoom In',
      category: 'View',
      icon: <ZoomIn className="w-4 h-4" />,
      onExecute: () => setZoom(Math.min(3.0, Math.round((zoom + 0.1) * 10) / 10))
    },
    {
      id: 'cmd-zoom-out',
      title: 'Zoom Out',
      category: 'View',
      icon: <ZoomOut className="w-4 h-4" />,
      onExecute: () => setZoom(Math.max(0.25, Math.round((zoom - 0.1) * 10) / 10))
    },
    {
      id: 'cmd-reset-zoom',
      title: 'Reset Zoom to 100%',
      category: 'View',
      icon: <ZoomIn className="w-4 h-4" />,
      onExecute: () => setZoom(1.0)
    },
    {
      id: 'cmd-toggle-gridlines',
      title: showGridlines ? 'Hide Gridlines' : 'Show Gridlines',
      category: 'View',
      icon: <Grid className="w-4 h-4" />,
      onExecute: () => setShowGridlines(!showGridlines)
    },
    {
      id: 'cmd-toggle-formula-bar',
      title: showFormulaBar ? 'Hide Formula Bar' : 'Show Formula Bar',
      category: 'View',
      icon: <Eye className="w-4 h-4" />,
      onExecute: () => setShowFormulaBar(!showFormulaBar)
    },

    // Help & Navigation
    {
      id: 'cmd-go-to',
      title: 'Go To Cell / Range...',
      category: 'Help',
      shortcut: 'Ctrl + G',
      icon: <Navigation className="w-4 h-4" />,
      onExecute: () => setIsGoToOpen(true)
    },
    {
      id: 'cmd-help',
      title: 'Help & Shortcuts Reference',
      category: 'Help',
      shortcut: 'F1',
      icon: <HelpCircle className="w-4 h-4" />,
      onExecute: () => setIsHelpOpen(true)
    },
    {
      id: 'cmd-preferences',
      title: 'Preferences & Settings...',
      category: 'Help',
      icon: <SlidersHorizontal className="w-4 h-4" />,
      onExecute: () => setIsPreferencesOpen(true)
    }
  ], [
    activeSheet,
    activeCell,
    currentTheme,
    showGridlines,
    setShowGridlines,
    showFormulaBar,
    setShowFormulaBar,
    zoom,
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
    setTheme,
    setZoom,
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
  ]);
}
