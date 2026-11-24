# OmniSheet — Testing Architecture & Quality Assurance

This document outlines the test strategy, execution instructions, and test coverage across all subsystems of OmniSheet.

---

## 1. Test Suite Overview

OmniSheet maintains a 100% in-browser, fully mocked automated test suite using **Vitest** with JSDOM and a custom in-memory IndexedDB mock adapter.

- **Total Test Files:** 74 suites
- **Total Passing Tests:** 478 tests (100% pass rate)
- **Execution Time:** ~20 seconds
- **Zero Flakiness:** All async storage operations are synchronized via transaction hooks.

---

## 2. Running Automated Tests

```bash
# Run all unit and integration tests once
npm run test

# Run tests in interactive watch mode
npm run test:watch

# Run tests with code coverage report
npm run test:coverage
```

To run a specific test suite:
```bash
npx vitest run tests/unit/production-acceptance.test.ts
npx vitest run tests/unit/performance-benchmarks.test.ts
npx vitest run tests/unit/io-excel-adapter.test.ts
```

---

## 3. Subsystem Test Map

### 3.1 Spreadsheet Calculation Engine
- `tests/unit/formula-tokenizer.test.ts`: Lexical tokenization of expressions, numbers, strings, cell references, ranges, and comparison operators.
- `tests/unit/formula-parser.test.ts`: Recursive descent AST parser, operator precedence, unary minus, percentage operator.
- `tests/unit/formula-evaluator.test.ts`: Tree-walking AST evaluation without dynamic `eval()`.
- `tests/unit/formula-dependency.test.ts`: Directed Acyclic Graph (DAG) dependency tracking, Kahn's topological sort recalculation, circular dependency detection (`#CYCLE!`).
- `tests/unit/formula-lookup.test.ts`: `VLOOKUP`, `HLOOKUP`, `XLOOKUP`, `INDEX`, `MATCH`.
- `tests/unit/formula-math-stat.test.ts`: `SUM`, `AVERAGE`, `COUNT`, `MIN`, `MAX`, `ROUND`, `MEDIAN`, `STDEV`, `SUMPRODUCT`.
- `tests/unit/formula-datetime.test.ts`: `DATE`, `YEAR`, `MONTH`, `DAY`, `HOUR`, `MINUTE`, `SECOND`, `TODAY`, `NOW`, `NETWORKDAYS`.
- `tests/unit/formula-text.test.ts`: `TEXTJOIN`, `CONCAT`, `MID`, `SUBSTITUTE`, `UPPER`, `LOWER`.
- `tests/unit/formula-logical-info.test.ts`: `IF`, `IFERROR`, `AND`, `OR`, `ISNUMBER`, `ISBLANK`.
- `tests/unit/production-acceptance.test.ts`: Comprehensive verification of 23 required core functions and critical edge cases (blanks, zeroes, negative numbers, decimals, large ranges).

### 3.2 Grid Engine & Virtualization
- `tests/unit/grid-virtualization.test.ts`: 2D viewport virtualization with binary search indexing over 1,000,000 rows.
- `tests/unit/grid-selection.test.ts`: Single cell, bounding box rectangular ranges, inverted selections.
- `tests/unit/grid-keyboard.test.ts`: Arrow keys, Shift range expansion, Home/End, `Ctrl + Arrow` contiguous data edge jumping.
- `tests/unit/grid-operations.test.ts`: Insert row/column, delete row/column, resize row height/column width.
- `tests/unit/merged-cells.test.ts`: Multi-cell merged ranges, non-anchor cell masking, unmerge operations.
- `tests/unit/selection-statistics.test.ts`: $O(K)$ sparse cell map selection statistics calculation.

### 3.3 Data Tools & Analysis
- `tests/unit/data-sorting.test.ts`: Single and multi-level sorting preserving complete row records.
- `tests/unit/data-filtering.test.ts`: Column filter configuration and non-destructive virtual row hiding.
- `tests/unit/data-validation.test.ts`: Number, list, date, and custom formula validation rules.
- `tests/unit/data-remove-duplicates.test.ts`: Multi-column duplicate detection and upward shifting.
- `tests/unit/data-text-to-columns.test.ts`: Delimited and fixed-width text splitting.
- `tests/unit/analysis-conditional-formatting.test.ts`: Highlight rules, top/bottom rules, custom formula rules.
- `tests/unit/analysis-visual-scales.test.ts`: Data bars, color scales, icon sets.
- `tests/unit/analysis-named-ranges.test.ts`: Workbook and sheet-scoped named ranges.
- `tests/unit/analysis-pivot-table.test.ts`: Multi-field aggregation pivot tables.
- `tests/unit/analysis-subtotals.test.ts`: Grouping and subtotal generation.

### 3.4 Data Persistence & Recovery
- `tests/unit/storage.test.ts`: IndexedDB initialization, migration v1 -> v2 -> v3.
- `tests/unit/persistence-save-queue.test.ts`: Debounced save queue (600ms), dirty state tracking, atomic revision increments.
- `tests/unit/history-manager.test.ts` & `tests/unit/undo-redo-integration.test.ts`: Reversible command stack up to 80 operations.
- `tests/unit/version-service.test.ts`: Checkpoint creation, diff preview, pre-restore safety backups.
- `tests/unit/recovery-service.test.ts`: Uncommitted session state auto-recovery on browser restart.
- `tests/unit/backup-service.test.ts`: Portable `.omni` ZIP archive backup and restoration.
- `tests/unit/multi-tab-service.test.ts`: Cross-tab synchronization via `BroadcastChannel` with conflict warnings.

### 3.5 Import / Export Compatibility
- `tests/unit/io-excel-adapter.test.ts`: Microsoft Excel `.xlsx` binary parsing, styling, formulas, borders, and freeze panes.
- `tests/unit/io-csv-parser.test.ts`: RFC 4180 CSV/TSV parsing, Unicode/Telugu preservation, formula injection protection.
- `tests/unit/io-service.test.ts`: Export file generation without memory leaks.

---

## 4. End-to-End Browser Acceptance Testing

In addition to unit and integration test suites, OmniSheet undergoes automated visual verification in real Chromium headless browsers via the Browser Subagent. All major user workflows (Dashboard creation, Grid entry, Formatting, Context Menus, Command Palette, Formula Bar, Status Bar, and Print dialogs) are exercised against the running Vite dev server.
