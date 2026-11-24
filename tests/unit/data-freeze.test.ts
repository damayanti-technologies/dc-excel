import { describe, it, expect } from 'vitest';
import {
  freezeTopRow,
  freezeFirstColumn,
  freezePanesAtCell,
  unfreezePanes
} from '@/engine/data-tools/freeze';

describe('Data Tools: Freeze Panes Engine', () => {
  it('freezeTopRow pins row 1 and 0 columns', () => {
    const config = freezeTopRow();
    expect(config).toEqual({ frozenRows: 1, frozenCols: 0 });
  });

  it('freezeFirstColumn pins 0 rows and column 1', () => {
    const config = freezeFirstColumn();
    expect(config).toEqual({ frozenRows: 0, frozenCols: 1 });
  });

  it('freezePanesAtCell pins rows and columns above and to the left', () => {
    // Active cell at C4 (row 3, col 2) -> pins 3 rows (0, 1, 2) and 2 cols (0, 1)
    const config = freezePanesAtCell(3, 2);
    expect(config).toEqual({ frozenRows: 3, frozenCols: 2 });
  });

  it('unfreezePanes resets frozen rows and columns to 0', () => {
    const config = unfreezePanes();
    expect(config).toEqual({ frozenRows: 0, frozenCols: 0 });
  });
});
