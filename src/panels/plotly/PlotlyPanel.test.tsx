import React from 'react';
import { render } from '@testing-library/react';
import { PanelProps } from '@grafana/data';
import { PlotlyPanel } from './PlotlyPanel';
import { PanelOptions } from './types';
import { locationService } from '@grafana/runtime';

jest.mock('@grafana/runtime', () => ({
  getTemplateSrv: () => ({
    replace: (str: string) => str,
  }),
  locationService: {
    getLocation: jest.fn(),
    partial: jest.fn(),
  },
}));

let plotlyOnReLayout: any;

jest.mock('./utils', () => ({
  getFieldsByName: jest.fn((frames, name) => frames.map((f: any) => f.fields[0])),
  notEmpty: jest.fn((val) => val !== null && val !== undefined),
  Plot: ({ onRelayout }: any) => {
    plotlyOnReLayout = onRelayout;
    return <div data-testid="plotly-plot">Plot</div>;
  },
  renderMenuItems: jest.fn(),
  useTraceColors: jest.fn(() => ['#color1', '#color2']),
}));

describe('PlotlyPanel - X-Axis Sync', () => {
  const mockLocationWith = (search: string) => {
    (locationService.getLocation as jest.Mock).mockReturnValue({
      search,
      pathname: '/dashboard',
    });
  };

  const createMockProps = (
    options: Partial<PanelOptions> = {},
    panelId: number = 1
  ): PanelProps<PanelOptions> => ({
    options: {
      xAxis: { field: 'temperature', min: undefined, max: undefined },
      yAxis: { fields: [], min: undefined, max: undefined },
      yAxis2: { fields: [], min: undefined, max: undefined },
      showYAxis2: false,
      showLegend: true,
      legendPosition: 'right',
      showModeBar: true,
      displayVertically: true,
      invertXAxis: false,
      series: {
        plotType: 'line',
        stackBars: false,
        areaFill: false,
        staircase: false,
        markerSize: 5,
        lineWidth: 2,
      },
      series2: {
        plotType: 'line',
        stackBars: false,
        areaFill: false,
        staircase: false,
        markerSize: 5,
        lineWidth: 2,
      },
      ...options,
    },
    data: {
      series: [
        {
          name: 'Series 1',
          fields: [
            {
              name: 'temperature',
              type: 'number',
              values: { toArray: () => [1, 2, 3] },
              config: {},
            },
            {
              name: 'value',
              type: 'number',
              values: { toArray: () => [10, 20, 30] },
              config: {},
            },
          ],
          length: 3,
        },
      ],
      state: 'Done',
    } as any,
    timeRange: {} as any,
    timeZone: 'UTC',
    width: 800,
    height: 600,
    fieldConfig: {} as any,
    id: panelId,
    title: 'Plotly Panel',
    transparent: false,
    renderCounter: 1,
    onOptionsChange: jest.fn(),
    onFieldConfigChange: jest.fn(),
    replaceVariables: jest.fn((str) => str),
    onChangeTimeRange: jest.fn(),
    eventBus: {} as any,
  });

  const renderPlotlyElement = (props: PanelProps<PanelOptions>) => {
    return render(<PlotlyPanel {...props} />);
  };

  const triggerReLayout = (xAxisMin?: number | string, xAxisMax?: number | string) => {
    plotlyOnReLayout({
      'xaxis.range[0]': xAxisMin,
      'xaxis.range[1]': xAxisMax,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('X-Axis Range Synchronization', () => {
    it('should update route parameters when panel is in sync targets and x-axis is zoomed', () => {
      mockLocationWith('?nisl-syncXAxisRangeTargets=1,2,3');
      const props = createMockProps({ xAxis: { field: 'temperature' } }, 1);

      renderPlotlyElement(props);
      triggerReLayout(10.3, 99.7);
      jest.runOnlyPendingTimers();

      expect(locationService.partial).toHaveBeenCalledWith(
        {
          'nisl-temperature-min': 10,
          'nisl-temperature-max': 100,
        },
        true
      );
    });

    it('should not update route parameters when panel is NOT in sync targets', () => {
      mockLocationWith('?nisl-syncXAxisRangeTargets=2,3,4');
      const props = createMockProps({ xAxis: { field: 'temperature' } }, 1);

      renderPlotlyElement(props);
      triggerReLayout(10.3, 99.7);
      jest.runOnlyPendingTimers();

      expect(locationService.partial).not.toHaveBeenCalled();
    });

    it('should not update route parameters when x-axis field is not configured', () => {
      mockLocationWith('?nisl-syncXAxisRangeTargets=1');
      const props = createMockProps({ xAxis: { field: undefined } }, 1);

      renderPlotlyElement(props);
      triggerReLayout(10.3, 99.7);
      jest.runOnlyPendingTimers();

      expect(locationService.partial).not.toHaveBeenCalled();
    });

    it('should floor min value and ceil max value', () => {
      mockLocationWith('?nisl-syncXAxisRangeTargets=5');
      const props = createMockProps({ xAxis: { field: 'pressure' } }, 5);

      renderPlotlyElement(props);
      triggerReLayout(45.8, 78.2);
      jest.runOnlyPendingTimers();

      expect(locationService.partial).toHaveBeenCalledWith(
        {
          'nisl-pressure-min': 45,
          'nisl-pressure-max': 79,
        },
        true
      );
    });

    it('should not update route parameters when x-axis values are undefined', () => {
      mockLocationWith('?nisl-syncXAxisRangeTargets=1');
      const props = createMockProps({ xAxis: { field: 'voltage' } }, 1);

      renderPlotlyElement(props);
      triggerReLayout(undefined, undefined);
      jest.runOnlyPendingTimers();

      expect(locationService.partial).not.toHaveBeenCalled();
    });

    it('should not update route parameters when x-axis values are strings', () => {
      mockLocationWith('?nisl-syncXAxisRangeTargets=1');
      const props = createMockProps({ xAxis: { field: 'voltage' } }, 1);

      renderPlotlyElement(props);
      triggerReLayout('2025-01-01', '2025-12-31');
      jest.runOnlyPendingTimers();

      expect(locationService.partial).not.toHaveBeenCalled();
    });

    it('should handle empty sync targets parameter', () => {
      mockLocationWith('?nisl-syncXAxisRangeTargets=');
      const props = createMockProps({ xAxis: { field: 'temperature' } }, 1);

      renderPlotlyElement(props);
      triggerReLayout(10, 100);
      jest.runOnlyPendingTimers();

      expect(locationService.partial).not.toHaveBeenCalled();
    });

    it('should handle missing sync targets parameter', () => {
      mockLocationWith('?someOtherParam=value');
      const props = createMockProps({ xAxis: { field: 'temperature' } }, 1);

      renderPlotlyElement(props);
      triggerReLayout(10, 100);
      jest.runOnlyPendingTimers();

      expect(locationService.partial).not.toHaveBeenCalled();
    });

    it('should use x-axis field name in route parameter keys', () => {
      mockLocationWith('?nisl-syncXAxisRangeTargets=7');
      const props = createMockProps({ xAxis: { field: 'custom-field-name' } }, 7);

      renderPlotlyElement(props);
      triggerReLayout(5.5, 15.5);
      jest.runOnlyPendingTimers();

      expect(locationService.partial).toHaveBeenCalledWith(
        {
          'nisl-custom-field-name-min': 5,
          'nisl-custom-field-name-max': 16,
        },
        true
      );
    });
  });
});
