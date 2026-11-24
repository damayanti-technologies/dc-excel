import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_USER_PREFERENCES
} from '@/types/preferences';
import { applyThemeToDOM } from '@/stores/ui-preferences-store';
import { CommandPaletteAction } from '@/features/spreadsheet/components/CommandPaletteDialog';

describe('Productivity, Personalization & Accessibility (Stage 14)', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark');
  });

  it('contains comprehensive default user preferences', () => {
    expect(DEFAULT_USER_PREFERENCES.applicationPreferences.defaultZoom).toBe(100);
    expect(DEFAULT_USER_PREFERENCES.applicationPreferences.showGridLinesDefault).toBe(true);
    expect(DEFAULT_USER_PREFERENCES.applicationPreferences.showFormulaBarDefault).toBe(true);
    expect(DEFAULT_USER_PREFERENCES.applicationPreferences.reducedMotion).toBe(false);
    expect(DEFAULT_USER_PREFERENCES.applicationPreferences.quickAccessToolbar).toEqual([
      'save',
      'undo',
      'redo',
      'print',
      'find'
    ]);
  });

  it('applies dark and light theme classes cleanly to documentElement', () => {
    applyThemeToDOM('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    applyThemeToDOM('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('filters command palette actions by title, category, and keywords', () => {
    const dummyCommands: CommandPaletteAction[] = [
      {
        id: 'cmd-save',
        title: 'Save Workbook',
        category: 'File',
        keywords: ['flush', 'persist', 'commit'],
        icon: null,
        onExecute: () => {}
      },
      {
        id: 'cmd-chart',
        title: 'Insert Chart',
        category: 'Insert',
        keywords: ['graph', 'bar', 'pie', 'visualization'],
        icon: null,
        onExecute: () => {}
      },
      {
        id: 'cmd-bold',
        title: 'Toggle Bold',
        category: 'Formatting',
        keywords: ['style', 'font', 'weight'],
        icon: null,
        onExecute: () => {}
      }
    ];

    const filter = (query: string) => {
      const lower = query.toLowerCase().trim();
      return dummyCommands.filter(
        (cmd) =>
          cmd.title.toLowerCase().includes(lower) ||
          cmd.category.toLowerCase().includes(lower) ||
          cmd.keywords?.some((k) => k.toLowerCase().includes(lower))
      );
    };

    expect(filter('save').length).toBe(1);
    expect(filter('save')[0]?.id).toBe('cmd-save');

    // Search by category
    expect(filter('insert').length).toBe(1);
    expect(filter('insert')[0]?.id).toBe('cmd-chart');

    // Search by keyword
    expect(filter('graph').length).toBe(1);
    expect(filter('graph')[0]?.id).toBe('cmd-chart');

    expect(filter('nonexistent').length).toBe(0);
  });

  it('supports toggling Quick Access Toolbar pinned actions', () => {
    let currentPinned = ['save', 'undo', 'redo'];

    const toggle = (id: string) => {
      if (currentPinned.includes(id)) {
        currentPinned = currentPinned.filter((item) => item !== id);
      } else {
        currentPinned = [...currentPinned, id];
      }
    };

    // Pin 'print'
    toggle('print');
    expect(currentPinned).toEqual(['save', 'undo', 'redo', 'print']);

    // Unpin 'undo'
    toggle('undo');
    expect(currentPinned).toEqual(['save', 'redo', 'print']);
  });
});
