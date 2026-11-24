import React, { useRef, useState, useEffect } from 'react';
import { CellCoordinates, Cell, CellRange } from '@/types/cell';
import { NamedRange } from '@/types/analysis';
import { coordToA1, a1ToRange } from '@/utils/coordinates';
import { useFormulaInputAssist } from '../hooks/useFormulaInputAssist';
import { FormulaAutocomplete } from './FormulaAutocomplete';
import { FormulaArgumentHelp } from './FormulaArgumentHelp';
import { BookOpen, ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import { cn } from '@/utils/cn';

interface FormulaBarProps {
  activeCell: CellCoordinates | null;
  cell: Cell | undefined;
  isEditing: boolean;
  editingValue: string;
  selectedRange?: CellRange | null;
  namedRanges?: NamedRange[];
  onStartEditing: (initialValue?: string) => void;
  onEditingChange: (value: string) => void;
  onCommitEditing: (moveTo?: 'down' | 'up' | 'right' | 'left' | 'none') => void;
  onCancelEditing: () => void;
  onOpenReference?: () => void;
  onNavigateToRange?: (range: CellRange) => void;
  onNavigateToNamedRange?: (namedRange: NamedRange) => void;
}

export const FormulaBar: React.FC<FormulaBarProps> = ({
  activeCell,
  cell,
  isEditing,
  editingValue,
  selectedRange,
  namedRanges = [],
  onStartEditing,
  onEditingChange,
  onCommitEditing,
  onCancelEditing,
  onOpenReference,
  onNavigateToRange,
  onNavigateToNamedRange
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Multiline expansion toggle
  const [isExpanded, setIsExpanded] = useState(false);

  // Name Box interactive editing state
  const [nameBoxInput, setNameBoxInput] = useState('');
  const [isNameBoxEditing, setIsNameBoxEditing] = useState(false);
  const [isNameBoxInvalid, setIsNameBoxInvalid] = useState(false);
  const [isNameBoxDropdownOpen, setIsNameBoxDropdownOpen] = useState(false);

  // Formatted address text or range dimensions
  const formattedAddress = React.useMemo(() => {
    if (!activeCell) return 'A1';
    if (selectedRange) {
      const rowCount = Math.abs(selectedRange.endRow - selectedRange.startRow) + 1;
      const colCount = Math.abs(selectedRange.endCol - selectedRange.startCol) + 1;
      if (rowCount > 1 || colCount > 1) {
        return `${rowCount}R × ${colCount}C`;
      }
    }
    return coordToA1(activeCell);
  }, [activeCell, selectedRange]);

  // Keep input in sync with address when not typing
  useEffect(() => {
    if (!isNameBoxEditing) {
      setNameBoxInput(activeCell ? coordToA1(activeCell) : 'A1');
      setIsNameBoxInvalid(false);
    }
  }, [activeCell, isNameBoxEditing]);

  // Determine uncommitted raw content from current cell
  const rawCellText = cell
    ? cell.formula ?? (cell.value !== null && cell.value !== undefined ? String(cell.value) : '')
    : '';

  const displayValue = isEditing ? editingValue : rawCellText;

  const currentRef = isExpanded ? textareaRef : inputRef;

  const {
    suggestions,
    selectedIndex,
    argumentHelpContext,
    acceptSuggestion,
    handleAssistKeyDown,
    updateCursorPosition
  } = useFormulaInputAssist({
    value: displayValue,
    onChange: (val) => {
      if (!isEditing) onStartEditing(val);
      else onEditingChange(val);
    },
    inputRef: currentRef as React.RefObject<HTMLInputElement>
  });

  const handleFocus = () => {
    if (!isEditing) {
      onStartEditing(rawCellText);
    }
    updateCursorPosition();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!isEditing) onStartEditing(e.target.value);
    else onEditingChange(e.target.value);
    updateCursorPosition();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    // 1. Give priority to autocomplete navigation
    if (handleAssistKeyDown(e as unknown as React.KeyboardEvent<HTMLInputElement>)) {
      return;
    }

    // 2. Multiline textarea specific: Alt+Enter or Shift+Enter inserts newline, plain Enter commits
    if (isExpanded && e.key === 'Enter') {
      if (e.altKey || (e.shiftKey && !e.ctrlKey)) {
        // Allow newline insertion
        return;
      }
      e.preventDefault();
      onCommitEditing('down');
      currentRef.current?.blur();
      return;
    }

    // 3. Single-line input: Enter / Tab / Escape
    if (e.key === 'Enter') {
      e.preventDefault();
      onCommitEditing(e.shiftKey ? 'up' : 'down');
      currentRef.current?.blur();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      onCommitEditing(e.shiftKey ? 'left' : 'right');
      currentRef.current?.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancelEditing();
      currentRef.current?.blur();
    }
  };

  // Name Box submit handler
  const handleNameBoxSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const query = nameBoxInput.trim();
    if (!query) {
      setIsNameBoxEditing(false);
      return;
    }

    // Check named ranges first
    const matchedNamedRange = namedRanges.find(
      (nr) => nr.name.toLowerCase() === query.toLowerCase()
    );
    if (matchedNamedRange) {
      setIsNameBoxInvalid(false);
      setIsNameBoxEditing(false);
      if (onNavigateToNamedRange) {
        onNavigateToNamedRange(matchedNamedRange);
      } else if (onNavigateToRange) {
        onNavigateToRange(matchedNamedRange.range);
      }
      return;
    }

    // Try parsing as A1 notation or range
    const parsedRange = a1ToRange(query);
    if (parsedRange) {
      setIsNameBoxInvalid(false);
      setIsNameBoxEditing(false);
      onNavigateToRange?.(parsedRange);
    } else {
      setIsNameBoxInvalid(true);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative bg-surface border-b border-border px-3 flex items-start gap-2 text-xs shrink-0 select-none transition-all duration-150',
        isExpanded ? 'py-1.5' : 'h-8 items-center'
      )}
    >
      {/* 1. Name / Address Box with Dropdown */}
      <div className="relative shrink-0 flex items-center">
        {isNameBoxEditing ? (
          <input
            type="text"
            value={nameBoxInput}
            onChange={(e) => {
              setNameBoxInput(e.target.value);
              setIsNameBoxInvalid(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleNameBoxSubmit();
              } else if (e.key === 'Escape') {
                setIsNameBoxEditing(false);
                setIsNameBoxInvalid(false);
                setNameBoxInput(activeCell ? coordToA1(activeCell) : 'A1');
              }
            }}
            onBlur={() => {
              handleNameBoxSubmit();
            }}
            autoFocus
            aria-label="Cell reference or range input"
            className={cn(
              'w-24 h-6 px-1.5 bg-background border rounded font-mono text-[11px] font-medium text-foreground outline-none shadow-xs',
              isNameBoxInvalid
                ? 'border-red-500 ring-1 ring-red-500'
                : 'border-accent ring-1 ring-accent'
            )}
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setNameBoxInput(activeCell ? coordToA1(activeCell) : 'A1');
              setIsNameBoxEditing(true);
            }}
            className="w-24 h-6 px-1.5 bg-surface-secondary hover:bg-surface border border-border rounded flex items-center justify-between font-mono font-medium text-foreground text-[11px] shadow-xs cursor-text transition-colors group"
            title="Click to enter cell address, range (e.g. A1:C10), or named range"
          >
            <span className="truncate">{formattedAddress}</span>
            {namedRanges.length > 0 && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsNameBoxDropdownOpen(!isNameBoxDropdownOpen);
                }}
                className="p-0.5 rounded hover:bg-surface-secondary text-foreground-muted hover:text-foreground"
                title="Select named range"
              >
                <ChevronDown className="w-3 h-3" />
              </span>
            )}
          </button>
        )}

        {/* Named Range Quick Picker Dropdown */}
        {isNameBoxDropdownOpen && namedRanges.length > 0 && (
          <div
            className="absolute top-7 left-0 z-50 w-44 bg-surface-elevated border border-border rounded-lg shadow-lg py-1 max-h-48 overflow-y-auto"
            onMouseLeave={() => setIsNameBoxDropdownOpen(false)}
          >
            <div className="px-2 py-1 text-[10px] font-semibold text-foreground-muted uppercase tracking-wider">
              Named Ranges
            </div>
            {namedRanges.map((nr) => (
              <button
                key={nr.id}
                type="button"
                onClick={() => {
                  setIsNameBoxDropdownOpen(false);
                  if (onNavigateToNamedRange) {
                    onNavigateToNamedRange(nr);
                  } else if (onNavigateToRange) {
                    onNavigateToRange(nr.range);
                  }
                }}
                className="w-full text-left px-2.5 py-1 text-xs hover:bg-surface-secondary flex items-center justify-between gap-1 transition-colors"
              >
                <span className="font-medium text-foreground truncate">{nr.name}</span>
                <span className="text-[10px] font-mono text-foreground-muted shrink-0">
                  {nr.scope === 'sheet' ? 'Sheet' : 'Wb'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. Commit / Cancel Quick Buttons (visible when editing) */}
      {isEditing && (
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onCancelEditing()}
            className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            title="Cancel edit (Escape)"
            aria-label="Cancel edit"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onCommitEditing('none')}
            className="p-1 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
            title="Confirm edit (Enter)"
            aria-label="Confirm edit"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. fx Formula Indicator & Reference Button */}
      <button
        type="button"
        onClick={onOpenReference}
        className="px-1.5 py-0.5 rounded text-foreground-muted hover:text-accent hover:bg-surface-secondary font-serif italic text-xs font-bold shrink-0 transition-colors flex items-center gap-1 cursor-pointer"
        title="Insert Function or Browse Documentation (fx)"
      >
        <span>fx</span>
        <BookOpen className="w-3 h-3 not-italic text-foreground-muted" />
      </button>

      {/* 4. Interactive Formula / Cell Content Input (Single-line vs Multiline) */}
      <div className="relative flex-1 min-w-0">
        {isExpanded ? (
          <textarea
            ref={textareaRef}
            rows={3}
            value={displayValue}
            onFocus={handleFocus}
            onClick={updateCursorPosition}
            onKeyUp={updateCursorPosition}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Enter formula (e.g. =SUM(A1:A10)) or text. Alt+Enter for newline."
            aria-label="Multiline Formula Bar"
            className="w-full px-2 py-1 text-xs bg-surface-secondary border border-border rounded text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-accent focus:bg-background select-text transition-colors resize-none leading-relaxed"
          />
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={displayValue}
            onFocus={handleFocus}
            onClick={updateCursorPosition}
            onKeyUp={updateCursorPosition}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Enter text, number, or formula starting with ="
            aria-label="Formula Bar"
            className="w-full h-6 px-2 text-xs bg-surface-secondary border border-border rounded text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-accent focus:bg-background select-text transition-colors"
          />
        )}

        {/* Floating Autocomplete Suggestions */}
        {isEditing && suggestions.length > 0 && (
          <div className={cn('absolute left-0 z-50', isExpanded ? 'top-20' : 'top-8')}>
            <FormulaAutocomplete
              suggestions={suggestions}
              selectedIndex={selectedIndex}
              onSelect={acceptSuggestion}
            />
          </div>
        )}

        {/* Floating Argument Helper Tooltip */}
        {isEditing && argumentHelpContext && (
          <div className={cn('absolute left-0 z-50', isExpanded ? 'top-20' : 'top-8')}>
            <FormulaArgumentHelp context={argumentHelpContext} />
          </div>
        )}
      </div>

      {/* 5. Multiline Expand/Collapse Toggle Button */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-1 rounded text-foreground-muted hover:text-foreground hover:bg-surface-secondary shrink-0 transition-colors cursor-pointer"
        title={isExpanded ? 'Collapse formula bar' : 'Expand formula bar for multiline editing'}
        aria-label={isExpanded ? 'Collapse formula bar' : 'Expand formula bar'}
      >
        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
};
