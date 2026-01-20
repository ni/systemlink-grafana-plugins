import React from 'react';
import { render } from '@testing-library/react';
import { PanelProps } from '@grafana/data';
import { PlotlyPanel } from './PlotlyPanel';
import { PanelOptions } from './types';
import { locationService } from '@grafana/runtime';
import _ from 'lodash';

const mockPublish = jest.fn();
let plotlyOnRelayout: any;

jest.mock('@grafana/runtime', () => ({
  getTemplateSrv: () => ({
    replace: (str: string) => str,
  }),
  locationService: {
    partial: jest.fn(),
    getSearchObject: jest.fn(() => ({})),
  },
  getAppEvents: () => ({
    publish: mockPublish,
  }),
}));

jest.mock('./utils', () => ({
  getFieldsByName: jest.fn((frames, name) => frames.map((f: any) => f.fields[0])),
  notEmpty: jest.fn((val) => val !== null && val !== undefined),
  Plot: ({ onRelayout }: any) => {
    plotlyOnRelayout = onRelayout;
    return <div data-testid="plotly-plot">Plot</div>;
  },
  renderMenuItems: jest.fn(),
  useTraceColors: jest.fn(() => ['#color1', '#color2']),
}));

describe('PlotlyPanel', () => {
  const mockSearchObject = (search: string) => {
    const params: Record<string, string> = {};
    if (search && search.startsWith('?')) {
      const searchParams = new URLSearchParams(search);
      searchParams.forEach((value, key) => {
        params[key] = value;
      });
    }
    (locationService.getSearchObject as jest.Mock).mockReturnValue(params);
  };

  const createMockProps = (
    options: Partial<PanelOptions> = {},
    panelId = 1
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

  const triggerRelayout = (xAxisMin?: number | string, xAxisMax?: number | string) => {
    plotlyOnRelayout({
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
    describe('when x-axis field is valid', () => {
      describe('x-axis values are valid', () => {
        it('should update route parameters when panel ID is in nisl-syncXAxisRangeTargets and x-axis is zoomed', () => {
          mockSearchObject('?nisl-syncXAxisRangeTargets=1,2,3');
          const props = createMockProps({ xAxis: { field: 'temperature' } }, 1);

          renderPlotlyElement(props);
          triggerRelayout(2.6013864243031377, 99.7458293847562891);
          jest.runOnlyPendingTimers();

          expect(locationService.partial).toHaveBeenCalledWith(
            {
              'nisl-temperature-min': 2.601386,
              'nisl-temperature-max': 99.745829,
            },
            true
          );
        });

        it('should update route parameters when panel ID is 0 and is included in nisl-syncXAxisRangeTargets', () => {
          mockSearchObject('?nisl-syncXAxisRangeTargets=0,1,2');
          const props = createMockProps({ xAxis: { field: 'temperature' } }, 0);

          renderPlotlyElement(props);
          triggerRelayout(3.1234567890123456, 45.6789012345678901);
          jest.runOnlyPendingTimers();

          expect(locationService.partial).toHaveBeenCalledWith(
            {
              'nisl-temperature-min': 3.123457,
              'nisl-temperature-max': 45.678901,
            },
            true
          );
          expect(mockPublish).toHaveBeenCalled();
        });

        it('should use 6-decimal precision for min and max values', () => {
          mockSearchObject('?nisl-syncXAxisRangeTargets=5');
          const props = createMockProps({ xAxis: { field: 'pressure' } }, 5);

          renderPlotlyElement(props);
          triggerRelayout(45.8789239472847561, 78.6543212947382756);
          jest.runOnlyPendingTimers();

          expect(locationService.partial).toHaveBeenCalledWith(
            {
              'nisl-pressure-min': 45.878924,
              'nisl-pressure-max': 78.654321,
            },
            true
          );
        });

        it('should handle negative x-axis values with 6-decimal precision', () => {
          mockSearchObject('?nisl-syncXAxisRangeTargets=1');
          const props = createMockProps({ xAxis: { field: 'temperature' } }, 1);

          renderPlotlyElement(props);
          triggerRelayout(-15.1234567890123456, -5.9876543210987654);
          jest.runOnlyPendingTimers();

          expect(locationService.partial).toHaveBeenCalledWith(
            {
              'nisl-temperature-min': -15.123457,
              'nisl-temperature-max': -5.987654,
            },
            true
          );
        });

        it('should use x-axis field name in route parameter keys', () => {
          mockSearchObject('?nisl-syncXAxisRangeTargets=7');
          const props = createMockProps({ xAxis: { field: 'custom-field-name' } }, 7);

          renderPlotlyElement(props);
          triggerRelayout(5.5847392847563829, 15.5384756293847561);
          jest.runOnlyPendingTimers();

          expect(locationService.partial).toHaveBeenCalledWith(
            {
              'nisl-custom-field-name-min': 5.584739,
              'nisl-custom-field-name-max': 15.538476,
            },
            true
          );
        });

        it('should publish NIRefreshDashboardEvent after updating X-axis range', () => {
          mockSearchObject('?nisl-syncXAxisRangeTargets=1');
          const props = createMockProps({ xAxis: { field: 'temperature' } }, 1);

          renderPlotlyElement(props);
          triggerRelayout(10.9847392847563829, 100.2384756293847561);
          jest.runOnlyPendingTimers();

          expect(mockPublish).toHaveBeenCalled();
          const eventArg = mockPublish.mock.calls[0][0];
          expect(eventArg.constructor.name).toBe('NIRefreshDashboardEvent');
        });

        it('should debounce rapid x-axis range changes and only trigger one URL update after 300ms delay', () => {
          mockSearchObject('?nisl-syncXAxisRangeTargets=1');
          const props = createMockProps({ xAxis: { field: 'temperature' } }, 1);

          renderPlotlyElement(props);
          for (let i = 0; i < 10; i++) {
            triggerRelayout(10.1234567890123456 + i, 100.9876543210987654 + i);
            jest.advanceTimersByTime(20);
          }

          expect(locationService.partial).toHaveBeenCalledTimes(0);

          jest.advanceTimersByTime(300);
          
          expect(locationService.partial).toHaveBeenCalledTimes(1);
          expect(locationService.partial).toHaveBeenCalledWith(
            {
              'nisl-temperature-min': 19.123457,
              'nisl-temperature-max': 109.987654,
            },
            true
          );
        });

        it('should call onOptionsChange with new min and max when relayout event provides numeric x-axis values', () => {
          const props = createMockProps({ xAxis: { field: 'temperature', min: 1, max: 2 } }, 1);

          renderPlotlyElement(props);
          triggerRelayout(10.8472639485726394, 100.5938475629384756);

          expect(props.onOptionsChange).toHaveBeenCalledWith({
            ...props.options,
            xAxis: { ...props.options.xAxis, min: 10.8472639485726394, max: 100.5938475629384756 },
          });
        });
      });

      describe('x-axis values are invalid', () => {
        it('should not update route parameters when x-axis values are undefined', () => {
          mockSearchObject('?nisl-syncXAxisRangeTargets=1');
          const props = createMockProps({ xAxis: { field: 'voltage' } }, 1);

          renderPlotlyElement(props);
          triggerRelayout(undefined, undefined);
          jest.runOnlyPendingTimers();

          expect(locationService.partial).not.toHaveBeenCalled();
        });

        it('should not update route parameters when x-axis values represent time', () => {
          mockSearchObject('?nisl-syncXAxisRangeTargets=1');
          const props = createMockProps({ xAxis: { field: 'time' } }, 1);

          renderPlotlyElement(props);
          triggerRelayout('2025-01-01', '2025-12-31');
          jest.runOnlyPendingTimers();

          expect(locationService.partial).not.toHaveBeenCalled();
        });

        [
          { name: 'xAxisMin is NaN', xAxisMin: NaN, xAxisMax: 100 },
          { name: 'xAxisMax is NaN', xAxisMin: 10, xAxisMax: NaN },
          { name: 'both xAxisMin and xAxisMax are NaN', xAxisMin: NaN, xAxisMax: NaN },
          { name: 'xAxisMin is Infinity', xAxisMin: Infinity, xAxisMax: 100 },
          { name: 'xAxisMax is Infinity', xAxisMin: 10, xAxisMax: Infinity },
          { name: 'both xAxisMin and xAxisMax are Infinity', xAxisMin: Infinity, xAxisMax: Infinity },
          { name: 'xAxisMin is -Infinity', xAxisMin: -Infinity, xAxisMax: 100 },
          { name: 'xAxisMax is -Infinity', xAxisMin: 10, xAxisMax: -Infinity },
          { name: 'both xAxisMin and xAxisMax are -Infinity', xAxisMin: -Infinity, xAxisMax: -Infinity },
        ].forEach(({ name, xAxisMin, xAxisMax }) => {
          it(`should not update route parameters when ${name}`, () => {
            mockSearchObject('?nisl-syncXAxisRangeTargets=1');
            const props = createMockProps({ xAxis: { field: 'temperature' } }, 1);

            renderPlotlyElement(props);
            triggerRelayout(xAxisMin, xAxisMax);
            jest.runOnlyPendingTimers();

            expect(props.onOptionsChange).not.toHaveBeenCalled();
            expect(locationService.partial).not.toHaveBeenCalled();
            expect(mockPublish).not.toHaveBeenCalled();
          });
        });
      });

      describe('query parameter handling', () => {
        it('should update route parameters when precision min value differs from existing URL parameter', () => {
          mockSearchObject('?nisl-syncXAxisRangeTargets=1&nisl-temperature-min=10.317283&nisl-temperature-max=49.793848');
          const props = createMockProps({ xAxis: { field: 'temperature' } }, 1);

          renderPlotlyElement(props);
          triggerRelayout(9.8472639485726394, 49.7938475629384756);
          jest.runOnlyPendingTimers();

          expect(locationService.partial).toHaveBeenCalledWith(
            {
              'nisl-temperature-min': 9.847264,
              'nisl-temperature-max': 49.793848,
            },
            true
          );
          expect(mockPublish).toHaveBeenCalled();
        });

        it('should update route parameters when precision max value differs from existing URL parameter', () => {
          mockSearchObject('?nisl-syncXAxisRangeTargets=1&nisl-temperature-min=10.347264&nisl-temperature-max=49.789067');
          const props = createMockProps({ xAxis: { field: 'temperature' } }, 1);

          renderPlotlyElement(props);
          triggerRelayout(10.3472639485726394, 50.1938475629384756);
          jest.runOnlyPendingTimers();

          expect(locationService.partial).toHaveBeenCalledWith(
            {
              'nisl-temperature-min': 10.347264,
              'nisl-temperature-max': 50.193848,
            },
            true
          );
          expect(mockPublish).toHaveBeenCalled();
        });

        it('should update route parameters when both precision min and max differ from existing URL parameters', () => {
          mockSearchObject('?nisl-syncXAxisRangeTargets=1&nisl-temperature-min=10.317283&nisl-temperature-max=49.793848');
          const props = createMockProps({ xAxis: { field: 'temperature' } }, 1);

          renderPlotlyElement(props);
          triggerRelayout(8.2472639485726394, 52.8938475629384756);
          jest.runOnlyPendingTimers();

          expect(locationService.partial).toHaveBeenCalledWith(
            {
              'nisl-temperature-min': 8.247264,
              'nisl-temperature-max': 52.893848,
            },
            true
          );
          expect(mockPublish).toHaveBeenCalled();
        });

        it('should update route parameters when nisl-syncXAxisRangeTargets has spaces between values', () => {
          mockSearchObject('?nisl-syncXAxisRangeTargets= 1,  2,  3');
          const props = createMockProps({ xAxis: { field: 'temperature' } }, 1);

          renderPlotlyElement(props);
          triggerRelayout(10.1847392847563829, 100.6384756293847561);
          jest.runOnlyPendingTimers();

          expect(locationService.partial).toHaveBeenCalledWith(
            {
              'nisl-temperature-min': 10.184739,
              'nisl-temperature-max': 100.638476,
            },
            true
          );
        });

        it('should not update route parameters when panel ID is not in nisl-syncXAxisRangeTargets', () => {
          mockSearchObject('?nisl-syncXAxisRangeTargets=2,3,4');
          const props = createMockProps({ xAxis: { field: 'temperature' } }, 1);

          renderPlotlyElement(props);
          triggerRelayout(15.2847392847563829, 87.9384756293847561);
          jest.runOnlyPendingTimers();

          expect(locationService.partial).not.toHaveBeenCalled();
        });

        it('should handle empty nisl-syncXAxisRangeTargets parameter', () => {
          mockSearchObject('?nisl-syncXAxisRangeTargets=');
          const props = createMockProps({ xAxis: { field: 'temperature' } }, 1);

          renderPlotlyElement(props);
          triggerRelayout(10, 100);
          jest.runOnlyPendingTimers();

          expect(locationService.partial).not.toHaveBeenCalled();
        });

        it('should handle missing nisl-syncXAxisRangeTargets query parameter', () => {
          mockSearchObject('?someOtherParam=value');
          const props = createMockProps({ xAxis: { field: 'temperature' } }, 1);

          renderPlotlyElement(props);
          triggerRelayout(10.2847392847563829, 100.7384756293847561);
          jest.runOnlyPendingTimers();

          expect(locationService.partial).not.toHaveBeenCalled();
        });

        it('should not update route parameters when nisl-syncXAxisRangeTargets has single quotes around values', () => {
          mockSearchObject('?nisl-syncXAxisRangeTargets=\'1\',\'2\'');
          const props = createMockProps({ xAxis: { field: 'temperature' } }, 2);

          renderPlotlyElement(props);
          triggerRelayout(10.5847392847563829, 100.3384756293847561);
          jest.runOnlyPendingTimers();

          expect(locationService.partial).not.toHaveBeenCalled();
        });

        it('should not update route parameters when nisl-syncXAxisRangeTargets has double quotes around values', () => {
          mockSearchObject('?nisl-syncXAxisRangeTargets="1","2"');
          const props = createMockProps({ xAxis: { field: 'temperature' } }, 2);

          renderPlotlyElement(props);
          triggerRelayout(10.7847392847563829, 100.1384756293847561);
          jest.runOnlyPendingTimers();

          expect(locationService.partial).not.toHaveBeenCalled();
        });

        it('should not update route parameters when precision values match existing URL parameters', () => {
          mockSearchObject('?nisl-syncXAxisRangeTargets=1&nisl-temperature-min=10.345679&nisl-temperature-max=49.712345');
          const props = createMockProps({ xAxis: { field: 'temperature' } }, 1);

          renderPlotlyElement(props);
          triggerRelayout(10.3456789123456789, 49.7123451123498675);
          jest.runOnlyPendingTimers();

          expect(locationService.partial).not.toHaveBeenCalled();
          expect(mockPublish).not.toHaveBeenCalled();
        });

        it('should not update when URL params in scientific notation equal decimal values', () => {
          mockSearchObject('?nisl-syncXAxisRangeTargets=1&nisl-temperature-min=1e-5&nisl-temperature-max=9.9e-5');
          const props = createMockProps({ xAxis: { field: 'temperature' } }, 1);

          renderPlotlyElement(props);
          triggerRelayout(0.00001, 0.000099);
          jest.runOnlyPendingTimers();

          expect(locationService.partial).not.toHaveBeenCalled();
          expect(mockPublish).not.toHaveBeenCalled();
        });
      });
    });

    describe('when x-axis field is invalid', () => {
      it('should not update route parameters when field is undefined', () => {
        mockSearchObject('?nisl-syncXAxisRangeTargets=1');
        const props = createMockProps({ xAxis: { field: undefined } }, 1);

        renderPlotlyElement(props);
        triggerRelayout(10.3472639485726394, 99.7938475629384756);
        jest.runOnlyPendingTimers();

        expect(locationService.partial).not.toHaveBeenCalled();
      });

      it('should not update route parameters when field is an empty string', () => {
        mockSearchObject('?nisl-syncXAxisRangeTargets=1');
        const props = createMockProps({ xAxis: { field: '' } }, 1);

        renderPlotlyElement(props);
        triggerRelayout(10.3472639485726394, 99.7938475629384756);
        jest.runOnlyPendingTimers();

        expect(locationService.partial).not.toHaveBeenCalled();
      });
    });

    it('should not update URL parameters after component unmount', () => {
      mockSearchObject('?nisl-syncXAxisRangeTargets=1');
      const props = createMockProps({ xAxis: { field: 'temperature' } }, 1);

      const { unmount } = renderPlotlyElement(props);
      triggerRelayout(10.4472639485726394, 100.8938475629384756);      
      unmount();
      jest.runOnlyPendingTimers();
      
      expect(locationService.partial).not.toHaveBeenCalled();
    });
  });
});
