# OmniSheet Design System

**Project:** OmniSheet  
**Date:** November 2026  
**Document:** `docs/DESIGN_SYSTEM.md`  
**Milestone:** Stage 2 — Design System & Core Application Interface  

---

## 1. Design Philosophy & Aesthetic Direction

OmniSheet merges the **functional density and familiarity of Microsoft Excel** with the **sleek, refined aesthetics of modern desktop productivity software**.

### Core Tenets:
1. **Productivity-First:** Dense, purposeful layouts without superfluous whitespace, oversized cards, or gratuitous floating buttons.
2. **Deep Navy & Professional Blue:** A commanding primary identity grounded in deep slate navy (`#0f172a`), accented with crisp royal blue (`#2563eb`), and resting on clean neutral surfaces (`#f8fafc`).
3. **Subtle Elevation & Contrast:** Borders (`1px solid var(--border-default)`) delineate boundaries rather than heavy drop shadows. Shadows are restrained and natural.
4. **Instant Theme Switching:** Full, synchronized support for **Light**, **Dark**, and **System** themes with zero layout shifts or theme flashing.
5. **Zero Remote Telemetry:** The interface transparently signals its 100% offline-ready, client-side persistence model.

---

## 2. Design Tokens

### 2.1 Color Palette & Semantic Tokens

Tokens are declared as CSS Custom Properties in `src/styles/index.css` and mapped to Tailwind CSS utilities in `tailwind.config.js`.

| Token Name | Light Theme Value | Dark Theme Value | Usage Description |
| :--- | :--- | :--- | :--- |
| `--bg-app` | `#f8fafc` (Slate-50) | `#0b0f19` (Deep Charcoal Navy) | Root application workspace background |
| `--bg-surface` | `#ffffff` (Pure White) | `#111827` (Gray-900) | Main cards, spreadsheet canvas, content panels |
| `--bg-surface-elevated` | `#ffffff` | `#1e293b` (Slate-800) | Floating dialogs, popovers, dropdown menus |
| `--bg-surface-secondary`| `#f1f5f9` (Slate-100) | `#162032` (Custom Slate) | Sidebar, header, formula bar, table headers |
| `--bg-surface-tertiary` | `#e2e8f0` (Slate-200) | `#1e293b` (Slate-800) | Inactive tabs, badge fills, subtle states |
| `--text-primary` | `#0f172a` (Slate-900) | `#f8fafc` (Slate-50) | Primary headings, body copy, active inputs |
| `--text-secondary` | `#334155` (Slate-700) | `#cbd5e1` (Slate-300) | Secondary navigation labels, card descriptions |
| `--text-muted` | `#64748b` (Slate-500) | `#94a3b8` (Slate-400) | Subtitles, shortcut labels, metadata |
| `--text-subtle` | `#94a3b8` (Slate-400) | `#64748b` (Slate-500) | Placeholders, disabled text |
| `--brand-navy` | `#0f172a` (Slate-900) | `#38bdf8` (Sky-400) | Primary brand accents & logo wordmarks |
| `--accent-primary` | `#2563eb` (Blue-600) | `#3b82f6` (Blue-500) | Interactive buttons, primary action states |
| `--accent-hover` | `#1d4ed8` (Blue-700) | `#60a5fa` (Blue-400) | Hovered button and link states |
| `--accent-muted` | `#eff6ff` (Blue-50) | `#1e3a8a33` (Blue-900/20) | Active row highlights, soft selection fills |
| `--border-default` | `#e2e8f0` (Slate-200) | `#243048` (Slate-700) | Standard component and panel border |
| `--border-strong` | `#cbd5e1` (Slate-300) | `#334155` (Slate-600) | Input borders, active table gridlines |
| `--border-focus` | `#2563eb` (Blue-600) | `#3b82f6` (Blue-500) | Keyboard focus boundary |
| `--success-text` | `#15803d` (Green-700) | `#4ade80` (Green-400) | Success alerts, saved status indicators |
| `--warning-text` | `#b45309` (Amber-700) | `#fbbf24` (Amber-400) | Storage quota warnings, offline notices |
| `--error-text` | `#b91c1c` (Red-700) | `#f87171` (Red-400) | Input validation errors, destructive actions |

---

### 2.2 Typography Scale

OmniSheet uses the system-native **Inter** font family stack for fast rendering without layout shifting.

| Role | Font Size | Line Height | Weight | Tailwind Class |
| :--- | :--- | :--- | :--- | :--- |
| **Page Title** | 24px / 30px | 32px / 36px | 800 (Extrabold) | `text-2xl sm:text-3xl font-extrabold` |
| **Section Heading** | 16px / 18px | 24px / 28px | 700 (Bold) | `text-base font-bold` |
| **Card / Panel Title** | 14px | 20px | 600 (Semibold) | `text-sm font-semibold` |
| **Body Text** | 14px | 20px | 400 (Regular) | `text-sm text-foreground` |
| **Secondary Labels** | 12px | 16px | 500 (Medium) | `text-xs font-medium` |
| **Micro Labels / Badges**| 10px / 11px| 14px | 600 (Semibold) | `text-[10px] / text-[11px]` |
| **Formulas / Coordinates**| 12px | 16px | 500 (Mono) | `font-mono text-xs` |

---

### 2.3 Spacing & Layout Rhythm

Components adhere to a strict 4px grid:
- **Component Heights:**
  - Header: `h-13` (52px)
  - Ribbon Tabs: `h-8` (32px)
  - Ribbon Action Bar: `h-10` (40px)
  - Formula Bar: `h-8` (32px)
  - Status Bar: `h-7` (28px)
  - Buttons / Inputs: `h-8` (sm), `h-9` (md), `h-11` (lg)
- **Gaps & Padding:**
  - Container padding: `px-4 sm:px-6`
  - Card padding: `p-4 sm:p-6`
  - Button padding: `px-3 py-1.5` (sm), `px-4 py-2` (md)

---

## 3. Component Catalog (`src/components/ui/`)

| Component | File Path | Key Features & Accessibility |
| :--- | :--- | :--- |
| **Button** | `src/components/ui/Button.tsx` | 6 variants (`primary`, `accent`, `secondary`, `outline`, `ghost`, `danger`), 4 sizes, loading spinner, left/right icons, `focus-visible` ring. |
| **IconButton** | `src/components/ui/IconButton.tsx` | Compact icon trigger, accessible `aria-label`, rounded or square variants. |
| **Input** | `src/components/ui/Input.tsx` | Form input with floating label, error message text, helper text, left/right icon slots. |
| **SearchInput** | `src/components/ui/SearchInput.tsx` | Dedicated search input with search icon, clear button (`X`), and `Escape` key dismiss. |
| **Dropdown** | `src/components/ui/Dropdown.tsx` | Accessible menu with click-outside closing, divider support, shortcut key labels, and keyboard dismiss. |
| **Tooltip** | `src/components/ui/Tooltip.tsx` | Hover/focus tooltip with delay, 4 positions (`top`, `bottom`, `left`, `right`), `role="tooltip"`. |
| **Modal / Dialog**| `src/components/ui/Modal.tsx` | Accessible dialog with backdrop blur, focus trap, `Escape` key handler, body scroll locking, header, body, footer. |
| **ConfirmationDialog**| `src/components/ui/ConfirmationDialog.tsx` | Specialized modal for destructive confirmations with danger or accent triggers. |
| **ContextMenu** | `src/components/ui/ContextMenu.tsx` | Right-click context menu foundation clamped to viewport edges. |
| **Badge** | `src/components/ui/Badge.tsx` | 7 semantic variants (`default`, `accent`, `success`, `warning`, `error`, `neutral`, `outline`). |
| **Tabs** | `src/components/ui/Tabs.tsx` | Accessible `role="tablist"` with 3 visual variants: `line`, `pill`, `ribbon`. |
| **Toggle / Switch**| `src/components/ui/Toggle.tsx` | Accessible `role="switch"` with `aria-checked`, smooth spring animation, and labels. |
| **Checkbox** | `src/components/ui/Checkbox.tsx` | Supports checked, unchecked, and indeterminate (`-`) states with accessible keyboard focus. |
| **Radio / RadioGroup**| `src/components/ui/Radio.tsx` | Accessible radio option cards and inline radio choices. |
| **Select** | `src/components/ui/Select.tsx` | Native-styled custom select with chevron indicator and error states. |
| **Toast** | `src/components/ui/Toast.tsx` | Global notification system dispatched via `toast.success()`, `toast.error()`, auto-dismissing after 4s. |
| **LoadingState** | `src/components/ui/LoadingState.tsx` | Animated spinner and customizable `Skeleton` placeholders. |
| **EmptyState** | `src/components/ui/EmptyState.tsx` | Empty workspace presentation with icon, title, description, and primary/secondary buttons. |
| **ErrorState** | `src/components/ui/ErrorState.tsx` | Error box with retry action and technical stack details toggle. |
| **Divider** | `src/components/ui/Divider.tsx` | Horizontal / vertical line with optional text label. |
| **Breadcrumb** | `src/components/ui/Breadcrumb.tsx` | Trail navigation with Home icon and chevron separators. |

---

## 4. Theme Architecture & Synchronization

1. **State Ownership:** Managed in `useUIPreferencesStore` (`src/stores/ui-preferences-store.ts`).
2. **Zero Secondary State:** All theme changes flow strictly through `setTheme(mode)`.
3. **DOM Hydration:** `applyThemeToDOM(theme)` updates `document.documentElement.classList`.
4. **System Mode Synchronization:** When `theme === 'system'`, a persistent `window.matchMedia('(prefers-color-scheme: dark)')` listener dynamically updates colors when the user's OS changes between light and dark without reloading the page.
5. **Persistence:** Dual-stored in IndexedDB and mirrored to `localStorage` to ensure initial paint renders without a white/dark flash.

---

## 5. Responsive Breakpoints

| Breakpoint | Width Range | Layout Adaptation |
| :--- | :--- | :--- |
| **Desktop** | `>= 1024px` | Full 240px navigation sidebar, expanded header breadcrumb trail, spacious workspace. |
| **Tablet** | `768px – 1023px` | Collapsible 64px icon-only sidebar with tooltips, compact toolbar actions. |
| **Mobile** | `< 768px` | Off-canvas sliding drawer navigation with backdrop, compact header, touch-friendly tap targets (`>= 40px`). Zero horizontal page overflow. |
