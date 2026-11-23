# OmniSheet: Professional Local-First Spreadsheet Application

> A private, high-performance, offline-first spreadsheet application inspired by Microsoft Excel and Google Sheets. Designed with zero cloud dependencies, zero mandatory user accounts, and 100% client-side privacy.

---

## 1. Architectural Highlights

- **Local-First & Offline-First:** Persists all workbooks, worksheets, folders, and preferences in browser IndexedDB. Runs standalone without an internet connection.
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
| `npm run test` | Executes the Vitest unit and integration test suite (101 tests across 17 test files). |
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

- Design system & UI catalog: [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)
- Detailed system design: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Technology selection & licensing: [docs/TECH_STACK.md](docs/TECH_STACK.md)
- Spreadsheet engine comparison: [docs/ENGINE_EVALUATION.md](docs/ENGINE_EVALUATION.md)
- IndexedDB & sparse storage model: [docs/STORAGE_DESIGN.md](docs/STORAGE_DESIGN.md)
- Current status & stage tracking: [PROJECT_STATUS.md](PROJECT_STATUS.md)
