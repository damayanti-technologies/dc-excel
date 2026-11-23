import { CellRange } from '@/types/cell';

export type ChartType =
  | 'bar'
  | 'column'
  | 'line'
  | 'area'
  | 'pie'
  | 'doughnut'
  | 'scatter';

export interface ChartSeries {
  name: string;
  range: CellRange;
  color?: string;
}

export interface ChartDefinition {
  id: string;
  sheetId: string;
  type: ChartType;
  title: string;
  dataRange: CellRange;
  series: ChartSeries[];
  xAxisTitle?: string;
  yAxisTitle?: string;
  position: {
    topRow: number;
    leftCol: number;
    widthPx: number;
    heightPx: number;
  };
}
