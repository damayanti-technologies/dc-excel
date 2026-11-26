# DC Excel — Technology Stack
**Brand:** Damayanti Crest  
**Product:** DC Excel  
**Tagline:** Create. Calculate. Analyse.  
**Document:** `docs/TECHNOLOGY_STACK.md`

---

## 1. Core Framework & Build Tooling

- **React 18.3.1**: Component architecture, Concurrent Mode, fine-grained state hooks.
- **TypeScript 5.6**: Strict typing across engine, AST parser, cell models, and storage repositories.
- **Vite 5.4**: Ultra-fast ES-module bundling, Rollup chunk splitting (`echarts-vendor`, `exceljs-vendor`, `react-vendor`).
- **React Router v6**: Hash-based client-side routing (`createHashRouter`) for seamless offline PWA and GitHub Pages compatibility.

---

## 2. Styling & Design System

- **Tailwind CSS 3.4**: Utility-first CSS with CSS variables for dynamic themes.
- **Emerald Obsidian Theme**: Dark obsidian background (`#09090b`), emerald accents (`#10b981`), neutral borders (`#27272a`), high-contrast slate text.
- **Lucide React**: 240+ lightweight, accessible vector icons.
- **Zero AI-Fluff Aesthetic**: Professional, desktop-grade layout with compact toolbars, clear status indicators, and no decorative bloat.

---

## 3. Spreadsheet & Calculation Engine

- **Custom Recursive-Descent Formula Parser**: Generates typed Abstract Syntax Trees (AST) supporting unary, binary, function calls, ranges (`A1:B10`, `A:A`, `1:1`), array constants (`{1,2;3,4}`), and implicit intersection.
- **Cycle-Detection Dependency Graph**: Tarjan-inspired DFS cycle detector preventing stack overflows on circular references.
- **Sparse Cell Map**: `Record<string, Cell>` indexing via `${row}:${col}` hash keys. Unallocated cells cost zero bytes.
- **$O(1)$ Arithmetic Virtualizer**: Instant viewport calculation without allocating arrays for uniform row heights / column widths.

---

## 4. Charting & Visualization

- **Apache ECharts 6.1**: Canvas and SVG hardware-accelerated charting.
- **Chart Types**: Column, Bar, Line, Area, Pie, Doughnut, Scatter, Combo.
- **Interactive Overlays**: Draggable, resizable chart viewports attached to worksheet coordinates.

---

## 5. Storage & Offline Capabilities

- **IndexedDB via `idb` 8.0**: Indexed object stores for workbooks, sheets, folders, user preferences, and crash recovery checkpoints.
- **Generation-Tracked Save Queue**: Concurrency-safe debounced autosave preventing out-of-order race conditions.
- **PWA / Workbox 7.0**: Precached application shell, Web App Manifest, auto-updating Service Worker for 100% offline usage.
- **ExcelJS 4.4**: Professional XLSX import and export supporting cells, formulas, number formats, styles, and sheet tabs.
- **Fast CSV/TSV Parser**: RFC 4180 compliant delimited text processor.

---

## 6. Testing & Quality Assurance

- **Vitest 2.1**: High-performance unit and integration testing.
- **76 Test Files / 535 Tests**: Covering formulas, virtualizer, storage, undo/redo, data tools, charts, and file compatibility.
- **Playwright Test**: End-to-end browser automation.
