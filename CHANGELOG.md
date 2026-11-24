# Changelog

All notable changes to OmniSheet across its 15 development stages.

---

## [1.0.0] - 2026-11-24 — Stage 15: Production Release

### Added
- Comprehensive test suite expansion (`tests/unit/production-acceptance.test.ts` and `tests/unit/performance-benchmarks.test.ts`).
- Full verification of 23 required core formula functions and critical calculation edge cases.
- Performance benchmarks covering 1,000 to 100,000 row datasets.
- Production deployment guides (`DEPLOYMENT.md`, `TESTING.md`, `KNOWN_LIMITATIONS.md`).
- Security review confirming zero external telemetry, formula injection neutralization, and clean local-first isolation.

---

## [0.14.0] - 2026-11-24 — Stage 14: Productivity, UI Polish & Accessibility

### Added
- Centralized keyboard shortcut registry and navigation engine (`Ctrl+Shift+P`, `Ctrl+P`, `Ctrl+G`, `F1`, `Ctrl+;`, `Ctrl+Shift+;`).
- Excel-standard contiguous data edge jumping (`Ctrl + Arrow`).
- Searchable Command Palette dialog with category filtering and shortcut badges.
- Native right-click Context Menus for Cells, Row Headers, Column Headers, Worksheet Tabs, and Charts.
- Quick Access Toolbar (QAT) with live customization dropdown checklist.
- Formula Bar multiline expander (`Alt + Enter`) and interactive Name Box coordinate jump.
- Spreadsheet Status Bar with Ready/Edit indicator, dynamic $O(K)$ selection statistics (`Count`, `Nums`, `Sum`, `Avg`, `Min`, `Max`), and zoom slider (50%–200%).
- Print & PDF Export setup modal with page preview, orientation, paper size, and margins.
- First-time onboarding welcome tour and accessible tabbed help documentation.

---

## [0.13.0] - 2026-11-24 — Stage 13: Data Persistence, Autosave & Recovery System

### Added
- IndexedDB Schema v3 upgrade with `versions` and `recovery` stores.
- Debounced save queue (600ms) with atomic revision numbers.
- Comprehensive Undo & Redo command manager (up to 80 operations deep).
- Manual and automatic Version History checkpoints with pre-restore safety backups.
- Session crash recovery prompt on unexpected restart.
- Portable `.omni` ZIP archive backup and restoration.
- Storage quota diagnostics and database integrity checker.
- Multi-tab conflict detection via `BroadcastChannel`.

---

## [0.12.0] - 2026-11-24 — Stage 12: Excel & CSV Import/Export

### Added
- Microsoft Excel (.xlsx) binary import and export powered by `exceljs`.
- RFC 4180 compliant CSV/TSV parser supporting delimiters, escaped quotes, and newlines.
- Unicode and Telugu text preservation (`రాష్ట్రం, నగరం`).
- Formula injection protection on CSV export.
- Pre-import preview table with compatibility report.

---

## [0.11.0] - 2026-11-24 — Stage 11: Charts & Data Visualization

### Added
- Interactive charting system powered by Apache ECharts.
- Bar, Column, Line, Area, Pie, Donut, and Scatter chart types.
- Live source data synchronization and visual chart editing modal.
- Chart overlay with drag positioning, resizing handles, and PNG export.

---

## [0.10.0] - 2026-11-24 — Stage 10: Advanced Data Analysis & Spreadsheet Tools

### Added
- Conditional formatting: highlight rules, top/bottom rules, custom formula rules.
- Visual scales: data bars, 2-color and 3-color scales, icon sets.
- Named ranges manager with workbook and sheet scope.
- Interactive Pivot Tables with multi-field aggregation.
- Grouping and subtotals engine.
- What-If analysis tools: Goal Seek and Scenario Manager.

---

## [0.9.0] - 2026-11-24 — Stage 9: Data Management & Data Tools

### Added
- Single and multi-level custom sorting engine.
- Column header filtering with distinct value checklists and custom condition filters.
- Freeze Panes (Top Row, First Column, At Selection, Unfreeze).
- Find & Replace across sheet or workbook.
- Remove duplicates wizard and Text to Columns split wizard.
- Data validation rules with in-cell dropdown indicators.

---

## [0.8.0] - 2026-11-24 — Stage 8: Workbook & Worksheet Management

### Added
- Multi-worksheet tab bar with horizontal scroll buttons and All Sheets popup menu.
- Worksheet creation with gap-reclaiming name generation.
- Inline worksheet renaming with character validation rules.
- Deep-copy worksheet duplication and deletion with confirmation.
- Drag-and-drop tab reordering and 16-color tab accents.
- Sheet hiding and unhiding dialogs.

---

## [0.7.0] - 2026-11-24 — Stage 7: Cell Formatting & Styling Engine

### Added
- Font styling: family, size, bold, italic, underline, strikethrough.
- Color pickers: text and background colors with 50-color palette.
- Cell borders engine: thin, medium, thick, double, dashed with custom colors.
- Cell alignment: horizontal, vertical, indent, wrap text.
- Merged cell ranges with non-anchor cell protection.
- Number formatting engine (Currency, Percentage, Date, Time, Scientific, Custom).
- Single and locked Format Painter.

---

## [0.6.0] - 2026-11-24 — Stage 6: Advanced Formula Library & Autocomplete

### Added
- 92 built-in formula functions across 7 categories.
- Real-time formula autocomplete dropdown with fuzzy matching.
- Live parameter assistant tooltips with syntax highlighting.
- Formula Reference Panel modal.

---

## [0.5.0] - 2026-11-24 — Stage 5: Cell Editing & Formula Calculation Engine

### Added
- Lexical tokenizer and recursive descent AST formula parser.
- Tree-walking AST formula evaluator.
- Directed dependency graph (DAG) with Kahn's topological sort recalculation.
- Circular reference detection (`#CYCLE!`).
- Synchronized formula bar and in-cell input editing.

---

## [0.4.0] - 2026-11-24 — Stage 4: High-Performance Grid Engine

### Added
- 2D virtualized grid viewport supporting 1,000,000 rows.
- Prefix-sum binary search coordinate mapping.
- Range selection and header highlighting.
- Keyboard navigation and clipboard copy/cut/paste.
- Dynamic row/column resizing.

---

## [0.3.0] - 2026-11-24 — Stage 3: Workbook & Folder Management

### Added
- Local IndexedDB persistence architecture.
- Workbook dashboard with grid/list views, favoriting, and folders.
- Search and sorting controls.

---

## [0.2.0] - 2026-11-24 — Stage 2: Application Shell & Design System

### Added
- Excel-inspired design system with Deep Navy and Professional Blue palette.
- Light, Dark, and System theme switching.
- 21 reusable accessible UI components.

---

## [0.1.0] - 2026-11-24 — Stage 1: Architecture & Foundation

### Added
- Vite + React + TypeScript foundation.
- Sparse cell storage model (`Record<string, Cell>`).
- Virtualization and calculation engine architecture abstractions.
