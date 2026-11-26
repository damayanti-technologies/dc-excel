# DC Excel — System Architecture & Layer Boundaries

**Brand:** Damayanti Crest  
**Product:** DC Excel  
**Tagline:** Create. Calculate. Analyse.  
**Date:** November 2026  
**Document:** `docs/ARCHITECTURE.md`

---

## 1. Architectural Principles

DC Excel is architected as an **independent, local-first, offline-resilient desktop/web productivity and spreadsheet platform**. It enforces the following core architectural mandates:

1. **Strict Layer Separation:** Presentation components never access IndexedDB or calculate formula graphs directly.
2. **UI Independence:** Workbook and sheet data structures are decoupled from React UI state.
3. **Sparse Memory Model:** Memory footprint is proportional only to populated cells, preventing browser crashes on million-row spreadsheets.
4. **$O(1)$ Arithmetic Virtualization:** Row and column rendering utilizes constant-time coordinate projection without pre-allocating millions of DOM nodes or prefix-sum arrays.
5. **Zero Cloud Requirement:** Complete feature parity offline with zero telemetry and 100% client-side privacy.
6. **Hub Modularity:** Standalone productivity hubs (Tools Hub, Formula Center, Data Center, DC Excel Academy, Templates, Shortcut Center) run in dedicated routes while integrating seamlessly with the Workbook Workspace.

---

## 2. Layer Architecture Diagram

```mermaid
flowchart TD
    subgraph PresentationLayer["Presentation Layer (React 18 + Tailwind)"]
        UI_Shell["App Shell & Navigation (Header, Sidebar, Global Search)"]
        UI_Home["Home Hub (Command Center, Quick Actions, Guides)"]
        UI_Editor["Spreadsheet Workspace (Grid, Formula Bar, Ribbons, Modals)"]
        UI_Tools["Tools Hub (Calculators & Converters)"]
        UI_Formula["Formula Center (Explorer, Builder, Sandbox)"]
        UI_Data["Data Center (Cleaning, Validation, Analysis)"]
        UI_Academy["DC Excel Academy (19 Interactive Courses)"]
        UI_Templates["Templates Gallery (Business, Engineering, Personal)"]
        UI_Shortcuts["Shortcut Center & Command Palette (Ctrl+K)"]
        UI_Settings["Settings & Storage Diagnostics"]
    end

    subgraph StateLayer["Application State Layer (Zustand)"]
        Store_App["useAppStore (Modals, Navigation, Sidebar)"]
        Store_WB["useWorkbookStore (Active WB, Save Status, Undo)"]
        Store_Sheet["useSheetStore (Active Sheet Data, Cells, Dimensions)"]
        Store_Selection["useSelectionStore (Active Cell, Selection Range)"]
        Store_Prefs["useUIPreferencesStore (Theme, User Settings)"]
        Store_Workspace["useWorkspaceStore (Workbooks, Folders, Search)"]
    end

    subgraph ServiceLayer["Service & Domain Layer"]
        Service_WB["WorkbookService (Create, Duplicate, Delete)"]
        Service_Save["SaveQueue & RecoveryService (Crash Detection)"]
        Service_Log["Logger & Telemetry Shield"]
    end

    subgraph EngineLayer["Spreadsheet Engine & Adapters"]
        Engine_Calc["CalculationEngine (AST Parser, Cycle Detection)"]
        Engine_Grid["GridVirtualizer ($O(1)$ Math Viewport)"]
        Engine_Format["ValueFormatter (Number & Date Formatting)"]
        Engine_Data["DataTools (Sorting, Filtering, Find/Replace)"]
        Engine_Charts["ChartDataAdapter & ECharts Builder"]
    end

    subgraph StorageLayer["Persistence Layer (IndexedDB via idb)"]
        Repo_WB["WorkbookRepository"]
        Repo_Sheet["SheetRepository"]
        Repo_Folder["FolderRepository"]
        Repo_Prefs["PreferencesRepository"]
        Repo_Recovery["RecoveryRepository"]
        IDB_Instance[("IndexedDB: omnisheet_db v3")]
    end

    PresentationLayer --> StateLayer
    PresentationLayer --> ServiceLayer
    StateLayer --> ServiceLayer
    StateLayer --> EngineLayer
    ServiceLayer --> StorageLayer
    EngineLayer --> StateLayer
    StorageLayer --> IDB_Instance
```

---

## 3. Product Hub Architecture

DC Excel provides 9 distinct application areas:

1. **Home**: Productivity command center with welcome banner, unified global search, quick action cards, recent files, template highlights, and beginner quick guides.
2. **Workbook Workspace**: High-performance spreadsheet editor supporting up to 1,048,576 rows and 16,384 columns, formula bar, name box, sheet tabs, cell formatting, charts, and data tools.
3. **Tools Hub**: Integrated calculators (Scientific, Engineering, Financial, Statistics) and Universal Unit Converter with "Insert into Cell" capability.
4. **Formula Center**: Searchable formula library across 8 categories, interactive visual formula builder, and sandboxed tester.
5. **Data Center**: Data cleaning, text-to-columns, deduplication, data validation, and descriptive statistics.
6. **DC Excel Academy**: 19 offline-capable interactive courses with guided exercises, challenges, and local progress tracking.
7. **Templates**: Pre-designed, functional spreadsheet templates ready for 1-click instantiation.
8. **Shortcut Center & Command Palette**: Comprehensive keyboard shortcut database with interactive practice and `Ctrl+K` command launcher.
9. **Settings & Storage**: Theme configuration, locale preferences, autosave timers, storage quota analytics, and JSON backup/restore.
