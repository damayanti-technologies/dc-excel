import { describe, it, expect } from 'vitest';
import {
  hexToArgb,
  argbToHex,
  generateExcelWorkbook,
  parseExcelWorkbook,
} from '@/engine/io/excel-adapter';
import { Workbook } from '@/types/workbook';
import { Sheet } from '@/types/sheet';
import { coordToKey } from '@/utils/coordinates';

describe('Excel Adapter Engine (Stage 12)', () => {
  describe('Color Mapping', () => {
    it('translates 6-character hex to ARGB format and back', () => {
      const hex = '#2563EB';
      const argb = hexToArgb(hex);
      expect(argb).toBe('FF2563EB');

      const roundtripHex = argbToHex(argb);
      expect(roundtripHex?.toUpperCase()).toBe(hex.toUpperCase());
    });
  });

  describe('Workbook Generation & Parsing Roundtrip', () => {
    it('generates a multi-sheet XLSX file and successfully parses it back', async () => {
      const workbookId = 'wb_test_stage12';
      const sheet1Id = 'sheet_test_1';
      const sheet2Id = 'sheet_test_2';

      const sheet1: Sheet = {
        id: sheet1Id,
        workbookId,
        name: 'Financials',
        index: 0,
        rowCount: 50,
        columnCount: 20,
        cells: {
          [coordToKey(0, 0)]: {
            value: 'Revenue',
            dataType: 'string',
            style: {
              bold: true,
              fontSize: 14,
              fontFamily: 'Inter',
              textColor: '#1E293B',
              backgroundColor: '#E2E8F0',
              horizontalAlignment: 'left',
              verticalAlignment: 'middle',
              borders: {
                bottom: { style: 'medium', color: '#64748B' },
              },
            },
          },
          [coordToKey(1, 0)]: {
            value: 100000,
            dataType: 'number',
            style: { numberFormat: '$#,##0' },
          },
          [coordToKey(2, 0)]: {
            value: 50000,
            dataType: 'number',
            style: { numberFormat: '$#,##0' },
          },
          [coordToKey(3, 0)]: {
            value: 150000,
            formula: '=SUM(A2:A3)',
            dataType: 'formula',
            style: { bold: true },
          },
        },
        columnWidths: { 0: 160 },
        rowHeights: { 0: 36 },
        mergedRanges: [
          { startRow: 0, startCol: 1, endRow: 0, endCol: 3 },
        ],
        metadata: {
          freezePanes: { frozenRows: 1, frozenCols: 1 },
        },
      };

      const sheet2: Sheet = {
        id: sheet2Id,
        workbookId,
        name: 'Telugu Data',
        index: 1,
        rowCount: 30,
        columnCount: 10,
        cells: {
          [coordToKey(0, 0)]: { value: 'నగరం', dataType: 'string', style: { bold: true } },
          [coordToKey(0, 1)]: { value: 'జనాభా', dataType: 'string', style: { bold: true } },
          [coordToKey(1, 0)]: { value: 'హైదరాబాద్', dataType: 'string' },
          [coordToKey(1, 1)]: { value: 10000000, dataType: 'number' },
        },
      };

      const workbook: Workbook = {
        id: workbookId,
        name: 'Annual Model',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastOpenedAt: Date.now(),
        isStarred: false,
        sheetIds: [sheet1Id, sheet2Id],
        activeSheetId: sheet1Id,
        folderId: null,
        metadata: {
          namedRanges: [
            {
              id: 'nr_rev',
              name: 'TotalRevenue',
              sheetId: sheet1Id,
              scope: 'workbook',
              range: { startRow: 3, startCol: 0, endRow: 3, endCol: 0 },
            },
          ],
        },
      };

      // 1. Generate Excel binary ArrayBuffer
      const { buffer, warnings } = await generateExcelWorkbook(workbook, [sheet1, sheet2]);
      expect(buffer).toBeDefined();
      expect(buffer.byteLength).toBeGreaterThan(1000);
      expect(warnings).toBeDefined();

      // 2. Parse back the generated binary buffer
      const { summary, sheets: parsedSheets } = await parseExcelWorkbook(buffer, 'Annual Model.xlsx');

      expect(summary.sheetNames).toEqual(['Financials', 'Telugu Data']);
      expect(parsedSheets).toHaveLength(2);

      const parsedSheet1 = parsedSheets.find((s) => s.name === 'Financials')!;
      expect(parsedSheet1).toBeDefined();

      // Check cell values & formulas
      expect(parsedSheet1.cells[coordToKey(0, 0)]?.value).toBe('Revenue');
      expect(parsedSheet1.cells[coordToKey(0, 0)]?.style?.bold).toBe(true);
      expect(parsedSheet1.cells[coordToKey(1, 0)]?.value).toBe(100000);
      expect(parsedSheet1.cells[coordToKey(3, 0)]?.formula).toBe('=SUM(A2:A3)');

      // Check freeze panes
      expect(parsedSheet1.metadata?.freezePanes?.frozenRows).toBe(1);
      expect(parsedSheet1.metadata?.freezePanes?.frozenCols).toBe(1);

      // Check merged ranges
      expect(parsedSheet1.mergedRanges).toBeDefined();
      expect(parsedSheet1.mergedRanges!.length).toBeGreaterThanOrEqual(1);

      // Check Unicode sheet
      const parsedSheet2 = parsedSheets.find((s) => s.name === 'Telugu Data')!;
      expect(parsedSheet2).toBeDefined();
      expect(parsedSheet2.cells[coordToKey(1, 0)]?.value).toBe('హైదరాబాద్');
      expect(parsedSheet2.cells[coordToKey(1, 1)]?.value).toBe(10000000);

      // Check feature compatibility report
      expect(summary.compatibility.cellValues).toBe('full');
      expect(summary.compatibility.formulas).toBe('full');
      expect(summary.compatibility.formatting).toBe('full');
      expect(summary.compatibility.freezePanes).toBe('full');
    }, 60000);

    it('emits compatibility warnings when sheets contain charts', async () => {
      const sheetWithChart: Sheet = {
        id: 's_chart',
        workbookId: 'wb_c',
        name: 'Visuals',
        index: 0,
        rowCount: 20,
        columnCount: 10,
        cells: {},
        metadata: {
          charts: [
            {
              id: 'c1',
              title: { text: 'Revenue Chart', show: true },
              chartType: 'column-clustered',
            } as any,
          ],
        },
      };

      const workbook: Workbook = {
        id: 'wb_c',
        name: 'Chart Test',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastOpenedAt: Date.now(),
        isStarred: false,
        sheetIds: ['s_chart'],
        activeSheetId: 's_chart',
        folderId: null,
      };

      const { warnings } = await generateExcelWorkbook(workbook, [sheetWithChart]);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toContain('chart');
    });
  });
});
