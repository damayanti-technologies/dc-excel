import { describe, it, expect, beforeEach } from 'vitest';
import { importExportService } from '@/services/import-export-service';
import { workbookRepository } from '@/storage/repositories/workbook-repository';
import { sheetRepository } from '@/storage/repositories/sheet-repository';
import { clearAllStores, getDatabase } from '@/storage/indexeddb/database';
import { Sheet } from '@/types/sheet';
import { Workbook } from '@/types/workbook';
import { coordToKey } from '@/utils/coordinates';

describe('Import & Export Service (Stage 12)', () => {
  beforeEach(async () => {
    await getDatabase();
    await clearAllStores();
  });

  describe('File Preview', () => {
    it('generates a preview summary for a CSV File object', async () => {
      const csvContent = 'Region,Sales,Target\nNorth,54000,50000\nSouth,62000,60000';
      const file = new File([csvContent], 'sales_q3.csv', { type: 'text/csv' });

      const summary = await importExportService.previewFile(file);

      expect(summary.fileName).toBe('sales_q3.csv');
      expect(summary.fileType).toBe('csv');
      expect(summary.sheetNames).toEqual(['sales_q3']);
      expect(summary.sampleRows['sales_q3']).toBeDefined();
      expect(summary.sampleRows['sales_q3']!.length).toBe(3);
      expect(summary.sampleRows['sales_q3']![0]).toEqual(['Region', 'Sales', 'Target']);
    });
  });

  describe('Import Execution & Persistence', () => {
    it('imports a CSV file, persists workbook & sheet to IndexedDB, and returns ImportResult', async () => {
      const csvContent = 'Item,Quantity,UnitCost\nLaptop,10,1200\nMonitor,25,300';
      const file = new File([csvContent], 'inventory.csv', { type: 'text/csv' });

      const result = await importExportService.importWorkbook(file, {
        fileName: 'inventory.csv',
        workbookName: 'Office Inventory',
      });

      expect(result.success).toBe(true);
      expect(result.workbookName).toBe('Office Inventory');
      expect(result.sheetCount).toBe(1);
      expect(result.workbookId).toBeDefined();

      // Verify persistence in IndexedDB
      const loadedWb = await workbookRepository.getById(result.workbookId);
      expect(loadedWb).not.toBeNull();
      expect(loadedWb?.name).toBe('Office Inventory');

      const loadedSheets = await sheetRepository.getByWorkbookId(result.workbookId);
      expect(loadedSheets).toHaveLength(1);
      expect(loadedSheets[0]!.cells[coordToKey(0, 0)]?.value).toBe('Item');
      expect(loadedSheets[0]!.cells[coordToKey(1, 1)]?.value).toBe(10);
      expect(loadedSheets[0]!.cells[coordToKey(1, 2)]?.value).toBe(1200);
    });
  });

  describe('Export Execution', () => {
    it('exports a sheet to CSV text with formula injection protection and UTF-8 BOM', () => {
      const sheet: Sheet = {
        id: 's_exp_1',
        workbookId: 'wb_exp_1',
        name: 'Report',
        index: 0,
        rowCount: 10,
        columnCount: 5,
        cells: {
          [coordToKey(0, 0)]: { value: 'Customer', dataType: 'string' },
          [coordToKey(0, 1)]: { value: 'Balance', dataType: 'string' },
          [coordToKey(1, 0)]: { value: '=SUM(1,2)', dataType: 'string' },
          [coordToKey(1, 1)]: { value: 2500, dataType: 'number' },
        },
      };

      const result = importExportService.exportSheetCsv(
        sheet,
        {
          delimiter: ',',
          formulaInjectionProtection: true,
          encoding: 'utf-8-bom',
          autoDownload: false,
        },
        'CustomerReport'
      );

      expect(result.fileName).toBe('CustomerReport.csv');
      expect(result.csvText.startsWith('\uFEFF')).toBe(true);
      expect(result.csvText).toContain("'=SUM(1,2)"); // Protected injection prefix
      expect(result.csvText).toContain('2500');
    });

    it('exports workbook to Excel binary blob without auto-download', async () => {
      const workbook: Workbook = {
        id: 'wb_xl',
        name: 'Test Excel Export',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastOpenedAt: Date.now(),
        isStarred: false,
        sheetIds: ['s_xl'],
        activeSheetId: 's_xl',
        folderId: null,
      };

      const sheet: Sheet = {
        id: 's_xl',
        workbookId: 'wb_xl',
        name: 'Summary',
        index: 0,
        rowCount: 10,
        columnCount: 5,
        cells: {
          [coordToKey(0, 0)]: { value: 'Title', dataType: 'string' },
          [coordToKey(1, 0)]: { value: 'Value', dataType: 'string' },
        },
      };

      const result = await importExportService.exportWorkbook(
        workbook,
        [sheet],
        {
          fileName: 'TestExport.xlsx',
          autoDownload: false,
        }
      );

      expect(result.fileName).toBe('TestExport.xlsx');
      expect(result.blob).toBeDefined();
      expect(result.blob.size).toBeGreaterThan(1000);
      expect(result.blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });
  });
});
