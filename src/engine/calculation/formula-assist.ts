import { functionRegistry } from './functions';
import { FunctionDefinition } from './types';

export interface AutocompleteContext {
  prefix: string;
  replaceStart: number;
  replaceEnd: number;
}

export interface ArgumentHelpContext {
  functionDef: FunctionDefinition;
  activeArgIndex: number;
}

/**
 * Analyzes the text and cursor position to determine if the user is typing
 * a formula function name that can be autocompleted.
 */
export function getAutocompleteContext(
  text: string,
  cursorPosition: number
): AutocompleteContext | null {
  if (!text.startsWith('=')) {
    return null;
  }

  const beforeCursor = text.slice(0, cursorPosition);

  // Check if cursor is inside a quoted string literal
  let inString = false;
  for (let i = 0; i < beforeCursor.length; i++) {
    if (beforeCursor[i] === '"') {
      if (i + 1 < beforeCursor.length && beforeCursor[i + 1] === '"') {
        i++; // skip escaped quote
      } else {
        inString = !inString;
      }
    }
  }
  if (inString) return null;

  // Extract the word immediately preceding the cursor
  const match = beforeCursor.match(/([A-Za-z_][A-Za-z0-9_]*)$/);
  if (!match) return null;

  const prefix = match[1]!;
  const replaceStart = cursorPosition - prefix.length;

  // Ensure prefix is not immediately followed by '('
  if (cursorPosition < text.length && text[cursorPosition] === '(') {
    return null;
  }

  // Preceding character before the prefix should be '=', operator, comma, or open paren
  if (replaceStart > 0) {
    const prevChar = text[replaceStart - 1]!;
    if (!/[=(,+*/^&<>\-\s]/.test(prevChar)) {
      return null;
    }
  }

  return {
    prefix,
    replaceStart,
    replaceEnd: cursorPosition
  };
}

/**
 * Analyzes the text and cursor position to determine if the cursor is inside
 * a function call's argument list, returning the function definition and active argument index.
 */
export function getArgumentHelpContext(
  text: string,
  cursorPosition: number
): ArgumentHelpContext | null {
  if (!text.startsWith('=')) {
    return null;
  }

  const beforeCursor = text.slice(0, cursorPosition);

  // Parse backwards tracking parenthesis depth and commas outside strings
  let depth = 0;
  let commasAtDepth = 0;
  let openParenIndex = -1;
  let inString = false;

  for (let i = beforeCursor.length - 1; i >= 0; i--) {
    const c = beforeCursor[i]!;

    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (c === ')') {
      depth++;
    } else if (c === '(') {
      if (depth > 0) {
        depth--;
      } else {
        // Found the unclosed '(' for current function call
        openParenIndex = i;
        break;
      }
    } else if (c === ',' && depth === 0) {
      commasAtDepth++;
    }
  }

  if (openParenIndex === -1) {
    return null;
  }

  // Find the function name immediately preceding the open parenthesis
  const beforeParen = text.slice(0, openParenIndex);
  const funcMatch = beforeParen.match(/([A-Za-z_][A-Za-z0-9_.]*)\s*$/);
  if (!funcMatch) {
    return null;
  }

  const funcName = funcMatch[1]!.toUpperCase();
  const def = functionRegistry.getDefinition(funcName);
  if (!def) {
    return null;
  }

  return {
    functionDef: def,
    activeArgIndex: commasAtDepth
  };
}
