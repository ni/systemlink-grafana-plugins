export interface PanelOptions {
  xAxis: XAxisOptions;
  yAxis: YAxisOptions;
  yAxis2: YAxisOptions;
  showYAxis2: boolean;
  showLegend: boolean;
  legendPosition: string;
  showModeBar: boolean;
  displayVertically: boolean;
  invertXAxis: boolean;
  series: SeriesOptions;
  series2: SeriesOptions;
}

export interface AxisOptions {
  title?: string;
  min?: number;
  max?: number;
  decimals?: number;
  unit?: string;
  scale?: string;
}

export interface XAxisOptions extends AxisOptions {
  field?: string;
}

export interface YAxisOptions extends AxisOptions {
  fields: string[];
}

export interface SeriesOptions {
  plotType: string;
  stackBars: boolean;
  areaFill: boolean;
  staircase: boolean;
  markerSize: number;
  lineWidth: number;
}

export interface AxisLabels {
  xAxis: string;
  yAxis: string[];
  yAxis2: string[];
}
