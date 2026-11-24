import { describe, it, expect, beforeEach } from 'vitest';
import { useSheetStore } from '@/stores/sheet-store';
import { Sheet } from '@/types/sheet';
import { ChartConfig } from '@/types/chart';
import { SheetRepository } from '@/storage/repositories/sheet-repository';
import { deleteDatabase } from '@/storage/indexeddb/database';

describe('Chart Store & Persistence', () => {
  let mockSheet: Sheet;
  let sampleChart: ChartConfig;

  beforeEach(async () => {
    await deleteDatabase();
    useSheetStore.getState().clearSheet();

    sampleChart = {
      id: 'chart-123',
      sheetId: 'sheet-1',
      chartType: 'column-clustered',
      title: { show: true, text: 'Quarterly Sales' },
      source: {
        sheetId: 'sheet-1',
        range: { startRow: 0, startCol: 0, endRow: 4, endCol: 2 },
        rangeStr: 'A1:C5',
        orientation: 'columns',
        firstRowAsHeaders: true,
        firstColAsLabels: true,
      },
      series: [],
      axes: { showXAxis: true, showYAxis: true },
      legend: { show: true, position: 'top' },
      style: { paletteId: 'professional' },
      position: {
        anchorCell: { row: 2, col: 2 },
        offsetX: 10,
        offsetY: 10,
        width: 450,
        height: 300,
        zIndex: 10,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    mockSheet = {
      id: 'sheet-1',
      workbookId: 'wb-1',
      name: 'Sales Data',
      index: 0,
      rowCount: 100,
      columnCount: 26,
      cells: {},
      metadata: {},
    };

    useSheetStore.getState().setActiveSheet(mockSheet);
  });

  it('adds chart to active sheet metadata', () => {
    useSheetStore.getState().addChart(sampleChart);

    const sheet = useSheetStore.getState().activeSheet;
    expect(sheet?.metadata?.charts).toBeDefined();
    expect(sheet?.metadata?.charts?.length).toBe(1);
    expect(sheet?.metadata?.charts?.[0]?.id).toBe('chart-123');
  });

  it('updates chart properties and position', () => {
    useSheetStore.getState().addChart(sampleChart);

    useSheetStore.getState().updateChart('chart-123', {
      title: { show: true, text: 'Updated Sales Title' },
      position: {
        anchorCell: { row: 5, col: 5 },
        offsetX: 50,
        offsetY: 50,
        width: 600,
        height: 400,
        zIndex: 15,
      },
    });

    const sheet = useSheetStore.getState().activeSheet;
    const updated = sheet?.metadata?.charts?.[0];
    expect(updated?.title.text).toBe('Updated Sales Title');
    expect(updated?.position.width).toBe(600);
    expect(updated?.position.offsetX).toBe(50);
  });

  it('deletes chart by ID', () => {
    useSheetStore.getState().addChart(sampleChart);
    expect(useSheetStore.getState().activeSheet?.metadata?.charts?.length).toBe(1);

    useSheetStore.getState().deleteChart('chart-123');
    expect(useSheetStore.getState().activeSheet?.metadata?.charts?.length).toBe(0);
  });

  it('duplicates chart with offset and unique ID', () => {
    useSheetStore.getState().addChart(sampleChart);
    useSheetStore.getState().duplicateChart('chart-123');

    const sheet = useSheetStore.getState().activeSheet;
    expect(sheet?.metadata?.charts?.length).toBe(2);

    const copy = sheet?.metadata?.charts?.[1];
    expect(copy?.id).not.toBe('chart-123');
    expect(copy?.title.text).toContain('(Copy)');
    expect(copy?.position.offsetX).toBe(sampleChart.position.offsetX + 24);
    expect(copy?.position.zIndex).toBeGreaterThan(sampleChart.position.zIndex);
  });

  it('manages layer order (bring forward and send backward)', () => {
    useSheetStore.getState().addChart(sampleChart);
    useSheetStore.getState().duplicateChart('chart-123');

    // Chart 1 is at zIndex 10, Chart 2 is at zIndex 11
    useSheetStore.getState().bringChartForward('chart-123');
    const sheetAfterForward = useSheetStore.getState().activeSheet;
    const c1 = sheetAfterForward?.metadata?.charts?.find((c) => c.id === 'chart-123');
    expect(c1?.position.zIndex).toBeGreaterThan(11);

    useSheetStore.getState().sendChartBackward('chart-123');
    const sheetAfterBackward = useSheetStore.getState().activeSheet;
    const c1Back = sheetAfterBackward?.metadata?.charts?.find((c) => c.id === 'chart-123');
    expect(c1Back?.position.zIndex).toBeLessThanOrEqual(10);
  });

  it('persists and restores charts in IndexedDB', async () => {
    useSheetStore.getState().addChart(sampleChart);
    const sheetToSave = useSheetStore.getState().activeSheet!;

    const repo = new SheetRepository();
    await repo.save(sheetToSave);

    const loadedSheet = await repo.getById('sheet-1');
    expect(loadedSheet).not.toBeNull();
    expect(loadedSheet?.metadata?.charts?.length).toBe(1);

    const loadedChart = loadedSheet?.metadata?.charts?.[0];
    expect(loadedChart?.id).toBe('chart-123');
    expect(loadedChart?.title.text).toBe('Quarterly Sales');
    expect(loadedChart?.position.width).toBe(450);
  });
});
