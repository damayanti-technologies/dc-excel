import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  RotateCcw,
  RotateCw,
  Plus,
  Percent,
  DollarSign,
  Layers,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { useWorkbookStore } from '@/stores/workbook-store';
import { useSelectionStore } from '@/stores/selection-store';
import { workbookRepository } from '@/storage/repositories/workbook-repository';
import { sheetRepository } from '@/storage/repositories/sheet-repository';
import { Sheet } from '@/types/sheet';
import { generateId } from '@/utils/id';
import { Logger } from '@/utils/logger';
import { Tabs, TabOption } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/stores/toast-store';

export const SpreadsheetEditorPlaceholder: React.FC = () => {
  const { workbookId } = useParams<{ workbookId: string }>();
  const currentWorkbook = useWorkbookStore((state) => state.currentWorkbook);
  const setCurrentWorkbook = useWorkbookStore((state) => state.setCurrentWorkbook);
  const activeCell = useSelectionStore((state) => state.activeCell);
  const [activeRibbonTab, setActiveRibbonTab] = useState('home');
  const [formulaValue, setFormulaValue] = useState('');
  const [zoomLevel, setZoomLevel] = useState(100);

  useEffect(() => {
    async function loadOrCreateWorkbook() {
      if (!workbookId) return;

      try {
        let wb = await workbookRepository.getById(workbookId);

        if (!wb) {
          Logger.info('SpreadsheetEditor', `Workbook ${workbookId} provisioned for demo`);
          const sheetId = generateId('sheet');
          wb = {
            id: workbookId,
            name: `Workbook (${workbookId})`,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            sheetIds: [sheetId],
            activeSheetId: sheetId,
            folderId: null
          };

          const initialSheet: Sheet = {
            id: sheetId,
            workbookId: wb.id,
            name: 'Sheet1',
            index: 0,
            rowCount: 1000,
            columnCount: 26,
            cells: {}
          };

          await workbookRepository.save(wb);
          await sheetRepository.save(initialSheet);
        }

        setCurrentWorkbook(wb);
      } catch (err) {
        Logger.error('SpreadsheetEditor', 'Failed to load workbook', err);
      }
    }

    void loadOrCreateWorkbook();
  }, [workbookId, setCurrentWorkbook]);

  const ribbonTabs: TabOption[] = [
    { id: 'home', label: 'Home' },
    { id: 'insert', label: 'Insert' },
    { id: 'formulas', label: 'Formulas' },
    { id: 'data', label: 'Data' },
    { id: 'view', label: 'View' }
  ];

  const handleAction = (label: string) => {
    toast.info('Action Triggered', `${label} tool active in Stage 2 shell.`);
  };

  // Preview columns: A through L
  const columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  // Preview rows: 1 through 16
  const rows = Array.from({ length: 16 }, (_, i) => i + 1);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background select-none">
      {/* 1. Editor Top Navigation & Title Bar */}
      <div className="h-11 border-b border-border bg-surface-elevated px-3 sm:px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="p-1 rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-secondary transition-colors"
            title="Return to Dashboard"
            aria-label="Return to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs sm:text-sm text-foreground truncate max-w-[200px] sm:max-w-xs">
              {currentWorkbook?.name || `Workbook: ${workbookId}`}
            </span>
            <Badge variant="neutral" size="sm" className="hidden sm:inline-flex text-[10px]">
              Saved to IDB
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => handleAction('Undo')}
            className="p-1.5 rounded text-foreground-muted hover:text-foreground hover:bg-surface-secondary transition-colors"
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleAction('Redo')}
            className="p-1.5 rounded text-foreground-muted hover:text-foreground hover:bg-surface-secondary transition-colors"
            title="Redo (Ctrl+Y)"
            aria-label="Redo"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Ribbon Tabs */}
      <div className="bg-surface border-b border-border px-2 shrink-0">
        <Tabs
          variant="ribbon"
          tabs={ribbonTabs}
          activeTabId={activeRibbonTab}
          onChange={setActiveRibbonTab}
        />
      </div>

      {/* 3. Ribbon Action Toolbar */}
      <div className="h-10 bg-surface-secondary border-b border-border px-3 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar shrink-0 text-xs">
        {/* Font Family selector placeholder */}
        <select
          aria-label="Font Family"
          className="h-7 text-xs bg-surface border border-border rounded px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option>Inter</option>
          <option>Calibri</option>
          <option>Arial</option>
        </select>

        {/* Font Size selector placeholder */}
        <select
          aria-label="Font Size"
          className="h-7 text-xs bg-surface border border-border rounded px-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option>10</option>
          <option>11</option>
          <option>12</option>
          <option>14</option>
        </select>

        <div className="h-4 w-px bg-border mx-1" />

        {/* Formatting Buttons */}
        <button
          onClick={() => handleAction('Bold')}
          className="p-1.5 rounded hover:bg-surface text-foreground-secondary hover:text-foreground transition-colors"
          title="Bold (Ctrl+B)"
          aria-label="Bold"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => handleAction('Italic')}
          className="p-1.5 rounded hover:bg-surface text-foreground-secondary hover:text-foreground transition-colors"
          title="Italic (Ctrl+I)"
          aria-label="Italic"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => handleAction('Underline')}
          className="p-1.5 rounded hover:bg-surface text-foreground-secondary hover:text-foreground transition-colors"
          title="Underline (Ctrl+U)"
          aria-label="Underline"
        >
          <Underline className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-border mx-1" />

        {/* Alignment */}
        <button
          onClick={() => handleAction('Align Left')}
          className="p-1.5 rounded hover:bg-surface text-foreground-secondary hover:text-foreground transition-colors"
          title="Align Left"
          aria-label="Align Left"
        >
          <AlignLeft className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => handleAction('Align Center')}
          className="p-1.5 rounded hover:bg-surface text-foreground-secondary hover:text-foreground transition-colors"
          title="Align Center"
          aria-label="Align Center"
        >
          <AlignCenter className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => handleAction('Align Right')}
          className="p-1.5 rounded hover:bg-surface text-foreground-secondary hover:text-foreground transition-colors"
          title="Align Right"
          aria-label="Align Right"
        >
          <AlignRight className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-border mx-1" />

        {/* Number Formatting */}
        <button
          onClick={() => handleAction('Currency Format')}
          className="p-1.5 rounded hover:bg-surface text-foreground-secondary hover:text-foreground transition-colors"
          title="Format as Currency"
          aria-label="Format as Currency"
        >
          <DollarSign className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => handleAction('Percentage Format')}
          className="p-1.5 rounded hover:bg-surface text-foreground-secondary hover:text-foreground transition-colors"
          title="Format as Percent"
          aria-label="Format as Percent"
        >
          <Percent className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 4. Formula Bar Region */}
      <div className="h-8 bg-surface border-b border-border px-3 flex items-center gap-2 text-xs shrink-0">
        {/* Name / Address Box */}
        <div className="w-16 h-6 px-2 bg-surface-secondary border border-border rounded flex items-center justify-center font-mono font-medium text-foreground text-[11px]">
          {activeCell ? `R${activeCell.row + 1}C${activeCell.col + 1}` : 'A1'}
        </div>

        {/* fx button */}
        <button
          type="button"
          onClick={() => handleAction('Insert Function')}
          className="px-1 text-foreground-muted hover:text-foreground font-serif italic text-xs font-bold"
          title="Insert Function"
        >
          fx
        </button>

        {/* Formula Input */}
        <input
          type="text"
          value={formulaValue}
          onChange={(e) => setFormulaValue(e.target.value)}
          placeholder="Enter formula or cell content..."
          aria-label="Formula Bar"
          className="flex-1 h-6 px-2 text-xs bg-surface-secondary border border-border rounded text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      {/* 5. Main Spreadsheet Viewport Geometry & Stage 2 Layout Shell */}
      <div className="flex-1 overflow-auto bg-background relative flex flex-col">
        {/* Column Headers */}
        <div className="flex sticky top-0 z-10 bg-surface-secondary border-b border-border min-w-max">
          <div className="w-10 h-6 border-r border-border bg-surface-secondary shrink-0" />
          {columns.map((col) => (
            <div
              key={col}
              className="w-24 h-6 border-r border-border text-center text-[11px] font-semibold text-foreground-muted flex items-center justify-center bg-surface-secondary shrink-0 hover:bg-surface-tertiary transition-colors"
            >
              {col}
            </div>
          ))}
        </div>

        {/* Row Headers & Cell Geometry */}
        <div className="relative flex-1 min-w-max">
          {rows.map((row) => (
            <div key={row} className="flex border-b border-border/80">
              <div className="w-10 h-6 border-r border-border text-center text-[10px] font-mono text-foreground-muted flex items-center justify-center bg-surface-secondary shrink-0 sticky left-0 z-5">
                {row}
              </div>
              {columns.map((col, colIdx) => {
                const isA1 = row === 1 && colIdx === 0;
                return (
                  <div
                    key={`${col}-${row}`}
                    className={`w-24 h-6 border-r border-border/60 text-xs px-2 flex items-center truncate ${
                      isA1
                        ? 'bg-accent/10 ring-2 ring-accent ring-inset'
                        : 'hover:bg-surface-secondary/40'
                    }`}
                  >
                    {isA1 ? (
                      <span className="text-[11px] font-medium text-accent">Active Cell</span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Centered Architecture Boundary Overlay Card */}
          <div className="absolute top-16 left-1/2 -translate-x-1/2 max-w-md w-full p-6 bg-surface-elevated/95 backdrop-blur-sm border border-border rounded-2xl shadow-xl text-center space-y-3 z-20 pointer-events-auto">
            <div className="w-12 h-12 mx-auto rounded-xl bg-accent/10 text-accent flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">Spreadsheet Shell Prepared</h3>
              <p className="text-xs text-foreground-muted leading-relaxed">
                The Stage 2 application shell, ribbon toolbar, formula bar, and coordinate geometry
                are active. The high-performance virtualized canvas/DOM calculation grid will be
                integrated in Stage 4 & Stage 5.
              </p>
            </div>
            <div className="pt-1 flex items-center justify-center gap-2">
              <Link to="/">
                <button className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-surface-secondary border border-border text-foreground hover:bg-surface-tertiary transition-colors">
                  Dashboard
                </button>
              </Link>
              <Link to="/settings">
                <button className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors">
                  Settings
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Bottom Sheet Tabs Bar & Viewport Controls */}
      <div className="h-8 border-t border-border bg-surface-secondary px-3 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-1">
          <div className="px-3 py-1 bg-surface border-t-2 border-accent text-foreground font-semibold text-[11px] rounded-t flex items-center gap-1.5 shadow-xs">
            <span>Sheet1</span>
          </div>
          <button
            onClick={() => handleAction('Add Sheet')}
            className="p-1 rounded hover:bg-surface-tertiary text-foreground-muted hover:text-foreground transition-colors"
            title="Add Sheet (Coming soon)"
            aria-label="Add Sheet"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-3 text-foreground-muted text-[11px]">
          <span className="hidden sm:inline">Ready</span>
          <div className="flex items-center gap-1 pl-3 border-l border-border">
            <button
              onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
              className="p-0.5 hover:text-foreground"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="w-10 text-center font-mono">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(200, z + 10))}
              className="p-0.5 hover:text-foreground"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
