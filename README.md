# DC Excel: Professional Local-First Spreadsheet Application

> A private, high-performance, offline-first spreadsheet application inspired by Microsoft Excel and Google Sheets. Designed with zero cloud dependencies, zero mandatory user accounts, and 100% client-side privacy.

---

## 1. Architectural Highlights

- **Local-First & Offline-First:** Persists all workbooks, worksheets, folders, preferences, cell styles, and merged ranges in browser IndexedDB. Runs standalone without an internet connection.
- **Productivity & UI Polish (`Stage 14`):** Centralized shortcut registry (22 standard shortcuts), Excel-standard contiguous block jump (`Ctrl + Arrow`), searchable Command Palette (`Ctrl+Shift+P`), full right-click context menus for cells, headers, tabs, and charts, Quick Access Toolbar (QAT), multiline formula expander (`Alt+Enter`), Status Bar with dynamic $O(K)$ selection stats (`Count`, `Nums`, `Sum`, `Avg`, `Min`, `Max`), zoom slider (50%–200%), and print & PDF setup dialog (`Ctrl+P`).
- **Data Persistence, Autosave & Recovery (`Stage 13`):** IndexedDB Schema v3, debounced save queue (600ms), undo/redo command stack (80 operations), manual/automatic version history checkpoints, session crash recovery, portable `.omni` ZIP archive backup/restore, and multi-tab conflict warnings.
- **Excel & CSV Import/Export (`Stage 12`):** Microsoft Excel (.xlsx) parsing/generation with styling, merged cells, borders, and freeze panes; RFC 4180 CSV/TSV parser with Telugu Unicode preservation (`రాష్ట్రం, నగరం`) and formula injection neutralization.
- **Charts & Data Visualization (`Stage 11`):** Interactive Apache ECharts integration supporting Bar, Column, Line, Area, Pie, Donut, and Scatter charts with live data synchronization, draggable overlay, and PNG export.
- **Advanced Data Analysis (`Stage 10`):** Conditional formatting (highlight rules, top/bottom, custom formulas), data bars, color scales, icon sets, named ranges manager, interactive Pivot Tables, grouping and subtotals, and Goal Seek / Scenario what-if analysis.
- **Data Management & Data Tools (`Stage 9`):** Comprehensive spreadsheet data manipulation suite. Dedicated **Data** ribbon tab featuring:
  - **Single & Multi-Level Sorting:** Instant A-to-Z / Z-to-A quick sorting and custom multi-level sort modal preserving row record integrity, cell styles, and formulas, with table range auto-detection and blanks always placed at the bottom.
  - **Column Filtering & Visual Row Hiding:** Interactive filter icons on table column headers, distinct value checklist popovers with live counts, condition rules (text contains/starts/ends, numeric greater/less/between, blanks), multi-column AND logic, and non-destructive virtual row hiding persisted to IndexedDB.
  - **Freeze Panes:** Freeze Top Row, Freeze First Column, Freeze at Selection, and Unfreeze Panes with pinned headers/rails, sticky viewport alignment, and visual boundary separators.
  - **Find & Replace:** Search values or formulas across active sheet or entire workbook with case sensitivity, match entire cell contents, stepping navigation (`Next`/`Prev`), single replace, replace all, and global shortcuts (`Ctrl+F`, `Ctrl+H`).
  - **Remove Duplicates:** Configurable column selector, header row toggle, live duplicate count preview, and safe row deletion with automatic upward record shifting.
  - **Data Validation & In-Cell Dropdowns:** Whole number, decimal, date, text length, custom formula, and list criteria with in-cell dropdown chevron popover selectors and error alert configurations (`stop`, `warning`, `info`).
  - **Text to Columns:** Delimited (comma, semicolon, tab, space, custom, consecutive collapse) and fixed-width split wizard with destination overwrite warning and live data preview table.
  - **Trim Whitespace:** One-click cleanup of leading, trailing, and repeated whitespace across selected ranges while protecting formula cells.
- **Workbook & Worksheet Management (`Stage 8`):** Full multi-sheet workbook orchestration featuring an Excel-inspired bottom tab bar with smooth horizontal scroll navigation, quick jump sheet menu (`AllSheetsMenu`), `+` new sheet creator with gap-reclaiming name generation, inline renaming with validation rules (31-char limit, duplicate prevention, forbidden characters), deep-copy sheet duplication, deletion with confirmation and single-sheet protection, HTML5 drag-and-drop and accessible context menu reordering, 16-color tab accents with custom hex pickers, and sheet hiding/unhiding modals.
- **Professional Cell Formatting & Styling Engine (`Stage 7`):** Desktop-class cell styling and formatting toolbar with font family, size, B/I/U/S, text and background color pickers with a 50-color palette matrix and custom hex input, comprehensive border picker (thin, medium, thick, double, dashed with customizable colors), horizontal and vertical alignments, indent controls, wrap text, merged cells engine with non-anchor data protection warnings, number formatting engine (General, Number with grouping, Currencies `$`, `€`, `£`, `₹`, `¥`, Percentages, Dates, Times, Scientific, and multi-section custom formats), single and locked multi-use Format Painter, Clear Formatting with sparse map pruning, and built-in cell styles presets.
- **Advanced Formula Library & Autocomplete (`Stage 6`):** Extends calculation capabilities with 92 built-in functions across 7 categories (Lookup & Reference with `VLOOKUP`, `HLOOKUP`, `XLOOKUP`, `INDEX`, `MATCH`, Text with `TEXTJOIN`, `CONCAT`, `MID`, `SUBSTITUTE`, Date & Time with UTC serial date math, Mathematical, Statistical, Logical, and Information). Real-time formula autocomplete dropdown, live argument parameter assistant tooltips with syntax highlighting, and an interactive Formula Reference Panel modal accessible via the Formula Bar's `fx` button.
- **Cell Editing & Formula Engine (`Stage 5`):** Pure AST-based spreadsheet calculation engine with lexical tokenizer, recursive descent parser adhering to Excel operator precedence, extensible function registry, tree-walking evaluator without `eval()`, directed dependency graph (DAG) with Kahn's topological sort recalculation, circular reference detection (`#CYCLE!`), standard error codes (`#DIV/0!`, `#VALUE!`, `#REF!`, `#NAME?`, `#NUM!`, `#N/A`), interactive in-cell `<input>` editing, synchronized formula bar, and IndexedDB persistence.
- **Spreadsheet Grid Engine (`Stage 4`):** High-performance 2D virtualized grid capable of smooth scrolling over 1,000,000 rows and 16,384 columns with prefix-sum $O(\log N)$ binary search indexing. Features multi-cell range selection, header highlighting, keyboard navigation (Arrows, Shift-expansion, Tab, Enter, Home/End, PageUp/Down), Excel-compatible TSV clipboard copy/cut/paste, row/column insertion and deletion, interactive drag-resizing, and 400ms debounced persistence to IndexedDB.
- **Home Dashboard & Workspace (`Stage 3`):** Full workbook management suite including creating, opening, renaming, duplicate cloning (deep copy), deleting with sheet cascades, favoriting/starring, folder organization with dynamic workbook counts, instant search, and sorting.
- **Design System & Theme Engine (`Stage 2`):** Features an Excel-inspired Deep Navy (`#0f172a`) and Professional Blue (`#2563eb` / `#3b82f6`) palette with immediate, flicker-free switching between **Light**, **Dark**, and **System** themes.
- **Reusable Component Library:** Built with 21 accessible, keyboard-friendly UI components (Button, IconButton, Input, SearchInput, Dropdown, Tooltip, Modal, ConfirmationDialog, ContextMenu, Badge, Tabs, Toggle, Checkbox, Radio, Select, Toast, LoadingState, EmptyState, ErrorState, Divider, Breadcrumb).
- **Responsive Application Shell:** Complete top header with breadcrumbs, collapsible desktop sidebar (224px / 64px with tooltips), off-canvas mobile drawer navigation, and a dedicated full-viewport spreadsheet editor mode.
- **Installable PWA:** Equipped with a service worker and web app manifest for native desktop and mobile app installation.
- **Sparse Cell Architecture:** Employs an efficient sparse coordinate hash map (`Record<string, Cell>`) ensuring that workbooks with up to 1,000,000 rows consume minimal memory.
- **Decoupled Engine Adapters:** Grid virtualization and formula calculations sit behind strict architectural interfaces (`ISpreadsheetEngineAdapter` and `ICalculationEngine`), eliminating vendor lock-in.

---

## 2. Requirements

- **Node.js:** v18.0.0 or later (v24+ recommended)
- **npm:** v9.0.0 or later
- **Modern Browser:** Chrome, Edge, Safari, or Firefox with IndexedDB and Service Worker support.

---

## 3. Installation & Setup

```bash
# Navigate to the project directory
cd "C:\Users\Damayanti Crest\.gemini\antigravity\scratch\spreadsheet-app"

# Install dependencies
npm install
```

---

## 4. Development & Build Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Launches the Vite local development server with hot module replacement (HMR) at `http://localhost:5173`. |
| `npm run build` | Executes TypeScript typecheck and builds the optimized production bundle with PWA service worker into `/dist`. |
| `npm run preview` | Serves the production build locally to test offline service worker caching and PWA installation. |
| `npm run test` | Executes the Vitest unit and integration test suite (296 tests across 46 test files). |
| `npm run test:watch` | Runs Vitest in interactive watch mode. |
| `npm run test:e2e` | Runs Playwright end-to-end tests across desktop and mobile layouts. |
| `npm run typecheck` | Runs the TypeScript compiler in strict mode without emitting output (`tsc --noEmit`). |
| `npm run lint` | Runs ESLint 9 across all source and test files. |
| `npm run format` | Runs Prettier to format source files. |

---

## 5. Navigation & Routes

| Path | View | Purpose |
| :--- | :--- | :--- |
| `/` | **Home Dashboard** | Welcome banner, quick actions, recent workbooks, and all workbooks list/grid. |
| `/recent` | **Recent Workbooks** | Spreadsheets sorted by last opened/modified timestamp. |
| `/starred` | **Starred Workbooks** | Favorited spreadsheets flagged for quick access. |
| `/files` | **My Workbooks** | Complete workspace directory with search and sorting. |
| `/folders` | **My Folders** | Folder manager with workbook counts, color tags, and folder CRUD. |
| `/folders/:folderId` | **Folder Detail** | Filtered view of workbooks inside a specific folder with "New in Folder" action. |
| `/workbook/:workbookId` | **Spreadsheet Editor** | Full spreadsheet editor workspace with 2D virtualized grid, toolbar, formula bar, and tabs. |
| `/settings` | **Settings** | Theme switching, IndexedDB storage quota meter, and database wipe tools. |

---

## 6. Project Directory Structure

```
spreadsheet-app/
├── public/
│   ├── icons/                  # 192x192 and 512x512 PWA icons
│   ├── favicon.ico             # Application favicon
│   └── manifest.json           # Web App Manifest
│
├── src/
│   ├── app/
│   │   ├── config/             # Global application configuration constants
│   │   ├── providers/          # Root providers (ErrorBoundary, Theme, IndexedDB boot)
│   │   └── routes/             # React Router v6 definitions
│   │
│   ├── components/
│   │   ├── common/             # ErrorBoundary, LoadingSpinner, NotFoundPage
│   │   ├── layout/             # AppLayout, Header, Sidebar
│   │   └── ui/                 # 21 Reusable Design System components (Button, Modal, Toast, Tabs, etc.)
│   │
│   ├── features/
│   │   ├── dashboard/          # Home Dashboard, Quick Actions, Grids/Lists, Modals, Folder Management
│   │   ├── spreadsheet/        # Spreadsheet Editor workspace (Header, Toolbar, FormulaBar, Grid, SheetTabs)
│   │   ├── workbooks/          # Workbook domain contracts
│   │   ├── formulas/           # Formula definitions and category contracts
│   │   ├── formatting/         # Cell style and conditional formatting contracts
│   │   ├── charts/             # ECharts integration contracts
│   │   ├── data-tools/         # Sorting, filtering, validation contracts
│   │   └── settings/           # Tabbed Settings shell & storage quota diagnostics
│   │
│   ├── engine/
│   │   ├── grid/               # 2D Grid Virtualizer, Selection, Keyboard Nav, Clipboard, Operations
│   │   ├── calculation/        # Formula tokenization and calculation contracts
│   │   ├── formatting/         # Number and date formatters
│   │   ├── compatibility/      # File import/export contracts (XLSX, CSV)
│   │   └── adapters/           # Decoupled engine adapter interface & stubs
│   │
│   ├── storage/
│   │   ├── indexeddb/          # IndexedDB connection, schema v2, and quota handlers
│   │   ├── migrations/         # Database migration manager (v1 & v2 schema)
│   │   └── repositories/       # Repositories (Workbook, Sheet, Folder, Preferences)
│   │
│   ├── stores/                 # Zustand stores (app, workspace, workbook, sheet, selection, prefs, toast)
│   ├── hooks/                  # Network status, PWA install prompts
│   ├── services/               # WorkbookService & FolderService domain workflows
│   ├── types/                  # TypeScript domain models and interfaces
│   ├── utils/                  # Coordinate math, logger, errors, date, id, cn
│   ├── styles/index.css        # Tailwind CSS & centralized design tokens
│   ├── App.tsx                 # Root application component
│   └── main.tsx                # Client entrypoint
│
├── tests/
│   ├── unit/                   # Unit tests (models, storage, manifest, shell, theme, UI, grid, keyboard, clipboard, persistence)
│   ├── integration/            # Route navigation integration tests
│   ├── e2e/                    # Playwright end-to-end tests (desktop & mobile)
│   └── setup.ts                # Test setup (fake-indexeddb, matchMedia, ResizeObserver, storage quota mocks)
│
├── docs/
│   ├── ARCHITECTURE.md         # Detailed layer architecture and data flow
│   ├── DESIGN_SYSTEM.md        # Design tokens, color palette, typography, components catalog
│   ├── TECH_STACK.md           # Selected technologies and licensing review
│   ├── ENGINE_EVALUATION.md    # Comprehensive spreadsheet engine comparison
│   └── STORAGE_DESIGN.md       # IndexedDB schema, sparse cells, and migrations
│
├── PROJECT_STATUS.md           # Stage 4 milestone tracking and roadmap
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 7. Documentation Index

- Production Deployment Guide: [DEPLOYMENT.md](DEPLOYMENT.md)
- Testing & Quality Assurance: [TESTING.md](TESTING.md)
- Known Limitations & Boundaries: [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md)
- Full Changelog (Stages 1-15): [CHANGELOG.md](CHANGELOG.md)
- Project Status & Release Audit: [PROJECT_STATUS.md](PROJECT_STATUS.md)
- Design system & UI catalog: [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)
- Detailed system design: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Technology selection & licensing: [docs/TECH_STACK.md](docs/TECH_STACK.md)
- Spreadsheet engine comparison: [docs/ENGINE_EVALUATION.md](docs/ENGINE_EVALUATION.md)
- IndexedDB & sparse storage model: [docs/STORAGE_DESIGN.md](docs/STORAGE_DESIGN.md)
