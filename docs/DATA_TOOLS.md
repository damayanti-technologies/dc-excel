# OmniSheet — Data Management & Data Tools Architecture (Stage 9)

## 1. Overview & Objectives

Stage 9 introduces a professional data-management toolkit into OmniSheet, empowering users to organize, filter, clean, validate, and search spreadsheet records. Designed with local-first principles, high virtualization efficiency, and Excel-grade predictability, the toolkit preserves row integrity and sparse cell representations while persisting all configurations into IndexedDB.

---

## 2. Architecture & Modules

The data tools architecture resides in `src/engine/data-tools/` and UI components in `src/features/spreadsheet/components/`:

```
src/
├── types/
│   └── data-tools.ts              # Data tools types (SortConfig, FilterConfig, FreezePaneConfig, DataValidationRule, FindOptions, TextToColumnsOptions, etc.)
├── engine/
│   └── data-tools/
│       ├── sorting.ts             # compareCellValues, detectTableRange, sortRange (multi-level row sorting)
│       ├── filtering.ts           # matchesCondition, matchesColumnFilter, evaluateFilters, getDistinctColumnValues
│       ├── freeze.ts              # freezeTopRow, freezeFirstColumn, freezePanesAtCell, unfreezePanes
│       ├── find-replace.ts        # findMatches, findMatchesInSheet, replaceMatchInSheet, replaceAllMatches
│       ├── remove-duplicates.ts   # previewRemoveDuplicates, executeRemoveDuplicates (with upward row shifting)
│       ├── validation.ts          # validateCellValue, getValidationRuleForCell
│       ├── text-to-columns.ts     # splitByDelimiters, splitByFixedWidth, previewTextToColumns, executeTextToColumns
│       ├── trim.ts                # cleanString, trimWhitespace
│       └── index.ts               # Barrel exports
└── features/
    └── spreadsheet/
        └── components/
            ├── DataToolbar.tsx           # Ribbon Data tab with Sort, Filter, Cleanup, Validation, Freeze, Search
            ├── CustomSortDialog.tsx       # Multi-level sort modal with column & order pickers
            ├── ColumnFilterPopover.tsx   # Header column filter popover with search & condition rules
            ├── FindReplaceDialog.tsx     # Find & Replace modal with workbook-wide scope and regex match
            ├── RemoveDuplicatesDialog.tsx# Duplicate row detection and safe deletion
            ├── DataValidationDialog.tsx  # Validation criteria (Whole, Decimal, List, Date, Length) & Error alerts
            ├── TextToColumnsDialog.tsx   # Delimited & fixed-width text splitting wizard
            └── CellValidationDropdown.tsx# In-cell interactive dropdown list selector
```

---

## 3. Core Capabilities & Mechanics

### 3.1. Sorting Engine (`sorting.ts`)
- **Type-Aware Comparator (`compareCellValues`)**:
  - Compares numbers numerically (e.g., `2` < `10`).
  - Compares text alphabetically via `localeCompare`.
  - Compares dates chronologically.
  - Compares booleans (`FALSE` < `TRUE`).
  - **Blanks Placement**: Blank and empty cells are *always* placed at the very bottom in both ascending and descending sorts.
- **Row Integrity Preservation**:
  - Collects entire row slices across the bounding range columns.
  - Multi-level comparator evaluates primary level, then secondary, and so on.
  - Cell formatting and formulas are preserved with each record.
- **Table Range Auto-Detection (`detectTableRange`)**:
  - When invoked from a single active cell, dynamically expands to the contiguous bounding box of populated cells without requiring manual user selection.

### 3.2. Column Filtering & Row Hiding (`filtering.ts`)
- **No Record Deletion**: Filtering never mutates coordinates or drops sparse cell records.
- **Hidden Rows Array (`hiddenRows`)**:
  - `evaluateFilters` checks each row in the data range against active column filters.
  - Supports both **Checkbox list selection** (matching distinct column values) and **Condition filters** (`contains`, `not_contains`, `begins_with`, `ends_with`, `equals`, `greater_than`, `less_than`, `between`, `is_blank`, `is_not_blank`).
  - Multi-column filters are evaluated using **AND** logic.
  - Rows failing the criteria are recorded in `sheet.metadata.hiddenRows`.
- **Virtualized Grid Integration (`SpreadsheetGrid.tsx`)**:
  - Hidden rows are skipped during visible rows index generation.
  - Filter trigger buttons appear directly in column header cells when filtering is enabled, with visual indicators when a column has an active filter.

### 3.3. Freeze Panes (`freeze.ts`)
- **Per-Sheet Metadata (`freezePanes`)**:
  - `{ frozenRows: number, frozenCols: number }`
  - Modes:
    - *Freeze Top Row*: `frozenRows = 1, frozenCols = 0`
    - *Freeze First Column*: `frozenRows = 0, frozenCols = 1`
    - *Freeze Panes at Selection*: `frozenRows = activeCell.row, frozenCols = activeCell.col`
    - *Unfreeze Panes*: resets to `0, 0`
- **Virtualization Coordinates**:
  - Pinned frozen rows and columns are prepended to `visibleRows` and `visibleCols` regardless of scroll offset.
  - Offset calculations pin frozen cells (`scrollState.top + rowOffset`, `scrollState.left + colOffset`) with elevated z-indexes (`zIndex: 14..18`).
  - Distinct freeze divider lines (`border-primary/70`) visually delineate frozen boundaries.

### 3.4. Find & Replace (`find-replace.ts`)
- **Comprehensive Search**:
  - Match case toggle.
  - Match entire cell contents toggle.
  - Look in: **Values** vs. **Formulas**.
  - Scope: **Active Sheet** vs. **Entire Workbook**.
- **Interactive Navigation**:
  - Step through matches with `Next` (`Enter`) and `Prev` (`Shift+Enter`).
  - Auto-scrolls and navigates to the matching cell, switching worksheets automatically when searching across workbooks.
  - Single replace (`replaceMatchInSheet`) and bulk replace (`replaceAllMatches`).
  - Keyboard shortcuts: `Ctrl+F` (Find) and `Ctrl+H` (Replace).

### 3.5. Remove Duplicates (`remove-duplicates.ts`)
- **Column Selectivity**: Users can specify which columns define a duplicate record.
- **Live Preview (`previewRemoveDuplicates`)**: Shows duplicate count and remaining unique count before committing.
- **Safe Execution (`executeRemoveDuplicates`)**:
  - Eliminates duplicate rows in the specified range.
  - Shifts remaining unique rows upward to preserve compact, contiguous data without blank gaps.
  - Cleans obsolete sparse keys.

### 3.6. Data Validation & Dropdown Lists (`validation.ts`)
- **Criteria Types**:
  - Whole number & Decimal (with operators: between, equal, greater than, etc.).
  - List (with in-cell dropdown chevron trigger).
  - Date & Text length.
  - Custom formulas.
- **In-Cell Dropdown (`CellValidationDropdown.tsx`)**:
  - When a cell has a list validation rule with `showDropdown: true`, a chevron appears inside the cell.
  - Clicking the chevron opens a selection menu to insert valid choices directly.
- **Audit Mode**:
  - "Audit" / "Circle Invalid" button highlights cells violating validation rules with an outline ring and tint.

### 3.7. Text to Columns (`text-to-columns.ts`)
- **Delimited Mode**: Comma, Semicolon, Tab, Space, Custom Character, Consecutive delimiters as one.
- **Fixed Width Mode**: Character offset split points (e.g. `[10, 20]`).
- **Safety Checks**: Previews column splits and warns users before overwriting populated cells in target destination columns.

### 3.8. Trim Whitespace (`trim.ts`)
- Cleans leading spaces, trailing spaces, and collapses multiple internal spaces.
- Protects formula cells and non-string types.

---

## 4. Local-First Persistence

All Stage 9 data tool states persist to IndexedDB through the existing `sheets` store:
- `sheet.metadata.freezePanes`
- `sheet.metadata.filterConfig`
- `sheet.metadata.hiddenRows`
- `sheet.metadata.dataValidations`

Changes are debounced and saved automatically, ensuring that filters, freeze panes, and validation rules remain restored when reopening workbooks.
