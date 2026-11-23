import { describe, it, expect, beforeEach } from 'vitest';
import { workbookService } from '@/services';
import { sheetRepository } from '@/storage/repositories/sheet-repository';
import { clearAllStores } from '@/storage/indexeddb/database';
import { Sheet } from '@/types/sheet';

describe('Grid Persistence & Sheet Storage', () => {
  beforeEach(async () => {
    await clearAllStores();
  });

  it('persists cell values, custom row heights, column widths, and zoom', async () => {
    const { initialSheet } = await workbookService.createWorkbook('Persistence Test');

    const updatedSheet: Sheet = {
      ...initialSheet,
      rowCount: 500,
      columnCount: 50,
      cells: {
        '0:0': { value: 'Product', dataType: 'string' },
        '0:1': { value: 99.99, dataType: 'number' },
        '1:0': { value: 'InStock', dataType: 'string' },
        '1:1': { value: true, dataType: 'boolean' }
      },
      rowHeights: { 0: 45, 1: 35 },
      columnWidths: { 0: 160, 1: 120 },
      metadata: { zoom: 1.25 }
    };

    await workbookService.saveSheet(updatedSheet);

    // Fetch from storage
    const reloaded = await sheetRepository.getById(initialSheet.id);
    expect(reloaded).not.toBeNull();
    expect(reloaded?.rowCount).toBe(500);
    expect(reloaded?.columnCount).toBe(50);
    expect(reloaded?.cells['0:0']?.value).toBe('Product');
    expect(reloaded?.cells['0:1']?.value).toBe(99.99);
    expect(reloaded?.cells['1:1']?.value).toBe(true);
    expect(reloaded?.rowHeights?.[0]).toBe(45);
    expect(reloaded?.columnWidths?.[0]).toBe(160);
    expect(reloaded?.metadata?.zoom).toBe(1.25);
  });

  it('adds a new sheet to an existing workbook and updates sheetIds', async () => {
    const { workbook } = await workbookService.createWorkbook('Multi Sheet Model');
    expect(workbook.sheetIds.length).toBe(1);

    const sheet2 = await workbookService.addSheet(workbook.id, 'Expenses');
    expect(sheet2.id).toBeDefined();
    expect(sheet2.name).toBe('Expenses');
    expect(sheet2.index).toBe(1);

    const updatedWb = await workbookService.getWorkbook(workbook.id);
    expect(updatedWb?.sheetIds.length).toBe(2);
    expect(updatedWb?.sheetIds).toContain(sheet2.id);
    expect(updatedWb?.activeSheetId).toBe(sheet2.id);

    const allSheets = await workbookService.getSheetsForWorkbook(workbook.id);
    expect(allSheets.length).toBe(2);
    expect(allSheets[0]?.name).toBe('Sheet1');
    expect(allSheets[1]?.name).toBe('Expenses');
  });
});
