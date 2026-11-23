import { Token } from './types';

/**
 * Checks if a string is a valid Excel-style cell reference (e.g., "A1", "Z99", "AA10", "XFD1048576").
 */
export function isCellReference(word: string): boolean {
  return /^[A-Z]{1,3}[1-9][0-9]*$/i.test(word);
}

/**
 * Tokenizes a spreadsheet formula string into a stream of typed Tokens.
 *
 * @param formula Formula expression, with or without leading '='
 * @returns Array of Token objects ending with EOF
 */
export function tokenizeFormula(formula: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  const len = formula.length;

  // Skip leading '=' if present
  if (pos < len && formula[pos] === '=') {
    pos++;
  }

  while (pos < len) {
    const char = formula[pos]!;

    // 1. Whitespace
    if (/\s/.test(char)) {
      pos++;
      continue;
    }

    // 2. Numbers (integers, decimals, or starting with dot like .5)
    if (/[0-9]/.test(char) || (char === '.' && pos + 1 < len && /[0-9]/.test(formula[pos + 1]!))) {
      const start = pos;
      let hasDot = char === '.';
      pos++;

      while (pos < len) {
        const c = formula[pos]!;
        if (/[0-9]/.test(c)) {
          pos++;
        } else if (c === '.' && !hasDot) {
          hasDot = true;
          pos++;
        } else {
          break;
        }
      }

      tokens.push({
        type: 'NUMBER',
        value: formula.slice(start, pos),
        start,
        end: pos
      });
      continue;
    }

    // 3. String literals (double-quoted, supports "" escaped quotes)
    if (char === '"') {
      const start = pos;
      pos++; // skip opening quote
      let strVal = '';

      while (pos < len) {
        if (formula[pos] === '"') {
          // Check for escaped double quote ("")
          if (pos + 1 < len && formula[pos + 1] === '"') {
            strVal += '"';
            pos += 2;
          } else {
            // End of string
            pos++; // skip closing quote
            break;
          }
        } else {
          strVal += formula[pos]!;
          pos++;
        }
      }

      tokens.push({
        type: 'STRING',
        value: strVal,
        start,
        end: pos
      });
      continue;
    }

    // 4. Two-character comparison operators: <>, <=, >=
    if (pos + 1 < len) {
      const twoChar = formula.slice(pos, pos + 2);
      if (twoChar === '<>' || twoChar === '<=' || twoChar === '>=') {
        tokens.push({
          type: 'OPERATOR',
          value: twoChar,
          start: pos,
          end: pos + 2
        });
        pos += 2;
        continue;
      }
    }

    // 5. Single-character operators & punctuation
    if (char === '+' || char === '-' || char === '*' || char === '/' || char === '^' || char === '&' || char === '=' || char === '<' || char === '>') {
      tokens.push({
        type: 'OPERATOR',
        value: char,
        start: pos,
        end: pos + 1
      });
      pos++;
      continue;
    }

    if (char === '%') {
      tokens.push({
        type: 'PERCENT',
        value: '%',
        start: pos,
        end: pos + 1
      });
      pos++;
      continue;
    }

    if (char === '(') {
      tokens.push({
        type: 'PAREN_OPEN',
        value: '(',
        start: pos,
        end: pos + 1
      });
      pos++;
      continue;
    }

    if (char === ')') {
      tokens.push({
        type: 'PAREN_CLOSE',
        value: ')',
        start: pos,
        end: pos + 1
      });
      pos++;
      continue;
    }

    if (char === ',') {
      tokens.push({
        type: 'COMMA',
        value: ',',
        start: pos,
        end: pos + 1
      });
      pos++;
      continue;
    }

    if (char === ':') {
      tokens.push({
        type: 'COLON',
        value: ':',
        start: pos,
        end: pos + 1
      });
      pos++;
      continue;
    }

    // 6. Identifiers, Booleans, or Cell References (e.g. A1, SUM, TRUE)
    if (/[A-Za-z_]/.test(char)) {
      const start = pos;
      while (pos < len && /[A-Za-z0-9_]/.test(formula[pos]!)) {
        pos++;
      }
      const rawWord = formula.slice(start, pos);
      const upperWord = rawWord.toUpperCase();

      // Check next non-whitespace character to see if it's a function call (followed by '(')
      let nextPos = pos;
      while (nextPos < len && /\s/.test(formula[nextPos]!)) {
        nextPos++;
      }
      const isFunction = nextPos < len && formula[nextPos] === '(';

      if (!isFunction && (upperWord === 'TRUE' || upperWord === 'FALSE')) {
        tokens.push({
          type: 'BOOLEAN',
          value: upperWord,
          start,
          end: pos
        });
      } else if (!isFunction && isCellReference(upperWord)) {
        tokens.push({
          type: 'CELL_REF',
          value: upperWord,
          start,
          end: pos
        });
      } else {
        tokens.push({
          type: 'IDENTIFIER',
          value: upperWord,
          start,
          end: pos
        });
      }
      continue;
    }

    // 7. Unknown / Invalid character
    tokens.push({
      type: 'EOF', // or mark as error
      value: char,
      start: pos,
      end: pos + 1
    });
    pos++;
  }

  tokens.push({
    type: 'EOF',
    value: '',
    start: pos,
    end: pos
  });

  return tokens;
}
