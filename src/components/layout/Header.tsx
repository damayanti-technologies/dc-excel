import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Table2,
  Sun,
  Moon,
  Laptop,
  Download,
  Wifi,
  WifiOff,
  Settings,
  Menu,
  Database,
  Plus
} from 'lucide-react';
import { useUIPreferencesStore } from '@/stores/ui-preferences-store';
import { useAppStore } from '@/stores/app-store';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useWorkbookStore } from '@/stores/workbook-store';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { APP_CONFIG } from '@/app/config/constants';
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown';
import { Breadcrumb, BreadcrumbItem } from '@/components/ui/Breadcrumb';

export const Header: React.FC = () => {
  const location = useLocation();
  const theme = useUIPreferencesStore((state) => state.theme);
  const setTheme = useUIPreferencesStore((state) => state.setTheme);
  const isOnline = useNetworkStatus();
  const { isInstallable, triggerInstall } = usePWAInstall();
  const toggleMobileMenu = useAppStore((state) => state.toggleMobileMenu);
  const openCreateWorkbook = useWorkspaceStore((state) => state.openCreateWorkbook);
  const folders = useWorkspaceStore((state) => state.folders);
  const currentWorkbook = useWorkbookStore((state) => state.currentWorkbook);

  // Compute breadcrumbs based on current pathname
  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const path = location.pathname;

    if (path.startsWith('/workbook/')) {
      const id = path.split('/')[2] || 'untitled';
      return [
        { label: 'Workbooks', href: '/files' },
        { label: currentWorkbook?.name || id }
      ];
    }

    if (path.startsWith('/folders/')) {
      const folderId = path.split('/')[2];
      const folder = folders.find((f) => f.id === folderId);
      return [
        { label: 'Folders', href: '/folders' },
        { label: folder?.name || 'Folder' }
      ];
    }

    if (path === '/recent') {
      return [{ label: 'Recent' }];
    }

    if (path === '/starred') {
      return [{ label: 'Starred' }];
    }

    if (path === '/files') {
      return [{ label: 'My Workbooks' }];
    }

    if (path === '/folders') {
      return [{ label: 'Folders' }];
    }

    if (path === '/settings') {
      return [{ label: 'Settings' }];
    }

    return [{ label: 'Home' }];
  };

  const themeDropdownItems: (DropdownItem | 'divider')[] = [
    {
      id: 'theme-light',
      label: 'Light Theme',
      icon: <Sun className="w-4 h-4 text-amber-500" />,
      shortcut: theme === 'light' ? 'Active' : undefined,
      onClick: () => void setTheme('light')
    },
    {
      id: 'theme-dark',
      label: 'Dark Theme',
      icon: <Moon className="w-4 h-4 text-emerald-400" />,
      shortcut: theme === 'dark' ? 'Active' : undefined,
      onClick: () => void setTheme('dark')
    },
    {
      id: 'theme-system',
      label: 'System Theme',
      icon: <Laptop className="w-4 h-4 text-foreground-muted" />,
      shortcut: theme === 'system' ? 'Active' : undefined,
      onClick: () => void setTheme('system')
    }
  ];

  const currentThemeIcon = {
    light: <Sun className="w-4 h-4 text-amber-500" />,
    dark: <Moon className="w-4 h-4 text-emerald-400" />,
    system: <Laptop className="w-4 h-4" />
  }[theme] || <Laptop className="w-4 h-4" />;

  return (
    <header className="h-13 border-b border-border bg-surface-elevated/80 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between transition-colors z-20 shrink-0">
      {/* Left: Mobile Toggle, Brand & Wordmark */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={toggleMobileMenu}
          aria-label="Open navigation menu"
          className="md:hidden p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-secondary transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Brand Link */}
        <Link to="/" className="flex items-center gap-2.5 font-bold text-foreground group select-none">
          <div className="w-7 h-7 rounded-lg bg-accent text-zinc-950 flex items-center justify-center shadow-xs group-hover:bg-accent-hover transition-colors shrink-0 font-extrabold">
            <Table2 className="w-4 h-4" />
          </div>
          <span className="font-extrabold tracking-tight text-base sm:text-lg hidden xs:inline">
            {APP_CONFIG.name}
          </span>
          <span className="text-[10px] font-semibold tracking-wider px-1.5 py-0.2 rounded-md bg-accent/10 text-accent border border-accent/20 hidden sm:inline">
            Local
          </span>
        </Link>

        {/* Breadcrumb Context (Desktop) */}
        <div className="hidden lg:flex items-center pl-3 border-l border-border">
          <Breadcrumb items={getBreadcrumbs()} />
        </div>
      </div>

      {/* Middle: Breadcrumb Context (Tablet/Mobile fallback) */}
      <div className="flex lg:hidden items-center text-xs truncate max-w-[140px] sm:max-w-xs text-foreground-muted">
        <Breadcrumb items={getBreadcrumbs()} showHome={false} />
      </div>

      {/* Right: Status, Controls, Theme, Install, Settings */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* "New Workbook" Action Button */}
        <button
          type="button"
          onClick={() => openCreateWorkbook()}
          className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-accent text-zinc-950 hover:bg-accent-hover transition-all shadow-xs cursor-pointer active:scale-95"
          title="Create a new spreadsheet workbook"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Workbook</span>
        </button>

        {/* Network Status Pill */}
        <div
          className={`flex items-center gap-1.5 text-xs px-2 sm:px-2.5 py-1 rounded-full font-medium transition-colors select-none ${
            isOnline
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80'
              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80'
          }`}
          title={isOnline ? 'Online (Application works 100% offline)' : 'Offline (Local storage active)'}
        >
          {isOnline ? <Wifi className="w-3.5 h-3.5 shrink-0" /> : <WifiOff className="w-3.5 h-3.5 shrink-0" />}
          <span className="hidden sm:inline text-[11px] font-semibold">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* Storage Active Pill (Desktop) */}
        <div
          className="hidden xl:flex items-center gap-1.5 text-[11px] font-medium text-foreground-muted px-2.5 py-1 rounded-md bg-surface-secondary border border-border"
          title="IndexedDB local storage operational"
        >
          <Database className="w-3.5 h-3.5 text-accent" />
          <span>IndexedDB</span>
        </div>

        {/* PWA Install Button */}
        {isInstallable && (
          <button
            type="button"
            onClick={() => void triggerInstall()}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-surface-secondary border border-border text-foreground hover:bg-surface-elevated transition-colors shadow-xs"
            title="Install OmniSheet as desktop or mobile PWA"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Install App</span>
          </button>
        )}

        {/* Theme Dropdown */}
        <Dropdown
          align="right"
          trigger={
            <div
              role="button"
              tabIndex={0}
              aria-label="Select color theme"
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-border text-foreground hover:bg-surface-secondary transition-colors focus-ring"
              title={`Active theme: ${theme}`}
            >
              {currentThemeIcon}
            </div>
          }
          items={themeDropdownItems}
        />

        {/* Settings Navigation Shortcut */}
        <Link
          to="/settings"
          aria-label="Application Settings"
          className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${
            location.pathname === '/settings'
              ? 'border-accent bg-accent/10 text-accent font-semibold'
              : 'border-border text-foreground hover:bg-surface-secondary'
          }`}
          title="Application Settings"
        >
          <Settings className="w-4 h-4" />
        </Link>
      </div>
    </header>
  );
};
