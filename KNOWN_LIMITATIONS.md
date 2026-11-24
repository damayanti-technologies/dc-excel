# OmniSheet — Known Limitations & Compatibility Boundaries

This document lists known limitations, Excel compatibility boundaries, and architectural trade-offs in OmniSheet.

---

## 1. Microsoft Excel Compatibility Boundaries

OmniSheet prioritizes core spreadsheet calculation fidelity, performance, and data safety. It does not implement legacy, insecure, or proprietary Microsoft Excel features:

| Feature | Support Level | Technical Reason / Policy |
| :--- | :--- | :--- |
| **VBA Macros / VBScript** | **Not Supported** | Strict security policy. Untrusted executable code is never executed in client memory. |
| **Dynamic Array Spill Formulas** | **Partially Supported** | Standard array functions (e.g. `SUMPRODUCT`, `XLOOKUP`) evaluate internally. Spill across adjacent grid cells (`#SPILL!`) is not implemented in v1. |
| **3D Workbook References** | **Single-Sheet Formulas Only** | Formulas referencing cells across multiple sheets (e.g. `Sheet2!A1`) are parsed as single-sheet identifiers in the current calculation engine. |
| **External Workbook Links** | **Not Supported** | Local-first isolation boundary. OmniSheet never issues network requests to fetch external spreadsheets. |
| **ActiveX Controls & Form Controls** | **Not Supported** | Proprietary legacy Windows controls; incompatible with modern web standards. |
| **Power Query / Power Pivot** | **Not Supported** | Requires proprietary Microsoft enterprise analytical data engines. |
| **Embedded Images / Floating Shapes** | **Charts Supported; Shapes Not Supported** | Interactive charts (ECharts) are fully supported. Custom vector shapes and freehand drawing objects are omitted. |

---

## 2. Browser & Environment Limits

1. **Local Storage Quotas:**
   - IndexedDB storage is bounded by the browser's disk quota (typically 10%–60% of available disk space, often 5 GB–20 GB on desktop).
   - Storage usage and remaining quota can be inspected at any time via the **Storage** dialog in the header.
2. **Tab Sleeping & Background Throttling:**
   - When a browser tab is placed in the background for prolonged periods, browser timers (such as `setTimeout`) are throttled by the OS. OmniSheet's save queue automatically flushes immediately upon `visibilitychange` to prevent data loss.
3. **Safari / WebKit Private Browsing:**
   - In Safari Private Browsing mode, IndexedDB is ephemeral and deleted when the window is closed. OmniSheet will operate normally during the session, but users in Private Browsing are prompted to create a `.omni` or `.xlsx` backup before closing the tab.
4. **Mobile Screen Real Estate:**
   - While OmniSheet is fully responsive and touch-operable on smartphones and tablets, complex spreadsheet workflows (such as Pivot Table configurations and multi-level custom sorting) are significantly more comfortable on displays with a viewport width of 1024px or higher.

---

## 3. Delimited Text (CSV/TSV) Export Boundaries

- **Single Sheet Constraint:** By definition, CSV and TSV formats support only a single rectangular table of text. Exporting a multi-sheet workbook to CSV exports the currently active sheet. To preserve multiple worksheets, use the Excel (.xlsx) export or the `.omni` complete backup archive.
- **Formula Storage:** CSV files store calculated formula results by default. When the "Export raw formula expressions" option is checked, formulas are written as raw text strings (e.g. `=SUM(A1:A10)`).
