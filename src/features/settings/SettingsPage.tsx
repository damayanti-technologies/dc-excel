import React, { useEffect, useState } from 'react';
import { useUIPreferencesStore } from '@/stores/ui-preferences-store';
import { getStorageQuota } from '@/storage/indexeddb/database';
import { StorageQuotaInfo } from '@/types/storage';
import { ThemeMode } from '@/types/preferences';
import {
  Sun,
  Moon,
  Laptop,
  HardDrive,
  Sliders,
  RotateCcw,
  Info,
  CheckCircle2,
  Database
} from 'lucide-react';
import { APP_CONFIG } from '@/app/config/constants';
import { Tabs, TabOption } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/stores/toast-store';

export const SettingsPage: React.FC = () => {
  const { preferences, theme, setTheme, updatePreferences } = useUIPreferencesStore();
  const [activeTab, setActiveTab] = useState('appearance');
  const [quota, setQuota] = useState<StorageQuotaInfo | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  useEffect(() => {
    void getStorageQuota().then(setQuota);
  }, []);

  const handleThemeChange = (newTheme: ThemeMode) => {
    void setTheme(newTheme);
    toast.success('Theme Updated', `Switched theme to ${newTheme} mode.`);
  };

  const handleAutoSaveIntervalChange = (interval: number) => {
    void updatePreferences({
      applicationPreferences: {
        ...preferences.applicationPreferences,
        autoSaveIntervalMs: interval
      }
    });
    toast.success('Preferences Saved', `Auto-save interval updated to ${interval / 1000}s.`);
  };

  const settingsTabs: TabOption[] = [
    { id: 'appearance', label: 'Appearance', icon: <Sun className="w-4 h-4" /> },
    { id: 'storage', label: 'Storage & Diagnostics', icon: <HardDrive className="w-4 h-4" /> },
    { id: 'defaults', label: 'Workbook Defaults', icon: <Sliders className="w-4 h-4" /> },
    { id: 'about', label: 'About DC Excel', icon: <Info className="w-4 h-4" /> }
  ];

  return (
    <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-xs sm:text-sm text-foreground-muted">
          Manage local storage parameters, appearance tokens, and default spreadsheet geometry.
        </p>
      </div>

      {/* Settings Navigation Tabs */}
      <Tabs
        variant="line"
        tabs={settingsTabs}
        activeTabId={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab: Appearance */}
      {activeTab === 'appearance' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-surface border border-border rounded-2xl p-6 space-y-4 shadow-xs">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Sun className="w-4 h-4 text-accent" />
                <span>Theme Mode</span>
              </h2>
              <p className="text-xs text-foreground-muted">
                Choose whether DC Excel displays in light, dark, or system-synchronized theme.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
              <button
                type="button"
                onClick={() => handleThemeChange('light')}
                className={`p-4 rounded-xl border text-sm font-semibold flex flex-col items-center gap-3 transition-all ${
                  theme === 'light'
                    ? 'border-accent bg-accent/10 text-accent shadow-xs ring-2 ring-accent/20'
                    : 'border-border bg-surface-secondary text-foreground hover:bg-surface-tertiary'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                  <Sun className="w-5 h-5" />
                </div>
                <span>Light</span>
                <span className="text-[11px] font-normal text-foreground-muted">Crisp white & navy</span>
              </button>

              <button
                type="button"
                onClick={() => handleThemeChange('dark')}
                className={`p-4 rounded-xl border text-sm font-semibold flex flex-col items-center gap-3 transition-all ${
                  theme === 'dark'
                    ? 'border-accent bg-accent/10 text-accent shadow-xs ring-2 ring-accent/20'
                    : 'border-border bg-surface-secondary text-foreground hover:bg-surface-tertiary'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-zinc-800 text-emerald-400 flex items-center justify-center">
                  <Moon className="w-5 h-5" />
                </div>
                <span>Dark</span>
                <span className="text-[11px] font-normal text-foreground-muted">Obsidian & precision emerald</span>
              </button>

              <button
                type="button"
                onClick={() => handleThemeChange('system')}
                className={`p-4 rounded-xl border text-sm font-semibold flex flex-col items-center gap-3 transition-all ${
                  theme === 'system'
                    ? 'border-accent bg-accent/10 text-accent shadow-xs ring-2 ring-accent/20'
                    : 'border-border bg-surface-secondary text-foreground hover:bg-surface-tertiary'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-surface-tertiary text-foreground-muted flex items-center justify-center">
                  <Laptop className="w-5 h-5" />
                </div>
                <span>System</span>
                <span className="text-[11px] font-normal text-foreground-muted">Synchronized with OS</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Storage & Diagnostics */}
      {activeTab === 'storage' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-surface border border-border rounded-2xl p-6 space-y-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-accent" />
                  <span>IndexedDB Diagnostics</span>
                </h2>
                <p className="text-xs text-foreground-muted">
                  Client-side storage health and estimated storage quota.
                </p>
              </div>
              <Badge variant="success" size="md">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Operational</span>
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3.5 rounded-xl bg-surface-secondary border border-border space-y-1">
                <div className="text-foreground-muted">Database Name</div>
                <div className="font-bold text-foreground text-sm">{APP_CONFIG.dbName}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-secondary border border-border space-y-1">
                <div className="text-foreground-muted">Schema Version</div>
                <div className="font-bold text-foreground text-sm">v{APP_CONFIG.dbVersion}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-secondary border border-border space-y-1">
                <div className="text-foreground-muted">Storage Consumed</div>
                <div className="font-bold text-foreground text-sm">
                  {quota ? `${(quota.usageBytes / 1024).toFixed(1)} KB` : 'Querying...'}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-secondary border border-border space-y-1">
                <div className="text-foreground-muted">Available Quota</div>
                <div className="font-bold text-foreground text-sm">
                  {quota ? `${(quota.quotaBytes / (1024 * 1024 * 1024)).toFixed(1)} GB` : 'Querying...'}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-foreground">Reset Local Data</div>
                <div className="text-[11px] text-foreground-muted">
                  Wipes IndexedDB and resets application preferences to default.
                </div>
              </div>
              <Button
                variant="danger"
                size="sm"
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={() => setIsResetConfirmOpen(true)}
              >
                Clear Database
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Workbook Defaults */}
      {activeTab === 'defaults' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-surface border border-border rounded-2xl p-6 space-y-4 shadow-xs">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Sliders className="w-4 h-4 text-accent" />
                <span>Default Parameters</span>
              </h2>
              <p className="text-xs text-foreground-muted">
                Initial dimensions and auto-save timing for new workbooks.
              </p>
            </div>

            <div className="space-y-4 max-w-md pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">Auto-save interval:</span>
                <select
                  aria-label="Auto-save interval"
                  value={preferences.applicationPreferences.autoSaveIntervalMs}
                  onChange={(e) => handleAutoSaveIntervalChange(Number(e.target.value))}
                  className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-accent"
                >
                  <option value={1000}>1 second</option>
                  <option value={3000}>3 seconds (Recommended)</option>
                  <option value={5000}>5 seconds</option>
                  <option value={10000}>10 seconds</option>
                </select>
              </div>

              <div className="flex items-center justify-between text-xs pt-3 border-t border-border">
                <span className="font-medium text-foreground">Initial Grid Size:</span>
                <span className="font-mono text-foreground font-semibold">
                  {preferences.defaultWorkbookSettings.defaultRowCount} rows ×{' '}
                  {preferences.defaultWorkbookSettings.defaultColumnCount} columns
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: About */}
      {activeTab === 'about' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-surface border border-border rounded-2xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center font-bold text-lg">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">{APP_CONFIG.name}</h2>
                <p className="text-xs text-foreground-muted">Version {APP_CONFIG.version} • Production Release</p>
              </div>
            </div>

            <p className="text-xs text-foreground-secondary leading-relaxed pt-2">
              DC Excel is a local-first, privacy-respecting spreadsheet application built with React,
              TypeScript, Zustand, and IndexedDB. It works completely client-side without cloud logins or remote tracking.
            </p>

            <div className="p-3.5 rounded-xl bg-surface-secondary border border-border text-xs text-foreground-muted space-y-1">
              <div>License: Permissive MIT / Apache-2.0</div>
              <div>Milestone: Production Release • Offline-First Engine</div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for DB Wipe */}
      <ConfirmationDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={() => {
          if (typeof indexedDB !== 'undefined') {
            indexedDB.deleteDatabase(APP_CONFIG.dbName);
            if (typeof localStorage !== 'undefined') {
              const keysToRemove: string[] = [];
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('omnisheet_') || key.startsWith('omnisheet:'))) {
                  keysToRemove.push(key);
                }
              }
              for (const k of keysToRemove) {
                localStorage.removeItem(k);
              }
            }
            window.location.reload();
          }
        }}
        title="Confirm Local Database Wipe"
        message="This will completely clear your local IndexedDB storage and reset all user preferences. This action cannot be undone."
        confirmLabel="Wipe Database"
        isDestructive={true}
      />
    </div>
  );
};
