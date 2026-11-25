import { Token, ASTNode, CellRefNode, RangeRefNode } from './types';
import { tokenizeFormula } from './tokenizer';
import { parseA1Reference, nameToColIndex } from '@/utils/coordinates';
import { FormulaError } from './errors';

function extractSheetAndA1(raw: string): { sheetName?: string; a1: string } {
  const match = raw.match(/^(?:'([^']+)'|([A-Za-z0-9_]+))!(.+)$/);
  if (match) {
    return {
      sheetName: match[1] || match[2],
      a1: match[3]!
    };
  }
  return { a1: raw };
}

/**
 * Recursive descent parser for spreadsheet formulas.
 * Implements standard spreadsheet operator precedence and AST construction.
 */
export class FormulaParser {
  private tokens: Token[] = [];
  private current = 0;

  /**
   * Parses formula text into an ASTNode.
   */
  public parse(formula: string): ASTNode {
    const clean = formula.trim();
    if (!clean || clean === '=') {
      return { type: 'StringLiteral', value: '' };
    }

    this.tokens = tokenizeFormula(clean);
    this.current = 0;

    // Check for lexical errors upfront
    if (this.tokens.some((t) => t.type === 'ERROR')) {
      return { type: 'Error', error: FormulaError.VALUE };
    }

    const ast = this.parseComparison();

    if (!this.isAtEnd()) {
      return { type: 'Error', error: FormulaError.VALUE };
    }

    return ast;
  }

  // 1. Comparison: =, <>, <, <=, >, >=
  private parseComparison(): ASTNode {
    let expr = this.parseAdditive();

    while (
      this.matchOperator('=') ||
      this.matchOperator('<>') ||
      this.matchOperator('<=') ||
      this.matchOperator('>=') ||
      this.matchOperator('<') ||
      this.matchOperator('>')
    ) {
      const op = this.previous().value as
        | '='
        | '<>'
        | '<'
        | '<='
        | '>'
        | '>=';
      const right = this.parseAdditive();
      expr = {
        type: 'BinaryOp',
        operator: op,
        left: expr,
        right
      };
    }

    return expr;
  }

  // 2. Additive & Concatenation: +, -, &
  private parseAdditive(): ASTNode {
    let expr = this.parseMultiplicative();

    while (this.matchOperator('+') || this.matchOperator('-') || this.matchOperator('&')) {
      const op = this.previous().value as '+' | '-' | '&';
      const right = this.parseMultiplicative();
      expr = {
        type: 'BinaryOp',
        operator: op,
        left: expr,
        right
      };
    }

    return expr;
  }

  // 3. Multiplicative: *, /
  private parseMultiplicative(): ASTNode {
    let expr = this.parsePower();

    while (this.matchOperator('*') || this.matchOperator('/')) {
      const op = this.previous().value as '*' | '/';
      const right = this.parsePower();
      expr = {
        type: 'BinaryOp',
        operator: op,
        left: expr,
        right
      };
    }

    return expr;
  }

  // 4. Exponentiation: ^ (right-associative)
  private parsePower(): ASTNode {
    let expr = this.parseUnary();

    if (this.matchOperator('^')) {
      const right = this.parsePower();
      expr = {
        type: 'BinaryOp',
        operator: '^',
        left: expr,
        right
      };
    }

    return expr;
  }

  // 5. Unary operators: +, -
  private parseUnary(): ASTNode {
    if (this.matchOperator('+') || this.matchOperator('-')) {
      const op = this.previous().value as '+' | '-';
      const operand = this.parseUnary();
      return {
        type: 'UnaryOp',
        operator: op,
        operand
      };
    }

    return this.parsePostfixPercent();
  }

  // 6. Postfix Percent: %
  private parsePostfixPercent(): ASTNode {
    let expr = this.parsePrimary();

    while (this.match('PERCENT')) {
      expr = {
        type: 'Percent',
        operand: expr
      };
    }

    return expr;
  }

  // 7. Primary expressions: Literals, CellRefs, RangeRefs, Functions, Parentheses
  private parsePrimary(): ASTNode {
    const token = this.peek();

    // Error token from tokenizer (e.g. invalid character or unterminated string)
    if (this.match('ERROR')) {
      return { type: 'Error', error: FormulaError.VALUE };
    }

    // Number
    if (this.match('NUMBER')) {
      // Check full row reference: e.g. 1:1 or 1:10
      if (this.check('COLON') && /^\$?[1-9][0-9]*$/.test(token.value)) {
        this.advance(); // consume ':'
        if (this.check('NUMBER')) {
          const nextToken = this.peek();
          if (/^\$?[1-9][0-9]*$/.test(nextToken.value)) {
            this.advance(); // consume 2nd NUMBER
            const r1 = Number.parseInt(token.value.replace(/\$/g, ''), 10) - 1;
            const r2 = Number.parseInt(nextToken.value.replace(/\$/g, ''), 10) - 1;
            const startRow = Math.min(r1, r2);
            const endRow = Math.max(r1, r2);
            return {
              type: 'RangeRef',
              raw: `${token.value}:${nextToken.value}`,
              isFullRow: true,
              startRef: { row: startRow, col: 0 },
              endRef: { row: endRow, col: 16383 },
              range: { startRow, startCol: 0, endRow, endCol: 16383 }
            };
          }
        }
      }
      const val = Number.parseFloat(token.value);
      return { type: 'NumberLiteral', value: Number.isNaN(val) ? 0 : val };
    }

    // String
    if (this.match('STRING')) {
      return { type: 'StringLiteral', value: token.value };
    }

    // Boolean
    if (this.match('BOOLEAN')) {
      return { type: 'BooleanLiteral', value: token.value.toUpperCase() === 'TRUE' };
    }

    // Cell Reference or Range Reference (e.g. A1, $A$1, Sheet2!A1, A1:B10)
    if (this.match('CELL_REF')) {
      const rawStart = token.value;
      const { sheetName: startSheet, a1: startA1 } = extractSheetAndA1(rawStart);
      const parsedStart = parseA1Reference(startA1);

      if (!parsedStart) {
        return { type: 'Error', error: FormulaError.REF };
      }

      const startCoord = { row: parsedStart.row, col: parsedStart.col };

      // Check if followed by colon ':' for range reference (e.g. A1:B10)
      if (this.match('COLON')) {
        const nextToken = this.peek();
        if (this.match('CELL_REF')) {
          const rawEnd = nextToken.value;
          const { sheetName: endSheet, a1: endA1 } = extractSheetAndA1(rawEnd);
          const parsedEnd = parseA1Reference(endA1);

          if (!parsedEnd) {
            return { type: 'Error', error: FormulaError.REF };
          }

          const endCoord = { row: parsedEnd.row, col: parsedEnd.col };
          const rangeNode: RangeRefNode = {
            type: 'RangeRef',
            raw: `${rawStart}:${rawEnd}`,
            sheetName: startSheet || endSheet,
            startRef: startCoord,
            endRef: endCoord,
            range: {
              startRow: Math.min(startCoord.row, endCoord.row),
              startCol: Math.min(startCoord.col, endCoord.col),
              endRow: Math.max(startCoord.row, endCoord.row),
              endCol: Math.max(startCoord.col, endCoord.col)
            }
          };
          return rangeNode;
        }

        return { type: 'Error', error: FormulaError.REF };
      }

      const cellRefNode: CellRefNode = {
        type: 'CellRef',
        raw: rawStart,
        sheetName: startSheet,
        coord: startCoord,
        isColAbsolute: parsedStart.isColAbsolute,
        isRowAbsolute: parsedStart.isRowAbsolute
      };
      return cellRefNode;
    }

    // Function Call (e.g. SUM(A1:A5, B1)) or Full Column Range (e.g. A:A) or Named Range
    if (this.match('IDENTIFIER')) {
      const rawIdent = token.value.toUpperCase();

      // Check full column reference: e.g. A:A or $A:$B or Sheet1!A:A
      const { sheetName: colSheet, a1: colName } = extractSheetAndA1(rawIdent);
      if (this.check('COLON') && /^\$?[A-Z]{1,3}$/.test(colName)) {
        this.advance(); // consume ':'
        if (this.check('IDENTIFIER')) {
          const nextToken = this.peek();
          const nextIdent = nextToken.value.toUpperCase();
          const { sheetName: nextColSheet, a1: nextColName } = extractSheetAndA1(nextIdent);
          if (/^\$?[A-Z]{1,3}$/.test(nextColName)) {
            this.advance(); // consume 2nd IDENTIFIER
            const c1 = nameToColIndex(colName.replace(/\$/g, ''));
            const c2 = nameToColIndex(nextColName.replace(/\$/g, ''));
            const startCol = Math.min(c1, c2);
            const endCol = Math.max(c1, c2);
            return {
              type: 'RangeRef',
              raw: `${rawIdent}:${nextIdent}`,
              sheetName: colSheet || nextColSheet,
              isFullCol: true,
              startRef: { row: 0, col: startCol },
              endRef: { row: 999999, col: endCol },
              range: { startRow: 0, startCol, endRow: 999999, endCol }
            };
          }
        }
      }

      const funcName = rawIdent;

      if (this.match('PAREN_OPEN')) {
        const args: ASTNode[] = [];

        if (!this.check('PAREN_CLOSE')) {
          while (true) {
            if (this.check('COMMA')) {
              // Omitted argument before comma, e.g. FUNC(, B1) or FUNC(A1,, C1)
              args.push({ type: 'Empty' });
              this.advance();
            } else if (this.check('PAREN_CLOSE')) {
              break;
            } else {
              args.push(this.parseComparison());
              if (this.match('COMMA')) {
                if (this.check('PAREN_CLOSE')) {
                  args.push({ type: 'Empty' });
                  break;
                }
                continue;
              } else {
                break;
              }
            }
          }
        }

        if (!this.match('PAREN_CLOSE')) {
          return { type: 'Error', error: FormulaError.VALUE };
        }

        return {
          type: 'FunctionCall',
          name: funcName,
          args
        };
      }

      // If an identifier is not followed by '(', it is treated as a named range reference
      return { type: 'NamedRangeRef', name: funcName };
    }

    // Parentheses (expr)
    if (this.match('PAREN_OPEN')) {
      const expr = this.parseComparison();
      if (!this.match('PAREN_CLOSE')) {
        return { type: 'Error', error: FormulaError.VALUE };
      }
      return expr;
    }

    // If unexpected token or syntax error
    this.advance();
    return { type: 'Error', error: FormulaError.VALUE };
  }

  // --- Helper Methods ---

  private match(...types: Token['type'][]): boolean {
    for (const t of types) {
      if (this.check(t)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private matchOperator(opValue: string): boolean {
    if (this.check('OPERATOR') && this.peek().value === opValue) {
      this.advance();
      return true;
    }
    return false;
  }

  private check(type: Token['type']): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }

  private peek(): Token {
    return this.tokens[this.current] || { type: 'EOF', value: '', start: 0, end: 0 };
  }

  private previous(): Token {
    return this.tokens[this.current - 1] || { type: 'EOF', value: '', start: 0, end: 0 };
  }
}

/**
 * Singleton parser helper.
 */
export function parseFormula(formula: string): ASTNode {
  const parser = new FormulaParser();
  return parser.parse(formula);
}
