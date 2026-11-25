import { ASTNode } from './types';
import { coordToKey, parseKey } from '@/utils/coordinates';
import { CellRange } from '@/types/cell';

export interface RangeDependentRecord {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
  dependentKey: string;
}

/**
 * Traverses an AST and extracts all referenced cell coordinate keys ("row:col").
 * Large ranges (or full columns/rows) are emitted as compact "RANGE:r1:c1:r2:c2" tokens
 * to prevent allocating hundreds of thousands of keys in memory.
 */
export function extractReferencesFromAST(
  node: ASTNode,
  resolveNamedRange?: (name: string) => { range: CellRange } | null,
  currentSheetName?: string
): string[] {
  const refs = new Set<string>();

  function walk(n: ASTNode) {
    switch (n.type) {
      case 'CellRef': {
        const isCrossSheet = n.sheetName && (!currentSheetName || n.sheetName.toLowerCase() !== currentSheetName.toLowerCase());
        if (isCrossSheet) {
          refs.add(`${n.sheetName}!${coordToKey(n.coord.row, n.coord.col)}`);
        } else {
          refs.add(coordToKey(n.coord.row, n.coord.col));
        }
        break;
      }

      case 'RangeRef': {
        const rowSpan = n.range.endRow - n.range.startRow + 1;
        const colSpan = n.range.endCol - n.range.startCol + 1;
        const cellCount = rowSpan * colSpan;
        const isCrossSheet = n.sheetName && (!currentSheetName || n.sheetName.toLowerCase() !== currentSheetName.toLowerCase());
        const prefix = isCrossSheet ? `${n.sheetName}!` : '';

        if (n.isFullCol || n.isFullRow || cellCount > 250) {
          // Bounded range token to avoid 100k key explosion
          refs.add(`${prefix}RANGE:${n.range.startRow}:${n.range.startCol}:${n.range.endRow}:${n.range.endCol}`);
        } else {
          for (let r = n.range.startRow; r <= n.range.endRow; r++) {
            for (let c = n.range.startCol; c <= n.range.endCol; c++) {
              refs.add(`${prefix}${coordToKey(r, c)}`);
            }
          }
        }
        break;
      }

      case 'NamedRangeRef':
        if (resolveNamedRange) {
          const resolved = resolveNamedRange(n.name);
          if (resolved) {
            const rowSpan = resolved.range.endRow - resolved.range.startRow + 1;
            const colSpan = resolved.range.endCol - resolved.range.startCol + 1;
            const cellCount = rowSpan * colSpan;

            if (cellCount > 250) {
              refs.add(`RANGE:${resolved.range.startRow}:${resolved.range.startCol}:${resolved.range.endRow}:${resolved.range.endCol}`);
            } else {
              for (let r = resolved.range.startRow; r <= resolved.range.endRow; r++) {
                for (let c = resolved.range.startCol; c <= resolved.range.endCol; c++) {
                  refs.add(coordToKey(r, c));
                }
              }
            }
          }
        }
        break;

      case 'UnaryOp':
      case 'Percent':
        walk(n.operand);
        break;

      case 'BinaryOp':
        walk(n.left);
        walk(n.right);
        break;

      case 'FunctionCall':
        for (const arg of n.args) {
          walk(arg);
        }
        break;

      case 'Empty':
      case 'Error':
      case 'NumberLiteral':
      case 'StringLiteral':
      case 'BooleanLiteral':
        break;
    }
  }

  walk(node);
  return Array.from(refs);
}

/**
 * Dependency Graph (DAG) for tracking formula precedents and dependents.
 * Provides stack-safe iterative cycle detection and O(V + E) topological recalculation sorting.
 */
export class DependencyGraph {
  // cellKey -> set of cells that cellKey references (precedents)
  private precedents = new Map<string, Set<string>>();

  // cellKey -> set of cells that reference cellKey (dependents)
  private dependents = new Map<string, Set<string>>();

  // rangeDependents array for compact, large-range subscriptions
  private rangeDependents: RangeDependentRecord[] = [];

  /**
   * Sets or updates the precedents of a cell.
   * Automatically synchronizes the reverse dependents map and compact range subscriptions.
   */
  public setCellDependencies(cellKey: string, newPrecedents: string[]): void {
    // 1. Remove old precedents
    const oldPrecedents = this.precedents.get(cellKey);
    if (oldPrecedents) {
      for (const prec of oldPrecedents) {
        if (!prec.startsWith('RANGE:')) {
          this.dependents.get(prec)?.delete(cellKey);
        }
      }
      this.rangeDependents = this.rangeDependents.filter((rd) => rd.dependentKey !== cellKey);
    }

    // 2. Set new precedents
    const precSet = new Set(newPrecedents);
    this.precedents.set(cellKey, precSet);

    // 3. Update reverse dependents
    for (const prec of precSet) {
      if (prec.startsWith('RANGE:')) {
        const parts = prec.split(':');
        if (parts.length === 5) {
          this.rangeDependents.push({
            startRow: Number.parseInt(parts[1]!, 10),
            startCol: Number.parseInt(parts[2]!, 10),
            endRow: Number.parseInt(parts[3]!, 10),
            endCol: Number.parseInt(parts[4]!, 10),
            dependentKey: cellKey
          });
        }
      } else {
        if (!this.dependents.has(prec)) {
          this.dependents.set(prec, new Set());
        }
        this.dependents.get(prec)!.add(cellKey);
      }
    }
  }

  /**
   * Clears a cell's dependencies (e.g. when cell formula is deleted or replaced with literal).
   */
  public removeCell(cellKey: string): void {
    const oldPrecedents = this.precedents.get(cellKey);
    if (oldPrecedents) {
      for (const prec of oldPrecedents) {
        if (!prec.startsWith('RANGE:')) {
          this.dependents.get(prec)?.delete(cellKey);
        }
      }
      this.rangeDependents = this.rangeDependents.filter((rd) => rd.dependentKey !== cellKey);
      this.precedents.delete(cellKey);
    }
  }

  /**
   * Returns all direct precedents (cells this cell references).
   */
  public getPrecedents(cellKey: string): string[] {
    const prec = this.precedents.get(cellKey);
    return prec ? Array.from(prec) : [];
  }

  /**
   * Returns all direct dependents (cells referencing this cell).
   */
  public getDirectDependents(cellKey: string): string[] {
    const dep = this.dependents.get(cellKey);
    const result = dep ? Array.from(dep) : [];

    const coord = parseKey(cellKey);
    if (coord) {
      for (const rd of this.rangeDependents) {
        if (
          coord.row >= rd.startRow &&
          coord.row <= rd.endRow &&
          coord.col >= rd.startCol &&
          coord.col <= rd.endCol
        ) {
          if (!result.includes(rd.dependentKey)) {
            result.push(rd.dependentKey);
          }
        }
      }
    }

    return result;
  }

  /**
   * Detects whether a cell is part of a circular dependency cycle.
   * Uses stack-safe iterative depth-first search with explicit heap stack.
   */
  public hasCircularDependency(startKey: string): boolean {
    const visited = new Set<string>();
    const onStack = new Set<string>();

    interface DfsFrame {
      node: string;
      neighbors: string[];
      index: number;
    }

    const startPrecs = Array.from(this.precedents.get(startKey) || []).filter(
      (p) => !p.startsWith('RANGE:')
    );

    const stack: DfsFrame[] = [{ node: startKey, neighbors: startPrecs, index: 0 }];
    visited.add(startKey);
    onStack.add(startKey);

    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;

      if (frame.index < frame.neighbors.length) {
        const next = frame.neighbors[frame.index++]!;

        if (onStack.has(next)) {
          return true; // Cycle detected
        }

        if (!visited.has(next)) {
          visited.add(next);
          onStack.add(next);
          const nextNeighbors = Array.from(this.precedents.get(next) || []).filter(
            (p) => !p.startsWith('RANGE:')
          );
          stack.push({ node: next, neighbors: nextNeighbors, index: 0 });
        }
      } else {
        onStack.delete(frame.node);
        stack.pop();
      }
    }

    return false;
  }

  /**
   * Computes a topologically sorted list of all downstream dependents that need recalculation
   * when the given cells are modified.
   *
   * @param changedCellKeys Array of cell keys that were edited
   * @returns Ordered array of dependent cell keys to recalculate in topological order
   */
  public getRecalculationOrder(changedCellKeys: string[]): {
    order: string[];
    hasCycle: boolean;
    cycleCells: Set<string>;
  } {
    // 1. Collect all downstream reachable dependents via BFS
    const allDependents = new Set<string>();
    const queue = [...changedCellKeys];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const direct = this.dependents.get(current);
      if (direct) {
        for (const dep of direct) {
          if (!allDependents.has(dep)) {
            allDependents.add(dep);
            queue.push(dep);
          }
        }
      }

      // Check range dependents
      const coord = parseKey(current);
      if (coord) {
        for (const rd of this.rangeDependents) {
          if (
            coord.row >= rd.startRow &&
            coord.row <= rd.endRow &&
            coord.col >= rd.startCol &&
            coord.col <= rd.endCol
          ) {
            if (!allDependents.has(rd.dependentKey)) {
              allDependents.add(rd.dependentKey);
              queue.push(rd.dependentKey);
            }
          }
        }
      }
    }

    if (allDependents.size === 0) {
      return { order: [], hasCycle: false, cycleCells: new Set() };
    }

    // 2. Perform Kahn's algorithm topological sort on the subgraph of allDependents
    const inDegree = new Map<string, number>();
    for (const node of allDependents) {
      let degree = 0;
      const precs = this.precedents.get(node);
      if (precs) {
        for (const p of precs) {
          if (!p.startsWith('RANGE:') && allDependents.has(p)) {
            degree++;
          }
        }
      }
      inDegree.set(node, degree);
    }

    // Initial queue of nodes with inDegree === 0
    const topoQueue: string[] = [];
    for (const [node, deg] of inDegree.entries()) {
      if (deg === 0) {
        topoQueue.push(node);
      }
    }

    const order: string[] = [];
    const orderSet = new Set<string>();

    while (topoQueue.length > 0) {
      const u = topoQueue.shift()!;
      order.push(u);
      orderSet.add(u);

      const direct = this.dependents.get(u);
      if (direct) {
        for (const v of direct) {
          if (allDependents.has(v)) {
            const currentDeg = inDegree.get(v)! - 1;
            inDegree.set(v, currentDeg);
            if (currentDeg === 0) {
              topoQueue.push(v);
            }
          }
        }
      }
    }

    // 3. Cycle check: if order.length !== allDependents.size, a cycle exists among remaining nodes
    const hasCycle = order.length !== allDependents.size;
    const cycleCells = new Set<string>();
    if (hasCycle) {
      for (const node of allDependents) {
        if (!orderSet.has(node)) {
          cycleCells.add(node);
        }
      }
    }

    return { order, hasCycle, cycleCells };
  }

  /**
   * Topologically sorts a full set of target keys (e.g. all formula cells in a sheet)
   * so that precedents are always evaluated before dependents.
   * Runs in O(V + E) time by using Set lookups instead of Array.includes.
   */
  public getFullTopologicalOrder(targetKeys: string[]): string[] {
    const keySet = new Set(targetKeys);
    const inDegree = new Map<string, number>();

    // Count in-degrees within keySet
    for (const key of targetKeys) {
      let degree = 0;
      const precs = this.precedents.get(key);
      if (precs) {
        for (const p of precs) {
          if (!p.startsWith('RANGE:') && keySet.has(p)) {
            degree++;
          }
        }
      }
      inDegree.set(key, degree);
    }

    const queue: string[] = [];
    for (const [key, deg] of inDegree.entries()) {
      if (deg === 0) {
        queue.push(key);
      }
    }

    const order: string[] = [];
    const orderSet = new Set<string>();

    while (queue.length > 0) {
      const u = queue.shift()!;
      order.push(u);
      orderSet.add(u);

      const direct = this.dependents.get(u);
      if (direct) {
        for (const v of direct) {
          if (keySet.has(v)) {
            const nextDeg = inDegree.get(v)! - 1;
            inDegree.set(v, nextDeg);
            if (nextDeg === 0) {
              queue.push(v);
            }
          }
        }
      }
    }

    // Append any remaining keys that weren't queued (e.g. if part of a cycle)
    for (const key of targetKeys) {
      if (!orderSet.has(key)) {
        order.push(key);
        orderSet.add(key);
      }
    }

    return order;
  }

  /**
   * Resets the entire dependency graph.
   */
  public clear(): void {
    this.precedents.clear();
    this.dependents.clear();
    this.rangeDependents = [];
  }
}
