import { describe, it, expect, beforeEach } from 'vitest';
import { workbookService } from '@/services';
import { sheetRepository } from '@/storage/repositories/sheet-repository';
import { clearAllStores } from '@/storage/indexeddb/database';
import { Sheet } from '@/types/sheet';

describe('Formatting & Merged Cells Persistence', () => {
  beforeEach(async () => {
    await clearAllStores();
  });

  it('persists cell styles, fonts, colors, and borders across save and reload', async () => {
    const { initialSheet } = await workbookService.createWorkbook('Formatting Persistence');

    const updatedSheet: Sheet = {
      ...initialSheet,
      cells: {
        '0:0': {
          value: 'Quarterly Report',
          dataType: 'string',
          style: {
            fontFamily: 'Inter',
            fontSize: 16,
            bold: true,
            textColor: '#1e3a8a',
            backgroundColor: '#dbeafe',
            horizontalAlignment: 'center',
            verticalAlignment: 'middle',
            borders: {
              bottom: { style: 'medium', color: '#1d4ed8' }
            }
          }
        },
        '1:0': {
          value: 1250000.75,
          dataType: 'number',
          style: {
            numberFormat: '$#,##0.00',
            bold: true,
            horizontalAlignment: 'right'
          }
        },
        '1:1': {
          value: 0.185,
          dataType: 'number',
          style: {
            numberFormat: '0.00%',
            italic: true
          }
        }
      }
    };

    await workbookService.saveSheet(updatedSheet);

    const reloaded = await sheetRepository.getById(initialSheet.id);
    expect(reloaded).not.toBeNull();
    const cell00 = reloaded?.cells['0:0'];
    expect(cell00?.value).toBe('Quarterly Report');
    expect(cell00?.style?.fontFamily).toBe('Inter');
    expect(cell00?.style?.fontSize).toBe(16);
    expect(cell00?.style?.bold).toBe(true);
    expect(cell00?.style?.textColor).toBe('#1e3a8a');
    expect(cell00?.style?.backgroundColor).toBe('#dbeafe');
    expect(cell00?.style?.horizontalAlignment).toBe('center');
    expect(cell00?.style?.verticalAlignment).toBe('middle');
    expect(cell00?.style?.borders?.bottom?.style).toBe('medium');

    const cell10 = reloaded?.cells['1:0'];
    expect(cell10?.value).toBe(1250000.75);
    expect(cell10?.style?.numberFormat).toBe('$#,##0.00');

    const cell11 = reloaded?.cells['1:1'];
    expect(cell11?.value).toBe(0.185);
    expect(cell11?.style?.numberFormat).toBe('0.00%');
  });

  it('persists merged cells ranges and restores them accurately', async () => {
    const { initialSheet } = await workbookService.createWorkbook('Merge Persistence');

    const updatedSheet: Sheet = {
      ...initialSheet,
      cells: {
        '0:0': {
          value: 'Consolidated Revenue',
          dataType: 'string',
          style: {
            bold: true,
            horizontalAlignment: 'center'
          }
        }
      },
      mergedRanges: [
        { startRow: 0, startCol: 0, endRow: 1, endCol: 3 },
        { startRow: 5, startCol: 1, endRow: 5, endCol: 4 }
      ]
    };

    await workbookService.saveSheet(updatedSheet);

    const reloaded = await sheetRepository.getById(initialSheet.id);
    expect(reloaded).not.toBeNull();
    expect(reloaded?.mergedRanges).toHaveLength(2);

    expect(reloaded?.mergedRanges?.[0]).toEqual({
      startRow: 0,
      startCol: 0,
      endRow: 1,
      endCol: 3
    });

    expect(reloaded?.mergedRanges?.[1]).toEqual({
      startRow: 5,
      startCol: 1,
      endRow: 5,
      endCol: 4
    });
  });
});
