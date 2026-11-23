import { describe, it, expect } from 'vitest';
import { tokenizeFormula } from '@/engine/calculation/tokenizer';

describe('Formula Tokenizer', () => {
  it('tokenizes simple arithmetic expressions', () => {
    const tokens = tokenizeFormula('=10 + 20 * 3');
    expect(tokens.map((t) => t.type)).toEqual([
      'NUMBER',
      'OPERATOR',
      'NUMBER',
      'OPERATOR',
      'NUMBER',
      'EOF'
    ]);
    expect(tokens[0]!.value).toBe('10');
    expect(tokens[1]!.value).toBe('+');
    expect(tokens[2]!.value).toBe('20');
    expect(tokens[3]!.value).toBe('*');
    expect(tokens[4]!.value).toBe('3');
  });

  it('handles decimal numbers and decimals starting with dot', () => {
    const tokens = tokenizeFormula('=.5 + 3.1415');
    expect(tokens[0]!.value).toBe('.5');
    expect(tokens[1]!.value).toBe('+');
    expect(tokens[2]!.value).toBe('3.1415');
  });

  it('tokenizes string literals with escaped double quotes', () => {
    const tokens = tokenizeFormula('="Hello ""World"""');
    expect(tokens[0]!.type).toBe('STRING');
    expect(tokens[0]!.value).toBe('Hello "World"');
  });

  it('tokenizes cell references and ranges', () => {
    const tokens = tokenizeFormula('=SUM(A1:B10, C5)');
    expect(tokens.map((t) => t.type)).toEqual([
      'IDENTIFIER',
      'PAREN_OPEN',
      'CELL_REF',
      'COLON',
      'CELL_REF',
      'COMMA',
      'CELL_REF',
      'PAREN_CLOSE',
      'EOF'
    ]);
    expect(tokens[0]!.value).toBe('SUM');
    expect(tokens[2]!.value).toBe('A1');
    expect(tokens[4]!.value).toBe('B10');
    expect(tokens[6]!.value).toBe('C5');
  });

  it('tokenizes comparison and concatenation operators', () => {
    const tokens = tokenizeFormula('=A1 <> B1 & A2 <= 100');
    expect(tokens.map((t) => t.value)).toEqual([
      'A1',
      '<>',
      'B1',
      '&',
      'A2',
      '<=',
      '100',
      ''
    ]);
  });

  it('tokenizes percentage and exponentiation', () => {
    const tokens = tokenizeFormula('=2 ^ 3 + 10%');
    expect(tokens.map((t) => t.type)).toEqual([
      'NUMBER',
      'OPERATOR',
      'NUMBER',
      'OPERATOR',
      'NUMBER',
      'PERCENT',
      'EOF'
    ]);
    expect(tokens[1]!.value).toBe('^');
    expect(tokens[5]!.value).toBe('%');
  });

  it('tokenizes booleans correctly', () => {
    const tokens = tokenizeFormula('=TRUE = FALSE');
    expect(tokens[0]!.type).toBe('BOOLEAN');
    expect(tokens[0]!.value).toBe('TRUE');
    expect(tokens[1]!.value).toBe('=');
    expect(tokens[2]!.type).toBe('BOOLEAN');
    expect(tokens[2]!.value).toBe('FALSE');
  });
});
