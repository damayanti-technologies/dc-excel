import { Token } from './types';

/**
 * Checks if a string is a valid Excel-style cell reference (e.g., "A1", "$A$1", "A$1", "$A1", "Z99", "AA10", "XFD1048576").
 */
export function isCellReference(word: string): boolean {
  return /^\$?[A-Z]{1,3}\$?[1-9][0-9]*$/i.test(word);
}

/**
 * Checks if a string is a valid sheet-qualified cell reference (e.g. "Sheet2!A1", "'My Sheet'!$B$5").
 */
export function isSheetQualifiedCellRef(word: string): boolean {
  return /^(?:'([^']+)'|([A-Za-z0-9_]+))!\$?[A-Z]{1,3}\$?[1-9][0-9]*$/i.test(word);
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

    // 2. Numbers (integers, decimals, scientific notation e.g. 1E5, 2.5e-3, .5)
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
        } else if ((c === 'e' || c === 'E') && pos + 1 < len) {
          // Check for scientific notation exponent
          const nextC = formula[pos + 1]!;
          if (/[0-9]/.test(nextC)) {
            pos += 2;
            while (pos < len && /[0-9]/.test(formula[pos]!)) {
              pos++;
            }
          } else if ((nextC === '+' || nextC === '-') && pos + 2 < len && /[0-9]/.test(formula[pos + 2]!)) {
            pos += 3;
            while (pos < len && /[0-9]/.test(formula[pos]!)) {
              pos++;
            }
          } else {
            break;
          }
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
      let isTerminated = false;

      while (pos < len) {
        if (formula[pos] === '"') {
          // Check for escaped double quote ("")
          if (pos + 1 < len && formula[pos + 1] === '"') {
            strVal += '"';
            pos += 2;
          } else {
            // End of string
            pos++; // skip closing quote
            isTerminated = true;
            break;
          }
        } else {
          strVal += formula[pos]!;
          pos++;
        }
      }

      if (!isTerminated) {
        // Unterminated string literal is a syntax error
        tokens.push({
          type: 'ERROR',
          value: 'Unterminated string literal',
          start,
          end: pos
        });
      } else {
        tokens.push({
          type: 'STRING',
          value: strVal,
          start,
          end: pos
        });
      }
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

    if (char === ';') {
      tokens.push({
        type: 'SEMICOLON',
        value: ';',
        start: pos,
        end: pos + 1
      });
      pos++;
      continue;
    }

    if (char === '{') {
      tokens.push({
        type: 'BRACE_OPEN',
        value: '{',
        start: pos,
        end: pos + 1
      });
      pos++;
      continue;
    }

    if (char === '}') {
      tokens.push({
        type: 'BRACE_CLOSE',
        value: '}',
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

    // 6. Single-quoted sheet name prefix: e.g. 'Sheet Name'!A1 or 'Sheet Name'!A1:B10
    if (char === "'") {
      const start = pos;
      pos++; // skip opening single quote
      let sheetName = '';
      let isQuoteClosed = false;

      while (pos < len) {
        if (formula[pos] === "'") {
          if (pos + 1 < len && formula[pos + 1] === "'") {
            sheetName += "'";
            pos += 2;
          } else {
            pos++; // closing single quote
            isQuoteClosed = true;
            break;
          }
        } else {
          sheetName += formula[pos]!;
          pos++;
        }
      }

      if (isQuoteClosed && pos < len && formula[pos] === '!') {
        pos++; // skip '!'
        // Now read cell ref or column/row ref after 'Sheet Name'!
        const refStart = pos;
        if (pos < len && formula[pos] === '$') pos++;
        while (pos < len && /[A-Za-z0-9_$]/.test(formula[pos]!)) {
          pos++;
        }
        const refWord = formula.slice(refStart, pos);
        const fullVal = `'${sheetName}'!${refWord}`;
        tokens.push({
          type: 'CELL_REF',
          value: fullVal,
          start,
          end: pos
        });
        continue;
      } else {
        tokens.push({
          type: 'ERROR',
          value: 'Invalid quoted sheet reference',
          start,
          end: pos
        });
        continue;
      }
    }

    // 7. Cell reference with leading '$', e.g. $A$1, $A1
    if (char === '$') {
      const start = pos;
      pos++; // skip leading '$'
      while (pos < len && /[A-Za-z0-9_$]/.test(formula[pos]!)) {
        pos++;
      }
      const rawWord = formula.slice(start, pos);
      const upperWord = rawWord.toUpperCase();

      if (isCellReference(upperWord)) {
        tokens.push({
          type: 'CELL_REF',
          value: upperWord,
          start,
          end: pos
        });
      } else {
        tokens.push({
          type: 'ERROR',
          value: rawWord,
          start,
          end: pos
        });
      }
      continue;
    }

    // 8. Identifiers, Booleans, or Cell References (e.g. A1, A$1, Sheet2!A1, SUM, TRUE)
    if (/[A-Za-z_]/.test(char)) {
      const start = pos;
      while (pos < len && /[A-Za-z0-9_]/.test(formula[pos]!)) {
        pos++;
      }

      // Check if followed by '$' (e.g. A$1)
      if (pos < len && formula[pos] === '$') {
        pos++; // include '$'
        while (pos < len && /[0-9]/.test(formula[pos]!)) {
          pos++;
        }
      }

      // Check if followed by '!' (e.g. Sheet2!A1 or Sheet2!$A$1)
      if (pos < len && formula[pos] === '!') {
        pos++; // skip '!'
        if (pos < len && formula[pos] === '$') pos++;
        while (pos < len && /[A-Za-z0-9_$]/.test(formula[pos]!)) {
          pos++;
        }
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
      } else if (!isFunction && (isCellReference(upperWord) || isSheetQualifiedCellRef(rawWord))) {
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

    // 9. Unknown / Invalid character -> Emit ERROR token (NEVER silent EOF!)
    tokens.push({
      type: 'ERROR',
      value: char,
      start: pos,
      end: pos + 1
    });
    pos++;
  }

  // Final true EOF token
  tokens.push({
    type: 'EOF',
    value: '',
    start: pos,
    end: pos
  });

  return tokens;
}
