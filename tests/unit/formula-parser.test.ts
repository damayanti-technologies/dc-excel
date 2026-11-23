import { describe, it, expect } from 'vitest';
import { parseFormula } from '@/engine/calculation/parser';
import {
  BinaryOpNode,
  FunctionCallNode,
  NumberLiteralNode,
  PercentNode,
  RangeRefNode,
  UnaryOpNode
} from '@/engine/calculation/types';

describe('Formula Parser & AST', () => {
  it('parses operator precedence: multiplication before addition', () => {
    // 10 + 20 * 3 => 10 + (20 * 3)
    const ast = parseFormula('=10 + 20 * 3') as BinaryOpNode;
    expect(ast.type).toBe('BinaryOp');
    expect(ast.operator).toBe('+');
    expect((ast.left as NumberLiteralNode).value).toBe(10);

    const right = ast.right as BinaryOpNode;
    expect(right.type).toBe('BinaryOp');
    expect(right.operator).toBe('*');
    expect((right.left as NumberLiteralNode).value).toBe(20);
    expect((right.right as NumberLiteralNode).value).toBe(3);
  });

  it('respects parentheses overriding precedence', () => {
    // (10 + 20) * 3
    const ast = parseFormula('=(10 + 20) * 3') as BinaryOpNode;
    expect(ast.type).toBe('BinaryOp');
    expect(ast.operator).toBe('*');

    const left = ast.left as BinaryOpNode;
    expect(left.type).toBe('BinaryOp');
    expect(left.operator).toBe('+');
    expect((left.left as NumberLiteralNode).value).toBe(10);
    expect((left.right as NumberLiteralNode).value).toBe(20);
  });

  it('parses unary minus and plus operators', () => {
    const ast = parseFormula('=-5 + 10') as BinaryOpNode;
    expect(ast.type).toBe('BinaryOp');
    expect(ast.operator).toBe('+');

    const left = ast.left as UnaryOpNode;
    expect(left.type).toBe('UnaryOp');
    expect(left.operator).toBe('-');
    expect((left.operand as NumberLiteralNode).value).toBe(5);
  });

  it('parses postfix percentage operator', () => {
    const ast = parseFormula('=50%') as PercentNode;
    expect(ast.type).toBe('Percent');
    expect((ast.operand as NumberLiteralNode).value).toBe(50);
  });

  it('parses exponentiation (power)', () => {
    const ast = parseFormula('=2 ^ 3') as BinaryOpNode;
    expect(ast.type).toBe('BinaryOp');
    expect(ast.operator).toBe('^');
    expect((ast.left as NumberLiteralNode).value).toBe(2);
    expect((ast.right as NumberLiteralNode).value).toBe(3);
  });

  it('parses range references and function calls', () => {
    const ast = parseFormula('=SUM(A1:B10, 42)') as FunctionCallNode;
    expect(ast.type).toBe('FunctionCall');
    expect(ast.name).toBe('SUM');
    expect(ast.args.length).toBe(2);

    const rangeArg = ast.args[0] as RangeRefNode;
    expect(rangeArg.type).toBe('RangeRef');
    expect(rangeArg.raw).toBe('A1:B10');
    expect(rangeArg.range).toEqual({
      startRow: 0,
      startCol: 0,
      endRow: 9,
      endCol: 1
    });

    const numArg = ast.args[1] as NumberLiteralNode;
    expect(numArg.type).toBe('NumberLiteral');
    expect(numArg.value).toBe(42);
  });

  it('parses nested function calls (e.g. IF inside IF)', () => {
    const ast = parseFormula('=IF(A1 > 50, "Pass", IF(A1 > 25, "Retake", "Fail"))') as FunctionCallNode;
    expect(ast.type).toBe('FunctionCall');
    expect(ast.name).toBe('IF');
    expect(ast.args.length).toBe(3);

    const condition = ast.args[0] as BinaryOpNode;
    expect(condition.operator).toBe('>');

    const nestedIf = ast.args[2] as FunctionCallNode;
    expect(nestedIf.type).toBe('FunctionCall');
    expect(nestedIf.name).toBe('IF');
    expect(nestedIf.args.length).toBe(3);
  });

  it('parses text concatenation operator &', () => {
    const ast = parseFormula('=A1 & " " & B1') as BinaryOpNode;
    expect(ast.type).toBe('BinaryOp');
    expect(ast.operator).toBe('&');
  });
});
