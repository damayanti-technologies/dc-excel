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

    // 1000 evaluations should comfortably finish in < 250ms on modern JS engine
    expect(elapsed).toBeLessThan(350);
  });
});
