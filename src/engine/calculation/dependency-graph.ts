import { ASTNode } from './types';
import { coordToKey } from '@/utils/coordinates';
import { CellRange } from '@/types/cell';

/**
 * Traverses an AST and extracts all referenced cell coordinate keys ("row:col").
 * Range references are expanded to all contained cell keys.
 */
export function extractReferencesFromAST(
  node: ASTNode,
  resolveNamedRange?: (name: string) => { range: CellRange } | null
): string[] {
  const refs = new Set<string>();

  function walk(n: ASTNode) {
    switch (n.type) {
      case 'CellRef':
        refs.add(coordToKey(n.coord.row, n.coord.col));
        break;

      case 'RangeRef':
        for (let r = n.range.startRow; r <= n.range.endRow; r++) {
          for (let c = n.range.startCol; c <= n.range.endCol; c++) {
            refs.add(coordToKey(r, c));
          }
        }
        break;

      case 'NamedRangeRef':
        if (resolveNamedRange) {
          const resolved = resolveNamedRange(n.name);
          if (resolved) {
            for (let r = resolved.range.startRow; r <= resolved.range.endRow; r++) {
              for (let c = resolved.range.startCol; c <= resolved.range.endCol; c++) {
                refs.add(coordToKey(r, c));
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
 * Provides cycle detection and topological recalculation sorting.
 */
export class DependencyGraph {
  // cellKey -> set of cells that cellKey references (precedents)
  private precedents = new Map<string, Set<string>>();

  // cellKey -> set of cells that reference cellKey (dependents)
  private dependents = new Map<string, Set<string>>();

  /**
   * Sets or updates the precedents of a cell.
   * Automatically synchronizes the reverse dependents map.
   */
  public setCellDependencies(cellKey: string, newPrecedents: string[]): void {
    // 1. Remove old precedents
    const oldPrecedents = this.precedents.get(cellKey);
    if (oldPrecedents) {
      for (const prec of oldPrecedents) {
        this.dependents.get(prec)?.delete(cellKey);
      }
    }

    // 2. Set new precedents
    const precSet = new Set(newPrecedents);
    this.precedents.set(cellKey, precSet);

    // 3. Update reverse dependents
    for (const prec of precSet) {
      if (!this.dependents.has(prec)) {
        this.dependents.set(prec, new Set());
      }
      this.dependents.get(prec)!.add(cellKey);
    }
  }

  /**
   * Clears a cell's dependencies (e.g. when cell formula is deleted or replaced with literal).
   */
  public removeCell(cellKey: string): void {
    const oldPrecedents = this.precedents.get(cellKey);
    if (oldPrecedents) {
      for (const prec of oldPrecedents) {
        this.dependents.get(prec)?.delete(cellKey);
      }
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
    return dep ? Array.from(dep) : [];
  }

  /**
   * Detects whether a cell is part of a circular dependency cycle.
   * Uses depth-first search with recursion stack.
   */
  public hasCircularDependency(startKey: string): boolean {
    const visited = new Set<string>();
    const stack = new Set<string>();

    const dfs = (curr: string): boolean => {
      visited.add(curr);
      stack.add(curr);

      const precs = this.precedents.get(curr);
      if (precs) {
        for (const p of precs) {
          if (!visited.has(p)) {
            if (dfs(p)) return true;
          } else if (stack.has(p)) {
            return true; // Cycle found
          }
        }
      }

      stack.delete(curr);
      return false;
    };

    return dfs(startKey);
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
    }

    if (allDependents.size === 0) {
      return { order: [], hasCycle: false, cycleCells: new Set() };
    }

    // 2. Perform Kahn's algorithm or DFS topological sort on the subgraph of allDependents
    // In-degree: how many precedents of node V are also in (allDependents + changedCellKeys)?
    const inDegree = new Map<string, number>();
    for (const node of allDependents) {
      let degree = 0;
      const precs = this.precedents.get(node);
      if (precs) {
        for (const p of precs) {
          if (allDependents.has(p)) {
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
    while (topoQueue.length > 0) {
      const u = topoQueue.shift()!;
      order.push(u);

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
        if (!order.includes(node)) {
          cycleCells.add(node);
        }
      }
    }

    return { order, hasCycle, cycleCells };
  }

  /**
   * Topologically sorts a full set of target keys (e.g. all formula cells in a sheet)
   * so that precedents are always evaluated before dependents.
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
          if (keySet.has(p)) {
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
    while (queue.length > 0) {
      const u = queue.shift()!;
      order.push(u);

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
      if (!order.includes(key)) {
        order.push(key);
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
  }
}
