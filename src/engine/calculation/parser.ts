import { Token, ASTNode, CellRefNode, RangeRefNode } from './types';
import { tokenizeFormula } from './tokenizer';
import { a1ToCoord } from '@/utils/coordinates';
import { FormulaError } from './errors';

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

    // Number
    if (this.match('NUMBER')) {
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

    // Cell Reference or Range Reference (e.g. A1 or A1:B10)
    if (this.match('CELL_REF')) {
      const startA1 = token.value.toUpperCase();
      const startCoord = a1ToCoord(startA1);

      if (!startCoord) {
        return { type: 'Error', error: FormulaError.REF };
      }

      // Check if followed by colon ':' for range reference (e.g. A1:B10)
      if (this.match('COLON')) {
        const nextToken = this.peek();
        if (this.match('CELL_REF')) {
          const endA1 = nextToken.value.toUpperCase();
          const endCoord = a1ToCoord(endA1);

          if (!endCoord) {
            return { type: 'Error', error: FormulaError.REF };
          }

          const rangeNode: RangeRefNode = {
            type: 'RangeRef',
            raw: `${startA1}:${endA1}`,
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
        raw: startA1,
        coord: startCoord
      };
      return cellRefNode;
    }

    // Function Call (e.g. SUM(A1:A5, B1))
    if (this.match('IDENTIFIER')) {
      const funcName = token.value.toUpperCase();

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
