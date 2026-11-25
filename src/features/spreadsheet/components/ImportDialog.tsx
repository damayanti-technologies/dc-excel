import React, { useState, useRef, useCallback } from 'react';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  CheckCircle2,
  X,
  ShieldCheck,
  RefreshCw,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  FilePreviewSummary,
  DelimiterOption,
  CsvImportConfig,
  ImportResult,
} from '@/types/io';
import { importExportService } from '@/services/import-export-service';
import { colIndexToName } from '@/utils/coordinates';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (result: ImportResult) => void;
}

export const ImportDialog: React.FC<ImportDialogProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [previewSummary, setPreviewSummary] = useState<FilePreviewSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Import configuration
  const [workbookName, setWorkbookName] = useState('');
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [activePreviewSheet, setActivePreviewSheet] = useState<string>('');
  const [delimiter, setDelimiter] = useState<DelimiterOption>(',');
  const [hasHeaders, setHasHeaders] = useState(true);
  const [autoType, setAutoType] = useState(true);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setSelectedFile(null);
    setIsLoadingPreview(false);
    setIsImporting(false);
    setPreviewSummary(null);
    setErrorMessage(null);
    setWorkbookName('');
    setSelectedSheets([]);
    setActivePreviewSheet('');
    setDelimiter(',');
    setHasHeaders(true);
    setAutoType(true);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const processFile = useCallback(async (file: File, customDelim?: DelimiterOption) => {
    setSelectedFile(file);
    setIsLoadingPreview(true);
    setErrorMessage(null);

    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const isCsvTsv = ext === '.csv' || ext === '.tsv' || ext === '.txt';

    const csvConfig: Partial<CsvImportConfig> = {
      delimiter: customDelim || (ext === '.tsv' ? '\t' : undefined),
      autoTypeDetection: autoType,
      hasHeaders,
    };

    try {
      const summary = await importExportService.previewFile(file, csvConfig);
      setPreviewSummary(summary);
      setWorkbookName(summary.workbookName);
      setSelectedSheets(summary.sheetNames);
      setActivePreviewSheet(summary.sheetNames[0] || '');
      if (isCsvTsv && customDelim) {
        setDelimiter(customDelim);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to parse file preview.');
      setPreviewSummary(null);
    } finally {
      setIsLoadingPreview(false);
    }
  }, [autoType, hasHeaders]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDelimiterChange = (newDelim: DelimiterOption) => {
    setDelimiter(newDelim);
    if (selectedFile) {
      processFile(selectedFile, newDelim);
    }
  };

  const toggleSheetSelection = (sheetName: string) => {
    if (selectedSheets.includes(sheetName)) {
      if (selectedSheets.length > 1) {
        setSelectedSheets(selectedSheets.filter((s) => s !== sheetName));
      }
    } else {
      setSelectedSheets([...selectedSheets, sheetName]);
    }
  };

  const handleSelectAllSheets = () => {
    if (previewSummary) {
      setSelectedSheets([...previewSummary.sheetNames]);
    }
  };

  const handleDeselectAllSheets = () => {
    if (previewSummary && previewSummary.sheetNames.length > 0) {
      const first = previewSummary.sheetNames[0];
      if (first) {
        setSelectedSheets([first]);
      }
    }
  };

  const handleExecuteImport = async () => {
    if (!selectedFile) return;
    setIsImporting(true);
    setErrorMessage(null);

    try {
      const result = await importExportService.importWorkbook(selectedFile, {
        fileName: selectedFile.name,
        workbookName: workbookName.trim() || selectedFile.name,
        selectedSheetNames: selectedSheets,
        targetWorkbook: 'new',
        csvConfig: {
          delimiter,
          quoteChar: '"',
          hasHeaders,
          autoTypeDetection: autoType,
          emptyCellHandling: 'null',
          encoding: 'utf-8',
        },
      });

      if (result.success) {
        onImportSuccess(result);
        handleClose();
      } else {
        setErrorMessage(result.warnings.join('; ') || 'Import failed.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error occurred during import.');
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  const isExcel = previewSummary?.fileType === 'xlsx' || previewSummary?.fileType === 'xls';
  const sampleData = previewSummary?.sampleRows[activePreviewSheet] || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-dialog-title"
    >
      <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-secondary/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 id="import-dialog-title" className="text-base font-semibold text-foreground">
                Import Spreadsheet
              </h2>
              <p className="text-xs text-muted-foreground">
                Import Microsoft Excel (.xlsx), CSV, or TSV into DC Excel
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-secondary transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Privacy Guarantee Banner */}
          <div className="flex items-start gap-3 p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
            <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            <div className="text-xs space-y-0.5">
              <span className="font-semibold">Local-First Privacy Guarantee:</span>
              <p className="opacity-90 leading-relaxed">
                All file processing, calculation, and parsing occurs 100% locally inside your browser. Your data is stored strictly in your browser&apos;s IndexedDB and never transmitted to external cloud servers.
              </p>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* File Upload Zone (shown when no file selected or to change) */}
          {!previewSummary && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-primary bg-primary/5 scale-[0.99]'
                  : 'border-border hover:border-primary/50 hover:bg-surface-secondary/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.tsv,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3 shadow-inner">
                {isLoadingPreview ? (
                  <RefreshCw className="w-7 h-7 animate-spin" />
                ) : (
                  <Upload className="w-7 h-7" />
                )}
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                {isLoadingPreview ? 'Analyzing spreadsheet file...' : 'Choose a file or drag & drop here'}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Supports Microsoft Excel (.xlsx, .xls), CSV (.csv), and Tab-separated (.tsv) files
              </p>

              <div className="flex items-center gap-2 mt-4 text-[11px] text-muted-foreground">
                <span className="px-2 py-0.5 rounded-full bg-surface-secondary border border-border font-medium">.XLSX</span>
                <span className="px-2 py-0.5 rounded-full bg-surface-secondary border border-border font-medium">.CSV</span>
                <span className="px-2 py-0.5 rounded-full bg-surface-secondary border border-border font-medium">.TSV</span>
              </div>
            </div>
          )}

          {/* Preview & Configuration Area */}
          {previewSummary && (
            <div className="space-y-5">
              {/* File Info Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-lg border border-border bg-surface-secondary/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-surface border border-border">
                    {isExcel ? (
                      <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <FileText className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">{previewSummary.fileName}</h4>
                    <p className="text-[11px] text-muted-foreground">
                      {(previewSummary.fileSize / 1024).toFixed(1)} KB • {previewSummary.sheetNames.length} sheet(s) detected • Format: {previewSummary.fileType.toUpperCase()}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPreviewSummary(null);
                    setSelectedFile(null);
                  }}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Choose different file
                </button>
              </div>

              {/* Target Workbook Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Workbook Name
                </label>
                <input
                  type="text"
                  value={workbookName}
                  onChange={(e) => setWorkbookName(e.target.value)}
                  placeholder="Enter workbook name"
                  className="w-full h-8 px-3 rounded-md border border-border bg-surface text-foreground text-xs focus:ring-1 focus:ring-primary outline-hidden"
                />
              </div>

              {/* Excel Worksheet Selection */}
              {isExcel && previewSummary.sheetNames.length > 1 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-primary" />
                      Select Worksheets to Import ({selectedSheets.length} of {previewSummary.sheetNames.length})
                    </label>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={handleSelectAllSheets}
                        className="text-primary hover:underline text-[11px]"
                      >
                        Select All
                      </button>
                      <span className="text-muted-foreground">•</span>
                      <button
                        type="button"
                        onClick={handleDeselectAllSheets}
                        className="text-primary hover:underline text-[11px]"
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-lg border border-border bg-surface-secondary/20 max-h-36 overflow-y-auto">
                    {previewSummary.sheetNames.map((sheetName) => {
                      const dims = previewSummary.sheetDimensions[sheetName];
                      const isChecked = selectedSheets.includes(sheetName);
                      return (
                        <label
                          key={sheetName}
                          className={`flex items-center gap-2 p-2 rounded-md border text-xs cursor-pointer transition-colors ${
                            isChecked
                              ? 'border-primary/40 bg-primary/5 text-foreground'
                              : 'border-border bg-surface text-muted-foreground hover:bg-surface-secondary'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSheetSelection(sheetName)}
                            className="rounded border-border text-primary focus:ring-0 w-3.5 h-3.5"
                          />
                          <div className="truncate">
                            <span className="font-medium truncate block">{sheetName}</span>
                            {dims && (
                              <span className="text-[10px] text-muted-foreground block">
                                {dims.rowCount} rows × {dims.columnCount} cols
                              </span>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* CSV/TSV Delimiter & Parsing Controls */}
              {!isExcel && (
                <div className="p-3.5 rounded-lg border border-border bg-surface-secondary/20 space-y-3">
                  <h4 className="text-xs font-semibold text-foreground">Delimited File Settings</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                        Delimiter
                      </label>
                      <select
                        value={delimiter}
                        onChange={(e) => handleDelimiterChange(e.target.value as DelimiterOption)}
                        className="w-full h-8 px-2 rounded-md border border-border bg-surface text-foreground text-xs focus:ring-1 focus:ring-primary outline-hidden"
                      >
                        <option value=",">Comma (,)</option>
                        <option value="&#9;">Tab (\t)</option>
                        <option value=";">Semicolon (;)</option>
                        <option value="|">Pipe (|)</option>
                      </select>
                    </div>

                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hasHeaders}
                          onChange={(e) => setHasHeaders(e.target.checked)}
                          className="rounded border-border text-primary focus:ring-0 w-3.5 h-3.5"
                        />
                        <span>First row contains headers</span>
                      </label>
                    </div>

                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoType}
                          onChange={(e) => setAutoType(e.target.checked)}
                          className="rounded border-border text-primary focus:ring-0 w-3.5 h-3.5"
                        />
                        <span>Detect numbers & dates</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Live Data Preview Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-foreground">
                      Sample Data Preview
                    </label>
                    {isExcel && previewSummary.sheetNames.length > 1 && (
                      <div className="flex items-center gap-1">
                        {previewSummary.sheetNames.map((sName) => (
                          <button
                            key={sName}
                            type="button"
                            onClick={() => setActivePreviewSheet(sName)}
                            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                              activePreviewSheet === sName
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-surface-secondary text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {sName}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Showing first 10 rows
                  </span>
                </div>

                <div className="border border-border rounded-lg overflow-x-auto max-h-56 bg-surface">
                  {sampleData.length > 0 && sampleData[0] ? (
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="bg-surface-secondary border-b border-border">
                          <th className="py-1 px-2.5 font-medium text-muted-foreground border-r border-border text-center w-10">
                            #
                          </th>
                          {sampleData[0].map((_, colIdx) => (
                            <th
                              key={colIdx}
                              className="py-1 px-2.5 font-medium text-foreground border-r border-border whitespace-nowrap min-w-24"
                            >
                              {colIndexToName(colIdx)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sampleData.map((row, rowIdx) => (
                          <tr
                            key={rowIdx}
                            className="border-b border-border/50 hover:bg-surface-secondary/40 transition-colors"
                          >
                            <td className="py-1 px-2 text-center text-muted-foreground bg-surface-secondary/20 border-r border-border text-[11px]">
                              {rowIdx + 1}
                            </td>
                            {row.map((val, colIdx) => (
                              <td
                                key={colIdx}
                                className="py-1 px-2.5 text-foreground border-r border-border/50 truncate max-w-xs whitespace-nowrap"
                              >
                                {val != null ? String(val) : ''}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                      No sample preview available for this worksheet.
                    </div>
                  )}
                </div>
              </div>

              {/* Feature Compatibility Report */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Format Compatibility & Preservation
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 rounded-md border border-border bg-surface-secondary/20">
                    <span className="text-muted-foreground block text-[10px]">Cell Values & Types</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-xs">
                      {previewSummary.compatibility.cellValues.toUpperCase()}
                    </span>
                  </div>
                  <div className="p-2 rounded-md border border-border bg-surface-secondary/20">
                    <span className="text-muted-foreground block text-[10px]">Formulas</span>
                    <span
                      className={`font-semibold text-xs ${
                        previewSummary.compatibility.formulas === 'full'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {previewSummary.compatibility.formulas.toUpperCase()}
                    </span>
                  </div>
                  <div className="p-2 rounded-md border border-border bg-surface-secondary/20">
                    <span className="text-muted-foreground block text-[10px]">Cell Styling & Colors</span>
                    <span
                      className={`font-semibold text-xs ${
                        previewSummary.compatibility.formatting === 'full'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {previewSummary.compatibility.formatting.toUpperCase()}
                    </span>
                  </div>
                  <div className="p-2 rounded-md border border-border bg-surface-secondary/20">
                    <span className="text-muted-foreground block text-[10px]">Freeze Panes</span>
                    <span
                      className={`font-semibold text-xs ${
                        previewSummary.compatibility.freezePanes === 'full'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {previewSummary.compatibility.freezePanes.toUpperCase()}
                    </span>
                  </div>
                </div>

                {previewSummary.warnings.length > 0 && (
                  <div className="p-2.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs space-y-1">
                    <div className="font-medium flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Compatibility Notices:</span>
                    </div>
                    <ul className="list-disc list-inside text-[11px] space-y-0.5 opacity-90">
                      {previewSummary.warnings.map((warn, i) => (
                        <li key={i}>{warn}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-surface-secondary/40">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-md border border-border bg-surface text-xs font-medium text-foreground hover:bg-surface-secondary transition-colors"
          >
            Cancel
          </button>

          {previewSummary ? (
            <button
              type="button"
              disabled={isImporting || selectedSheets.length === 0}
              onClick={handleExecuteImport}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors shadow-xs"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <span>Import Workbook</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              disabled={!selectedFile}
              onClick={() => selectedFile && processFile(selectedFile)}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors shadow-xs"
            >
              Analyze File
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
