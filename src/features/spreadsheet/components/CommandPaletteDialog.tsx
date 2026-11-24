import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface CommandPaletteAction {
  id: string;
  title: string;
  category: 'File' | 'Editing' | 'Formatting' | 'Data' | 'Insert' | 'View' | 'Help';
  shortcut?: string;
  keywords?: string[];
  icon: React.ReactNode;
  onExecute: () => void;
}

interface CommandPaletteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  commands: CommandPaletteAction[];
}

export const CommandPaletteDialog: React.FC<CommandPaletteDialogProps> = ({
  isOpen,
  onClose,
  commands
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    const lower = query.toLowerCase().trim();
    return commands.filter((cmd) => {
      if (cmd.title.toLowerCase().includes(lower)) return true;
      if (cmd.category.toLowerCase().includes(lower)) return true;
      if (cmd.keywords?.some((k) => k.toLowerCase().includes(lower))) return true;
      return false;
    });
  }, [commands, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands]);

  // Keep selected element visible when navigating with arrow keys
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-selected="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredCommands[selectedIndex];
      if (selected) {
        selected.onExecute();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-surface-elevated border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-surface">
          <Search className="w-4 h-4 text-foreground-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            aria-label="Search commands"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-foreground-muted outline-none"
          />
          <kbd className="px-2 py-0.5 text-[10px] font-mono text-foreground-muted bg-surface-secondary border border-border rounded">
            ESC to close
          </kbd>
        </div>

        {/* Command List grouped or empty state */}
        <div ref={listRef} className="overflow-y-auto p-2 divide-y divide-border/50">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-xs text-foreground-muted space-y-1">
              <p className="font-medium text-foreground">No matching commands found</p>
              <p>Try searching for "save", "sort", "chart", "bold", or "zoom"</p>
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  type="button"
                  data-selected={isSelected}
                  onClick={() => {
                    cmd.onExecute();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    'w-full px-3 py-2 text-left rounded-lg flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer',
                    isSelected
                      ? 'bg-accent text-white font-medium shadow-xs'
                      : 'text-foreground hover:bg-surface-secondary'
                  )}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span
                      className={cn(
                        'w-4 h-4 shrink-0',
                        isSelected ? 'text-white' : 'text-foreground-muted'
                      )}
                    >
                      {cmd.icon}
                    </span>
                    <span className="truncate">{cmd.title}</span>
                    <span
                      className={cn(
                        'text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded',
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-surface-secondary text-foreground-muted border border-border'
                      )}
                    >
                      {cmd.category}
                    </span>
                  </div>

                  {cmd.shortcut && (
                    <kbd
                      className={cn(
                        'text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0',
                        isSelected
                          ? 'bg-white/20 border-white/30 text-white'
                          : 'bg-surface-secondary border-border text-foreground-muted'
                      )}
                    >
                      {cmd.shortcut}
                    </kbd>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer Hint */}
        <div className="px-4 py-2 border-t border-border bg-surface-secondary text-[11px] text-foreground-muted flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
          </div>
          <span>{filteredCommands.length} command{filteredCommands.length === 1 ? '' : 's'} available</span>
        </div>
      </div>
    </div>
  );
};
