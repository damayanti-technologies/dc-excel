import { ShortcutDefinition, ShortcutMatchParams } from './shortcut-types';

export const DEFAULT_SHORTCUTS: ShortcutDefinition[] = [
  // 1. Workbook Shortcuts
  {
    id: 'save',
    label: 'Save Workbook',
    category: 'workbook',
    key: 's',
    ctrlOrMeta: true,
    display: 'Ctrl + S',
    description: 'Manually flush and commit all changes to local storage'
  },
  {
    id: 'undo',
    label: 'Undo',
    category: 'editing',
    key: 'z',
    ctrlOrMeta: true,
    display: 'Ctrl + Z',
    description: 'Revert the last cell edit, style change, or operation'
  },
  {
    id: 'redo',
    label: 'Redo',
    category: 'editing',
    key: 'y',
    ctrlOrMeta: true,
    display: 'Ctrl + Y',
    description: 'Reapply the previously undone operation'
  },
  {
    id: 'find',
    label: 'Find in Sheet',
    category: 'workbook',
    key: 'f',
    ctrlOrMeta: true,
    display: 'Ctrl + F',
    description: 'Search for text or numbers in the active sheet or workbook'
  },
  {
    id: 'replace',
    label: 'Find and Replace',
    category: 'workbook',
    key: 'h',
    ctrlOrMeta: true,
    display: 'Ctrl + H',
    description: 'Search and replace matching content across cells'
  },
  {
    id: 'print',
    label: 'Print / Export PDF',
    category: 'workbook',
    key: 'p',
    ctrlOrMeta: true,
    display: 'Ctrl + P',
    description: 'Open the print preview and export dialog'
  },
  {
    id: 'select_all',
    label: 'Select All Cells',
    category: 'navigation',
    key: 'a',
    ctrlOrMeta: true,
    display: 'Ctrl + A',
    description: 'Select all cells in the active sheet'
  },
  {
    id: 'command_palette',
    label: 'Command Palette',
    category: 'workbook',
    key: 'P',
    ctrlOrMeta: true,
    shift: true,
    display: 'Ctrl + Shift + P',
    description: 'Quickly search and execute any spreadsheet command'
  },
  {
    id: 'go_to',
    label: 'Go To Reference',
    category: 'navigation',
    key: 'g',
    ctrlOrMeta: true,
    display: 'Ctrl + G',
    description: 'Navigate directly to a cell, range, or named range'
  },
  {
    id: 'help',
    label: 'Help & Shortcuts',
    category: 'help',
    key: 'F1',
    display: 'F1',
    description: 'Open the full help guide and keyboard shortcuts reference'
  },

  // 2. Cell Editing Shortcuts
  {
    id: 'edit_cell',
    label: 'Edit Active Cell',
    category: 'editing',
    key: 'F2',
    display: 'F2',
    description: 'Enter in-cell editing mode without clearing existing contents'
  },
  {
    id: 'confirm_edit',
    label: 'Confirm Cell Edit',
    category: 'editing',
    key: 'Enter',
    display: 'Enter',
    description: 'Commit cell edit and move selection to the cell below'
  },
  {
    id: 'cancel_edit',
    label: 'Cancel Cell Edit',
    category: 'editing',
    key: 'Escape',
    display: 'Escape',
    description: 'Cancel cell editing and discard uncommitted changes'
  },
  {
    id: 'copy',
    label: 'Copy Range',
    category: 'editing',
    key: 'c',
    ctrlOrMeta: true,
    display: 'Ctrl + C',
    description: 'Copy selected cell values, formulas, and styles to clipboard'
  },
  {
    id: 'cut',
    label: 'Cut Range',
    category: 'editing',
    key: 'x',
    ctrlOrMeta: true,
    display: 'Ctrl + X',
    description: 'Cut selected cells to clipboard and clear them upon paste'
  },
  {
    id: 'paste',
    label: 'Paste',
    category: 'editing',
    key: 'v',
    ctrlOrMeta: true,
    display: 'Ctrl + V',
    description: 'Paste clipboard contents into the active cell or range'
  },
  {
    id: 'bold',
    label: 'Toggle Bold',
    category: 'formatting',
    key: 'b',
    ctrlOrMeta: true,
    display: 'Ctrl + B',
    description: 'Apply or remove bold formatting on selected cells'
  },
  {
    id: 'italic',
    label: 'Toggle Italic',
    category: 'formatting',
    key: 'i',
    ctrlOrMeta: true,
    display: 'Ctrl + I',
    description: 'Apply or remove italic formatting on selected cells'
  },
  {
    id: 'underline',
    label: 'Toggle Underline',
    category: 'formatting',
    key: 'u',
    ctrlOrMeta: true,
    display: 'Ctrl + U',
    description: 'Apply or remove underline styling on selected cells'
  },
  {
    id: 'insert_date',
    label: 'Insert Current Date',
    category: 'editing',
    key: ';',
    ctrlOrMeta: true,
    display: 'Ctrl + ;',
    description: 'Insert today’s date (YYYY-MM-DD) into the active cell'
  },
  {
    id: 'insert_time',
    label: 'Insert Current Time',
    category: 'editing',
    key: ':',
    ctrlOrMeta: true,
    shift: true,
    display: 'Ctrl + Shift + ;',
    description: 'Insert the current time (HH:MM:SS) into the active cell'
  },

  // 3. Navigation Shortcuts
  {
    id: 'nav_home',
    label: 'Row Start',
    category: 'navigation',
    key: 'Home',
    display: 'Home',
    description: 'Move active selection to Column A of the current row'
  },
  {
    id: 'nav_ctrl_home',
    label: 'First Cell (A1)',
    category: 'navigation',
    key: 'Home',
    ctrlOrMeta: true,
    display: 'Ctrl + Home',
    description: 'Navigate directly to cell A1'
  },
  {
    id: 'nav_ctrl_end',
    label: 'Last Used Cell',
    category: 'navigation',
    key: 'End',
    ctrlOrMeta: true,
    display: 'Ctrl + End',
    description: 'Navigate to the bottom-rightmost populated cell'
  },
  {
    id: 'nav_page_up',
    label: 'Page Up',
    category: 'navigation',
    key: 'PageUp',
    display: 'Page Up',
    description: 'Scroll view and jump active cell up by 20 rows'
  },
  {
    id: 'nav_page_down',
    label: 'Page Down',
    category: 'navigation',
    key: 'PageDown',
    display: 'Page Down',
    description: 'Scroll view and jump active cell down by 20 rows'
  }
];

export function matchShortcut(
  definition: ShortcutDefinition,
  event: ShortcutMatchParams
): boolean {
  const isCtrlOrMeta = event.ctrlKey || event.metaKey;
  const defCtrl = !!definition.ctrlOrMeta;
  if (defCtrl !== isCtrlOrMeta) return false;

  const defShift = !!definition.shift;
  if (defShift !== event.shiftKey) return false;

  const defAlt = !!definition.alt;
  if (defAlt !== event.altKey) return false;

  // Handle case-insensitive comparison for letters
  if (definition.key.length === 1 && event.key.length === 1) {
    return definition.key.toLowerCase() === event.key.toLowerCase();
  }

  // Handle special keys like F1, F2, Home, End, PageUp, etc.
  return definition.key === event.key;
}

export function getShortcutDisplay(id: string): string | undefined {
  const sc = DEFAULT_SHORTCUTS.find((s) => s.id === id);
  return sc?.display;
}
