import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Edit3,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Download,
  AlertTriangle,
  Move,
} from 'lucide-react';
import { Sheet } from '@/types/sheet';
import { ChartConfig, ChartPositionConfig } from '@/types/chart';
import { NamedRange, PivotTableConfig } from '@/types/analysis';
import { extractChartData } from '@/engine/chart/chart-data-adapter';
import { ChartView } from './ChartView';
import { useUIPreferencesStore } from '@/stores/ui-preferences-store';

interface ChartOverlayProps {
  sheet: Sheet;
  zoom: number;
  selectedChartId: string | null;
  onSelectChart: (chartId: string | null) => void;
  onEditChart: (chart: ChartConfig) => void;
  onDeleteChart: (chartId: string) => void;
  onDuplicateChart: (chartId: string) => void;
  onBringForward: (chartId: string) => void;
  onSendBackward: (chartId: string) => void;
  onUpdatePosition: (chartId: string, position: ChartPositionConfig) => void;
  onExportChart: (chart: ChartConfig) => void;
  namedRangeResolver?: (name: string) => NamedRange | null;
  pivotTables?: PivotTableConfig[];
  getColOffset: (col: number, zoom: number) => number;
  getRowOffset: (row: number, zoom: number) => number;
}

type ResizeHandleType = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export const ChartOverlay: React.FC<ChartOverlayProps> = ({
  sheet,
  zoom,
  selectedChartId,
  onSelectChart,
  onEditChart,
  onDeleteChart,
  onDuplicateChart,
  onBringForward,
  onSendBackward,
  onUpdatePosition,
  onExportChart,
  namedRangeResolver,
  pivotTables,
  getColOffset,
  getRowOffset,
}) => {
  const theme = useUIPreferencesStore((s) => s.theme);
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const charts = useMemo(() => sheet.metadata?.charts || [], [sheet.metadata?.charts]);

  // Interaction States
  const [activeDragChartId, setActiveDragChartId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const [activeResize, setActiveResize] = useState<{
    chartId: string;
    handle: ResizeHandleType;
    startX: number;
    startY: number;
    initPos: ChartPositionConfig;
  } | null>(null);

  const dragStartRef = useRef<{ startX: number; startY: number }>({ startX: 0, startY: 0 });

  // Right-click context menu state
  const [chartContextMenu, setChartContextMenu] = useState<{
    chart: ChartConfig;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (!chartContextMenu) return;
    const handleClose = () => setChartContextMenu(null);
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setChartContextMenu(null);
    };
    window.addEventListener('click', handleClose);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleClose);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [chartContextMenu]);

  // Handle Drag Move
  const handleDragStart = (e: React.MouseEvent, chart: ChartConfig) => {
    e.stopPropagation();
    onSelectChart(chart.id);
    setActiveDragChartId(chart.id);
    dragStartRef.current = { startX: e.clientX, startY: e.clientY };
    setDragOffset({ dx: 0, dy: 0 });
  };

  // Handle Resize Start
  const handleResizeStart = (
    e: React.MouseEvent,
    chart: ChartConfig,
    handle: ResizeHandleType
  ) => {
    e.stopPropagation();
    onSelectChart(chart.id);
    setActiveResize({
      chartId: chart.id,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      initPos: { ...chart.position },
    });
  };

  // Global mousemove and mouseup listeners for drag and resize
  useEffect(() => {
    if (!activeDragChartId && !activeResize) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (activeDragChartId) {
        const dx = (e.clientX - dragStartRef.current.startX) / zoom;
        const dy = (e.clientY - dragStartRef.current.startY) / zoom;
        setDragOffset({ dx, dy });
      } else if (activeResize) {
        const dx = (e.clientX - activeResize.startX) / zoom;
        const dy = (e.clientY - activeResize.startY) / zoom;

        const { handle, initPos, chartId } = activeResize;
        let newX = initPos.offsetX;
        let newY = initPos.offsetY;
        let newW = initPos.width;
        let newH = initPos.height;

        if (handle.includes('e')) {
          newW = Math.max(240, initPos.width + dx);
        }
        if (handle.includes('s')) {
          newH = Math.max(160, initPos.height + dy);
        }
        if (handle.includes('w')) {
          const deltaW = Math.min(dx, initPos.width - 240);
          newX = initPos.offsetX + deltaW;
          newW = initPos.width - deltaW;
        }
        if (handle.includes('n')) {
          const deltaH = Math.min(dy, initPos.height - 160);
          newY = initPos.offsetY + deltaH;
          newH = initPos.height - deltaH;
        }

        onUpdatePosition(chartId, {
          ...initPos,
          offsetX: Math.round(newX),
          offsetY: Math.round(newY),
          width: Math.round(newW),
          height: Math.round(newH),
        });
      }
    };

    const handleMouseUp = () => {
      if (activeDragChartId) {
        const target = charts.find((c) => c.id === activeDragChartId);
        if (target && (dragOffset.dx !== 0 || dragOffset.dy !== 0)) {
          onUpdatePosition(activeDragChartId, {
            ...target.position,
            offsetX: Math.round(target.position.offsetX + dragOffset.dx),
            offsetY: Math.round(target.position.offsetY + dragOffset.dy),
          });
        }
        setActiveDragChartId(null);
        setDragOffset({ dx: 0, dy: 0 });
      }

      if (activeResize) {
        setActiveResize(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeDragChartId, activeResize, charts, dragOffset, onUpdatePosition, zoom]);

  if (charts.length === 0) return null;

  return (
    <>
      {charts.map((chart) => {
        const isSelected = selectedChartId === chart.id;
        const isDragging = activeDragChartId === chart.id;

        const anchorX = getColOffset(chart.position.anchorCell.col, zoom);
        const anchorY = getRowOffset(chart.position.anchorCell.row, zoom);

        const currentOffsetX = isDragging
          ? chart.position.offsetX + dragOffset.dx
          : chart.position.offsetX;
        const currentOffsetY = isDragging
          ? chart.position.offsetY + dragOffset.dy
          : chart.position.offsetY;

        const left = anchorX + currentOffsetX * zoom;
        const top = anchorY + currentOffsetY * zoom;
        const width = chart.position.width * zoom;
        const height = chart.position.height * zoom;

        // Extract Chart Data reactively
        const chartData = extractChartData(
          sheet.cells,
          chart.source,
          namedRangeResolver,
          pivotTables,
          chart.series
        );

        return (
          <div
            key={chart.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelectChart(chart.id);
            }}
            style={{
              position: 'absolute',
              left,
              top,
              width,
              height,
              zIndex: isSelected ? 50 : chart.position.zIndex || 20,
              borderRadius: chart.style.borderRadius ? `${chart.style.borderRadius}px` : '8px',
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSelectChart(chart.id);
              const x = Math.min(e.clientX, window.innerWidth - 200);
              const y = Math.min(e.clientY, window.innerHeight - 250);
              setChartContextMenu({ chart, x, y });
            }}
            className={`group bg-surface border transition-shadow flex flex-col select-none overflow-hidden ${
              isSelected
                ? 'ring-2 ring-accent border-accent shadow-xl'
                : 'border-border shadow-md hover:shadow-lg'
            }`}
          >
            {/* Chart Floating Header / Drag Handle */}
            <div
              onMouseDown={(e) => handleDragStart(e, chart)}
              className={`h-8 px-2 flex items-center justify-between border-b border-border/40 cursor-move ${
                isSelected
                  ? 'bg-accent/10 text-foreground'
                  : 'bg-surface-secondary/40 text-muted-foreground hover:bg-surface-secondary/70'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0 pr-1">
                <Move className="w-3.5 h-3.5 text-muted-foreground shrink-0 opacity-60" />
                <span className="text-xs font-semibold truncate text-foreground">
                  {chart.title.text || chart.chartType}
                </span>
                {chartData.sourceWarning && (
                  <span
                    className="flex items-center text-amber-500 shrink-0"
                    title={chartData.sourceWarning}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>

              {/* Action Toolbar */}
              <div
                className={`flex items-center gap-0.5 transition-opacity ${
                  isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => onEditChart(chart)}
                  title="Customize Chart"
                  className="p-1 rounded hover:bg-surface-secondary text-foreground-muted hover:text-foreground"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onBringForward(chart.id)}
                  title="Bring Forward"
                  className="p-1 rounded hover:bg-surface-secondary text-foreground-muted hover:text-foreground"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onSendBackward(chart.id)}
                  title="Send Backward"
                  className="p-1 rounded hover:bg-surface-secondary text-foreground-muted hover:text-foreground"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDuplicateChart(chart.id)}
                  title="Duplicate Chart"
                  className="p-1 rounded hover:bg-surface-secondary text-foreground-muted hover:text-foreground"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onExportChart(chart)}
                  title="Export Chart Image"
                  className="p-1 rounded hover:bg-surface-secondary text-foreground-muted hover:text-foreground"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteChart(chart.id)}
                  title="Delete Chart"
                  className="p-1 rounded hover:bg-rose-500/20 text-rose-500 hover:text-rose-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Chart View Content Body */}
            <div className="flex-1 w-full h-full min-h-0 relative p-1">
              <ChartView
                config={chart}
                data={chartData}
                isDark={isDark}
                onChartClick={() => onSelectChart(chart.id)}
              />
            </div>

            {/* Resize Handles (Only rendered when selected) */}
            {isSelected && (
              <>
                <div
                  onMouseDown={(e) => handleResizeStart(e, chart, 'nw')}
                  className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-accent border-2 border-surface rounded-full cursor-nwse-resize z-20"
                />
                <div
                  onMouseDown={(e) => handleResizeStart(e, chart, 'n')}
                  className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-accent border-2 border-surface rounded-full cursor-ns-resize z-20"
                />
                <div
                  onMouseDown={(e) => handleResizeStart(e, chart, 'ne')}
                  className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-accent border-2 border-surface rounded-full cursor-nesw-resize z-20"
                />
                <div
                  onMouseDown={(e) => handleResizeStart(e, chart, 'e')}
                  className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-3 bg-accent border-2 border-surface rounded-full cursor-ew-resize z-20"
                />
                <div
                  onMouseDown={(e) => handleResizeStart(e, chart, 'se')}
                  className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-accent border-2 border-surface rounded-full cursor-nwse-resize z-20"
                />
                <div
                  onMouseDown={(e) => handleResizeStart(e, chart, 's')}
                  className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-accent border-2 border-surface rounded-full cursor-ns-resize z-20"
                />
                <div
                  onMouseDown={(e) => handleResizeStart(e, chart, 'sw')}
                  className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-accent border-2 border-surface rounded-full cursor-nesw-resize z-20"
                />
                <div
                  onMouseDown={(e) => handleResizeStart(e, chart, 'w')}
                  className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3 h-3 bg-accent border-2 border-surface rounded-full cursor-ew-resize z-20"
                />
              </>
            )}
          </div>
        );
      })}

      {/* Chart Context Menu */}
      {chartContextMenu && (
        <div
          role="menu"
          aria-label="Chart context menu"
          style={{ top: chartContextMenu.y, left: chartContextMenu.x }}
          className="fixed z-50 min-w-[190px] py-1 bg-surface-elevated border border-border rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-100 select-none text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1 font-semibold text-[10px] text-foreground-muted uppercase tracking-wider border-b border-border">
            {chartContextMenu.chart.title.text || 'Chart Options'}
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onEditChart(chartContextMenu.chart);
              setChartContextMenu(null);
            }}
            className="w-full px-3 py-1.5 text-left text-foreground hover:bg-surface-secondary flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5 text-foreground-muted" />
            <span>Edit Chart...</span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onDuplicateChart(chartContextMenu.chart.id);
              setChartContextMenu(null);
            }}
            className="w-full px-3 py-1.5 text-left text-foreground hover:bg-surface-secondary flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-foreground-muted" />
            <span>Duplicate Chart</span>
          </button>

          <div className="h-px bg-border my-1" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onBringForward(chartContextMenu.chart.id);
              setChartContextMenu(null);
            }}
            className="w-full px-3 py-1.5 text-left text-foreground hover:bg-surface-secondary flex items-center gap-2 cursor-pointer transition-colors"
          >
            <ArrowUp className="w-3.5 h-3.5 text-foreground-muted" />
            <span>Bring Forward</span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onSendBackward(chartContextMenu.chart.id);
              setChartContextMenu(null);
            }}
            className="w-full px-3 py-1.5 text-left text-foreground hover:bg-surface-secondary flex items-center gap-2 cursor-pointer transition-colors"
          >
            <ArrowDown className="w-3.5 h-3.5 text-foreground-muted" />
            <span>Send Backward</span>
          </button>

          <div className="h-px bg-border my-1" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onExportChart(chartContextMenu.chart);
              setChartContextMenu(null);
            }}
            className="w-full px-3 py-1.5 text-left text-foreground hover:bg-surface-secondary flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-foreground-muted" />
            <span>Export as PNG</span>
          </button>

          <div className="h-px bg-border my-1" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onDeleteChart(chartContextMenu.chart.id);
              setChartContextMenu(null);
            }}
            className="w-full px-3 py-1.5 text-left text-rose-500 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Chart</span>
          </button>
        </div>
      )}
    </>
  );
};
