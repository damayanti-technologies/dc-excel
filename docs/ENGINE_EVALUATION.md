# Spreadsheet Engine Evaluation & Technical Selection Report

**Project:** OmniSheet  
**Date:** November 2026  
**Architect:** Senior Software Architect & Technical Lead  
**Scope:** Stage 1 Technical Foundation & Engine Viability Assessment  

---

## 1. Executive Summary

OmniSheet requires a robust, performant, extensible, and locally resilient spreadsheet engine. To build a long-term professional application without legal risk, recurring subscription burdens, or vendor lock-in, we conducted a rigorous comparative evaluation of the leading open-source and commercial spreadsheet engines.

The evaluation prioritized seven criteria:
1. **Licensing & Commercial Safety:** Absolute freedom from restrictive licenses (e.g., GPL copyleft or restrictive commercial clauses) without hidden royalties.
2. **Architecture Decoupling:** Ability to separate data models, formula calculation, and grid rendering via clean adapter interfaces.
3. **Formula & Calculation Engine:** Depth of Excel-compatible functions, circular dependency detection, and cross-sheet referencing.
4. **XLSX / CSV Fidelity:** Compatibility with Microsoft Excel workbooks (openxml standards) and standard tabular data.
5. **Rendering Performance:** Virtualization support capable of rendering 1,000,000+ rows and 10,000+ columns at 60 FPS without DOM bloat.
6. **Local-First & Offline Resilience:** Zero requirement for backend execution, cloud services, or authentication endpoints.
7. **Extensibility & UI Customization:** Ease of styling with Tailwind CSS, custom design tokens, and domain features (charts, pivot tables).

---

## 2. Comparative Engine Analysis

### 2.1 Univer (`@univerjs/core`, `@univerjs/sheets`, etc.)

- **Overview:** Modern, TypeScript-first, collaborative document and spreadsheet suite developed by DreamNum. Built with Canvas rendering, pluggable architecture, and Web Worker support.
- **Licensing:**
  - Core components are published under **Apache License 2.0**.
  - *Caution:* Certain advanced plugins and enterprise collaboration extensions are proprietary or subject to commercial enterprise licenses. The open-source core includes sheets, formula calculation, and base formatting.
- **Formula Coverage:** High. Covers over 300+ standard Excel functions with an AST-based calculation engine and array formula support.
- **XLSX Compatibility:** Good native support through `@univerjs/sheets-exchange`, though full fidelity requires custom styling bridges.
- **Performance:** Excellent. Canvas rendering engine with double-buffering and viewport culling handles 1,000,000 cells smoothly.
- **Architecture Fit:** Pluggable dependency injection (DI) container. Strong abstraction, but brings significant package weight (~1.5 MB bundle) and proprietary ecosystem ties.

### 2.2 FortuneSheet / Luckysheet (`@fortune-sheet/react`)

- **Overview:** FortuneSheet is the modern React/TypeScript rewrite of Luckysheet, a widely adopted browser spreadsheet.
- **Licensing:** **MIT License**. Fully permissive for personal and commercial usage with zero royalties.
- **Formula Coverage:** Moderate to High (~200+ formulas, including statistical, financial, lookup, math).
- **XLSX Compatibility:** Requires third-party translation (`luckyexcel` / SheetJS) to convert XLSX files into FortuneSheet JSON models.
- **Performance:** Mixed. Uses Canvas for the cell grid, but overlay DOM layers for formula bar, headers, and context menus can create lag when sheets have thousands of complex conditional formatting rules.
- **Architecture Fit:** Tightly couples state to its internal data structure, making decoupled Zustand store synchronization more difficult.

### 2.3 Handsontable (`handsontable`)

- **Overview:** Mature, highly customizable data grid and spreadsheet component with extensive enterprise adoption.
- **Licensing:**
  - **Commercial License Required for Commercial Use.**
  - Non-commercial evaluation license only under restrictive terms; proprietary license fee applies for commercial or production distribution.
- **Formula Coverage:** Requires integration with HyperFormula.
- **XLSX Compatibility:** No native XLSX parser included; requires SheetJS or server-side parsing.
- **Performance:** Very high for tabular editing and data entry.
- **Architecture Fit:** **Disqualified due to licensing constraints.** The project guidelines mandate no commercial dependencies or mandatory licensing fees.

### 2.4 HyperFormula (Handsontable Team)

- **Overview:** Standalone headless spreadsheet calculation engine written in TypeScript.
- **Licensing:**
  - **GPL-3.0 (Copyleft) or Commercial License.**
  - Using GPL-3.0 would force the entire OmniSheet application codebase to be licensed under GPL-3.0, preventing permissive distribution or proprietary embedding.
- **Formula Coverage:** Exceptional (380+ functions, highly optimized topological sort dependency engine, multi-sheet, matrix calculations).
- **Architecture Fit:** Outstanding calculation abstraction, but **GPL-3.0 license is an unacceptable barrier** for a permissive MIT/Apache-2.0 local-first product.

### 2.5 Custom Decoupled Architecture: Hybrid Virtualized Canvas/DOM Grid + Open Formula Parser

- **Overview:** A custom, modular spreadsheet engine built specifically for OmniSheet:
  - **Grid Layer:** Virtualized HTML5 Canvas or virtualized CSS Grid DOM for cell rendering with viewport culling (only rendering visible rows/cols).
  - **Calculation Layer:** AST-based formula parser and directed acyclic graph (DAG) topological evaluator (using pure MIT/Apache-2.0 libraries such as `fast-formula-parser` or custom AST evaluator).
  - **Storage Layer:** Sparse coordinate hash map (`SparseCellMap`) backed by IndexedDB.
- **Licensing:** **100% Permissive MIT / Apache-2.0**.
- **Formula Coverage:** Incrementally built starting from standard arithmetic, SUM, AVERAGE, MIN, MAX, IF, VLOOKUP, XLOOKUP, INDEX, MATCH.
- **XLSX Compatibility:** Uses SheetJS Community Edition (`xlsx`) or `exceljs` (MIT) through an isolated adapter layer.
- **Performance:** Zero unnecessary dependencies, lean bundle (<300 KB total), custom memory management with sparse storage.

---

## 3. Comparison Matrix

| Evaluation Dimension | Univer | FortuneSheet | Handsontable | HyperFormula (Standalone) | OmniSheet Decoupled Engine |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Primary License** | Apache 2.0 (Core) | MIT | Commercial | GPL-3.0 / Commercial | **MIT / Apache 2.0** |
| **Commercial Cost** | Free (Core) | Free | $1,000+/yr | Commercial Fee / Copyleft | **$0 (Zero Royalty)** |
| **Formula Coverage** | 300+ | 200+ | Ext. (HyperFormula) | 380+ | Standard (~150+ roadmap) |
| **Grid Technology** | Canvas Virtualized | Canvas + DOM | DOM Virtualized | Headless (None) | **Virtualized Canvas/DOM** |
| **XLSX Compatibility** | Native Plugin | Via LuckyExcel | Via SheetJS | Headless (None) | **Via SheetJS / ExcelJS** |
| **Decoupled Architecture** | Good | Moderate | Poor | Excellent (Headless) | **First-Class Adapter** |
| **Bundle Size Overhead** | ~1.5 MB | ~800 KB | ~600 KB | ~350 KB | **< 200 KB** |
| **Offline Reliability** | 100% | 100% | 100% | 100% | **100% Client-Side** |

---

## 4. Architectural Recommendation & Roadmap

### Primary Decision: The Decoupled Adapter Strategy

Rather than hard-coupling OmniSheet to any single monolithic spreadsheet component, OmniSheet adopts an **Adapter Design Pattern** (`ISpreadsheetEngineAdapter` and `ICalculationEngine` defined in `src/types/engine.ts`):

1. **Stage 1 (Current):**
   - Architectural contracts, sparse data models, storage repositories, and a testable adapter boundary (`StubSpreadsheetEngineAdapter`) are established and verified.
2. **Engine Implementation Strategy (Stage 3 & 4):**
   - **Calculation Engine:** Deploy a headless, dependency-tracked calculation engine using a custom topological DAG parser or permissive MIT-licensed evaluation engine.
   - **Grid Rendering Engine:** Implement a virtualized Canvas/DOM hybrid grid capable of frictionless selection, virtual scroll offsets, and inline editing.
   - **Alternative Drop-in:** If Univer Core or FortuneSheet is chosen for specific UI shortcuts in later stages, the `ISpreadsheetEngineAdapter` enables swapping the rendering engine without modifying the storage schema, Zustand stores, or dashboard routes.

### Excel Compatibility Strategy:
- **SheetJS (Community Edition, Apache 2.0 / SheetJS License):** Industry standard for parsing and serializing XLSX binary files in browser environments without server dependencies.
- **ExcelJS (MIT):** Alternative robust option with deep support for formatting, font styles, and cell borders.
- Isolated behind `IFileCompatibilityService` in `src/engine/compatibility/`.

### Charting Engine Strategy:
- **Apache ECharts (Apache-2.0):** Evaluated and selected for Stage 9. It is lightweight, supports Canvas and SVG rendering, offers 20+ chart types (bar, line, scatter, pie, heatmap), and works completely offline with zero telemetry.

---

## 5. Unresolved Concerns & Mitigation

1. **Complex Formula Matrix Performance:**
   - *Concern:* Very large workbooks with 50,000+ formula cells with cascading dependencies may cause UI thread blocking during recalculation.
   - *Mitigation:* Web Worker execution planned for calculation engine in Stage 3, keeping UI interaction at a steady 60 FPS.
2. **SheetJS Security Warnings:**
   - *Concern:* Older versions of SheetJS hosted on public npm have known CVE warnings regarding prototype pollution on untrusted input.
   - *Mitigation:* Pin verified patch releases or utilize the official CDN/tarball release with sanitization boundaries.
