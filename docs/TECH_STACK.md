# Technology Stack & Dependency Justification

**Project:** OmniSheet  
**Date:** November 2026  
**Document:** `docs/TECH_STACK.md`  

---

## 1. Core Framework & Build Tooling

| Technology | Selected Version | License | Architectural Rationale |
| :--- | :--- | :--- | :--- |
| **React** | `^18.3.1` | MIT | Battle-tested component model with concurrent features, stable hooks, and universal ecosystem support. |
| **TypeScript** | `~5.6.3` | Apache-2.0 | Full strict-mode typing across all domain models, interfaces, stores, and coordinate math. Eliminates runtime type errors. |
| **Vite** | `^5.4.11` | MIT | Sub-millisecond HMR during development and optimized Rollup-based tree-shaken production bundles. |

---

## 2. Styling & Design System

| Technology | Selected Version | License | Architectural Rationale |
| :--- | :--- | :--- | :--- |
| **Tailwind CSS** | `^3.4.15` | MIT | Zero-runtime CSS framework producing minuscule stylesheet payloads. Extended with custom CSS variable design tokens. |
| **CSS Variables** | W3C Standard | Native | Enables instantaneous dynamic switching between light and dark modes without rebuilding class trees or re-rendering components. |
| **Lucide Icons** | `^0.460.0` | ISC (Permissive) | Crisp, tree-shakeable SVG icon library with consistent 24x24 geometry matching modern productivity suites. |
| **clsx + tailwind-merge** | `^2.1.1` / `^2.5.4` | MIT | Clean utility class composition with conflict resolution (`cn()` utility). |

---

## 3. State Management

| Technology | Selected Version | License | Architectural Rationale |
| :--- | :--- | :--- | :--- |
| **Zustand** | `^5.0.1` | MIT | High-performance, lightweight (<1.5 KB) store without boilerplate context providers. Perfect for splitting application state, workbook metadata, sheet data, and transient cell selection into isolated domains. |

---

## 4. Local Persistence & Storage

| Technology | Selected Version | License | Architectural Rationale |
| :--- | :--- | :--- | :--- |
| **idb** | `^8.0.0` | ISC / MIT | Modern, async Promise-based wrapper around native browser IndexedDB. Zero dependencies, robust TypeScript definitions, and transaction safety. |
| **Custom Repository Layer** | Internal | MIT | Encapsulates database transactions behind strict interfaces (`IWorkbookRepository`, `ISheetRepository`), guaranteeing that UI components never directly call IndexedDB primitives. |

---

## 5. PWA & Offline Infrastructure

| Technology | Selected Version | License | Architectural Rationale |
| :--- | :--- | :--- | :--- |
| **vite-plugin-pwa** | `^0.20.5` | MIT | Automated Service Worker generation powered by Google Workbox. Configured with precaching for application shell assets, cache-first strategies for fonts, and auto-updating capabilities. |
| **Web App Manifest** | W3C Standard | Native | Configures standalone display, icons (192x192, 512x512), theme colors, and native desktop/mobile install prompts. |

---

## 6. Testing Infrastructure

| Technology | Selected Version | License | Architectural Rationale |
| :--- | :--- | :--- | :--- |
| **Vitest** | `^2.1.4` | MIT | Ultra-fast unit and integration test runner sharing the same Vite configuration, alias mappings, and transformation pipeline. |
| **React Testing Library** | `^16.0.1` | MIT | User-centric DOM testing ensuring components render and behave according to accessibility standards. |
| **fake-indexeddb** | `^6.0.0` | Apache-2.0 | Complete in-memory implementation of the W3C IndexedDB 3.0 specification for deterministic, isolated unit testing without a browser process. |
| **Playwright** | `^1.48.2` | Apache-2.0 | Cross-browser end-to-end automation testing application launch, route navigation, theme switching, and offline PWA reliability. |

---

## 7. Code Quality & Formatting

| Technology | Selected Version | License | Architectural Rationale |
| :--- | :--- | :--- | :--- |
| **ESLint 9** | `^9.14.0` | MIT | Modern flat config enforcing TypeScript strict standards, React hook dependencies, and preventing unused variables. |
| **Prettier** | `^3.3.3` | MIT | Opinionated formatting ensuring consistent code style across all contributors and modules. |

---

## 8. Summary of Licensing Status

All installed packages and tooling dependencies are published under **permissive open-source licenses** (MIT, Apache-2.0, ISC). Zero GPL copyleft or proprietary commercial dependencies exist in the codebase.
