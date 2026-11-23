import { create } from 'zustand';
import { UserPreferences, ThemeMode, DEFAULT_USER_PREFERENCES } from '@/types/preferences';
import { preferencesRepository } from '@/storage/repositories/preferences-repository';
import { Logger } from '@/utils/logger';

interface UIPreferencesState {
  preferences: UserPreferences;
  theme: ThemeMode;
  isLoading: boolean;

  setTheme: (theme: ThemeMode) => Promise<void>;
  updatePreferences: (partial: Partial<UserPreferences>) => Promise<void>;
  loadPreferences: () => Promise<void>;
}

let mediaQueryListenerAttached = false;

export const useUIPreferencesStore = create<UIPreferencesState>((set, get) => ({
  preferences: DEFAULT_USER_PREFERENCES,
  theme: DEFAULT_USER_PREFERENCES.theme,
  isLoading: true,

  setTheme: async (theme: ThemeMode) => {
    const current = get().preferences;
    const updated: UserPreferences = { ...current, theme };
    set({ theme, preferences: updated });

    applyThemeToDOM(theme);

    try {
      await preferencesRepository.save(updated);
    } catch (err) {
      Logger.error('UIPreferencesStore', 'Failed to persist theme change', err);
    }
  },

  updatePreferences: async (partial: Partial<UserPreferences>) => {
    const current = get().preferences;
    const updated: UserPreferences = {
      ...current,
      ...partial,
      id: 'current_user_preferences'
    };
    set({ preferences: updated, theme: updated.theme });
    applyThemeToDOM(updated.theme);

    try {
      await preferencesRepository.save(updated);
    } catch (err) {
      Logger.error('UIPreferencesStore', 'Failed to persist preferences', err);
    }
  },

  loadPreferences: async () => {
    set({ isLoading: true });
    try {
      const prefs = await preferencesRepository.get();
      set({ preferences: prefs, theme: prefs.theme, isLoading: false });
      applyThemeToDOM(prefs.theme);

      // Listen for OS system theme changes if theme === 'system'
      if (!mediaQueryListenerAttached && typeof window !== 'undefined' && window.matchMedia) {
        mediaQueryListenerAttached = true;
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = () => {
          if (get().theme === 'system') {
            applyThemeToDOM('system');
          }
        };
        if (typeof mediaQuery.addEventListener === 'function') {
          mediaQuery.addEventListener('change', handler);
        } else if (typeof mediaQuery.addListener === 'function') {
          mediaQuery.addListener(handler);
        }
      }
    } catch (err) {
      Logger.error('UIPreferencesStore', 'Failed to load preferences', err);
      set({ isLoading: false });
    }
  }
}));

export function applyThemeToDOM(theme: ThemeMode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}
