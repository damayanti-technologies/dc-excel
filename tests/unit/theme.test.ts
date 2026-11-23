import { describe, it, expect, beforeEach } from 'vitest';
import { useUIPreferencesStore, applyThemeToDOM } from '@/stores/ui-preferences-store';
import { preferencesRepository } from '@/storage/repositories/preferences-repository';

describe('Theme System & Persistence', () => {
  beforeEach(() => {
    document.documentElement.className = '';
  });

  it('applies dark class to documentElement when theme is dark', async () => {
    await useUIPreferencesStore.getState().setTheme('dark');
    expect(useUIPreferencesStore.getState().theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('removes dark class from documentElement when theme is light', async () => {
    // Start with dark
    await useUIPreferencesStore.getState().setTheme('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    // Switch to light
    await useUIPreferencesStore.getState().setTheme('light');
    expect(useUIPreferencesStore.getState().theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('persists theme preference to storage repository', async () => {
    await useUIPreferencesStore.getState().setTheme('dark');

    const stored = await preferencesRepository.get();
    expect(stored.theme).toBe('dark');
  });

  it('handles system theme mode correctly based on matchMedia', () => {
    // When matchMedia reports false for dark
    applyThemeToDOM('system');
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    // Explicit dark
    applyThemeToDOM('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    // Explicit light
    applyThemeToDOM('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
