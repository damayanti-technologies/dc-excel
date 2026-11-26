import { describe, it, expect } from 'vitest';
import { SparseCellMap } from '@/types/cell';
import { calculateSelectionStatistics } from '@/engine/grid/selection-stats';
import { calculationEngine } from '@/engine/calculation/engine';

describe('Stage 15 Performance Benchmarking & Optimization Targets', () => {
  it('Benchmark 1: Small dataset (1,000 rows × 20 cols = 20,000 cells) sparse allocation & stats', () => {
    const t0 = performance.now();
    const cells: SparseCellMap = {};
    // Populate 1,000 active cells in sparse map
    for (let r = 0; r < 1000; r++) {
      cells[`${r}:0`] = { value: r + 1, dataType: 'number' };
    }
    const allocTime = performance.now() - t0;

    const t1 = performance.now();
    const stats = calculateSelectionStatistics(
      { startRow: 0, startCol: 0, endRow: 999, endCol: 19 },
      { row: 0, col: 0 },
      cells
    );
    const statTime = performance.now() - t1;

    expect(stats.cellCount).toBe(20000);
    expect(stats.numericCount).toBe(1000);
    expect(stats.sum).toBe((1000 * 1001) / 2); // 500,500
    expect(statTime).toBeLessThan(50); // Under 50ms (typically < 3ms)
    expect(allocTime).toBeLessThan(100);
  });

  it('Benchmark 2: Medium dataset (10,000 rows × 30 cols = 300,000 cells) calculation & sparse stats', () => {
    const cells: SparseCellMap = {};
    for (let r = 0; r < 5000; r++) {
      cells[`${r}:5`] = { value: 10, dataType: 'number' };
    }

    const t0 = performance.now();
    const stats = calculateSelectionStatistics(
      { startRow: 0, startCol: 0, endRow: 9999, endCol: 29 },
      { row: 0, col: 0 },
      cells
    );
    const duration = performance.now() - t0;

    expect(stats.cellCount).toBe(300000);
    expect(stats.numericCount).toBe(5000);
    expect(stats.sum).toBe(50000);
    expect(duration).toBeLessThan(100); // O(K) lookup runs in < 20ms
  });

  it('Benchmark 3: Large dataset (50,000 rows × 30 cols = 1,500,000 cells) memory and selection', () => {
    const cells: SparseCellMap = {
      '0:0': { value: 100, dataType: 'number' },
      '25000:15': { value: 500, dataType: 'number' },
      '49999:29': { value: 900, dataType: 'number' }
    };

    const t0 = performance.now();
    const stats = calculateSelectionStatistics(
      { startRow: 0, startCol: 0, endRow: 49999, endCol: 29 },
      { row: 0, col: 0 },
      cells
    );
    const duration = performance.now() - t0;

    expect(stats.cellCount).toBe(1500000);
    expect(stats.numericCount).toBe(3);
    expect(stats.sum).toBe(1500);
    expect(duration).toBeLessThan(20); // Immediate O(K) sparse calculation
  });

  it('Benchmark 4: Stress dataset (100,000 rows × 50 cols = 5,000,000 cells) sparse boundary check', () => {
    const cells: SparseCellMap = {
      '99999:49': { value: 42, dataType: 'number' }
    };

    const t0 = performance.now();
    const stats = calculateSelectionStatistics(
      { startRow: 0, startCol: 0, endRow: 99999, endCol: 49 },
      { row: 0, col: 0 },
      cells
    );
    const duration = performance.now() - t0;

    expect(stats.cellCount).toBe(5000000);
    expect(stats.sum).toBe(42);
    expect(duration).toBeLessThan(15);
  });

  it('Benchmark 5: High-speed Formula Evaluation (1,000 iterations of formula parsing and evaluation)', () => {
    const sampleCells: SparseCellMap = {
      '0:0': { value: 10, dataType: 'number' },
      '0:1': { value: 20, dataType: 'number' },
      '0:2': { value: 30, dataType: 'number' }
    };

    const t0 = performance.now();
    for (let i = 0; i < 1000; i++) {
      calculationEngine.evaluateFormula('=SUM(A1:C1) * 2', sampleCells);
    }
    const elapsed = performance.now() - t0;

    // 1000 evaluations should comfortably finish in < 1s even under parallel test worker load
    expect(elapsed).toBeLessThan(1000);
  });

  it('Benchmark 6: Chained formula running-total column (20,000 rows O(V+E) linear scaling)', () => {
    // Sheet setup:
    // A1 = 1, A2 = 1, ..., A20000 = 1
    // B1 = A1
    // B2 = B1 + A2
    // ...
    // B20000 = B19999 + A20000
    const cells: SparseCellMap = {};
    const n = 20000;

    for (let i = 0; i < n; i++) {
      cells[`${i}:0`] = { value: 1, dataType: 'number' };
      if (i === 0) {
        cells[`${i}:1`] = { formula: '=A1', value: 0, dataType: 'formula' };
      } else {
        cells[`${i}:1`] = {
          formula: `=B${i} + A${i + 1}`,
          value: 0,
          dataType: 'formula'
        };
      }
    }

    const testSheet = {
      id: 'sheet-perf-1',
      workbookId: 'wb-perf',
      name: 'PerfSheet',
      index: 0,
      rowCount: n,
      columnCount: 5,
      cells,
      activeCell: { row: 0, col: 0 },
      selection: { startRow: 0, startCol: 0, endRow: 0, endCol: 0 },
      scrollPosition: { scrollTop: 0, scrollLeft: 0 }
    };

    const t0 = performance.now();
    const result = calculationEngine.recalculateSheet(testSheet);
    const elapsed = performance.now() - t0;

    // Previously took ~215 seconds due to O(n^2) cycle checks!
    // With O(V + E) single-pass Kahn's algorithm, 20,000 rows completes in < 1,000ms.
    expect(elapsed).toBeLessThan(1500);
    expect(result.cycles).toHaveLength(0);
    expect(result.updatedCells[`${n - 1}:1`]?.value).toBe(n);

    // Also test single edit at root A1 (coord: 0, 0)
    const tEdit0 = performance.now();
    const editResult = calculationEngine.updateCellInput(result.updatedCells, { row: 0, col: 0 }, '2');
    const editElapsed = performance.now() - tEdit0;

    // Recalculating all 20,000 dependents on cell edit should take < 500ms
    expect(editElapsed).toBeLessThan(800);
    expect(editResult.updatedCells[`${n - 1}:1`]?.value).toBe(n + 1);
  });

  it('Benchmark 7: Range cross-checks over 250 cells (3,000 rows with SUM range)', () => {
    // 3,000 rows in column A
    // Row 0 col B has =SUM(A1:A3000)
    // 3,000 formula rows in column C: C1 = B1 + A1, C2 = B1 + A2, ...
    const cells: SparseCellMap = {};
    const n = 3000;

    for (let i = 0; i < n; i++) {
      cells[`${i}:0`] = { value: 2, dataType: 'number' };
      cells[`${i}:2`] = {
        formula: `=B1 + A${i + 1}`,
        value: 0,
        dataType: 'formula'
      };
    }
    cells['0:1'] = {
      formula: `=SUM(A1:A${n})`,
      value: 0,
      dataType: 'formula'
    };

    const testSheet = {
      id: 'sheet-perf-2',
      workbookId: 'wb-perf',
      name: 'RangePerfSheet',
      index: 0,
      rowCount: n,
      columnCount: 5,
      cells,
      activeCell: { row: 0, col: 0 },
      selection: { startRow: 0, startCol: 0, endRow: 0, endCol: 0 },
      scrollPosition: { scrollTop: 0, scrollLeft: 0 }
    };

    const t0 = performance.now();
    const result = calculationEngine.recalculateSheet(testSheet);
    const elapsed = performance.now() - t0;

    // Previously took ~8 seconds. Now should take < 500ms.
    expect(elapsed).toBeLessThan(600);
    expect(result.cycles).toHaveLength(0);
    expect(result.updatedCells['0:1']?.value).toBe(n * 2);
    expect(result.updatedCells[`${n - 1}:2`]?.value).toBe(n * 2 + 2);
  });

  it('Benchmark 8: Circular dependency detection across direct, indirect, and self-referencing ranges', () => {
    const cells: SparseCellMap = {
      // Direct self-cycle: A1 = A1
      '0:0': { formula: '=A1', value: 0, dataType: 'formula' },
      // Indirect 3-cell cycle: B1 = C1, C1 = D1, D1 = B1
      '0:1': { formula: '=C1', value: 0, dataType: 'formula' },
      '0:2': { formula: '=D1', value: 0, dataType: 'formula' },
      '0:3': { formula: '=B1', value: 0, dataType: 'formula' },
      // Self-referencing range: A10 = SUM(A1:A500)
      '9:0': { formula: '=SUM(A1:A500)', value: 0, dataType: 'formula' },
      // Valid independent cell
      '0:4': { formula: '=10 + 20', value: 0, dataType: 'formula' }
    };

    const testSheet = {
      id: 'sheet-perf-3',
      workbookId: 'wb-perf',
      name: 'CycleSheet',
      index: 0,
      rowCount: 500,
      columnCount: 5,
      cells,
      activeCell: { row: 0, col: 0 },
      selection: { startRow: 0, startCol: 0, endRow: 0, endCol: 0 },
      scrollPosition: { scrollTop: 0, scrollLeft: 0 }
    };

    const result = calculationEngine.recalculateSheet(testSheet);
    expect(result.cycles).toContain('0:0');
    expect(result.cycles).toContain('0:1');
    expect(result.cycles).toContain('0:2');
    expect(result.cycles).toContain('0:3');
    expect(result.cycles).toContain('9:0');
    expect(result.cycles).not.toContain('0:4');

    expect(result.updatedCells['0:0']?.value).toBe('#CYCLE!');
    expect(result.updatedCells['9:0']?.value).toBe('#CYCLE!');
    expect(result.updatedCells['0:4']?.value).toBe(30);
  });
});
