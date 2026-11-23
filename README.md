# OmniSheet: Professional Local-First Spreadsheet Application

> A private, high-performance, offline-first spreadsheet application inspired by Microsoft Excel and Google Sheets. Designed with zero cloud dependencies, zero mandatory user accounts, and 100% client-side privacy.

---

## 1. Architectural Highlights

- **Local-First & Offline-First:** Persists all workbooks, worksheets, folders, and preferences in browser IndexedDB. Runs standalone without an internet connection.
- **Design System & Theme Engine:** Features an Excel-inspired Deep Navy (`#0f172a`) and Professional Blue (`#2563eb` / `#3b82f6`) palette with immediate, flicker-free switching between **Light**, **Dark**, and **System** themes.
- **Reusable Component Library:** Built with 21 accessible, keyboard-friendly UI components (Button, IconButton, Input, SearchInput, Dropdown, Tooltip, Modal, ConfirmationDialog, ContextMenu, Badge, Tabs, Toggle, Checkbox, Radio, Select, Toast, LoadingState, EmptyState, ErrorState, Divider, Breadcrumb).
- **Responsive Application Shell:** Complete top header with breadcrumbs, collapsible desktop sidebar (224px / 64px with tooltips), and off-canvas mobile drawer navigation.
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
| `npm run test` | Executes the Vitest unit and integration test suite (37 tests across 7 test files). |
| `npm run test:watch` | Runs Vitest in interactive watch mode. |
| `npm run test:e2e` | Runs Playwright end-to-end tests across desktop and mobile layouts. |
| `npm run typecheck` | Runs the TypeScript compiler in strict mode without emitting output (`tsc --noEmit`). |
| `npm run lint` | Runs ESLint 9 across all source and test files. |
| `npm run format` | Runs Prettier to format source files. |

---

## 5. Project Directory Structure

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
│   │   ├── dashboard/          # Workspace Dashboard shell & Stage 2 verification playground
│   │   ├── spreadsheet/        # Spreadsheet Editor shell with ribbon toolbar and formula bar
│   │   ├── workbooks/          # Workbook domain contracts
│   │   ├── formulas/           # Formula definitions and category contracts
│   │   ├── formatting/         # Cell style and conditional formatting contracts
│   │   ├── charts/             # ECharts integration contracts
│   │   ├── data-tools/         # Sorting, filtering, validation contracts
│   │   └── settings/           # Tabbed Settings shell & storage quota diagnostics
│   │
│   ├── engine/
│   │   ├── grid/               # Viewport metric calculations and virtualization
│   │   ├── calculation/        # Formula tokenization and calculation contracts
│   │   ├── formatting/         # Number and date formatters
│   │   ├── compatibility/      # File import/export contracts (XLSX, CSV)
│   │   └── adapters/           # Decoupled engine adapter interface & stubs
│   │
│   ├── storage/
│   │   ├── indexeddb/          # IndexedDB connection and quota handlers
│   │   ├── migrations/         # Database migration manager (v1 schema)
│   │   └── repositories/       # Repositories (Workbook, Sheet, Folder, Preferences)
│   │
│   ├── stores/                 # Zustand stores (app, workbook, sheet, selection, prefs, toast)
│   ├── hooks/                  # Network status, PWA install prompts
│   ├── services/               # WorkbookService domain workflows
│   ├── types/                  # TypeScript domain models and interfaces
│   ├── utils/                  # Coordinate math, logger, errors, cn
│   ├── styles/index.css        # Tailwind CSS & centralized design tokens
│   ├── App.tsx                 # Root application component
│   └── main.tsx                # Client entrypoint
│
├── tests/
│   ├── unit/                   # Unit tests (models, storage, manifest, shell, theme, UI components)
│   ├── integration/            # Route navigation integration tests
│   ├── e2e/                    # Playwright end-to-end tests (desktop & mobile)
│   └── setup.ts                # Test setup (fake-indexeddb, matchMedia, storage quota mocks)
│
├── docs/
│   ├── ARCHITECTURE.md         # Detailed layer architecture and data flow
│   ├── DESIGN_SYSTEM.md        # Design tokens, color palette, typography, components catalog
│   ├── TECH_STACK.md           # Selected technologies and licensing review
│   ├── ENGINE_EVALUATION.md    # Comprehensive spreadsheet engine comparison
│   └── STORAGE_DESIGN.md       # IndexedDB schema, sparse cells, and migrations
│
├── PROJECT_STATUS.md           # Stage 2 milestone tracking and roadmap
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 6. Documentation Index

- Design system & UI catalog: [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)
- Detailed system design: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Technology selection & licensing: [docs/TECH_STACK.md](docs/TECH_STACK.md)
- Spreadsheet engine comparison: [docs/ENGINE_EVALUATION.md](docs/ENGINE_EVALUATION.md)
- IndexedDB & sparse storage model: [docs/STORAGE_DESIGN.md](docs/STORAGE_DESIGN.md)
- Current status & stage tracking: [PROJECT_STATUS.md](PROJECT_STATUS.md)
