import { describe, it, expect, beforeEach } from 'vitest';
import { workbookService } from '@/services';
import { sheetRepository } from '@/storage/repositories/sheet-repository';
import { clearAllStores } from '@/storage/indexeddb/database';
import { Sheet } from '@/types/sheet';

describe('Worksheet Management & Persistence (Stage 8)', () => {
  beforeEach(async () => {
    await clearAllStores();
  });

  describe('Worksheet Creation', () => {
    it('creates a new worksheet with an auto-generated conflict-free name and makes it active', async () => {
      const { workbook, initialSheet } = await workbookService.createWorkbook('Worksheet Test');
      expect(initialSheet.name).toBe('Sheet1');
      expect(workbook.activeSheetId).toBe(initialSheet.id);
      expect(workbook.sheetIds).toEqual([initialSheet.id]);

      // Add a second sheet
      const sheet2 = await workbookService.addSheet(workbook.id);
      expect(sheet2.id).toBeDefined();
      expect(sheet2.name).toBe('Sheet2');
      expect(sheet2.index).toBe(1);

      // Verify workbook state in database
      const reloadedWb = await workbookService.getWorkbook(workbook.id);
      expect(reloadedWb?.sheetIds).toEqual([initialSheet.id, sheet2.id]);
      expect(reloadedWb?.activeSheetId).toBe(sheet2.id);

      // Verify sheet in storage
      const reloadedSheet2 = await sheetRepository.getById(sheet2.id);
      expect(reloadedSheet2).not.toBeNull();
      expect(reloadedSheet2?.name).toBe('Sheet2');
    });

    it('creates a worksheet with a custom valid name and inserts after a specific sheet', async () => {
      const { workbook, initialSheet } = await workbookService.createWorkbook('Insert After Test');
      const sheet2 = await workbookService.addSheet(workbook.id, 'Data');
      const sheet3 = await workbookService.addSheet(workbook.id, 'Intermediate', initialSheet.id);

      const reloadedWb = await workbookService.getWorkbook(workbook.id);
      // Expected order: initialSheet, sheet3, sheet2
      expect(reloadedWb?.sheetIds).toEqual([initialSheet.id, sheet3.id, sheet2.id]);
    });
  });

  describe('Worksheet Renaming', () => {
    it('renames an existing worksheet and preserves all cells and styling', async () => {
      const { workbook, initialSheet } = await workbookService.createWorkbook('Rename Test');

      // Add styled cell to initialSheet
      const populatedSheet: Sheet = {
        ...initialSheet,
        cells: {
          '0:0': {
            value: 'Revenue',
            dataType: 'string',
            style: { bold: true, textColor: '#2563eb' }
          }
        }
      };
      await workbookService.saveSheet(populatedSheet);

      // Rename sheet
      const renamed = await workbookService.renameSheet(workbook.id, initialSheet.id, 'Q1_Financials');
      expect(renamed.name).toBe('Q1_Financials');

      // Verify cells and styling were untouched
      const reloaded = await sheetRepository.getById(initialSheet.id);
      expect(reloaded?.name).toBe('Q1_Financials');
      expect(reloaded?.cells['0:0']?.value).toBe('Revenue');
      expect(reloaded?.cells['0:0']?.style?.bold).toBe(true);
    });

    it('rejects empty and duplicate sheet names', async () => {
      const { workbook, initialSheet } = await workbookService.createWorkbook('Reject Test');
      await workbookService.addSheet(workbook.id, 'Summary');

      // Reject empty
      await expect(workbookService.renameSheet(workbook.id, initialSheet.id, '   ')).rejects.toThrow(
        /empty/i
      );

      // Reject duplicate name
      await expect(workbookService.renameSheet(workbook.id, initialSheet.id, 'summary')).rejects.toThrow(
        /already exists/i
      );
    });
  });

  describe('Worksheet Duplication', () => {
    it('duplicates a worksheet with a deep copy of cells, formulas, formatting, borders, and merged ranges', async () => {
      const { workbook, initialSheet } = await workbookService.createWorkbook('Duplicate Test');

      const styledSheet: Sheet = {
        ...initialSheet,
        cells: {
          '0:0': {
            value: 'Total',
            dataType: 'string',
            style: {
              bold: true,
              borders: { bottom: { style: 'double', color: '#000000' } }
            }
          },
          '0:1': {
            value: 1250,
            dataType: 'number',
            formula: '=SUM(A1:A10)'
          }
        },
        rowHeights: { 0: 40 },
        columnWidths: { 0: 160 },
        mergedRanges: [{ startRow: 0, startCol: 0, endRow: 0, endCol: 2 }],
        metadata: { tabColor: '#10b981' }
      };
      await workbookService.saveSheet(styledSheet);

      // Duplicate
      const duplicate = await workbookService.duplicateSheet(workbook.id, initialSheet.id);
      expect(duplicate.id).not.toBe(initialSheet.id);
      expect(duplicate.name).toBe('Sheet1 (Copy)');
      expect(duplicate.cells['0:0']?.value).toBe('Total');
      expect(duplicate.cells['0:0']?.style?.bold).toBe(true);
      expect(duplicate.cells['0:0']?.style?.borders?.bottom?.style).toBe('double');
      expect(duplicate.cells['0:1']?.formula).toBe('=SUM(A1:A10)');
      expect(duplicate.rowHeights?.[0]).toBe(40);
      expect(duplicate.columnWidths?.[0]).toBe(160);
      expect(duplicate.mergedRanges).toHaveLength(1);
      expect(duplicate.metadata?.tabColor).toBe('#10b981');

      // Check workbook active sheet switched to duplicate
      const reloadedWb = await workbookService.getWorkbook(workbook.id);
      expect(reloadedWb?.activeSheetId).toBe(duplicate.id);
      expect(reloadedWb?.sheetIds).toEqual([initialSheet.id, duplicate.id]);
    });
  });

  describe('Worksheet Deletion', () => {
    it('prevents deletion of the only remaining worksheet', async () => {
      const { workbook, initialSheet } = await workbookService.createWorkbook('Delete Protection');
      await expect(workbookService.deleteSheet(workbook.id, initialSheet.id)).rejects.toThrow(
        /only sheet/i
      );
    });

    it('deletes a worksheet, removes its storage record, and selects a neighboring sheet', async () => {
      const { workbook, initialSheet } = await workbookService.createWorkbook('Delete Success');
      const sheet2 = await workbookService.addSheet(workbook.id, 'Expenses');
      const sheet3 = await workbookService.addSheet(workbook.id, 'Revenue');

      // Delete sheet2 (which is in the middle)
      const { remainingSheets, nextActiveSheetId } = await workbookService.deleteSheet(
        workbook.id,
        sheet2.id
      );

      expect(remainingSheets).toHaveLength(2);
      expect(remainingSheets.map((s) => s.id)).not.toContain(sheet2.id);

      // Check sheet2 is deleted from IndexedDB
      const deletedCheck = await sheetRepository.getById(sheet2.id);
      expect(deletedCheck).toBeNull();

      // Check workbook sheetIds
      const reloadedWb = await workbookService.getWorkbook(workbook.id);
      expect(reloadedWb?.sheetIds).toEqual([initialSheet.id, sheet3.id]);
      expect(reloadedWb?.activeSheetId).toBe(nextActiveSheetId);
    });
  });

  describe('Worksheet Reordering & Move', () => {
    it('reorders sheets and updates indices', async () => {
      const { workbook, initialSheet } = await workbookService.createWorkbook('Reorder Test');
      const sheet2 = await workbookService.addSheet(workbook.id, 'B');
      const sheet3 = await workbookService.addSheet(workbook.id, 'C');

      // Reorder to C, Sheet1, B
      const reordered = await workbookService.reorderSheets(workbook.id, [
        sheet3.id,
        initialSheet.id,
        sheet2.id
      ]);

      expect(reordered[0]?.id).toBe(sheet3.id);
      expect(reordered[0]?.index).toBe(0);
      expect(reordered[1]?.id).toBe(initialSheet.id);
      expect(reordered[1]?.index).toBe(1);
      expect(reordered[2]?.id).toBe(sheet2.id);
      expect(reordered[2]?.index).toBe(2);

      const reloadedWb = await workbookService.getWorkbook(workbook.id);
      expect(reloadedWb?.sheetIds).toEqual([sheet3.id, initialSheet.id, sheet2.id]);
    });

    it('moves a sheet left and right', async () => {
      const { workbook, initialSheet } = await workbookService.createWorkbook('Move Test');
      const sheet2 = await workbookService.addSheet(workbook.id, 'B');

      // Move sheet2 left -> should become first
      await workbookService.moveSheet(workbook.id, sheet2.id, 'left');
      let reloadedWb = await workbookService.getWorkbook(workbook.id);
      expect(reloadedWb?.sheetIds).toEqual([sheet2.id, initialSheet.id]);

      // Move sheet2 right -> should return to second
      await workbookService.moveSheet(workbook.id, sheet2.id, 'right');
      reloadedWb = await workbookService.getWorkbook(workbook.id);
      expect(reloadedWb?.sheetIds).toEqual([initialSheet.id, sheet2.id]);
    });
  });

  describe('Tab Colors', () => {
    it('sets and clears worksheet tab color and persists', async () => {
      const { initialSheet } = await workbookService.createWorkbook('Color Test');

      await workbookService.setSheetTabColor(initialSheet.id, '#ef4444');
      let reloaded = await sheetRepository.getById(initialSheet.id);
      expect(reloaded?.metadata?.tabColor).toBe('#ef4444');

      // Reset color
      await workbookService.setSheetTabColor(initialSheet.id, null);
      reloaded = await sheetRepository.getById(initialSheet.id);
      expect(reloaded?.metadata?.tabColor).toBeUndefined();
    });
  });

  describe('Hide and Unhide Worksheets', () => {
    it('prevents hiding the only visible worksheet', async () => {
      const { workbook, initialSheet } = await workbookService.createWorkbook('Hide Protection');
      await expect(workbookService.hideSheet(workbook.id, initialSheet.id)).rejects.toThrow(
        /only visible sheet/i
      );
    });

    it('hides a worksheet, switches active sheet, and unhides it cleanly', async () => {
      const { workbook, initialSheet } = await workbookService.createWorkbook('Hide Test');
      const sheet2 = await workbookService.addSheet(workbook.id, 'Auxiliary');

      // Currently sheet2 is active. Hide sheet2.
      const { updatedSheet, nextActiveSheetId } = await workbookService.hideSheet(
        workbook.id,
        sheet2.id
      );

      expect(updatedSheet.metadata?.isHidden).toBe(true);
      expect(nextActiveSheetId).toBe(initialSheet.id);

      const reloadedWb = await workbookService.getWorkbook(workbook.id);
      expect(reloadedWb?.activeSheetId).toBe(initialSheet.id);

      // Unhide sheet2
      const unhidden = await workbookService.unhideSheet(workbook.id, sheet2.id);
      expect(unhidden.metadata?.isHidden).toBe(false);

      const reloadedWbAfterUnhide = await workbookService.getWorkbook(workbook.id);
      expect(reloadedWbAfterUnhide?.activeSheetId).toBe(sheet2.id);
    });
  });
});
