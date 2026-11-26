import React, { useState, useEffect } from 'react';
import {
  Keyboard,
  Search,
  Command
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface ShortcutItem {
  id: string;
  category: 'Navigation' | 'Editing' | 'Formatting' | 'Formulas' | 'Workbooks' | 'Selection';
  description: string;
  keysWindows: string[];
  keysMac: string[];
}

const SHORTCUTS_DATA: ShortcutItem[] = [
  {
    id: 'undo',
    category: 'Editing',
    description: 'Undo the last action',
    keysWindows: ['Ctrl', 'Z'],
    keysMac: ['⌘', 'Z']
  },
  {
    id: 'redo',
    category: 'Editing',
    description: 'Redo the previously undone action',
    keysWindows: ['Ctrl', 'Y'],
    keysMac: ['⌘', 'Shift', 'Z']
  },
  {
    id: 'copy',
    category: 'Editing',
    description: 'Copy selected cells or text',
    keysWindows: ['Ctrl', 'C'],
    keysMac: ['⌘', 'C']
  },
  {
    id: 'cut',
    category: 'Editing',
    description: 'Cut selected cells or text',
    keysWindows: ['Ctrl', 'X'],
    keysMac: ['⌘', 'X']
  },
  {
    id: 'paste',
    category: 'Editing',
    description: 'Paste clipboard content into active cell',
    keysWindows: ['Ctrl', 'V'],
    keysMac: ['⌘', 'V']
  },
  {
    id: 'bold',
    category: 'Formatting',
    description: 'Toggle bold styling on selected cells',
    keysWindows: ['Ctrl', 'B'],
    keysMac: ['⌘', 'B']
  },
  {
    id: 'italic',
    category: 'Formatting',
    description: 'Toggle italic styling on selected cells',
    keysWindows: ['Ctrl', 'I'],
    keysMac: ['⌘', 'I']
  },
  {
    id: 'underline',
    category: 'Formatting',
    description: 'Toggle underline styling on selected cells',
    keysWindows: ['Ctrl', 'U'],
    keysMac: ['⌘', 'U']
  },
  {
    id: 'find',
    category: 'Editing',
    description: 'Open Find & Replace dialog',
    keysWindows: ['Ctrl', 'F'],
    keysMac: ['⌘', 'F']
  },
  {
    id: 'command_palette',
    category: 'Navigation',
    description: 'Open Global Command Palette',
    keysWindows: ['Ctrl', 'K'],
    keysMac: ['⌘', 'K']
  },
  {
    id: 'edit_cell',
    category: 'Editing',
    description: 'Start editing the active cell in-place',
    keysWindows: ['F2'],
    keysMac: ['F2']
  },
  {
    id: 'save',
    category: 'Workbooks',
    description: 'Force immediate manual workbook save',
    keysWindows: ['Ctrl', 'S'],
    keysMac: ['⌘', 'S']
  },
  {
    id: 'select_all',
    category: 'Selection',
    description: 'Select all cells in the worksheet',
    keysWindows: ['Ctrl', 'A'],
    keysMac: ['⌘', 'A']
  },
  {
    id: 'home_cell',
    category: 'Navigation',
    description: 'Navigate to top-left cell (A1)',
    keysWindows: ['Ctrl', 'Home'],
    keysMac: ['⌘', 'Fn', 'Left']
  },
  {
    id: 'new_sheet',
    category: 'Workbooks',
    description: 'Insert a new worksheet',
    keysWindows: ['Shift', 'F11'],
    keysMac: ['Shift', 'F11']
  },
  {
    id: 'fill_down',
    category: 'Formulas',
    description: 'Fill down from cell above',
    keysWindows: ['Ctrl', 'D'],
    keysMac: ['⌘', 'D']
  }
];

export const ShortcutsPage: React.FC = () => {
  const [platform, setPlatform] = useState<'windows' | 'mac'>('windows');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('All');

  // Live Keypress Tester
  const [pressedKeys, setPressedKeys] = useState<string[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keys: string[] = [];
      if (e.ctrlKey) keys.push('Ctrl');
      if (e.metaKey) keys.push('⌘');
      if (e.altKey) keys.push('Alt');
      if (e.shiftKey) keys.push('Shift');
      if (!['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)) {
        keys.push(e.key.toUpperCase());
      }
      if (keys.length > 0) {
        setPressedKeys(keys);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filtered = SHORTCUTS_DATA.filter((s) => {
    const matchesCat = category === 'All' || s.category === category;
    const matchesSearch =
      search.trim() === '' ||
      s.description.toLowerCase().includes(search.toLowerCase()) ||
      s.keysWindows.join(' ').toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-accent/10 text-accent border border-accent/20">
              <Keyboard className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Shortcut Center & Keyboard Master
              </h1>
              <p className="text-xs sm:text-sm text-foreground-muted">
                Complete keystroke database, live keypress tester, and mouse-free productivity cheat sheet.
              </p>
            </div>
          </div>
        </div>

        {/* Platform Toggle */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-secondary border border-border text-xs">
          <button
            type="button"
            onClick={() => setPlatform('windows')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              platform === 'windows' ? 'bg-accent text-zinc-950 shadow-xs' : 'text-foreground-muted'
            }`}
          >
            Windows / Linux
          </button>
          <button
            type="button"
            onClick={() => setPlatform('mac')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              platform === 'mac' ? 'bg-accent text-zinc-950 shadow-xs' : 'text-foreground-muted'
            }`}
          >
            macOS
          </button>
        </div>
      </div>

      {/* Live Keypress Tester Strip */}
      <div className="p-4 rounded-2xl border border-border bg-surface flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent/10 text-accent">
            <Command className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-foreground">Live Keypress Tester</div>
            <div className="text-[11px] text-foreground-muted">Press any key combination on your keyboard to test.</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {pressedKeys.length > 0 ? (
            pressedKeys.map((k, i) => (
              <kbd
                key={i}
                className="px-3 py-1.5 rounded-lg border border-border bg-surface-secondary text-xs font-mono font-bold text-accent shadow-xs"
              >
                {k}
              </kbd>
            ))
          ) : (
            <span className="text-xs text-foreground-subtle italic">Listening for key events...</span>
          )}
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-subtle" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search shortcuts (e.g. undo, bold, find, copy)..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-surface text-xs font-medium text-foreground focus:outline-none focus:border-accent shadow-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {['All', 'Navigation', 'Editing', 'Formatting', 'Formulas', 'Workbooks', 'Selection'].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                category === c
                  ? 'bg-surface-elevated text-accent border border-accent/30'
                  : 'bg-surface-secondary text-foreground-muted hover:text-foreground'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Shortcuts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((item) => {
          const keys = platform === 'mac' ? item.keysMac : item.keysWindows;
          return (
            <div
              key={item.id}
              className="p-4 rounded-2xl border border-border bg-surface hover:bg-surface-elevated flex items-center justify-between gap-4 transition-all shadow-xs"
            >
              <div className="min-w-0 space-y-1">
                <div className="text-xs font-semibold text-foreground">{item.description}</div>
                <Badge variant="neutral" size="sm">
                  {item.category}
                </Badge>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {keys.map((k, i) => (
                  <kbd
                    key={i}
                    className="px-2.5 py-1 rounded-lg border border-border bg-surface-secondary text-xs font-mono font-bold text-foreground shadow-xs"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
