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

      case 'ArrayLiteral':
        for (const row of n.elements) {
          for (const item of row) {
            walk(item);
          }
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

  // cellKey -> list of range records it registered (for O(1) removal without scanning all ranges)
  private cellToRangeRecords = new Map<string, RangeDependentRecord[]>();

  // Column number -> array of RangeDependentRecord intersecting that column (for fast targeted column lookups)
  private colRangeDependents = new Map<number, RangeDependentRecord[]>();

  // Wide ranges spanning > 32 columns (e.g. full rows 1:1, or entire sheet ranges)
  private wideRangeDependents: RangeDependentRecord[] = [];

  private unregisterCellRangeRecords(cellKey: string): void {
    const records = this.cellToRangeRecords.get(cellKey);
    if (!records) return;

    for (const rd of records) {
      if (rd.endCol - rd.startCol > 32) {
        const idx = this.wideRangeDependents.indexOf(rd);
        if (idx !== -1) {
          this.wideRangeDependents.splice(idx, 1);
        }
      } else {
        for (let c = rd.startCol; c <= rd.endCol; c++) {
          const list = this.colRangeDependents.get(c);
          if (list) {
            const idx = list.indexOf(rd);
            if (idx !== -1) {
              list.splice(idx, 1);
            }
          }
        }
      }
    }
    this.cellToRangeRecords.delete(cellKey);
  }

  private registerCellRangeRecord(cellKey: string, rd: RangeDependentRecord): void {
    let list = this.cellToRangeRecords.get(cellKey);
    if (!list) {
      list = [];
      this.cellToRangeRecords.set(cellKey, list);
    }
    list.push(rd);

    if (rd.endCol - rd.startCol > 32) {
      this.wideRangeDependents.push(rd);
    } else {
      for (let c = rd.startCol; c <= rd.endCol; c++) {
        let colList = this.colRangeDependents.get(c);
        if (!colList) {
          colList = [];
          this.colRangeDependents.set(c, colList);
        }
        colList.push(rd);
      }
    }
  }

  private findRangeDependentsForCoord(row: number, col: number, onFound: (depKey: string) => void): void {
    const colList = this.colRangeDependents.get(col);
    if (colList) {
      for (let i = 0; i < colList.length; i++) {
        const rd = colList[i]!;
        if (row >= rd.startRow && row <= rd.endRow && col >= rd.startCol && col <= rd.endCol) {
          onFound(rd.dependentKey);
        }
      }
    }
    for (let i = 0; i < this.wideRangeDependents.length; i++) {
      const rd = this.wideRangeDependents[i]!;
      if (row >= rd.startRow && row <= rd.endRow && col >= rd.startCol && col <= rd.endCol) {
        onFound(rd.dependentKey);
      }
    }
  }

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
      this.unregisterCellRangeRecords(cellKey);
    }

    // 2. Set new precedents
    const precSet = new Set(newPrecedents);
    this.precedents.set(cellKey, precSet);

    // 3. Update reverse dependents
    for (const prec of precSet) {
      if (prec.startsWith('RANGE:')) {
        const parts = prec.split(':');
        if (parts.length === 5) {
          this.registerCellRangeRecord(cellKey, {
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
      this.unregisterCellRangeRecords(cellKey);
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
    const resultSet = new Set(result);

    const coord = parseKey(cellKey);
    if (coord) {
      this.findRangeDependentsForCoord(coord.row, coord.col, (depKey) => {
        if (!resultSet.has(depKey)) {
          resultSet.add(depKey);
          result.push(depKey);
        }
      });
    }

    return result;
  }

  /**
   * Detects whether a cell is part of a circular dependency cycle.
   * Uses stack-safe iterative depth-first search with immediate self-cycle shortcut.
   */
  public hasCircularDependency(startKey: string): boolean {
    const precs = this.precedents.get(startKey);
    if (!precs || precs.size === 0) return false;
    if (precs.has(startKey)) return true;

    // Fast check: does startKey lie within any of its own RANGE precedents?
    const startCoord = parseKey(startKey);
    if (startCoord) {
      for (const p of precs) {
        if (p.startsWith('RANGE:')) {
          const parts = p.split(':');
          if (parts.length === 5) {
            const r1 = Number.parseInt(parts[1]!, 10);
            const c1 = Number.parseInt(parts[2]!, 10);
            const r2 = Number.parseInt(parts[3]!, 10);
            const c2 = Number.parseInt(parts[4]!, 10);
            if (startCoord.row >= r1 && startCoord.row <= r2 && startCoord.col >= c1 && startCoord.col <= c2) {
              return true;
            }
          }
        }
      }
    }

    const visited = new Set<string>();
    const onStack = new Set<string>();

    const stack: string[] = [startKey];
    const indexStack: number[] = [0];
    const neighborsStack: string[][] = [
      Array.from(precs).filter((p) => !p.startsWith('RANGE:'))
    ];

    visited.add(startKey);
    onStack.add(startKey);

    while (stack.length > 0) {
      const topIdx = stack.length - 1;
      const node = stack[topIdx]!;
      const neighbors = neighborsStack[topIdx]!;
      const i = indexStack[topIdx]!;

      if (i < neighbors.length) {
        const next = neighbors[i]!;
        indexStack[topIdx] = i + 1;

        if (onStack.has(next)) {
          return true; // Cycle detected
        }

        if (!visited.has(next)) {
          visited.add(next);
          onStack.add(next);
          const nextPrecs = this.precedents.get(next);
          const nextNeighbors = nextPrecs
            ? Array.from(nextPrecs).filter((p) => !p.startsWith('RANGE:'))
            : [];
          stack.push(next);
          indexStack.push(0);
          neighborsStack.push(nextNeighbors);
        }
      } else {
        onStack.delete(node);
        stack.pop();
        indexStack.pop();
        neighborsStack.pop();
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
    // 1. Collect all downstream reachable dependents via BFS with O(1) queue head pointer
    const allDependents = new Set<string>();
    const queue = [...changedCellKeys];
    let head = 0;

    while (head < queue.length) {
      const current = queue[head++]!;
      const direct = this.dependents.get(current);
      if (direct) {
        for (const dep of direct) {
          if (!allDependents.has(dep)) {
            allDependents.add(dep);
            queue.push(dep);
          }
        }
      }

      // Check indexed range dependents
      const coord = parseKey(current);
      if (coord) {
        this.findRangeDependentsForCoord(coord.row, coord.col, (depKey) => {
          if (!allDependents.has(depKey)) {
            allDependents.add(depKey);
            queue.push(depKey);
          }
        });
      }
    }

    if (allDependents.size === 0) {
      return { order: [], hasCycle: false, cycleCells: new Set() };
    }

    // 2. Perform Kahn's algorithm topological sort on the subgraph of allDependents
    const inDegree = new Map<string, number>();
    for (const node of allDependents) {
      inDegree.set(node, 0);
    }

    for (const node of allDependents) {
      const precs = this.precedents.get(node);
      if (precs) {
        const coord = parseKey(node);
        for (const p of precs) {
          if (p.startsWith('RANGE:')) {
            if (coord) {
              const parts = p.split(':');
              if (parts.length === 5) {
                const r1 = Number.parseInt(parts[1]!, 10);
                const c1 = Number.parseInt(parts[2]!, 10);
                const r2 = Number.parseInt(parts[3]!, 10);
                const c2 = Number.parseInt(parts[4]!, 10);
                if (coord.row >= r1 && coord.row <= r2 && coord.col >= c1 && coord.col <= c2) {
                  inDegree.set(node, inDegree.get(node)! + 1_000_000);
                }
              }
            }
          } else if (allDependents.has(p)) {
            inDegree.set(node, inDegree.get(node)! + 1);
          }
        }
      }

      // Check if node is inside the range of any dependent in allDependents
      const coord = parseKey(node);
      if (coord) {
        this.findRangeDependentsForCoord(coord.row, coord.col, (depKey) => {
          if (allDependents.has(depKey) && depKey !== node) {
            inDegree.set(depKey, inDegree.get(depKey)! + 1);
          }
        });
      }
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
    let topoHead = 0;

    while (topoHead < topoQueue.length) {
      const u = topoQueue[topoHead++]!;
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

      // Decrement range dependents for u
      const uCoord = parseKey(u);
      if (uCoord) {
        this.findRangeDependentsForCoord(uCoord.row, uCoord.col, (v) => {
          if (allDependents.has(v) && v !== u) {
            const currentDeg = inDegree.get(v)! - 1;
            inDegree.set(v, currentDeg);
            if (currentDeg === 0) {
              topoQueue.push(v);
            }
          }
        });
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
   * Performs a single-pass global topological sort and cycle detection over a set of target formula keys.
   * Runs in O(V + E) time using Kahn's algorithm.
   *
   * @param targetKeys All formula cell keys in the sheet
   * @returns order: topologically sorted array of acyclic formula keys
   *          cycleCells: set of all keys participating in circular dependencies or depending on them
   */
  public getTopologicalOrderAndCycles(targetKeys: string[]): {
    order: string[];
    cycleCells: Set<string>;
  } {
    const keySet = new Set(targetKeys);
    const inDegree = new Map<string, number>();
    for (const key of targetKeys) {
      inDegree.set(key, 0);
    }

    // Count in-degrees within keySet (direct + range)
    for (const key of targetKeys) {
      const precs = this.precedents.get(key);
      if (precs) {
        const coord = parseKey(key);
        for (const p of precs) {
          if (p.startsWith('RANGE:')) {
            if (coord) {
              const parts = p.split(':');
              if (parts.length === 5) {
                const r1 = Number.parseInt(parts[1]!, 10);
                const c1 = Number.parseInt(parts[2]!, 10);
                const r2 = Number.parseInt(parts[3]!, 10);
                const c2 = Number.parseInt(parts[4]!, 10);
                if (coord.row >= r1 && coord.row <= r2 && coord.col >= c1 && coord.col <= c2) {
                  // Direct self-cycle via range
                  inDegree.set(key, inDegree.get(key)! + 1_000_000);
                }
              }
            }
          } else if (keySet.has(p)) {
            inDegree.set(key, inDegree.get(key)! + 1);
          }
        }
      }

      // If this key is inside the range of any other formula cell in keySet,
      // that formula cell depends on this key.
      const coord = parseKey(key);
      if (coord) {
        this.findRangeDependentsForCoord(coord.row, coord.col, (depKey) => {
          if (keySet.has(depKey) && depKey !== key) {
            inDegree.set(depKey, inDegree.get(depKey)! + 1);
          }
        });
      }
    }

    const queue: string[] = [];
    for (const [key, deg] of inDegree.entries()) {
      if (deg === 0) {
        queue.push(key);
      }
    }

    const order: string[] = [];
    const orderSet = new Set<string>();
    let head = 0;

    while (head < queue.length) {
      const u = queue[head++]!;
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

      // Decrement range dependents for u
      const uCoord = parseKey(u);
      if (uCoord) {
        this.findRangeDependentsForCoord(uCoord.row, uCoord.col, (v) => {
          if (keySet.has(v) && v !== u) {
            const nextDeg = inDegree.get(v)! - 1;
            inDegree.set(v, nextDeg);
            if (nextDeg === 0) {
              queue.push(v);
            }
          }
        });
      }
    }

    // Nodes in keySet that never reached inDegree === 0 are in a cycle or depend on a cycle
    const cycleCells = new Set<string>();
    if (order.length < keySet.size) {
      for (const key of targetKeys) {
        if (!orderSet.has(key)) {
          cycleCells.add(key);
        }
      }
    }

    return { order, cycleCells };
  }

  /**
   * Topologically sorts a full set of target keys (e.g. all formula cells in a sheet)
   * so that precedents are always evaluated before dependents.
   * Runs in O(V + E) time using Kahn's algorithm.
   */
  public getFullTopologicalOrder(targetKeys: string[]): string[] {
    const { order, cycleCells } = this.getTopologicalOrderAndCycles(targetKeys);
    if (cycleCells.size === 0) {
      return order;
    }
    // Append any cycle cells at the end so all target keys are present
    const result = [...order];
    for (const key of targetKeys) {
      if (cycleCells.has(key)) {
        result.push(key);
      }
    }
    return result;
  }

  /**
   * Resets the entire dependency graph.
   */
  public clear(): void {
    this.precedents.clear();
    this.dependents.clear();
    this.cellToRangeRecords.clear();
    this.colRangeDependents.clear();
    this.wideRangeDependents = [];
  }
}
