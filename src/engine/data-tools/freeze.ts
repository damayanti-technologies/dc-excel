import { FreezePaneConfig } from '@/types/data-tools';

export function freezeTopRow(): FreezePaneConfig {
  return {
    frozenRows: 1,
    frozenCols: 0
  };
}

export function freezeFirstColumn(): FreezePaneConfig {
  return {
    frozenRows: 0,
    frozenCols: 1
  };
}

export function freezePanesAtCell(row: number, col: number): FreezePaneConfig {
  return {
    frozenRows: Math.max(0, row),
    frozenCols: Math.max(0, col)
  };
}

export function unfreezePanes(): FreezePaneConfig {
  return {
    frozenRows: 0,
    frozenCols: 0
  };
}
