import { describe, it, expect } from 'vitest';
import { Sheet } from '@/types/sheet';
import { CellRange } from '@/types/cell';
import {
  mergeRange,
  unmergeRange,
  canMergeRange,
  checkNonAnchorPopulated,
  getMergedRangeForCell,
  isMergeAnchor,
  isCellCoveredByMerge
} from '@/engine/formatting/merge-cells';

describe('Merged Cells Operations & Integrity', () => {
  const createMockSheet = (): Sheet => ({
    id: 'sheet-1',
    workbookId: 'wb-1',
    name: 'Sheet1',
    index: 0,
    rowCount: 100,
    columnCount: 26,
    cells: {
      '0:0': { value: 'Title Header', dataType: 'string' },
      '0:1': { value: 'Secondary Data', dataType: 'string' },
      '1:1': { value: 500, dataType: 'number' }
    },
    mergedRanges: []
  });

  it('detects populated non-anchor cells in range', () => {
    const sheet = createMockSheet();
    const range: CellRange = { startRow: 0, startCol: 0, endRow: 1, endCol: 1 };

    const { hasPopulated, populatedCoords } = checkNonAnchorPopulated(sheet.cells, range);
    expect(hasPopulated).toBe(true);
    expect(populatedCoords).toEqual([
      { row: 0, col: 1 },
      { row: 1, col: 1 }
    ]);
  });

  it('merges rectangular ranges in all mode and adds to sheet.mergedRanges', () => {
    const sheet = createMockSheet();
    const range: CellRange = { startRow: 0, startCol: 0, endRow: 0, endCol: 3 };

    const { updatedSheet, mergedRangesAdded } = mergeRange(sheet, range, 'all');

    expect(updatedSheet.mergedRanges?.length).toBe(1);
    expect(mergedRangesAdded.length).toBe(1);
    expect(updatedSheet.mergedRanges?.[0]).toEqual({
      startRow: 0,
      startCol: 0,
      endRow: 0,
      endCol: 3
    });
    // Anchor content preserved
    expect(updatedSheet.cells['0:0']?.value).toBe('Title Header');
  });

  it('merges in center mode and sets horizontalAlignment to center on anchor cell', () => {
    const sheet = createMockSheet();
    const range: CellRange = { startRow: 2, startCol: 0, endRow: 2, endCol: 2 };

    const { updatedSheet } = mergeRange(sheet, range, 'center');
    expect(updatedSheet.cells['2:0']?.style?.horizontalAlignment).toBe('center');
  });

  it('prevents invalid overlapping merges', () => {
    const existingMerges: CellRange[] = [
      { startRow: 0, startCol: 0, endRow: 1, endCol: 1 }
    ];

    // Attempting to merge range that partially intersects (e.g. 1:0 to 2:1)
    const intersectingRange: CellRange = { startRow: 1, startCol: 0, endRow: 2, endCol: 1 };
    const { canMerge, reason } = canMergeRange(existingMerges, intersectingRange);

    expect(canMerge).toBe(false);
    expect(reason).toContain('Cannot merge range that partially intersects');

    // Attempting to merge identical range
    const identicalRange: CellRange = { startRow: 0, startCol: 0, endRow: 1, endCol: 1 };
    const { canMerge: canMergeIdentical } = canMergeRange(existingMerges, identicalRange);
    expect(canMergeIdentical).toBe(false);

    // Disjoint range is permitted
    const disjointRange: CellRange = { startRow: 5, startCol: 0, endRow: 6, endCol: 2 };
    const { canMerge: canMergeDisjoint } = canMergeRange(existingMerges, disjointRange);
    expect(canMergeDisjoint).toBe(true);
  });

  it('identifies merge anchors and covered cells correctly', () => {
    const mergedRanges: CellRange[] = [
      { startRow: 0, startCol: 0, endRow: 1, endCol: 2 }
    ];

    const m = getMergedRangeForCell(mergedRanges, 0, 1);
    expect(m).not.toBeNull();
    expect(m?.startRow).toBe(0);
    expect(m?.endCol).toBe(2);

    expect(isMergeAnchor(mergedRanges[0]!, 0, 0)).toBe(true);
    expect(isMergeAnchor(mergedRanges[0]!, 0, 1)).toBe(false);

    expect(isCellCoveredByMerge(mergedRanges, 0, 0)).toBe(false); // Anchor is not covered
    expect(isCellCoveredByMerge(mergedRanges, 0, 1)).toBe(true);  // Non-anchor cell is covered
    expect(isCellCoveredByMerge(mergedRanges, 1, 2)).toBe(true);  // Non-anchor cell is covered
    expect(isCellCoveredByMerge(mergedRanges, 2, 0)).toBe(false); // Outside merge
  });

  it('unmerges intersecting merged ranges', () => {
    const sheet: Sheet = {
      ...createMockSheet(),
      mergedRanges: [
        { startRow: 0, startCol: 0, endRow: 1, endCol: 1 },
        { startRow: 5, startCol: 0, endRow: 5, endCol: 3 }
      ]
    };

    const target: CellRange = { startRow: 0, startCol: 0, endRow: 0, endCol: 0 };
    const { updatedSheet, unmergedCount } = unmergeRange(sheet, target);

    expect(unmergedCount).toBe(1);
    expect(updatedSheet.mergedRanges?.length).toBe(1);
    expect(updatedSheet.mergedRanges?.[0]?.startRow).toBe(5);
  });
});
