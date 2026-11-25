import React, { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  CheckCircle2,
  X,
  Layers,
  Shield,
  Settings2,
} from 'lucide-react';
import { SupportedExportFormat, DelimiterOption } from '@/types/io';
import { Workbook } from '@/types/workbook';
import { Sheet } from '@/types/sheet';
import { CellRange } from '@/types/cell';
import { importExportService } from '@/services/import-export-service';
import { formatRangeLabel } from '@/engine/grid/selection';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  workbook: Workbook;
  sheets: Sheet[];
  activeSheetId: string;
  selectedRange?: CellRange;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onClose,
  workbook,
  sheets,
  activeSheetId,
  selectedRange,
}) => {
  const [format, setFormat] = useState<SupportedExportFormat>('xlsx');
  const [fileName, setFileName] = useState(workbook.name || 'workbook');
  const [selectedSheetIds, setSelectedSheetIds] = useState<string[]>(
    sheets.map((s) => s.id)
  );
  const [targetCsvSheetId, setTargetCsvSheetId] = useState<string>(
    activeSheetId || sheets[0]?.id || ''
  );
  const [exportSelectedRangeOnly, setExportSelectedRangeOnly] = useState(false);

  // CSV/TSV options
  const [csvDelimiter, setCsvDelimiter] = useState<DelimiterOption>(',');
  const [exportFormulas, setExportFormulas] = useState(false);
  const [protectInjection, setProtectInjection] = useState(true);
  const [includeUtf8Bom, setIncludeUtf8Bom] = useState(true);
  const [includeHeaders, setIncludeHeaders] = useState(true);

  // Excel options
  const [includeHiddenSheets, setIncludeHiddenSheets] = useState(false);

  // Status
  const [isExporting, setIsExporting] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeSheet = sheets.find((s) => s.id === targetCsvSheetId) || sheets[0];

  const handleFormatChange = (newFormat: SupportedExportFormat) => {
    setFormat(newFormat);
    if (newFormat === 'tsv') {
      setCsvDelimiter('\t');
    } else if (newFormat === 'csv') {
      setCsvDelimiter(',');
    }
  };

  const toggleSheetSelection = (id: string) => {
    if (selectedSheetIds.includes(id)) {
      if (selectedSheetIds.length > 1) {
        setSelectedSheetIds(selectedSheetIds.filter((sId) => sId !== id));
      }
    } else {
      setSelectedSheetIds([...selectedSheetIds, id]);
    }
  };

  const handleExecuteExport = async () => {
    setIsExporting(true);
    setErrorMessage(null);
    setWarnings([]);

    try {
      if (format === 'xlsx') {
        const result = await importExportService.exportWorkbook(workbook, sheets, {
          fileName: fileName.trim() || workbook.name || 'workbook',
          selectedSheetIds,
          includeHiddenSheets,
          autoDownload: true,
        });

        if (result.warnings && result.warnings.length > 0) {
          setWarnings(result.warnings);
        } else {
          onClose();
        }
      } else {
        // CSV / TSV Export
        if (!activeSheet) {
          throw new Error('No valid sheet selected for export.');
        }

        importExportService.exportSheetCsv(
          activeSheet,
          {
            delimiter: format === 'tsv' ? '\t' : csvDelimiter,
            quoteChar: '"',
            includeHeaders,
            exportFormulas,
            formulaInjectionProtection: protectInjection,
            selectedRange: exportSelectedRangeOnly ? selectedRange : undefined,
            encoding: includeUtf8Bom ? 'utf-8-bom' : undefined,
            autoDownload: true,
          },
          fileName.trim() || activeSheet.name
        );

        onClose();
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Export operation failed.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-dialog-title"
    >
      <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-secondary/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 id="export-dialog-title" className="text-base font-semibold text-foreground">
                Export Spreadsheet
              </h2>
              <p className="text-xs text-muted-foreground">
                Save your spreadsheet locally as Excel (.xlsx), CSV, or TSV
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-secondary transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Format Picker */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">
              Select Export Format
            </label>
            <div className="grid grid-cols-3 gap-3">
              {/* XLSX */}
              <button
                type="button"
                onClick={() => handleFormatChange('xlsx')}
                className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all ${
                  format === 'xlsx'
                    ? 'border-primary bg-primary/10 text-primary shadow-xs'
                    : 'border-border bg-surface text-muted-foreground hover:border-primary/40 hover:bg-surface-secondary'
                }`}
              >
                <FileSpreadsheet className="w-6 h-6 mb-1.5 text-emerald-600" />
                <span className="text-xs font-semibold text-foreground">Excel Workbook</span>
                <span className="text-[10px] text-muted-foreground">.xlsx (All styles & formulas)</span>
              </button>

              {/* CSV */}
              <button
                type="button"
                onClick={() => handleFormatChange('csv')}
                className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all ${
                  format === 'csv'
                    ? 'border-primary bg-primary/10 text-primary shadow-xs'
                    : 'border-border bg-surface text-muted-foreground hover:border-primary/40 hover:bg-surface-secondary'
                }`}
              >
                <FileText className="w-6 h-6 mb-1.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-semibold text-foreground">CSV</span>
                <span className="text-[10px] text-muted-foreground">.csv (Comma-delimited)</span>
              </button>

              {/* TSV */}
              <button
                type="button"
                onClick={() => handleFormatChange('tsv')}
                className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all ${
                  format === 'tsv'
                    ? 'border-primary bg-primary/10 text-primary shadow-xs'
                    : 'border-border bg-surface text-muted-foreground hover:border-primary/40 hover:bg-surface-secondary'
                }`}
              >
                <FileText className="w-6 h-6 mb-1.5 text-amber-600" />
                <span className="text-xs font-semibold text-foreground">TSV</span>
                <span className="text-[10px] text-muted-foreground">.tsv (Tab-delimited)</span>
              </button>
            </div>
          </div>

          {/* File Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              File Name
            </label>
            <div className="flex items-center">
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Enter filename"
                className="w-full h-8 px-3 rounded-l-md border border-border bg-surface text-foreground text-xs focus:ring-1 focus:ring-primary outline-hidden"
              />
              <span className="h-8 px-3 rounded-r-md border border-l-0 border-border bg-surface-secondary text-xs text-muted-foreground flex items-center font-mono">
                .{format}
              </span>
            </div>
          </div>

          {/* Excel Specific Options */}
          {format === 'xlsx' && (
            <div className="space-y-3 p-4 rounded-xl border border-border bg-surface-secondary/20">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-primary" />
                  Worksheets to Export ({selectedSheetIds.length} of {sheets.length})
                </label>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedSheetIds(sheets.map((s) => s.id))}
                    className="text-primary hover:underline text-[11px]"
                  >
                    Select All
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                {sheets.map((sheet) => {
                  const isChecked = selectedSheetIds.includes(sheet.id);
                  return (
                    <label
                      key={sheet.id}
                      className={`flex items-center gap-2 p-2 rounded-md border text-xs cursor-pointer transition-colors ${
                        isChecked
                          ? 'border-primary/40 bg-primary/5 text-foreground'
                          : 'border-border bg-surface text-muted-foreground hover:bg-surface-secondary'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSheetSelection(sheet.id)}
                        className="rounded border-border text-primary focus:ring-0 w-3.5 h-3.5"
                      />
                      <span className="font-medium truncate">{sheet.name}</span>
                    </label>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-border flex items-center">
                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeHiddenSheets}
                    onChange={(e) => setIncludeHiddenSheets(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-0 w-3.5 h-3.5"
                  />
                  <span>Include hidden sheets</span>
                </label>
              </div>
            </div>
          )}

          {/* CSV / TSV Specific Options */}
          {(format === 'csv' || format === 'tsv') && (
            <div className="space-y-3.5 p-4 rounded-xl border border-border bg-surface-secondary/20">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Settings2 className="w-3.5 h-3.5 text-primary" />
                <span>Delimited Export Settings</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Target Sheet */}
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                    Select Worksheet
                  </label>
                  <select
                    value={targetCsvSheetId}
                    onChange={(e) => setTargetCsvSheetId(e.target.value)}
                    className="w-full h-8 px-2 rounded-md border border-border bg-surface text-foreground text-xs focus:ring-1 focus:ring-primary outline-hidden"
                  >
                    {sheets.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Delimiter for CSV */}
                {format === 'csv' && (
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                      Field Delimiter
                    </label>
                    <select
                      value={csvDelimiter}
                      onChange={(e) => setCsvDelimiter(e.target.value as DelimiterOption)}
                      className="w-full h-8 px-2 rounded-md border border-border bg-surface text-foreground text-xs focus:ring-1 focus:ring-primary outline-hidden"
                    >
                      <option value=",">Comma (,)</option>
                      <option value=";">Semicolon (;)</option>
                      <option value="|">Pipe (|)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Range Scope Option */}
              {selectedRange && (
                <div className="pt-2 border-t border-border">
                  <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportSelectedRangeOnly}
                      onChange={(e) => setExportSelectedRangeOnly(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-0 w-3.5 h-3.5"
                    />
                    <span>
                      Export selected range only ({formatRangeLabel(selectedRange)})
                    </span>
                  </label>
                </div>
              )}

              {/* Formula vs Values */}
              <div className="space-y-2 pt-2 border-t border-border">
                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeHeaders}
                    onChange={(e) => setIncludeHeaders(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-0 w-3.5 h-3.5"
                  />
                  <span>Include column headers in export</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportFormulas}
                    onChange={(e) => setExportFormulas(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-0 w-3.5 h-3.5"
                  />
                  <span>Export raw formula expressions (instead of calculated values)</span>
                </label>

                {/* Formula Injection Protection */}
                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={protectInjection}
                    onChange={(e) => setProtectInjection(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-0 w-3.5 h-3.5"
                  />
                  <div className="flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Formula injection protection (sanitize dangerous prefixes =, +, -, @)</span>
                  </div>
                </label>

                {/* UTF-8 BOM */}
                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeUtf8Bom}
                    onChange={(e) => setIncludeUtf8Bom(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-0 w-3.5 h-3.5"
                  />
                  <span>Include UTF-8 BOM (retains Telugu & Unicode in Microsoft Excel)</span>
                </label>
              </div>
            </div>
          )}

          {/* Compatibility Guarantee */}
          <div className="flex items-start gap-2.5 p-3 rounded-lg border border-border bg-surface-secondary/30 text-xs text-muted-foreground">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
            <p className="leading-relaxed">
              Files are generated directly in-memory and downloaded straight to your browser. Your data remains strictly local and private.
            </p>
          </div>

          {/* Warnings List */}
          {warnings.length > 0 && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs space-y-1">
              <span className="font-semibold block">Export Notices:</span>
              <ul className="list-disc list-inside text-[11px] space-y-0.5 opacity-90">
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-surface-secondary/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-border bg-surface text-xs font-medium text-foreground hover:bg-surface-secondary transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isExporting || (format === 'xlsx' && selectedSheetIds.length === 0)}
            onClick={handleExecuteExport}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Generating...' : `Export & Download .${format.toUpperCase()}`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
