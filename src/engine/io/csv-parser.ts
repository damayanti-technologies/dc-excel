import { CsvImportConfig, CsvExportConfig } from '@/types/io';
import { SparseCellMap } from '@/types/cell';
import { coordToKey, parseKey } from '@/utils/coordinates';

/**
 * Standard RFC 4180 CSV & TSV Parser.
 * Properly processes quoted fields, escaped double quotes (""),
 * embedded newlines inside quotes, custom delimiters, and Unicode text.
 */
export function parseCsvString(
  text: string,
  config: Partial<CsvImportConfig> = {}
): (string | number | boolean | null)[][] {
  const delimiter = config.delimiter || ',';
  const quoteChar = config.quoteChar || '"';
  const autoType = config.autoTypeDetection !== false;
  const emptyAsNull = config.emptyCellHandling === 'null';

  const rows: (string | number | boolean | null)[][] = [];
  let currentRow: (string | number | boolean | null)[] = [];
  let currentField = '';
  let insideQuotes = false;

  const len = text.length;

  for (let i = 0; i < len; i++) {
    const char = text[i];
    const nextChar = i + 1 < len ? text[i + 1] : '';

    if (insideQuotes) {
      if (char === quoteChar) {
        if (nextChar === quoteChar) {
          // Escaped quote: "" -> "
          currentField += quoteChar;
          i++; // Skip the second quote
        } else {
          // Closing quote
          insideQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === quoteChar) {
        // Opening quote
        insideQuotes = true;
      } else if (char === delimiter) {
        // Field separator
        currentRow.push(processParsedField(currentField, autoType, emptyAsNull));
        currentField = '';
      } else if (char === '\r') {
        // Carriage return: handle \r\n
        if (nextChar === '\n') {
          i++;
        }
        currentRow.push(processParsedField(currentField, autoType, emptyAsNull));
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else if (char === '\n') {
        // Line feed newline
        currentRow.push(processParsedField(currentField, autoType, emptyAsNull));
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  // Push final trailing field and row if non-empty or if input ended on field
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(processParsedField(currentField, autoType, emptyAsNull));
    rows.push(currentRow);
  }

  // Remove trailing empty row if file ended with newline
  if (
    rows.length > 1 &&
    rows[rows.length - 1]?.length === 1 &&
    rows[rows.length - 1]?.[0] === (emptyAsNull ? null : '')
  ) {
    rows.pop();
  }

  return rows;
}

/**
 * Type-detection and value formatting for parsed CSV cells.
 */
function processParsedField(
  rawField: string,
  autoType: boolean,
  emptyAsNull: boolean
): string | number | boolean | null {
  if (rawField === '') {
    return emptyAsNull ? null : '';
  }

  if (!autoType) {
    return rawField;
  }

  const trimmed = rawField.trim();

  // Boolean parsing
  if (trimmed.toUpperCase() === 'TRUE') return true;
  if (trimmed.toUpperCase() === 'FALSE') return false;

  // Numeric parsing
  // Preserve leading zeros for codes (e.g. "01234" is text, but "0" or "0.5" is number)
  const isLeadingZero = /^0\d+/.test(trimmed);
  if (!isLeadingZero) {
    // Check if valid numeric format (integer, decimal, scientific notation)
    const num = Number(trimmed);
    if (!isNaN(num) && trimmed !== '') {
      return num;
    }
  }

  return rawField;
}

/**
 * Converts a 2D array of parsed values into a OmniSheet SparseCellMap.
 */
export function csvMatrixToSparseCells(matrix: (string | number | boolean | null)[][]): {
  cells: SparseCellMap;
  rowCount: number;
  columnCount: number;
} {
  const cells: SparseCellMap = {};
  const rowCount = matrix.length;
  let maxColCount = 0;

  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r];
    if (!row) continue;
    if (row.length > maxColCount) maxColCount = row.length;

    for (let c = 0; c < row.length; c++) {
      const val = row[c];
      if (val !== null && val !== undefined && val !== '') {
        const dataType =
          typeof val === 'number'
            ? 'number'
            : typeof val === 'boolean'
            ? 'boolean'
            : 'string';

        cells[coordToKey(r, c)] = {
          value: val,
          dataType,
        };
      }
    }
  }

  return {
    cells,
    rowCount: Math.max(rowCount, 100),
    columnCount: Math.max(maxColCount, 26),
  };
}

/**
 * Serializes spreadsheet cells or a 2D range to RFC 4180 CSV / TSV text.
 * Implements spreadsheet formula injection protection.
 */
export function serializeToCsv(
  cells: SparseCellMap,
  config: Partial<CsvExportConfig> = {}
): string {
  const delimiter = config.delimiter || ',';
  const quoteChar = config.quoteChar || '"';
  const lineEnding = config.lineEnding || '\r\n';
  const exportFormulas = Boolean(config.exportFormulas);
  const protectInjection = config.formulaInjectionProtection !== false;

  // Determine bounding box
  let minRow = 0;
  let maxRow = 0;
  let minCol = 0;
  let maxCol = 0;

  if (config.selectedRange) {
    minRow = Math.min(config.selectedRange.startRow, config.selectedRange.endRow);
    maxRow = Math.max(config.selectedRange.startRow, config.selectedRange.endRow);
    minCol = Math.min(config.selectedRange.startCol, config.selectedRange.endCol);
    maxCol = Math.max(config.selectedRange.startCol, config.selectedRange.endCol);
  } else {
    // Scan cells to find maximum populated bounds
    const keys = Object.keys(cells);
    if (keys.length > 0) {
      for (const k of keys) {
        const coord = parseKey(k);
        if (coord) {
          if (coord.row > maxRow) maxRow = coord.row;
          if (coord.col > maxCol) maxCol = coord.col;
        }
      }
    }
  }

  const lines: string[] = [];

  for (let r = minRow; r <= maxRow; r++) {
    const rowFields: string[] = [];

    for (let c = minCol; c <= maxCol; c++) {
      const cell = cells[coordToKey(r, c)];
      let fieldText = '';

      if (cell) {
        if (exportFormulas && cell.formula) {
          fieldText = cell.formula.startsWith('=') ? cell.formula : `=${cell.formula}`;
        } else if (cell.value != null) {
          fieldText = String(cell.value);
        }
      }

      // Formula injection protection for CSV
      if (protectInjection && !exportFormulas && typeof fieldText === 'string' && fieldText.length > 0) {
        const firstChar = fieldText[0];
        if (firstChar === '=' || firstChar === '+' || firstChar === '-' || firstChar === '@') {
          // If strictly a valid number (e.g. -42 or +5.5), do not alter it!
          const isPureNumber = !isNaN(Number(fieldText)) && !isNaN(parseFloat(fieldText));
          if (!isPureNumber) {
            // Neutralize dangerous spreadsheet executable prefix with leading single quote
            fieldText = `'${fieldText}`;
          }
        }
      }

      // RFC 4180 Quoting: If field contains delimiter, quote, or newline, escape quotes and wrap in quotes
      if (
        fieldText.includes(delimiter) ||
        fieldText.includes(quoteChar) ||
        fieldText.includes('\n') ||
        fieldText.includes('\r')
      ) {
        const escaped = fieldText.replaceAll(quoteChar, `${quoteChar}${quoteChar}`);
        rowFields.push(`${quoteChar}${escaped}${quoteChar}`);
      } else {
        rowFields.push(fieldText);
      }
    }

    lines.push(rowFields.join(delimiter));
  }

  return lines.join(lineEnding);
}
