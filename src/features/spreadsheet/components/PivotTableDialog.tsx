import React, { useState } from 'react';
import {
  X,
  Table,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import {
  PivotTableConfig,
  PivotValueField,
  PivotAggregationFunction,
} from '@/types/analysis';
import { Cell, CellRange } from '@/types/cell';
import { formatRangeReference, parseRangeReference } from '@/engine/analysis/named-ranges';
import { colIndexToName, a1ToCoord, coordToKey } from '@/utils/coordinates';

interface PivotTableDialogProps {
  isOpen: boolean;
  activeSheetId: string;
  sheets: { id: string; name: string }[];
  cells: Record<string, Cell>;
  currentSelection?: CellRange;
  onApplyPivotTable: (config: PivotTableConfig) => void;
  onClose: () => void;
}

export const PivotTableDialog: React.FC<PivotTableDialogProps> = ({
  isOpen,
  activeSheetId,
  sheets,
  cells,
  currentSelection,
  onApplyPivotTable,
  onClose,
}) => {
  const initialRange: CellRange = currentSelection || {
    startRow: 0,
    startCol: 0,
    endRow: 10,
    endCol: 3,
  };

  const [sourceRangeStr, setSourceRangeStr] = useState(formatRangeReference(initialRange));
  const [hasHeaders, setHasHeaders] = useState(true);
  const [destSheetId, setDestSheetId] = useState(activeSheetId);
  const [destCellStr, setDestCellStr] = useState('F1');
  const [showGrandRows, setShowGrandRows] = useState(true);
  const [showGrandCols, setShowGrandCols] = useState(true);

  // Field selections
  const [rowFields, setRowFields] = useState<number[]>([0]);
  const [colFields, setColFields] = useState<number[]>([]);
  const [valueFields, setValueFields] = useState<PivotValueField[]>([
    {
      fieldIndex: 1,
      fieldName: 'Field 2',
      agg: 'sum',
      displayName: 'Sum of Field 2',
    },
  ]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Extract detected fields from source range headers
  const parsedRange = parseRangeReference(sourceRangeStr);
  const detectedFields: { index: number; name: string }[] = [];

  if (parsedRange) {
    for (let c = parsedRange.startCol; c <= parsedRange.endCol; c++) {
      let name = `Col ${colIndexToName(c)}`;
      if (hasHeaders) {
        const headerCell = cells[coordToKey(parsedRange.startRow, c)];
        if (headerCell?.value !== null && headerCell?.value !== undefined && headerCell.value !== '') {
          name = String(headerCell.value);
        }
      }
      detectedFields.push({ index: c, name });
    }
  }

  const handleAddRowField = (fieldIndex: number) => {
    if (!rowFields.includes(fieldIndex)) {
      setRowFields([...rowFields, fieldIndex]);
    }
  };

  const handleRemoveRowField = (fieldIndex: number) => {
    setRowFields(rowFields.filter((f) => f !== fieldIndex));
  };

  const handleAddColField = (fieldIndex: number) => {
    if (!colFields.includes(fieldIndex)) {
      setColFields([...colFields, fieldIndex]);
    }
  };

  const handleRemoveColField = (fieldIndex: number) => {
    setColFields(colFields.filter((f) => f !== fieldIndex));
  };

  const handleAddValueField = (field: { index: number; name: string }) => {
    const newField: PivotValueField = {
      fieldIndex: field.index,
      fieldName: field.name,
      agg: 'sum',
      displayName: `Sum of ${field.name}`,
    };
    setValueFields([...valueFields, newField]);
  };

  const handleUpdateValueAgg = (idx: number, agg: PivotAggregationFunction) => {
    setValueFields((prev) =>
      prev.map((vf, i) => {
        if (i !== idx) return vf;
        return {
          ...vf,
          agg,
          displayName: `${agg.toUpperCase()} of ${vf.fieldName}`,
        };
      })
    );
  };

  const handleRemoveValueField = (idx: number) => {
    setValueFields(valueFields.filter((_, i) => i !== idx));
  };

  const handleCreatePivot = () => {
    if (!parsedRange) {
      setErrorMsg('Invalid source range format (e.g. A1:D10).');
      return;
    }

    const destCoord = a1ToCoord(destCellStr);
    if (!destCoord) {
      setErrorMsg('Invalid destination cell coordinate (e.g. F1).');
      return;
    }

    if (rowFields.length === 0 && colFields.length === 0) {
      setErrorMsg('Please select at least one Row field or Column field.');
      return;
    }

    if (valueFields.length === 0) {
      setErrorMsg('Please select at least one Value field to calculate.');
      return;
    }

    const config: PivotTableConfig = {
      id: `pivot_${Date.now()}`,
      name: `PivotTable_${Date.now().toString(36).substring(2, 6)}`,
      sourceSheetId: activeSheetId,
      sourceRange: parsedRange,
      hasHeaders,
      rowFields,
      columnFields: colFields,
      valueFields,
      filterFields: [],
      destinationSheetId: destSheetId,
      destinationCoord: destCoord,
      showGrandTotalsRow: showGrandRows,
      showGrandTotalsCol: showGrandCols,
      showSubtotals: false,
    };

    onApplyPivotTable(config);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-surface rounded-xl border border-border shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-secondary/40">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Table className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Create Pivot Table</h2>
              <p className="text-xs text-foreground-muted">
                Summarize, analyze, and explore multidimensional spreadsheet data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Source Data Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Source Range
              </label>
              <input
                type="text"
                value={sourceRangeStr}
                onChange={(e) => {
                  setSourceRangeStr(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="e.g. A1:D20"
                className="w-full px-3 py-2 text-xs font-mono bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasHeaders}
                  onChange={(e) => setHasHeaders(e.target.checked)}
                  className="rounded text-accent focus:ring-accent"
                />
                <span>First row contains headers</span>
              </label>
            </div>
          </div>

          {/* Destination */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Destination Sheet
              </label>
              <select
                value={destSheetId}
                onChange={(e) => setDestSheetId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {sheets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Destination Cell
              </label>
              <input
                type="text"
                value={destCellStr}
                onChange={(e) => setDestCellStr(e.target.value.toUpperCase())}
                placeholder="e.g. F1"
                className="w-full px-3 py-2 text-xs font-mono bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          {/* Pivot Field Layout Designer */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-foreground mb-2">
              Available Fields (Click to assign)
            </label>
            <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-surface-secondary/40 border border-border">
              {detectedFields.map((field) => (
                <div
                  key={field.index}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface border border-border text-xs font-medium text-foreground"
                >
                  <span>{field.name}</span>
                  <div className="flex gap-1 ml-1">
                    <button
                      type="button"
                      onClick={() => handleAddRowField(field.index)}
                      className="px-1 text-[10px] font-semibold rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20"
                      title="Add to Rows"
                    >
                      +Row
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddColField(field.index)}
                      className="px-1 text-[10px] font-semibold rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20"
                      title="Add to Columns"
                    >
                      +Col
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddValueField(field)}
                      className="px-1 text-[10px] font-semibold rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                      title="Add to Values"
                    >
                      +Val
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3 Active Zones: Rows, Columns, Values */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {/* Rows Zone */}
            <div className="p-3 rounded-lg border border-border bg-surface-secondary/20 flex flex-col min-h-[130px]">
              <span className="text-xs font-semibold text-foreground mb-2 flex items-center justify-between">
                <span>Rows</span>
                <span className="text-[10px] text-foreground-muted">({rowFields.length})</span>
              </span>
              <div className="space-y-1.5 flex-1">
                {rowFields.map((fIdx) => {
                  const fieldName = detectedFields.find((f) => f.index === fIdx)?.name || `Col ${fIdx + 1}`;
                  return (
                    <div
                      key={fIdx}
                      className="flex items-center justify-between px-2 py-1 bg-surface rounded border border-border text-xs"
                    >
                      <span className="truncate">{fieldName}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRowField(fIdx)}
                        className="text-foreground-muted hover:text-rose-500"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Columns Zone */}
            <div className="p-3 rounded-lg border border-border bg-surface-secondary/20 flex flex-col min-h-[130px]">
              <span className="text-xs font-semibold text-foreground mb-2 flex items-center justify-between">
                <span>Columns</span>
                <span className="text-[10px] text-foreground-muted">({colFields.length})</span>
              </span>
              <div className="space-y-1.5 flex-1">
                {colFields.map((fIdx) => {
                  const fieldName = detectedFields.find((f) => f.index === fIdx)?.name || `Col ${fIdx + 1}`;
                  return (
                    <div
                      key={fIdx}
                      className="flex items-center justify-between px-2 py-1 bg-surface rounded border border-border text-xs"
                    >
                      <span className="truncate">{fieldName}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveColField(fIdx)}
                        className="text-foreground-muted hover:text-rose-500"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Values Zone */}
            <div className="p-3 rounded-lg border border-border bg-surface-secondary/20 flex flex-col min-h-[130px]">
              <span className="text-xs font-semibold text-foreground mb-2 flex items-center justify-between">
                <span>Values</span>
                <span className="text-[10px] text-foreground-muted">({valueFields.length})</span>
              </span>
              <div className="space-y-1.5 flex-1">
                {valueFields.map((vf, idx) => (
                  <div
                    key={idx}
                    className="p-1.5 bg-surface rounded border border-border text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate">{vf.fieldName}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveValueField(idx)}
                        className="text-foreground-muted hover:text-rose-500"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <select
                      value={vf.agg}
                      onChange={(e) => handleUpdateValueAgg(idx, e.target.value as PivotAggregationFunction)}
                      className="w-full text-[11px] px-1.5 py-0.5 bg-surface-secondary border border-border rounded"
                    >
                      <option value="sum">Sum</option>
                      <option value="count">Count</option>
                      <option value="average">Average</option>
                      <option value="min">Min</option>
                      <option value="max">Max</option>
                      <option value="count_numbers">Count Numbers</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Grand Totals Options */}
          <div className="flex flex-wrap gap-4 pt-2 border-t border-border">
            <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={showGrandRows}
                onChange={(e) => setShowGrandRows(e.target.checked)}
                className="rounded text-accent focus:ring-accent"
              />
              <span>Show Grand Totals for Rows</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={showGrandCols}
                onChange={(e) => setShowGrandCols(e.target.checked)}
                className="rounded text-accent focus:ring-accent"
              />
              <span>Show Grand Totals for Columns</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-surface-secondary/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-foreground hover:bg-surface-secondary border border-border rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreatePivot}
            className="px-4 py-2 text-xs font-semibold bg-accent text-accent-foreground hover:bg-accent/90 rounded-lg shadow-xs transition-colors"
          >
            Generate Pivot Table
          </button>
        </div>
      </div>
    </div>
  );
};
