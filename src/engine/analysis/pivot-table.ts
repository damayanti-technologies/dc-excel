import { Cell, CellValue } from '../../types/cell';
import {
  PivotTableConfig,
  PivotValueField,
  PivotAggregationFunction,
} from '../../types/analysis';
import { coordToKey } from '../../utils/coordinates';

export interface GeneratedPivotCell {
  value: CellValue;
  displayValue?: string;
  style?: {
    bold?: boolean;
    italic?: boolean;
    backgroundColor?: string;
    textColor?: string;
    textAlign?: 'left' | 'center' | 'right';
  };
}

export interface PivotTableResult {
  cells: Record<string, GeneratedPivotCell>;
  rowCount: number;
  colCount: number;
  fieldNames: string[];
}

/**
 * Extracts and aggregates value for a list of raw values
 */
export function aggregateValues(
  values: CellValue[],
  agg: PivotAggregationFunction
): number | string {
  const numericValues = values
    .map((v) => (typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN))
    .filter((n) => !isNaN(n));

  switch (agg) {
    case 'sum':
      return numericValues.reduce((acc, curr) => acc + curr, 0);

    case 'count':
      return values.filter((v) => v !== null && v !== undefined && v !== '').length;

    case 'count_numbers':
      return numericValues.length;

    case 'average':
      if (numericValues.length === 0) return 0;
      return numericValues.reduce((acc, curr) => acc + curr, 0) / numericValues.length;

    case 'min':
      if (numericValues.length === 0) return 0;
      return Math.min(...numericValues);

    case 'max':
      if (numericValues.length === 0) return 0;
      return Math.max(...numericValues);

    default:
      return 0;
  }
}

/**
 * Executes pivot table aggregation and generates the output cells
 */
export function generatePivotTable(
  config: PivotTableConfig,
  getCell: (r: number, c: number) => Cell | undefined
): PivotTableResult {
  const {
    sourceRange,
    hasHeaders,
    rowFields,
    columnFields,
    valueFields,
    filterFields,
    destinationCoord,
    showGrandTotalsRow,
    showGrandTotalsCol,
  } = config;

  const minRow = Math.min(sourceRange.startRow, sourceRange.endRow);
  const maxRow = Math.max(sourceRange.startRow, sourceRange.endRow);
  const minCol = Math.min(sourceRange.startCol, sourceRange.endCol);
  const maxCol = Math.max(sourceRange.startCol, sourceRange.endCol);

  // 1. Identify field names
  const fieldNames: string[] = [];
  const startDataRow = hasHeaders ? minRow + 1 : minRow;

  for (let c = minCol; c <= maxCol; c++) {
    if (hasHeaders) {
      const headerCell = getCell(minRow, c);
      fieldNames.push(
        headerCell?.value !== null && headerCell?.value !== undefined
          ? String(headerCell.value)
          : `Col ${c + 1}`
      );
    } else {
      fieldNames.push(`Col ${c + 1}`);
    }
  }

  // 2. Read raw data records
  interface RawRecord {
    [colIndex: number]: CellValue;
  }
  const records: RawRecord[] = [];

  for (let r = startDataRow; r <= maxRow; r++) {
    const record: RawRecord = {};
    let hasAnyData = false;
    for (let c = minCol; c <= maxCol; c++) {
      const cell = getCell(r, c);
      const val = cell?.value ?? null;
      if (val !== null && val !== '') hasAnyData = true;
      record[c] = val;
    }
    if (hasAnyData) {
      records.push(record);
    }
  }

  // 3. Apply filters
  const filteredRecords = records.filter((rec) => {
    for (const filter of filterFields) {
      if (filter.selectedValues && filter.selectedValues.length > 0) {
        const valStr = String(rec[filter.col] ?? '');
        if (!filter.selectedValues.includes(valStr)) {
          return false;
        }
      }
    }
    return true;
  });

  // Fallback defaults if none selected
  const activeValueFields: PivotValueField[] =
    valueFields.length > 0
      ? valueFields
      : [
          {
            fieldIndex: minCol,
            fieldName: fieldNames[0] || 'Count',
            agg: 'count',
            displayName: `Count of ${fieldNames[0] || 'Field'}`,
          },
        ];

  // 4. Extract unique row groupings
  const rowGroupsMap = new Map<string, RawRecord[]>();
  const rowKeysSet = new Set<string>();

  for (const rec of filteredRecords) {
    const key = JSON.stringify(rowFields.map((colIdx) => rec[colIdx] ?? ''));
    if (!rowGroupsMap.has(key)) {
      rowGroupsMap.set(key, []);
      rowKeysSet.add(key);
    }
    rowGroupsMap.get(key)!.push(rec);
  }

  const rowGroupKeys = Array.from(rowKeysSet);
  if (rowGroupKeys.length === 0 && rowFields.length === 0) {
    rowGroupKeys.push(JSON.stringify(['Total']));
    rowGroupsMap.set(JSON.stringify(['Total']), filteredRecords);
  }

  // 5. Extract unique column groupings
  const colKeysSet = new Set<string>();
  for (const rec of filteredRecords) {
    if (columnFields.length > 0) {
      const key = JSON.stringify(columnFields.map((colIdx) => rec[colIdx] ?? ''));
      colKeysSet.add(key);
    }
  }
  const colGroupKeys = Array.from(colKeysSet);
  if (colGroupKeys.length === 0) {
    colGroupKeys.push(JSON.stringify([]));
  }

  // 6. Build Grid Layout
  const resultCells: Record<string, GeneratedPivotCell> = {};
  const destStartRow = destinationCoord.row;
  const destStartCol = destinationCoord.col;

  // Header styles
  const headerStyle = {
    bold: true,
    backgroundColor: '#f1f5f9',
    textColor: '#1e293b',
    textAlign: 'center' as const,
  };
  const labelStyle = {
    bold: true,
    backgroundColor: '#f8fafc',
    textColor: '#334155',
    textAlign: 'left' as const,
  };
  const totalStyle = {
    bold: true,
    backgroundColor: '#e2e8f0',
    textColor: '#0f172a',
    textAlign: 'right' as const,
  };
  const valueStyle = {
    textAlign: 'right' as const,
  };

  // Row header offset: number of row field columns
  const rowHeaderCols = Math.max(1, rowFields.length);

  // Render Row Headers titles
  for (let rf = 0; rf < rowFields.length; rf++) {
    const fieldIdx = rowFields[rf]!;
    const colName =
      fieldIdx >= minCol && fieldIdx <= maxCol
        ? fieldNames[fieldIdx - minCol] || `Field ${fieldIdx + 1}`
        : `Field ${fieldIdx + 1}`;
    const cellKey = coordToKey(destStartRow, destStartCol + rf);
    resultCells[cellKey] = {
      value: colName,
      displayValue: colName,
      style: headerStyle,
    };
  }

  // If no row fields, label it "Pivot"
  if (rowFields.length === 0) {
    const cellKey = coordToKey(destStartRow, destStartCol);
    resultCells[cellKey] = {
      value: 'Total',
      displayValue: 'Total',
      style: headerStyle,
    };
  }

  // Render Column Headers
  let currentDestCol = destStartCol + rowHeaderCols;
  const colIndexMap = new Map<string, number>();

  for (const colKeyStr of colGroupKeys) {
    const colValues: CellValue[] = JSON.parse(colKeyStr);
    const colHeaderLabel = colValues.length > 0 ? colValues.join(' - ') : '';

    for (const vField of activeValueFields) {
      const fullHeader = colHeaderLabel
        ? `${colHeaderLabel} (${vField.displayName || `${vField.agg.toUpperCase()} of ${vField.fieldName}`})`
        : (vField.displayName || `${vField.agg.toUpperCase()} of ${vField.fieldName}`);

      const cellKey = coordToKey(destStartRow, currentDestCol);
      resultCells[cellKey] = {
        value: fullHeader,
        displayValue: fullHeader,
        style: headerStyle,
      };

      colIndexMap.set(`${colKeyStr}_${vField.fieldIndex}_${vField.agg}`, currentDestCol);
      currentDestCol++;
    }
  }

  // Column Grand Total header
  let grandTotalColStart = -1;
  if (showGrandTotalsCol && (colGroupKeys.length > 1 || columnFields.length > 0)) {
    grandTotalColStart = currentDestCol;
    for (const vField of activeValueFields) {
      const cellKey = coordToKey(destStartRow, currentDestCol);
      const title = `Total ${vField.displayName || vField.fieldName}`;
      resultCells[cellKey] = {
        value: title,
        displayValue: title,
        style: headerStyle,
      };
      currentDestCol++;
    }
  }

  const totalColsGenerated = currentDestCol - destStartCol;

  // 7. Render Rows & Data Cells
  let currentDestRow = destStartRow + 1;

  for (const rowKeyStr of rowGroupKeys) {
    const rowValues: CellValue[] = JSON.parse(rowKeyStr);
    const groupRecords = rowGroupsMap.get(rowKeyStr) || [];

    // Render row labels
    if (rowFields.length > 0) {
      for (let rf = 0; rf < rowFields.length; rf++) {
        const val = rowValues[rf] ?? '';
        const cellKey = coordToKey(currentDestRow, destStartCol + rf);
        resultCells[cellKey] = {
          value: val,
          displayValue: String(val),
          style: labelStyle,
        };
      }
    } else {
      const cellKey = coordToKey(currentDestRow, destStartCol);
      resultCells[cellKey] = {
        value: 'Grand Total',
        displayValue: 'Grand Total',
        style: labelStyle,
      };
    }

    // Render values for each colGroup & valueField
    for (const colKeyStr of colGroupKeys) {
      const colValues: CellValue[] = JSON.parse(colKeyStr);

      // Filter groupRecords matching this column grouping
      const matchingRecords = groupRecords.filter((rec) => {
        if (columnFields.length === 0) return true;
        return columnFields.every((cf, idx) => String(rec[cf] ?? '') === String(colValues[idx] ?? ''));
      });

      for (const vField of activeValueFields) {
        const targetCol = colIndexMap.get(`${colKeyStr}_${vField.fieldIndex}_${vField.agg}`)!;
        const rawVals = matchingRecords.map((r) => r[vField.fieldIndex] ?? null);
        const aggResult = aggregateValues(rawVals, vField.agg);

        const cellKey = coordToKey(currentDestRow, targetCol);
        resultCells[cellKey] = {
          value: aggResult,
          displayValue: typeof aggResult === 'number' ? aggResult.toLocaleString() : String(aggResult),
          style: valueStyle,
        };
      }
    }

    // Row Grand Total across columns
    if (grandTotalColStart !== -1) {
      let gtCol = grandTotalColStart;
      for (const vField of activeValueFields) {
        const rawVals = groupRecords.map((r) => r[vField.fieldIndex] ?? null);
        const aggResult = aggregateValues(rawVals, vField.agg);

        const cellKey = coordToKey(currentDestRow, gtCol);
        resultCells[cellKey] = {
          value: aggResult,
          displayValue: typeof aggResult === 'number' ? aggResult.toLocaleString() : String(aggResult),
          style: totalStyle,
        };
        gtCol++;
      }
    }

    currentDestRow++;
  }

  // 8. Render Grand Total Row
  if (showGrandTotalsRow) {
    // Grand Total label in row header
    for (let rf = 0; rf < rowHeaderCols; rf++) {
      const cellKey = coordToKey(currentDestRow, destStartCol + rf);
      resultCells[cellKey] = {
        value: rf === 0 ? 'Grand Total' : '',
        displayValue: rf === 0 ? 'Grand Total' : '',
        style: totalStyle,
      };
    }

    // Compute column grand totals
    for (const colKeyStr of colGroupKeys) {
      const colValues: CellValue[] = JSON.parse(colKeyStr);
      const matchingRecords = filteredRecords.filter((rec) => {
        if (columnFields.length === 0) return true;
        return columnFields.every((cf, idx) => String(rec[cf] ?? '') === String(colValues[idx] ?? ''));
      });

      for (const vField of activeValueFields) {
        const targetCol = colIndexMap.get(`${colKeyStr}_${vField.fieldIndex}_${vField.agg}`)!;
        const rawVals = matchingRecords.map((r) => r[vField.fieldIndex] ?? null);
        const aggResult = aggregateValues(rawVals, vField.agg);

        const cellKey = coordToKey(currentDestRow, targetCol);
        resultCells[cellKey] = {
          value: aggResult,
          displayValue: typeof aggResult === 'number' ? aggResult.toLocaleString() : String(aggResult),
          style: totalStyle,
        };
      }
    }

    // Intersection of Grand Total Row and Grand Total Column
    if (grandTotalColStart !== -1) {
      let gtCol = grandTotalColStart;
      for (const vField of activeValueFields) {
        const rawVals = filteredRecords.map((r) => r[vField.fieldIndex] ?? null);
        const aggResult = aggregateValues(rawVals, vField.agg);

        const cellKey = coordToKey(currentDestRow, gtCol);
        resultCells[cellKey] = {
          value: aggResult,
          displayValue: typeof aggResult === 'number' ? aggResult.toLocaleString() : String(aggResult),
          style: totalStyle,
        };
        gtCol++;
      }
    }

    currentDestRow++;
  }

  const totalRowsGenerated = currentDestRow - destStartRow;

  return {
    cells: resultCells,
    rowCount: totalRowsGenerated,
    colCount: totalColsGenerated,
    fieldNames,
  };
}
