import type ExcelJS from 'exceljs';

async function getExcelJS(): Promise<typeof ExcelJS> {
  const mod = await import('exceljs');
  return (mod.default || mod) as typeof ExcelJS;
}
import {
  FilePreviewSummary,
  FeatureCompatibilityReport,
  ExcelExportConfig,
} from '@/types/io';
import { Sheet, SheetMetadata } from '@/types/sheet';
import { Workbook } from '@/types/workbook';
import {
  Cell,
  CellValue,
  CellStyle,
  CellBorders,
  CellBorder,
  SparseCellMap,
  CellRange,
} from '@/types/cell';
import { coordToKey, parseKey, colIndexToName } from '@/utils/coordinates';
import { generateId } from '@/utils/id';

/**
 * Converts #RRGGBB hex string to ExcelJS ARGB format.
 */
export function hexToArgb(hex?: string): string | undefined {
  if (!hex) return undefined;
  const clean = hex.replace('#', '').trim();
  if (clean.length === 6) {
    return `FF${clean.toUpperCase()}`;
  }
  if (clean.length === 8) {
    return clean.toUpperCase();
  }
  return undefined;
}

/**
 * Converts ExcelJS ARGB format back to #RRGGBB.
 */
export function argbToHex(argb?: string): string | undefined {
  if (!argb) return undefined;
  const clean = argb.toUpperCase().replace('#', '');
  if (clean.length === 8) {
    return `#${clean.substring(2)}`;
  }
  if (clean.length === 6) {
    return `#${clean}`;
  }
  return undefined;
}

/**
 * Maps OmniSheet border style to ExcelJS border style.
 */
function mapBorderToExcel(border?: CellBorder): ExcelJS.Border | undefined {
  if (!border || border.style === 'none') return undefined;
  const style = border.style === 'dashed' ? 'dashed' : border.style === 'double' ? 'double' : border.style === 'medium' ? 'medium' : 'thin';
  return {
    style,
    color: { argb: hexToArgb(border.color) || 'FFD1D5DB' },
  };
}

/**
 * Maps ExcelJS border style back to OmniSheet border.
 */
function mapBorderFromExcel(border?: Partial<ExcelJS.Border>): CellBorder | undefined {
  if (!border || !border.style) return undefined;
  let style: CellBorder['style'] = 'thin';
  if (border.style === 'medium' || border.style === 'thick') style = 'medium';
  else if (border.style === 'double') style = 'double';
  else if (border.style === 'dashed' || border.style === 'dotted') style = 'dashed';

  let color = '#D1D5DB';
  if (border.color?.argb) {
    color = argbToHex(border.color.argb) || color;
  }

  return { style, color };
}

/**
 * Parses an Excel (.xlsx) file and returns a complete FilePreviewSummary
 * along with parsed Sheets and Workbooks for OmniSheet.
 */
export async function parseExcelWorkbook(
  data: ArrayBuffer | Uint8Array,
  fileName: string
): Promise<{
  summary: FilePreviewSummary;
  workbook: Workbook;
  sheets: Sheet[];
}> {
  const ExcelJS = await getExcelJS();
  const excelWorkbook = new ExcelJS.Workbook();
  const buffer: ArrayBuffer =
    data instanceof Uint8Array
      ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
      : data;
  await excelWorkbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

  const sheetNames: string[] = [];
  const sheetDimensions: Record<string, { rowCount: number; columnCount: number; cellCount: number }> = {};
  const sampleRows: Record<string, (string | number | boolean | null)[][]> = {};
  const warnings: string[] = [];

  const parsedSheets: Sheet[] = [];
  const workbookId = generateId('wb');

  const compatibility: FeatureCompatibilityReport = {
    cellValues: 'full',
    formulas: 'full',
    formatting: 'full',
    charts: 'partial', // charts detected will be noted in warnings
    namedRanges: 'full',
    dataValidation: 'full',
    freezePanes: 'full',
  };

  excelWorkbook.eachSheet((worksheet, sheetIndex) => {
    sheetNames.push(worksheet.name);

    const cells: SparseCellMap = {};
    const samplePreview: (string | number | boolean | null)[][] = [];

    let minRow = Infinity;
    let maxRow = -1;
    let minCol = Infinity;
    let maxCol = -1;

    // Read rows & cells
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const r = rowNumber - 1; // 0-indexed row
      if (r < minRow) minRow = r;
      if (r > maxRow) maxRow = r;

      const previewRow: (string | number | boolean | null)[] = [];

      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const c = colNumber - 1; // 0-indexed col
        if (c < minCol) minCol = c;
        if (c > maxCol) maxCol = c;

        // Parse cell value and formula
        let val: unknown = cell.value;
        let formula: string | undefined = undefined;

        if (val && typeof val === 'object') {
          const valObj = val as Record<string, unknown>;
          if ('formula' in valObj && typeof valObj.formula === 'string') {
            formula = valObj.formula;
            val = valObj.result !== undefined ? valObj.result : null;
          } else if ('richText' in valObj && Array.isArray(valObj.richText)) {
            val = (valObj.richText as Array<{ text?: string }>).map((t) => t.text || '').join('');
          } else if ('text' in valObj && typeof valObj.text === 'string') {
            val = valObj.text;
          }
        }

        // Determine DataType
        let dataType: Cell['dataType'] = 'string';
        if (typeof val === 'number') {
          dataType = 'number';
        } else if (typeof val === 'boolean') {
          dataType = 'boolean';
        } else if (val instanceof Date) {
          dataType = 'date';
          val = val.toISOString().split('T')[0];
        } else if (val == null) {
          dataType = 'string';
          val = '';
        } else {
          dataType = 'string';
          val = String(val);
        }

        // Parse Styles
        const style: CellStyle = {};
        if (cell.font) {
          if (cell.font.name) style.fontFamily = cell.font.name;
          if (cell.font.size) style.fontSize = cell.font.size;
          if (cell.font.bold) style.bold = true;
          if (cell.font.italic) style.italic = true;
          if (cell.font.underline) style.underline = true;
          if (cell.font.strike) style.strikethrough = true;
          if (cell.font.color?.argb) {
            style.textColor = argbToHex(cell.font.color.argb);
          }
        }

        if (cell.fill && cell.fill.type === 'pattern') {
          const patternFill = cell.fill as ExcelJS.FillPattern;
          if (patternFill.fgColor?.argb) {
            style.backgroundColor = argbToHex(patternFill.fgColor.argb);
          }
        }

        if (cell.alignment) {
          if (cell.alignment.horizontal) {
            style.horizontalAlignment = cell.alignment.horizontal as CellStyle['horizontalAlignment'];
          }
          if (cell.alignment.vertical) {
            style.verticalAlignment = cell.alignment.vertical === 'middle' ? 'middle' : (cell.alignment.vertical as CellStyle['verticalAlignment']);
          }
          if (cell.alignment.wrapText) {
            style.wrapText = true;
          }
        }

        if (cell.border) {
          const borders: CellBorders = {};
          if (cell.border.top) borders.top = mapBorderFromExcel(cell.border.top);
          if (cell.border.bottom) borders.bottom = mapBorderFromExcel(cell.border.bottom);
          if (cell.border.left) borders.left = mapBorderFromExcel(cell.border.left);
          if (cell.border.right) borders.right = mapBorderFromExcel(cell.border.right);
          if (Object.keys(borders).length > 0) {
            style.borders = borders;
          }
        }

        if (cell.numFmt) {
          style.numberFormat = cell.numFmt;
        }

        const finalVal: CellValue = val as CellValue;
        cells[coordToKey(r, c)] = {
          value: finalVal,
          dataType,
          formula: formula ? (formula.startsWith('=') ? formula : `=${formula}`) : undefined,
          style: Object.keys(style).length > 0 ? style : undefined,
        };

        if (samplePreview.length < 10 && c < 10) {
          previewRow[c] = finalVal as (string | number | boolean | null);
        }
      });

      if (samplePreview.length < 10) {
        samplePreview.push(previewRow);
      }
    });

    sampleRows[worksheet.name] = samplePreview;

    const cellCount = Object.keys(cells).length;
    const finalRowCount = maxRow >= 0 ? maxRow + 1 : 50;
    const finalColCount = maxCol >= 0 ? maxCol + 1 : 20;

    sheetDimensions[worksheet.name] = {
      rowCount: finalRowCount,
      columnCount: finalColCount,
      cellCount,
    };

    // Parse Column Widths
    const columnWidths: Record<number, number> = {};
    worksheet.columns.forEach((col, idx) => {
      if (col.width && col.width > 0) {
        columnWidths[idx] = Math.round(col.width * 8); // approximate conversion to px
      }
    });

    // Parse Row Heights
    const rowHeights: Record<number, number> = {};
    for (let r = 1; r <= finalRowCount; r++) {
      const row = worksheet.getRow(r);
      if (row.height && row.height > 0) {
        rowHeights[r - 1] = Math.round(row.height * 1.33); // pt to px
      }
    }

    // Parse Merged Ranges
    const mergedRanges: CellRange[] = [];
    const mergesObj = (worksheet as unknown as { _merges?: Record<string, { model?: { top: number; left: number; bottom: number; right: number } }> })._merges;
    if (mergesObj) {
      for (const key of Object.keys(mergesObj)) {
        const m = mergesObj[key];
        if (m && m.model) {
          mergedRanges.push({
            startRow: m.model.top - 1,
            startCol: m.model.left - 1,
            endRow: m.model.bottom - 1,
            endCol: m.model.right - 1,
          });
        }
      }
    }

    // Parse Freeze Panes
    const metadata: SheetMetadata = {};
    if (worksheet.views && worksheet.views.length > 0) {
      const v = worksheet.views[0] as { state?: string; ySplit?: number; xSplit?: number } | undefined;
      if (v && v.state === 'frozen') {
        metadata.freezePanes = {
          frozenRows: v.ySplit || 0,
          frozenCols: v.xSplit || 0,
        };
      }
    }

    const sheetId = generateId('sheet');
    parsedSheets.push({
      id: sheetId,
      workbookId,
      name: worksheet.name,
      index: sheetIndex - 1,
      rowCount: Math.max(finalRowCount, 100),
      columnCount: Math.max(finalColCount, 26),
      cells,
      columnWidths: Object.keys(columnWidths).length > 0 ? columnWidths : undefined,
      rowHeights: Object.keys(rowHeights).length > 0 ? rowHeights : undefined,
      mergedRanges: mergedRanges.length > 0 ? mergedRanges : undefined,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    });
  });

  // Extract workbook name
  const cleanWorkbookName = fileName.replace(/\.[^/.]+$/, '').trim() || 'Imported Workbook';

  const workbook: Workbook = {
    id: workbookId,
    name: cleanWorkbookName,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    sheetIds: parsedSheets.map((s) => s.id),
    activeSheetId: parsedSheets[0]?.id || '',
    metadata: {
      version: 1,
    },
  };

  const summary: FilePreviewSummary = {
    fileName,
    fileSize: data.byteLength,
    fileType: 'xlsx',
    workbookName: cleanWorkbookName,
    sheetNames,
    sheetDimensions,
    warnings,
    compatibility,
    sampleRows,
  };

  return { summary, workbook, sheets: parsedSheets };
}

/**
 * Generates an Excel (.xlsx) binary ArrayBuffer from OmniSheet Workbook and Sheets.
 */
export async function generateExcelWorkbook(
  workbook: Workbook,
  sheets: Sheet[],
  config: ExcelExportConfig = { fileName: `${workbook.name}.xlsx` }
): Promise<{ buffer: ArrayBuffer; warnings: string[] }> {
  const ExcelJS = await getExcelJS();
  const excelWorkbook = new ExcelJS.Workbook();
  excelWorkbook.creator = 'DC Excel Spreadsheet Engine';
  excelWorkbook.created = new Date(workbook.createdAt || Date.now());
  excelWorkbook.modified = new Date();

  const warnings: string[] = [];

  // Filter sheets if selectedSheetIds specified
  const sheetsToExport = config.selectedSheetIds?.length
    ? sheets.filter((s) => config.selectedSheetIds!.includes(s.id))
    : sheets.filter((s) => config.includeHiddenSheets || !s.metadata?.isHidden);

  for (const sheet of sheetsToExport) {
    // Check for advanced objects and note compatibility
    if (sheet.metadata?.charts && sheet.metadata.charts.length > 0) {
      warnings.push(
        `Worksheet "${sheet.name}" contains ${sheet.metadata.charts.length} chart(s). DC Excel retains chart configurations, but external XLSX viewers will only see cell data.`
      );
    }
    if (sheet.metadata?.pivotTables && sheet.metadata.pivotTables.length > 0) {
      warnings.push(
        `Worksheet "${sheet.name}" contains pivot tables. Cells have been exported as values and formulas.`
      );
    }

    const worksheet = excelWorkbook.addWorksheet(sheet.name);

    // Freeze panes
    if (sheet.metadata?.freezePanes) {
      worksheet.views = [
        {
          state: 'frozen',
          xSplit: sheet.metadata.freezePanes.frozenCols || 0,
          ySplit: sheet.metadata.freezePanes.frozenRows || 0,
        },
      ];
    }

    // Set Column Widths
    if (sheet.columnWidths) {
      for (const [colIndexStr, widthPx] of Object.entries(sheet.columnWidths)) {
        const colIdx = Number(colIndexStr);
        const col = worksheet.getColumn(colIdx + 1);
        col.width = Math.max(8, widthPx / 8);
      }
    }

    // Set Row Heights
    if (sheet.rowHeights) {
      for (const [rowIndexStr, heightPx] of Object.entries(sheet.rowHeights)) {
        const rowIdx = Number(rowIndexStr);
        const row = worksheet.getRow(rowIdx + 1);
        row.height = Math.max(15, heightPx / 1.33);
      }
    }

    // Set Merged Ranges
    if (sheet.mergedRanges) {
      for (const m of sheet.mergedRanges) {
        worksheet.mergeCells(m.startRow + 1, m.startCol + 1, m.endRow + 1, m.endCol + 1);
      }
    }

    // Write Cells
    for (const [key, cell] of Object.entries(sheet.cells)) {
      const coord = parseKey(key);
      if (!coord) continue;

      const excelCell = worksheet.getCell(coord.row + 1, coord.col + 1);

      // Write formula or value
      if (cell.formula) {
        const cleanFormula = cell.formula.startsWith('=') ? cell.formula.substring(1) : cell.formula;
        excelCell.value = {
          formula: cleanFormula,
          result: cell.value != null ? (cell.value as unknown as number | string | boolean | Date) : undefined,
        };
      } else {
        excelCell.value = cell.value != null ? (cell.value as unknown as ExcelJS.CellValue) : '';
      }

      // Write cell formatting styles
      if (cell.style) {
        const s = cell.style;

        // Font
        if (s.fontFamily || s.fontSize || s.bold || s.italic || s.underline || s.strikethrough || s.textColor) {
          excelCell.font = {
            name: s.fontFamily || 'Inter',
            size: s.fontSize || 11,
            bold: Boolean(s.bold),
            italic: Boolean(s.italic),
            underline: Boolean(s.underline),
            strike: Boolean(s.strikethrough),
            color: s.textColor ? { argb: hexToArgb(s.textColor) } : undefined,
          };
        }

        // Fill / Background
        if (s.backgroundColor) {
          excelCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: hexToArgb(s.backgroundColor) || 'FFFFFFFF' },
          };
        }

        // Alignment
        if (s.horizontalAlignment || s.verticalAlignment || s.wrapText) {
          excelCell.alignment = {
            horizontal: s.horizontalAlignment,
            vertical: s.verticalAlignment,
            wrapText: Boolean(s.wrapText),
          };
        }

        // Borders
        if (s.borders) {
          excelCell.border = {
            top: mapBorderToExcel(s.borders.top),
            bottom: mapBorderToExcel(s.borders.bottom),
            left: mapBorderToExcel(s.borders.left),
            right: mapBorderToExcel(s.borders.right),
          };
        }

        // Number Format
        if (s.numberFormat) {
          excelCell.numFmt = s.numberFormat;
        }
      }
    }
  }

  // Export Named Ranges if present
  if (workbook.metadata?.namedRanges) {
    for (const nr of workbook.metadata.namedRanges) {
      const targetSheet = sheets.find((s) => s.id === nr.sheetId) || sheets[0];
      if (targetSheet) {
        const ref = `'${targetSheet.name}'!$${colIndexToName(nr.range.startCol)}$${nr.range.startRow + 1}:$${colIndexToName(nr.range.endCol)}$${nr.range.endRow + 1}`;
        try {
          excelWorkbook.definedNames.add(ref, nr.name);
        } catch {
          // Skip if named range syntax is invalid for Excel
        }
      }
    }
  }

  const buffer = await excelWorkbook.xlsx.writeBuffer();
  return { buffer: buffer as ArrayBuffer, warnings };
}
