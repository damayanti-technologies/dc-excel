import {
  FilePreviewSummary,
  FeatureCompatibilityReport,
  ImportExecutionOptions,
  ImportResult,
  ExcelExportConfig,
  CsvExportConfig,
  CsvImportConfig,
  SupportedImportFormat,
  DelimiterOption,
} from '@/types/io';
import { Workbook } from '@/types/workbook';
import { Sheet } from '@/types/sheet';
import { workbookRepository } from '@/storage/repositories/workbook-repository';
import { sheetRepository } from '@/storage/repositories/sheet-repository';
import { parseExcelWorkbook, generateExcelWorkbook } from '@/engine/io/excel-adapter';
import { parseCsvString, csvMatrixToSparseCells, serializeToCsv } from '@/engine/io/csv-parser';
import { CalculationEngine } from '@/engine/calculation/engine';
import { generateId } from '@/utils/id';
import { Logger } from '@/utils/logger';

export const MAX_EXCEL_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
export const MAX_CSV_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

/**
 * Strips file extension from a filename.
 */
function getBaseName(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot > 0 ? fileName.substring(0, lastDot) : fileName;
}

/**
 * Automatically detects the delimiter in a CSV/TSV text sample.
 */
export function detectDelimiter(sampleText: string): DelimiterOption {
  const lines = sampleText.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0).slice(0, 10);
  if (lines.length === 0) return ',';

  const counts: Record<string, number> = {
    ',': 0,
    '\t': 0,
    ';': 0,
    '|': 0,
  };

  for (const line of lines) {
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (!inQuotes && char) {
        if (char in counts) {
          counts[char] = (counts[char] || 0) + 1;
        }
      }
    }
  }

  let bestDelim: DelimiterOption = ',';
  let maxCount = -1;
  const delims: DelimiterOption[] = ['\t', ',', ';', '|'];
  for (const d of delims) {
    const c = counts[d] || 0;
    if (c > maxCount) {
      maxCount = c;
      bestDelim = d;
    }
  }

  return bestDelim;
}

/**
 * Reads a File or Blob as UTF-8 string, with universal browser and node/jsdom compatibility.
 */
export async function readFileAsText(file: File | Blob): Promise<string> {
  if ('text' in file && typeof file.text === 'function') {
    return await file.text();
  }
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string) || '');
    reader.onerror = () => reject(reader.error || new Error('Failed to read file as text'));
    reader.readAsText(file);
  });
}

/**
 * Reads a File or Blob as ArrayBuffer, with universal browser and node/jsdom compatibility.
 */
export async function readFileAsArrayBuffer(file: File | Blob): Promise<ArrayBuffer> {
  if ('arrayBuffer' in file && typeof file.arrayBuffer === 'function') {
    return await file.arrayBuffer();
  }
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as ArrayBuffer) || new ArrayBuffer(0));
    reader.onerror = () => reject(reader.error || new Error('Failed to read file as ArrayBuffer'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Triggers a browser download of a generated file Blob and frees memory.
 */
export function triggerBrowserDownload(blob: Blob, fileName: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = fileName;

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Revoke object URL after slight delay to ensure browser completes dispatch
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1500);
}

export class ImportExportService {
  private calculationEngine = new CalculationEngine();

  /**
   * Generates a preview summary of any supported file (.xlsx, .csv, .tsv).
   */
  public async previewFile(
    file: File,
    customCsvConfig?: Partial<CsvImportConfig>
  ): Promise<FilePreviewSummary> {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (ext === '.xlsx' || ext === '.xls') {
      if (file.size > MAX_EXCEL_FILE_SIZE) {
        throw new Error(
          `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum allowed Excel import size of 25 MB. Please reduce file size to prevent browser memory exhaustion.`
        );
      }
      const buffer = await readFileAsArrayBuffer(file);
      const { summary } = await parseExcelWorkbook(buffer, file.name);
      return summary;
    }

    if (file.size > MAX_CSV_FILE_SIZE) {
      throw new Error(
        `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum allowed CSV import size of 50 MB. Please reduce file size to prevent browser memory exhaustion.`
      );
    }

    // CSV / TSV file
    const text = await readFileAsText(file);
    const delimiter =
      customCsvConfig?.delimiter || (ext === '.tsv' ? '\t' : detectDelimiter(text));

    const matrix = parseCsvString(text, {
      ...customCsvConfig,
      delimiter,
    });

    const sampleRows = matrix.slice(0, 10);
    const rowCount = matrix.length;
    let maxCols = 0;
    for (const row of matrix) {
      if (row.length > maxCols) maxCols = row.length;
    }

    const sheetName = getBaseName(file.name) || 'Sheet1';
    let cellCount = 0;
    for (const row of matrix) {
      for (const val of row) {
        if (val !== null && val !== undefined && val !== '') cellCount++;
      }
    }

    const compatibility: FeatureCompatibilityReport = {
      cellValues: 'full',
      formulas: 'unsupported',
      formatting: 'unsupported',
      charts: 'unsupported',
      namedRanges: 'unsupported',
      dataValidation: 'unsupported',
      freezePanes: 'unsupported',
    };

    const format: SupportedImportFormat = ext === '.tsv' ? 'tsv' : 'csv';

    return {
      fileName: file.name,
      fileSize: file.size,
      fileType: format,
      workbookName: sheetName,
      sheetNames: [sheetName],
      sheetDimensions: {
        [sheetName]: {
          rowCount,
          columnCount: maxCols,
          cellCount,
        },
      },
      warnings: [],
      compatibility,
      sampleRows: {
        [sheetName]: sampleRows,
      },
    };
  }

  /**
   * Imports an Excel workbook or CSV/TSV file into OmniSheet with local IndexedDB persistence.
   */
  public async importWorkbook(
    file: File,
    options: Partial<ImportExecutionOptions> = {}
  ): Promise<ImportResult> {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const isExcel = ext === '.xlsx' || ext === '.xls';

    try {
      if (isExcel) {
        return await this.importExcel(file, options);
      } else {
        return await this.importCsv(file, options);
      }
    } catch (err: unknown) {
      Logger.error('ImportExportService', 'Import failed', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        workbookId: '',
        workbookName: options.workbookName || getBaseName(file.name),
        sheetCount: 0,
        totalCellCount: 0,
        warnings: [errMsg || 'Unknown import error occurred.'],
        sheets: [],
      };
    }
  }

  private async importExcel(
    file: File,
    options: Partial<ImportExecutionOptions>
  ): Promise<ImportResult> {
    const buffer = await readFileAsArrayBuffer(file);
    const { sheets: parsedSheets, summary } = await parseExcelWorkbook(buffer, file.name);

    if (parsedSheets.length === 0) {
      return {
        success: false,
        workbookId: '',
        workbookName: options.workbookName || getBaseName(file.name),
        sheetCount: 0,
        totalCellCount: 0,
        warnings: ['The uploaded Excel workbook contains no valid worksheets.'],
        sheets: [],
      };
    }

    // Filter sheets if specific sheet names were selected
    let selectedSheets = parsedSheets;
    if (options.selectedSheetNames && options.selectedSheetNames.length > 0) {
      const nameSet = new Set(options.selectedSheetNames);
      const filtered = parsedSheets.filter((s) => nameSet.has(s.name));
      if (filtered.length > 0) {
        selectedSheets = filtered;
      }
    }

    const workbookId = generateId('wb');
    const workbookName = options.workbookName?.trim() || getBaseName(file.name) || 'Imported Workbook';

    // Prepare sheets with new IDs and re-evaluate formulas
    const finalSheets: Sheet[] = [];
    let totalCellCount = 0;

    for (let i = 0; i < selectedSheets.length; i++) {
      const srcSheet = selectedSheets[i];
      if (!srcSheet) continue;

      const newSheetId = generateId('sheet');

      // Recalculate formula values if sheet contains formulas
      let sheetCells = srcSheet.cells;
      try {
        const getCrossSheetCells = (sheetName: string) =>
          selectedSheets.find((s) => s.name?.toLowerCase() === sheetName.toLowerCase())?.cells;
        const { updatedCells } = this.calculationEngine.recalculateSheet(
          {
            ...srcSheet,
            id: newSheetId,
            workbookId,
          },
          undefined,
          getCrossSheetCells
        );
        sheetCells = updatedCells;
      } catch {
        // Fallback to cells as extracted from file
      }

      totalCellCount += Object.keys(sheetCells).length;

      finalSheets.push({
        ...srcSheet,
        id: newSheetId,
        workbookId,
        name: srcSheet.name || `Sheet${i + 1}`,
        index: i,
        cells: sheetCells,
      });
    }

    const workbook: Workbook = {
      id: workbookId,
      name: workbookName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastOpenedAt: Date.now(),
      isStarred: false,
      sheetIds: finalSheets.map((s) => s.id),
      activeSheetId: finalSheets[0]?.id || '',
      folderId: null,
      metadata: {
        locale: 'en-US',
      },
    };

    // Save to IndexedDB
    await workbookRepository.save(workbook);
    await sheetRepository.saveMany(finalSheets);

    Logger.info('ImportExportService', `Imported Excel workbook "${workbookName}" (${workbookId}) with ${finalSheets.length} sheet(s)`);

    return {
      success: true,
      workbookId,
      workbookName,
      sheetCount: finalSheets.length,
      totalCellCount,
      warnings: summary.warnings,
      sheets: finalSheets,
    };
  }

  private async importCsv(
    file: File,
    options: Partial<ImportExecutionOptions>
  ): Promise<ImportResult> {
    const text = await readFileAsText(file);
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const delimiter =
      options.csvConfig?.delimiter || (ext === '.tsv' ? '\t' : detectDelimiter(text));

    const matrix = parseCsvString(text, {
      ...options.csvConfig,
      delimiter,
    });

    const { cells, rowCount, columnCount } = csvMatrixToSparseCells(matrix);

    const workbookId = generateId('wb');
    const sheetId = generateId('sheet');
    const workbookName = options.workbookName?.trim() || getBaseName(file.name) || 'Imported Data';
    const sheetName = getBaseName(file.name) || 'Sheet1';

    const sheet: Sheet = {
      id: sheetId,
      workbookId,
      name: sheetName,
      index: 0,
      rowCount,
      columnCount,
      cells,
    };

    const workbook: Workbook = {
      id: workbookId,
      name: workbookName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastOpenedAt: Date.now(),
      isStarred: false,
      sheetIds: [sheetId],
      activeSheetId: sheetId,
      folderId: null,
      metadata: {
        locale: 'en-US',
      },
    };

    // Save to IndexedDB
    await workbookRepository.save(workbook);
    await sheetRepository.save(sheet);

    const cellCount = Object.keys(cells).length;
    Logger.info('ImportExportService', `Imported CSV workbook "${workbookName}" (${workbookId})`);

    return {
      success: true,
      workbookId,
      workbookName,
      sheetCount: 1,
      totalCellCount: cellCount,
      warnings: [],
      sheets: [sheet],
    };
  }

  /**
   * Exports an entire workbook to a professional Microsoft Excel (.xlsx) file.
   */
  public async exportWorkbook(
    workbook: Workbook,
    sheets: Sheet[],
    config: Partial<ExcelExportConfig> & { autoDownload?: boolean } = {}
  ): Promise<{ blob: Blob; fileName: string; warnings: string[] }> {
    const exportConfig: ExcelExportConfig = {
      fileName: config.fileName || `${workbook.name}.xlsx`,
      selectedSheetIds: config.selectedSheetIds,
      includeHiddenSheets: config.includeHiddenSheets,
    };

    const { buffer, warnings } = await generateExcelWorkbook(workbook, sheets, exportConfig);

    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    let rawName = exportConfig.fileName.trim();
    if (!rawName.toLowerCase().endsWith('.xlsx')) {
      rawName += '.xlsx';
    }

    if (config.autoDownload !== false) {
      triggerBrowserDownload(blob, rawName);
    }

    Logger.info('ImportExportService', `Exported workbook "${rawName}" to Excel`);

    return {
      blob,
      fileName: rawName,
      warnings,
    };
  }

  /**
   * Exports a worksheet to CSV or TSV format with formula injection protection.
   */
  public exportSheetCsv(
    sheet: Sheet,
    config: Partial<CsvExportConfig> & { autoDownload?: boolean; encoding?: string } = {},
    customFileName?: string
  ): { blob: Blob; fileName: string; csvText: string } {
    const exportConfig: CsvExportConfig = {
      delimiter: config.delimiter || ',',
      quoteChar: config.quoteChar || '"',
      includeHeaders: config.includeHeaders !== false,
      exportFormulas: Boolean(config.exportFormulas),
      formulaInjectionProtection: config.formulaInjectionProtection !== false,
      selectedRange: config.selectedRange,
      lineEnding: config.lineEnding || '\r\n',
    };

    let csvText = serializeToCsv(sheet.cells, exportConfig);

    // If UTF-8 BOM is requested, prepend byte-order-mark so external programs (like Excel) handle Unicode cleanly
    if (config.encoding === 'utf-8-bom') {
      csvText = '\uFEFF' + csvText;
    }

    const isTsv = exportConfig.delimiter === '\t';
    const ext = isTsv ? 'tsv' : 'csv';
    const mime = isTsv
      ? 'text/tab-separated-values;charset=utf-8;'
      : 'text/csv;charset=utf-8;';

    const blob = new Blob([csvText], { type: mime });

    let rawName = (customFileName?.trim() || sheet.name || 'sheet').replace(
      new RegExp(`\\.${ext}$`, 'i'),
      ''
    );
    rawName += `.${ext}`;

    if (config.autoDownload !== false) {
      triggerBrowserDownload(blob, rawName);
    }

    Logger.info('ImportExportService', `Exported sheet "${sheet.name}" to ${ext.toUpperCase()}`);

    return {
      blob,
      fileName: rawName,
      csvText,
    };
  }
}

export const importExportService = new ImportExportService();
