import React from 'react';
import {
  ArrowDownAZ,
  ArrowUpZA,
  ArrowUpDown,
  Filter,
  FilterX,
  RefreshCw,
  CopySlash,
  Columns3,
  Sparkles,
  CheckSquare,
  AlertCircle,
  Search,
  Replace,
  Rows,
  Columns,
  Grid,
  Unlock,
  ChevronDown,
  Table,
  Tag,
  Sigma,
  Target,
  Layers,
  FolderTree,
  FolderMinus,
  Palette,
  Upload,
  Download,
} from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown';

interface DataToolbarProps {
  isFilterActive: boolean;
  hasFilterConditions: boolean;
  frozenRows: number;
  frozenCols: number;
  isAuditHighlighted: boolean;
  onQuickSortAsc: () => void;
  onQuickSortDesc: () => void;
  onOpenCustomSort: () => void;
  onToggleFilter: () => void;
  onClearFilter: () => void;
  onReapplyFilter: () => void;
  onOpenRemoveDuplicates: () => void;
  onOpenTextToColumns: () => void;
  onTrimWhitespace: () => void;
  onOpenDataValidation: () => void;
  onClearDataValidation: () => void;
  onToggleCircleInvalid: () => void;
  onFreezeTopRow: () => void;
  onFreezeFirstColumn: () => void;
  onFreezeAtSelection: () => void;
  onUnfreezePanes: () => void;
  onOpenFind: () => void;
  onOpenReplace: () => void;

  // Stage 10 Analysis Tools
  onOpenConditionalFormatting: () => void;
  onOpenConditionalFormattingManager: () => void;
  onClearConditionalFormattingSelection: () => void;
  onClearConditionalFormattingSheet: () => void;
  onOpenNameManager: () => void;
  onOpenPivotTable: () => void;
  onOpenSubtotals: () => void;
  onGroupSelectedRows: () => void;
  onUngroupSelectedRows: () => void;
  onOpenGoalSeek: () => void;
  onOpenScenarioManager: () => void;
  onOpenImport?: () => void;
  onOpenExport?: () => void;
}

export const DataToolbar: React.FC<DataToolbarProps> = ({
  isFilterActive,
  hasFilterConditions,
  frozenRows,
  frozenCols,
  isAuditHighlighted,
  onQuickSortAsc,
  onQuickSortDesc,
  onOpenCustomSort,
  onToggleFilter,
  onClearFilter,
  onReapplyFilter,
  onOpenRemoveDuplicates,
  onOpenTextToColumns,
  onTrimWhitespace,
  onOpenDataValidation,
  onClearDataValidation,
  onToggleCircleInvalid,
  onFreezeTopRow,
  onFreezeFirstColumn,
  onFreezeAtSelection,
  onUnfreezePanes,
  onOpenFind,
  onOpenReplace,
  onOpenConditionalFormatting,
  onOpenConditionalFormattingManager,
  onClearConditionalFormattingSelection,
  onClearConditionalFormattingSheet,
  onOpenNameManager,
  onOpenPivotTable,
  onOpenSubtotals,
  onGroupSelectedRows,
  onUngroupSelectedRows,
  onOpenGoalSeek,
  onOpenScenarioManager,
  onOpenImport,
  onOpenExport,
}) => {
  const isPanesFrozen = frozenRows > 0 || frozenCols > 0;

  const conditionalFormattingMenuItems: (DropdownItem | 'divider')[] = [
    {
      id: 'cf-new-rule',
      label: 'New Formatting Rule...',
      icon: <Sparkles className="w-3.5 h-3.5 text-accent" />,
      onClick: onOpenConditionalFormatting,
    },
    {
      id: 'cf-manage-rules',
      label: 'Manage Rules...',
      icon: <Palette className="w-3.5 h-3.5" />,
      onClick: onOpenConditionalFormattingManager,
    },
    'divider',
    {
      id: 'cf-clear-selection',
      label: 'Clear Rules from Selected Cells',
      icon: <Unlock className="w-3.5 h-3.5" />,
      onClick: onClearConditionalFormattingSelection,
    },
    {
      id: 'cf-clear-sheet',
      label: 'Clear Rules from Entire Sheet',
      icon: <Unlock className="w-3.5 h-3.5" />,
      onClick: onClearConditionalFormattingSheet,
    },
  ];

  const whatIfMenuItems: (DropdownItem | 'divider')[] = [
    {
      id: 'goal-seek',
      label: 'Goal Seek...',
      icon: <Target className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />,
      onClick: onOpenGoalSeek,
    },
    {
      id: 'scenario-manager',
      label: 'Scenario Manager...',
      icon: <Layers className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />,
      onClick: onOpenScenarioManager,
    },
  ];

  const freezeMenuItems: (DropdownItem | 'divider')[] = [
    {
      id: 'freeze-top-row',
      label: 'Freeze Top Row',
      icon: <Rows className="w-3.5 h-3.5" />,
      shortcut: frozenRows === 1 && frozenCols === 0 ? '✓' : undefined,
      onClick: onFreezeTopRow
    },
    {
      id: 'freeze-first-col',
      label: 'Freeze First Column',
      icon: <Columns className="w-3.5 h-3.5" />,
      shortcut: frozenRows === 0 && frozenCols === 1 ? '✓' : undefined,
      onClick: onFreezeFirstColumn
    },
    {
      id: 'freeze-at-selection',
      label: 'Freeze Panes at Selection',
      icon: <Grid className="w-3.5 h-3.5" />,
      shortcut: isPanesFrozen && (frozenRows > 1 || frozenCols > 1) ? '✓' : undefined,
      onClick: onFreezeAtSelection
    },
    'divider',
    {
      id: 'unfreeze',
      label: 'Unfreeze Panes',
      icon: <Unlock className="w-3.5 h-3.5" />,
      onClick: onUnfreezePanes
    }
  ];

  return (
    <div className="h-10 bg-surface border-b border-border px-3 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar shrink-0 text-xs select-none">
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-max">
        {/* GROUP 1: SORT & FILTER */}
        <div className="flex items-center gap-0.5 pr-1.5 border-r border-border/60">
          <Tooltip content="Sort Ascending (A to Z / Smallest to Largest)">
            <button
              type="button"
              onClick={onQuickSortAsc}
              className="p-1.5 rounded hover:bg-surface-secondary text-foreground hover:text-primary transition-colors flex items-center gap-1"
              aria-label="Sort Ascending"
            >
              <ArrowDownAZ className="w-4 h-4 text-primary" />
              <span className="hidden md:inline text-[11px] font-medium">A→Z</span>
            </button>
          </Tooltip>

          <Tooltip content="Sort Descending (Z to A / Largest to Smallest)">
            <button
              type="button"
              onClick={onQuickSortDesc}
              className="p-1.5 rounded hover:bg-surface-secondary text-foreground hover:text-primary transition-colors flex items-center gap-1"
              aria-label="Sort Descending"
            >
              <ArrowUpZA className="w-4 h-4 text-primary" />
              <span className="hidden md:inline text-[11px] font-medium">Z→A</span>
            </button>
          </Tooltip>

          <Tooltip content="Custom Multi-Level Sort...">
            <button
              type="button"
              onClick={onOpenCustomSort}
              className="p-1.5 rounded hover:bg-surface-secondary text-foreground hover:text-primary transition-colors flex items-center gap-1"
              aria-label="Custom Sort"
            >
              <ArrowUpDown className="w-4 h-4" />
              <span className="hidden lg:inline text-[11px] font-medium">Sort</span>
            </button>
          </Tooltip>

          <div className="w-[1px] h-4 bg-border/60 mx-1" />

          {/* Filter Toggle */}
          <Tooltip content={isFilterActive ? 'Turn Filter Off' : 'Create a Filter'}>
            <button
              type="button"
              onClick={onToggleFilter}
              className={`p-1.5 rounded transition-colors flex items-center gap-1 ${
                isFilterActive
                  ? 'bg-primary/15 text-primary font-semibold'
                  : 'hover:bg-surface-secondary text-foreground'
              }`}
              aria-label="Toggle Filter"
            >
              <Filter className="w-4 h-4" />
              <span className="hidden md:inline text-[11px]">Filter</span>
            </button>
          </Tooltip>

          {isFilterActive && (
            <>
              <Tooltip content="Clear All Column Filters">
                <button
                  type="button"
                  disabled={!hasFilterConditions}
                  onClick={onClearFilter}
                  className="p-1.5 rounded hover:bg-surface-secondary text-foreground hover:text-destructive disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  aria-label="Clear Filter"
                >
                  <FilterX className="w-4 h-4" />
                </button>
              </Tooltip>

              <Tooltip content="Reapply Current Filter">
                <button
                  type="button"
                  onClick={onReapplyFilter}
                  className="p-1.5 rounded hover:bg-surface-secondary text-foreground hover:text-primary transition-colors"
                  aria-label="Reapply Filter"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
            </>
          )}
        </div>

        {/* GROUP 2: DATA CLEANUP */}
        <div className="flex items-center gap-0.5 px-1.5 border-r border-border/60">
          <Tooltip content="Remove Duplicate Rows...">
            <button
              type="button"
              onClick={onOpenRemoveDuplicates}
              className="p-1.5 rounded hover:bg-surface-secondary text-foreground hover:text-primary transition-colors flex items-center gap-1"
              aria-label="Remove Duplicates"
            >
              <CopySlash className="w-4 h-4" />
              <span className="hidden lg:inline text-[11px]">Remove Duplicates</span>
            </button>
          </Tooltip>

          <Tooltip content="Convert Text to Columns...">
            <button
              type="button"
              onClick={onOpenTextToColumns}
              className="p-1.5 rounded hover:bg-surface-secondary text-foreground hover:text-primary transition-colors flex items-center gap-1"
              aria-label="Text to Columns"
            >
              <Columns3 className="w-4 h-4" />
              <span className="hidden lg:inline text-[11px]">Text to Columns</span>
            </button>
          </Tooltip>

          <Tooltip content="Trim Whitespace (Leading, Trailing & Repeated Spaces)">
            <button
              type="button"
              onClick={onTrimWhitespace}
              className="p-1.5 rounded hover:bg-surface-secondary text-foreground hover:text-primary transition-colors flex items-center gap-1"
              aria-label="Trim Whitespace"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="hidden xl:inline text-[11px]">Trim</span>
            </button>
          </Tooltip>
        </div>

        {/* GROUP 3: DATA VALIDATION */}
        <div className="flex items-center gap-0.5 px-1.5 border-r border-border/60">
          <Tooltip content="Data Validation & In-Cell Dropdowns...">
            <button
              type="button"
              onClick={onOpenDataValidation}
              className="p-1.5 rounded hover:bg-surface-secondary text-foreground hover:text-primary transition-colors flex items-center gap-1"
              aria-label="Data Validation"
            >
              <CheckSquare className="w-4 h-4 text-emerald-500" />
              <span className="hidden md:inline text-[11px]">Validation</span>
            </button>
          </Tooltip>

          <Tooltip content="Clear Validation from Selected Cells">
            <button
              type="button"
              onClick={onClearDataValidation}
              className="p-1.5 rounded hover:bg-surface-secondary text-foreground hover:text-destructive transition-colors"
              aria-label="Clear Validation"
            >
              <Unlock className="w-3.5 h-3.5" />
            </button>
          </Tooltip>

          <Tooltip content="Audit & Highlight Invalid Cells">
            <button
              type="button"
              onClick={onToggleCircleInvalid}
              className={`p-1.5 rounded transition-colors flex items-center gap-1 ${
                isAuditHighlighted
                  ? 'bg-rose-500/15 text-rose-600 font-semibold'
                  : 'hover:bg-surface-secondary text-foreground'
              }`}
              aria-label="Circle Invalid Data"
            >
              <AlertCircle className="w-4 h-4" />
              <span className="hidden xl:inline text-[11px]">Audit</span>
            </button>
          </Tooltip>
        </div>

        {/* GROUP 4: FREEZE PANES */}
        <div className="flex items-center gap-0.5 px-1.5 border-r border-border/60">
          <Dropdown
            trigger={
              <button
                type="button"
                className={`p-1.5 rounded transition-colors flex items-center gap-1.5 ${
                  isPanesFrozen
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'hover:bg-surface-secondary text-foreground'
                }`}
                aria-label="Freeze Panes"
              >
                <Grid className="w-4 h-4" />
                <span className="text-[11px]">
                  {isPanesFrozen ? `Frozen (${frozenRows}R, ${frozenCols}C)` : 'Freeze'}
                </span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </button>
            }
            items={freezeMenuItems}
          />
        </div>

        {/* GROUP 5: FIND & REPLACE */}
        <div className="flex items-center gap-0.5 px-1.5">
          <Tooltip content="Find in Sheet / Workbook (Ctrl+F)">
            <button
              type="button"
              onClick={onOpenFind}
              className="p-1.5 rounded hover:bg-surface-secondary text-foreground hover:text-primary transition-colors flex items-center gap-1"
              aria-label="Find (Ctrl+F)"
            >
              <Search className="w-4 h-4" />
              <span className="hidden md:inline text-[11px]">Find</span>
            </button>
          </Tooltip>

          <Tooltip content="Find and Replace (Ctrl+H)">
            <button
              type="button"
              onClick={onOpenReplace}
              className="p-1.5 rounded hover:bg-surface-secondary text-foreground hover:text-primary transition-colors flex items-center gap-1"
              aria-label="Replace (Ctrl+H)"
            >
              <Replace className="w-4 h-4" />
              <span className="hidden md:inline text-[11px]">Replace</span>
            </button>
          </Tooltip>
        </div>

        {/* GROUP 6: DATA ANALYSIS & TOOLS */}
        <div className="flex items-center gap-0.5 px-1.5 border-l border-border/60">
          {/* Conditional Formatting Dropdown */}
          <Dropdown
            trigger={
              <button
                type="button"
                className="p-1.5 rounded hover:bg-surface-secondary text-foreground hover:text-accent transition-colors flex items-center gap-1.5"
                aria-label="Conditional Formatting"
              >
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <span className="hidden md:inline text-[11px] font-medium">Conditional Formatting</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </button>
            }
            items={conditionalFormattingMenuItems}
          />

          {/* Name Manager */}
          <Tooltip content="Name Manager (Define & Manage Named Ranges for Formulas)">
            <button
              type="button"
              onClick={onOpenNameManager}
              className="p-1.5 rounded hover:bg-surface-secondary text-foreground hover:text-sky-600 dark:hover:text-sky-400 transition-colors flex items-center gap-1"
              aria-label="Name Manager"
            >
              <Tag className="w-4 h-4 text-sky-500" />
              <span className="hidden lg:inline text-[11px]">Name Manager</span>
            </button>
          </Tooltip>

          {/* Pivot Table */}
          <Tooltip content="Insert / Design Pivot Table">
            <button
              type="button"
              onClick={onOpenPivotTable}
              className="p-1.5 rounded hover:bg-surface-secondary text-foreground hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1"
              aria-label="Pivot Table"
            >
              <Table className="w-4 h-4 text-indigo-500" />
              <span className="hidden lg:inline text-[11px]">Pivot Table</span>
            </button>
          </Tooltip>

          {/* Subtotal */}
          <Tooltip content="Calculate Group Subtotals on Column Changes">
            <button
              type="button"
              onClick={onOpenSubtotals}
              className="p-1.5 rounded hover:bg-surface-secondary text-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1"
              aria-label="Subtotal"
            >
              <Sigma className="w-4 h-4 text-emerald-600" />
              <span className="hidden xl:inline text-[11px]">Subtotal</span>
            </button>
          </Tooltip>

          {/* Group / Ungroup */}
          <Tooltip content="Group Selected Rows">
            <button
              type="button"
              onClick={onGroupSelectedRows}
              className="p-1.5 rounded hover:bg-surface-secondary text-foreground hover:text-primary transition-colors flex items-center"
              aria-label="Group Rows"
            >
              <FolderTree className="w-4 h-4 text-amber-500" />
            </button>
          </Tooltip>

          <Tooltip content="Ungroup Selected Rows">
            <button
              type="button"
              onClick={onUngroupSelectedRows}
              className="p-1.5 rounded hover:bg-surface-secondary text-foreground hover:text-primary transition-colors flex items-center"
              aria-label="Ungroup Rows"
            >
              <FolderMinus className="w-4 h-4 text-amber-500" />
            </button>
          </Tooltip>

          {/* What-If Analysis Dropdown */}
          <Dropdown
            trigger={
              <button
                type="button"
                className="p-1.5 rounded hover:bg-surface-secondary text-foreground hover:text-accent transition-colors flex items-center gap-1.5"
                aria-label="What-If Analysis"
              >
                <Target className="w-4 h-4 text-teal-500" />
                <span className="hidden md:inline text-[11px] font-medium">What-If</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </button>
            }
            items={whatIfMenuItems}
          />

          {(onOpenImport || onOpenExport) && (
            <>
              <div className="h-4 w-px bg-border my-auto mx-0.5" />
              <div className="flex items-center gap-1">
                {onOpenImport && (
                  <Tooltip content="Import Spreadsheet (Excel .xlsx, CSV, TSV)">
                    <button
                      type="button"
                      onClick={onOpenImport}
                      className="p-1.5 rounded hover:bg-surface-secondary text-foreground hover:text-primary transition-colors flex items-center gap-1"
                      aria-label="Import File"
                    >
                      <Upload className="w-4 h-4 text-primary" />
                      <span className="hidden lg:inline text-[11px] font-medium">Import</span>
                    </button>
                  </Tooltip>
                )}

                {onOpenExport && (
                  <Tooltip content="Export Spreadsheet (Excel .xlsx, CSV, TSV)">
                    <button
                      type="button"
                      onClick={onOpenExport}
                      className="p-1.5 rounded hover:bg-surface-secondary text-foreground hover:text-primary transition-colors flex items-center gap-1"
                      aria-label="Export File"
                    >
                      <Download className="w-4 h-4 text-primary" />
                      <span className="hidden lg:inline text-[11px] font-medium">Export</span>
                    </button>
                  </Tooltip>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
