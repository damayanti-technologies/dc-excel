# OmniSheet Worksheet Management Engine

## 1. Overview & Architecture

The OmniSheet Worksheet Management Engine delivers full multi-sheet workbook orchestration inspired by Microsoft Excel and Google Sheets. Users can create, rename, duplicate, delete, reorder, color-code, hide, and unhide worksheets with immediate feedback on the virtualized grid and persistent synchronization in browser IndexedDB.

### Key Architectural Principles
1. **Multi-Sheet Topology**: A workbook (`Workbook`) maintains an ordered array of worksheet IDs (`sheetIds: string[]`) and tracks the currently active worksheet (`activeSheetId: string`).
2. **Normalized Sheet Records**: Each worksheet (`Sheet`) is stored as an independent record in the IndexedDB `sheets` store with sparse cell storage (`cells: SparseCellMap`), custom dimensions (`rowHeights`, `columnWidths`), merged regions (`mergedRanges`), and metadata (`SheetMetadata`).
3. **Data Protection & Conflict Prevention**: Validation algorithms prevent duplicate names, empty names, and forbidden characters. Guard rails prevent deleting or hiding the final remaining worksheet in a workbook.

---

## 2. Worksheet Data Models

```typescript
export interface SheetMetadata {
  isHidden?: boolean;          // Visibility in the tab bar
  tabColor?: string;          // Hex accent color (e.g. "#2563eb")
  isProtected?: boolean;       // Future worksheet protection flag
  zoom?: number;               // Zoom level (0.5 to 2.0, default 1.0)
  showGridLines?: boolean;
  showRowColHeaders?: boolean;
}

export interface Sheet {
  id: string;                  // Unique identifier (e.g. "sheet_1a2b3c")
  workbookId: string;          // Foreign key referencing parent Workbook
  name: string;                // Worksheet display name (1-31 chars)
  index: number;               // 0-based tab display position
  rowCount: number;            // Grid row bound (default: 100)
  columnCount: number;         // Grid column bound (default: 26)
  cells: SparseCellMap;        // Sparse cell dictionary ("row:col" -> Cell)
  rowHeights?: Record<number, number>;
  columnWidths?: Record<number, number>;
  mergedRanges?: CellRange[];
  metadata?: SheetMetadata;
}
```

---

## 3. Sheet Operations & Business Logic (`src/engine/worksheet/sheet-operations.ts`)

### 3.1 Sheet Name Validation (`validateSheetName`)
Every candidate name is validated against standard spreadsheet constraints before committing:
- **Non-Empty**: Rejects empty strings and whitespace-only entries.
- **Length Constraint**: Enforces a maximum length of 31 characters (Excel compatibility).
- **Forbidden Characters**: Rejects `\`, `/`, `?`, `*`, `:`, `[`, and `]` to avoid syntax ambiguities with future cross-sheet references.
- **Workbook Uniqueness**: Disallows duplicate names within the same workbook (case-insensitive comparison).

### 3.2 Conflict-Free Name Generation (`generateUniqueSheetName`)
When a user clicks the `+` button or inserts a sheet without a name, the engine scans existing sheets and dynamically generates the lowest unused positive integer index:
- `Sheet1`, `Sheet2`, `Sheet3`, ...
- If `Sheet2` was previously deleted, creating a new sheet intelligently reclaims the gap and names it `Sheet2`.

### 3.3 Sheet Duplication & Formula-Copy Behavior (`cloneSheet`, `generateDuplicateSheetName`)
When duplicating a worksheet:
- **Unique Name Generation**: Generates `Original (Copy)` or `Original (Copy N)`.
- **Deep Cloning**: Creates an independent copy of all cells, nested formatting styles, borders, number formats, row heights, column widths, and merged ranges (`mergedRanges`).
- **Formula-Copy Behavior**: Cell formulas reference cell coordinates. Within a duplicated sheet, internal intra-sheet references (e.g. `=SUM(A1:A10)`, `=B2*C2`) reference the exact same relative coordinates within the new sheet, producing identical calculations. Cross-sheet references (e.g. `=Sheet1!A1`) are out-of-scope for Stage 8 and scheduled for Stage 11.
- **Initial Visibility**: Duplicated sheets are always created unhidden (`isHidden: false`), even if the source sheet was hidden.

---

## 4. User Interface & Controls (`SheetTabsBar.tsx`)

### 4.1 Tab Bar Controls
- **Scroll Buttons (`<` and `>`)**: Smooth horizontal scrolling (`scrollBy({ left: ±150, behavior: 'smooth' })`) for workbooks with dozens of worksheets.
- **All Sheets Quick Jump Menu (`AllSheetsMenu.tsx`)**: Dropdown showing all sheets in order, their active status, color dots, and hidden flags. Allows jumping directly to any worksheet without scrolling.
- **Add Sheet (`+`) Button**: Quick one-click insertion immediately after the current active sheet.
- **Active Tab Styling**: Features elevated background, navy/accent top border, and bold font weight.
- **Tab Color Bar**: 3.5px colored bottom accent strip clearly visible in both light and dark themes.

### 4.2 Inline Renaming
- Double-clicking any tab or choosing "Rename" from the context menu enters inline editing.
- Auto-focuses and selects all text.
- `Enter` validates and saves; `Escape` cancels; `Blur` validates and saves.
- Surfaces error toasts on validation failure and refocuses the input for quick correction.

### 4.3 Context Menu Actions
Right-clicking any tab opens the context menu:
1. **Insert Sheet**: Inserts a new sheet directly after the clicked tab.
2. **Rename**: Activates inline name editing.
3. **Duplicate**: Deep-copies the sheet and activates the duplicate.
4. **Delete**: Shows a permanent deletion confirmation dialog (disabled if only 1 sheet remains).
5. **Move Left / Move Right**: Accessible reordering options (disabled at boundaries).
6. **Tab Color**: Opens `TabColorPickerPopover` with 16 curated colors, custom native hex picker, and reset.
7. **Hide Sheet**: Hides the worksheet from the tab bar (disabled if only 1 visible sheet remains).
8. **Unhide...**: Opens `UnhideSheetsDialog` listing hidden sheets for one-click restoration.

### 4.4 Drag and Drop Reordering
- Native HTML5 drag and drop with visual insertion indicators (`border-l-2` / `border-r-2` on hovered tab).
- Seamlessly updates `workbook.sheetIds` and persists `sheet.index` in IndexedDB.

---

## 5. Persistence & Storage Guarantee

- Worksheets and workbooks are stored exclusively in IndexedDB (`omnisheet_db`).
- Adding, renaming, duplicating, reordering, deleting, coloring, and hiding sheets immediately persist to storage.
- Deleting a sheet purges its record from the `sheets` store, eliminating orphaned data.
- Deleting a workbook cascades and cleans up all associated child sheets.
