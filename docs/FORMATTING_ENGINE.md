# OmniSheet Formatting & Styling Engine

## 1. Overview & Architecture

The OmniSheet Formatting & Styling Engine delivers desktop-class cell formatting, number representation, borders, alignments, merged cells, and format painter functionality, matching Microsoft Excel and Google Sheets standards.

The engine follows three core architectural principles:
1. **Separation of Raw Value and Display Representation**: Values are stored unmutated as raw numeric, string, boolean, date, or formula values in the sparse cell data model. Display transformations are computed dynamically by `NumberFormatter` and `StandardValueFormatter`.
2. **Sparse Style Storage**: Unstyled cells consume zero styling memory. Styles are stored sparsely in `cell.style`. When formatting is cleared from empty placeholder cells, the sparse map automatically prunes the keys to prevent memory and database bloat.
3. **Virtualized Grid Integration**: Merged cells dynamically calculate geometric bounding boxes spanning virtual rows and columns; covered cells are suppressed from virtual DOM rendering while anchor cells dynamically expand their width and height.

---

## 2. Formatting Data Model

### CellStyle Interface (`src/types/cell.ts`)

```typescript
export interface CellStyle {
  fontFamily?: string;          // e.g. "Calibri", "Inter", "Arial", "Consolas"
  fontSize?: number;            // e.g. 9, 10, 11, 12, 14, 16, 18, 24
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  textColor?: string;           // Hex color string (e.g. "#1e3a8a")
  backgroundColor?: string;     // Hex color string (e.g. "#dbeafe")
  horizontalAlignment?: 'left' | 'center' | 'right' | 'justify';
  verticalAlignment?: 'top' | 'middle' | 'bottom';
  wrapText?: boolean;
  textOverflow?: 'clip' | 'overflow' | 'wrap';
  indentation?: number;         // Multiples of 12px padding
  borders?: CellBorders;
  numberFormat?: string;        // Excel-compatible format mask, e.g. "$#,##0.00"
}
```

### Cell Borders

```typescript
export interface CellBorder {
  style: 'thin' | 'medium' | 'thick' | 'double' | 'dashed' | 'none';
  color: string;
}

export interface CellBorders {
  top?: CellBorder;
  right?: CellBorder;
  bottom?: CellBorder;
  left?: CellBorder;
}
```

---

## 3. Number Formatting Engine (`src/engine/formatting/number-formatter.ts`)

`NumberFormatter` implements standard spreadsheet format pattern interpretation:

| Category | Preset Mask | Example Value | Formatted Output |
| :--- | :--- | :--- | :--- |
| **General** | `General` | `1234.5` | `1234.5` |
| **Integer** | `#,##0` | `1234.56` | `1,235` |
| **Decimal** | `#,##0.00` | `1234.56` | `1,234.56` |
| **Currency USD** | `$#,##0.00` | `1234.56` | `$1,234.56` |
| **Currency EUR** | `€#,##0.00` | `1234.56` | `€1,234.56` |
| **Currency GBP** | `£#,##0.00` | `1234.56` | `£1,234.56` |
| **Currency INR** | `₹#,##0.00` | `1234.56` | `₹1,234.56` |
| **Currency JPY** | `¥#,##0` | `1234.56` | `¥1,235` |
| **Percentage** | `0%` | `0.125` | `13%` |
| **Percentage 2D** | `0.00%` | `0.1235` | `12.35%` |
| **Date (ISO)** | `YYYY-MM-DD` | `46350` / ISO | `2026-11-24` |
| **Date (UK)** | `DD/MM/YYYY` | `46350` / ISO | `24/11/2026` |
| **Date (US)** | `MM/DD/YYYY` | `46350` / ISO | `11/24/2026` |
| **Time (24h)** | `HH:MM:SS` | `46350.6046` | `14:30:45` |
| **Time (12h)** | `hh:mm A` | `46350.6046` | `02:30 PM` |
| **Scientific** | `0.00E+00` | `1234.56` | `1.23E+03` |
| **Plain Text** | `@` | `1234` | `1234` |

### Multi-Section Custom Format Support
Supports standard 4-section Excel patterns: `positive;negative;zero;text`
- Example: `$#,##0.00;($#,##0.00);"-";"Text: "@`
- Positive numbers use section 1.
- Negative numbers use section 2 (stripping sign and applying parenthesis/custom prefixes).
- Zero values evaluate to section 3 (`-`).
- String text values format through section 4 replacing the `@` token.

---

## 4. Merged Cells Engine (`src/engine/formatting/merge-cells.ts`)

### Rules & Constraints
1. **Top-Left Anchor**: The top-left cell in the rectangular range (`startRow`, `startCol`) acts as the anchor holding the retained value and primary style.
2. **Conflict Prevention**: Overlapping merges that intersect existing merged ranges are prevented (`canMergeRange`).
3. **Data Protection & Confirmation**: When merging a range where non-anchor cells contain values or formulas, `checkNonAnchorPopulated` detects data loss and prompts the user via `MergeConfirmDialog` before discarding non-anchor data.
4. **Merge Modes**:
   - `all`: Merges the entire selection into one unified cell.
   - `across`: Merges each row across all selected columns independently.
   - `center`: Merges all and sets `horizontalAlignment: 'center'`.
5. **Virtualization Integration**:
   - `isCellCoveredByMerge`: Suppresses non-anchor cells from rendering in virtual DOM.
   - `isMergeAnchor`: Expands anchor dimensions by summing column widths and row heights of the spanned region, assigned high z-index (`zIndex: 10`).
   - Selection outline expands to encompass the full merged rectangle when clicking any cell within the merge.

---

## 5. Format Painter Architecture (`src/stores/format-painter-store.ts`)

- **State Management**: Zustand-powered store tracking `isActive`, `isLocked`, and cloned `sourceStyle`.
- **Single-Click vs Double-Click**:
  - Single click activates single-use mode (`isLocked: false`): applies style once to target cell/range and automatically deactivates.
  - Double click locks format painter (`isLocked: true`): persists across multiple successive destination clicks until explicitly dismissed.
- **Escape Cancellation**: Pressing `Escape` or clicking the toolbar button toggles off the format painter cleanly.
- **Value Preservation**: Format painter strictly copies visual `CellStyle` without altering cell values, formulas, or data types.

---

## 6. Persistence & Storage

- Cell styles and formatting metadata are saved in the IndexedDB `sheets` store inside the `cells: SparseCellMap`.
- Sheet-level `mergedRanges: CellRange[]` are serialized directly with sheet records.
- Full round-trip testing confirms that fonts, colors, borders, custom number format masks, and merged ranges survive browser refreshes and tab navigations.
