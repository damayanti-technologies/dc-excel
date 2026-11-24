import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useUIPreferencesStore } from '@/stores/ui-preferences-store';
import { ThemeMode } from '@/types/preferences';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { cn } from '@/utils/cn';

interface PreferencesDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PreferencesDialog: React.FC<PreferencesDialogProps> = ({ isOpen, onClose }) => {
  const preferences = useUIPreferencesStore((s) => s.preferences);
  const theme = useUIPreferencesStore((s) => s.theme);
  const setTheme = useUIPreferencesStore((s) => s.setTheme);
  const updatePreferences = useUIPreferencesStore((s) => s.updatePreferences);

  // Local draft state
  const [selectedTheme, setSelectedTheme] = useState<ThemeMode>(theme);
  const [defaultZoom, setDefaultZoom] = useState(preferences.applicationPreferences?.defaultZoom ?? 100);
  const [showGridlines, setShowGridlines] = useState(preferences.applicationPreferences?.showGridLinesDefault ?? true);
  const [showFormulaBar, setShowFormulaBar] = useState(preferences.applicationPreferences?.showFormulaBarDefault ?? true);
  const [reducedMotion, setReducedMotion] = useState(preferences.applicationPreferences?.reducedMotion ?? false);
  const [numberLocale, setNumberLocale] = useState(preferences.applicationPreferences?.numberLocale ?? 'en-US');

  useEffect(() => {
    if (isOpen) {
      setSelectedTheme(theme);
      setDefaultZoom(preferences.applicationPreferences?.defaultZoom ?? 100);
      setShowGridlines(preferences.applicationPreferences?.showGridLinesDefault ?? true);
      setShowFormulaBar(preferences.applicationPreferences?.showFormulaBarDefault ?? true);
      setReducedMotion(preferences.applicationPreferences?.reducedMotion ?? false);
      setNumberLocale(preferences.applicationPreferences?.numberLocale ?? 'en-US');
    }
  }, [isOpen, theme, preferences]);

  const handleSave = async () => {
    if (selectedTheme !== theme) {
      await setTheme(selectedTheme);
    }

    await updatePreferences({
      applicationPreferences: {
        ...preferences.applicationPreferences,
        defaultZoom,
        showGridLinesDefault: showGridlines,
        showFormulaBarDefault: showFormulaBar,
        reducedMotion,
        numberLocale
      }
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="User Preferences & Settings"
      className="max-w-lg"
    >
      <div className="space-y-5 text-xs">
        {/* 1. Theme Selection */}
        <div>
          <label className="block font-semibold text-foreground mb-2">Theme Mode</label>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { id: 'light', label: 'Light', icon: <Sun className="w-4 h-4" /> },
              { id: 'dark', label: 'Dark', icon: <Moon className="w-4 h-4" /> },
              { id: 'system', label: 'System', icon: <Monitor className="w-4 h-4" /> }
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTheme(t.id as ThemeMode)}
                className={cn(
                  'px-3 py-2 border rounded-xl flex flex-col items-center gap-1.5 transition-colors cursor-pointer',
                  selectedTheme === t.id
                    ? 'border-accent bg-accent/10 text-accent font-semibold shadow-xs'
                    : 'border-border bg-surface-secondary text-foreground-muted hover:text-foreground'
                )}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Display Defaults */}
        <div className="space-y-3 pt-3 border-t border-border">
          <label className="block font-semibold text-foreground">Workspace View Defaults</label>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-foreground-muted mb-1">Default Zoom Level</label>
              <select
                value={defaultZoom}
                onChange={(e) => setDefaultZoom(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value={75}>75%</option>
                <option value={100}>100% (Standard)</option>
                <option value={125}>125%</option>
                <option value={150}>150%</option>
              </select>
            </div>

            <div>
              <label className="block text-foreground-muted mb-1">Number Formatting Locale</label>
              <select
                value={numberLocale}
                onChange={(e) => setNumberLocale(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="en-US">English (US) - 1,234.56</option>
                <option value="de-DE">German (DE) - 1.234,56</option>
                <option value="en-GB">English (UK) - 1,234.56</option>
                <option value="fr-FR">French (FR) - 1 234,56</option>
              </select>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showGridlines}
                onChange={(e) => setShowGridlines(e.target.checked)}
                className="rounded border-border text-accent focus:ring-accent"
              />
              <span className="text-foreground">Show cell gridlines by default</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showFormulaBar}
                onChange={(e) => setShowFormulaBar(e.target.checked)}
                className="rounded border-border text-accent focus:ring-accent"
              />
              <span className="text-foreground">Show formula bar by default</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={reducedMotion}
                onChange={(e) => setReducedMotion(e.target.checked)}
                className="rounded border-border text-accent focus:ring-accent"
              />
              <span className="text-foreground">Enable reduced motion (minimize UI animations)</span>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={handleSave} className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" />
            <span>Save Preferences</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
