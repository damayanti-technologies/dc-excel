import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as echarts from 'echarts';
import { ChartConfig, ExtractedChartData } from '@/types/chart';
import { buildEChartsOption } from '@/engine/chart/echarts-builder';

export interface ChartViewRef {
  exportImage: (format: 'png' | 'svg', options?: { pixelRatio?: number; transparent?: boolean }) => string;
  getEChartsInstance: () => echarts.ECharts | null;
}

interface ChartViewProps {
  config: ChartConfig;
  data: ExtractedChartData;
  isDark: boolean;
  className?: string;
  renderer?: 'canvas' | 'svg';
  onChartClick?: () => void;
}

export const ChartView = forwardRef<ChartViewRef, ChartViewProps>(
  ({ config, data, isDark, className, renderer = 'canvas', onChartClick }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartInstanceRef = useRef<echarts.ECharts | null>(null);

    // Expose export methods
    useImperativeHandle(ref, () => ({
      exportImage: (format = 'png', options = {}) => {
        const chart = chartInstanceRef.current;
        if (!chart) return '';
        const pixelRatio = options.pixelRatio || 2;
        const backgroundColor = options.transparent ? 'transparent' : undefined;

        return chart.getDataURL({
          type: format,
          pixelRatio,
          backgroundColor,
          excludeComponents: ['toolbox'],
        });
      },
      getEChartsInstance: () => chartInstanceRef.current,
    }));

    // Initialize or re-init ECharts instance
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const chart = echarts.init(container, isDark ? 'dark' : undefined, {
        renderer,
      });
      chartInstanceRef.current = chart;

      const option = buildEChartsOption(config, data, isDark);
      chart.setOption(option, true);

      // Handle resize observer
      let resizeObserver: ResizeObserver | null = null;
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => {
          if (chart && !chart.isDisposed()) {
            chart.resize();
          }
        });
        resizeObserver.observe(container);
      }

      return () => {
        if (resizeObserver) {
          resizeObserver.disconnect();
        }
        if (chart && !chart.isDisposed()) {
          chart.dispose();
        }
        chartInstanceRef.current = null;
      };
    }, [config, data, renderer, isDark]);

    // Update options when config or data changes without full re-init
    useEffect(() => {
      const chart = chartInstanceRef.current;
      if (!chart || chart.isDisposed()) return;

      const option = buildEChartsOption(config, data, isDark);
      chart.setOption(option, true);
      chart.resize();
    }, [config, data, isDark]);

    return (
      <div
        ref={containerRef}
        onClick={onChartClick}
        className={className || 'w-full h-full min-h-[160px]'}
        style={{
          width: '100%',
          height: '100%',
          overflow: 'hidden',
        }}
      />
    );
  }
);

ChartView.displayName = 'ChartView';
