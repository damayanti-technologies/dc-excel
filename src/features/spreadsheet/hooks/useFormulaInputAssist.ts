import React, { useState, useCallback, useMemo } from 'react';
import { functionRegistry } from '@/engine/calculation/functions';
import {
  getAutocompleteContext,
  getArgumentHelpContext,
  ArgumentHelpContext
} from '@/engine/calculation/formula-assist';
import { FunctionDefinition } from '@/engine/calculation/types';

interface UseFormulaInputAssistProps {
  value: string;
  onChange: (newValue: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

export function useFormulaInputAssist({
  value,
  onChange,
  inputRef
}: UseFormulaInputAssistProps) {
  const [cursorPos, setCursorPos] = useState<number>(value.length);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  // Determine autocomplete context
  const autocompleteContext = useMemo(() => {
    if (isDismissed) return null;
    return getAutocompleteContext(value, cursorPos);
  }, [value, cursorPos, isDismissed]);

  const suggestions = useMemo(() => {
    if (!autocompleteContext) return [];
    return functionRegistry.getAutocompleteSuggestions(autocompleteContext.prefix);
  }, [autocompleteContext]);

  // Determine argument assistance context
  const argumentHelpContext: ArgumentHelpContext | null = useMemo(() => {
    // Only show argument help if not actively showing autocomplete suggestions
    if (suggestions.length > 0) return null;
    return getArgumentHelpContext(value, cursorPos);
  }, [value, cursorPos, suggestions]);

  // Update cursor position from DOM input element
  const updateCursorPosition = useCallback(() => {
    if (inputRef.current) {
      setCursorPos(inputRef.current.selectionStart ?? value.length);
      setIsDismissed(false);
    }
  }, [inputRef, value.length]);

  // Accepts an autocomplete suggestion
  const acceptSuggestion = useCallback(
    (fn: FunctionDefinition) => {
      if (!autocompleteContext) return;

      const before = value.slice(0, autocompleteContext.replaceStart);
      const after = value.slice(autocompleteContext.replaceEnd);
      const inserted = `${fn.name}(`;
      const newValue = `${before}${inserted}${after}`;

      onChange(newValue);
      const newCursor = before.length + inserted.length;
      setCursorPos(newCursor);

      // Restore focus and cursor position in input
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.setSelectionRange(newCursor, newCursor);
        }
      }, 0);
    },
    [autocompleteContext, value, onChange, inputRef]
  );

  // Handles keyboard navigation for autocomplete
  const handleAssistKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>): boolean => {
      if (suggestions.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          e.stopPropagation();
          setSelectedIndex((prev) => (prev + 1) % suggestions.length);
          return true;
        }

        if (e.key === 'ArrowUp') {
          e.preventDefault();
          e.stopPropagation();
          setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
          return true;
        }

        if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
          e.preventDefault();
          e.stopPropagation();
          const target = suggestions[selectedIndex];
          if (target) {
            acceptSuggestion(target);
          }
          return true;
        }

        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          setIsDismissed(true);
          return true;
        }
      }

      return false;
    },
    [suggestions, selectedIndex, acceptSuggestion]
  );

  return {
    cursorPos,
    updateCursorPosition,
    suggestions,
    selectedIndex,
    argumentHelpContext,
    acceptSuggestion,
    handleAssistKeyDown
  };
}
