import React, { useState, useMemo, useEffect } from 'react';
import {
  PanelProps,
  DataFrame,
  FieldType,
  Field,
  getFieldDisplayName,
  GrafanaTheme2,
  hasLinks,
  dateTimeParse,
  FieldColorModeId,
  UrlQueryValue
} from '@grafana/data';
import { AxisLabels, PanelOptions } from './types';
import { useTheme2, ContextMenu, MenuItemsGroup, linkModelToContextMenuItems } from '@grafana/ui';
import { getTemplateSrv, PanelDataErrorView, locationService, getAppEvents } from '@grafana/runtime';
import { getFieldsByName, notEmpty, Plot, renderMenuItems, useTraceColors } from './utils';
import { AxisType, Legend, PlotData, PlotType, toImage, Icons, PlotlyHTMLElement } from 'plotly.js-basic-dist-min';
import { saveAs } from 'file-saver';
import _ from 'lodash';
import { NIRefreshDashboardEvent } from './events';

interface MenuState {
  x: number;
  y: number;
  show: boolean;
  items: MenuItemsGroup[];
}

interface Props extends PanelProps<PanelOptions> {}

export const PlotlyPanel: React.FC<Props> = (props) => {
  const { data, width, height, options, timeRange, onOptionsChange } = props;
  const [menu, setMenu] = useState<MenuState>({ x: 0, y: 0, show: false, items: [] });
  const theme = useTheme2();

  const traceColors = useTraceColors(theme);
  const debounceDelayInMs = 300;

  const publishXAxisRangeUpdate = useMemo(
    () =>
      _.debounce((xAxisMin: number, xAxisMax: number, xAxisField: string) => {
        locationService.partial(
          {
            [`nisl-${xAxisField}-min`]: xAxisMin,
            [`nisl-${xAxisField}-max`]: xAxisMax,
          },
          true,
        );
        getAppEvents().publish(new NIRefreshDashboardEvent());
      }, debounceDelayInMs),
    []
  );

  useEffect(() => {
    return () => {
      publishXAxisRangeUpdate.cancel();
    };
  }, [publishXAxisRangeUpdate]);

  const plotData: Array<Partial<PlotData>> = [];
  const axisLabels: AxisLabels = {
    xAxis: '',
    yAxis: [],
    yAxis2: [],
  };

  const xFields = _.attempt(() => getXFields(data.series, options.xAxis.field));
  const isTimeBasedXAxis = !_.isError(xFields) && xFields[0].type === FieldType.time;
  const dashboardTimeFrom = timeRange.from.isValid() ? timeRange.from.valueOf() : undefined;
  const dashboardTimeTo = timeRange.to.isValid() ? timeRange.to.valueOf() : undefined;
  const savedMin = options.xAxis.min;
  const savedMax = options.xAxis.max;

  useEffect(() => {
    if (_.isError(xFields) || !isTimeBasedXAxis || !Number.isFinite(dashboardTimeFrom) || !Number.isFinite(dashboardTimeTo)) {
      return;
    }

    if (savedMin !== dashboardTimeFrom || savedMax !== dashboardTimeTo) {
      onOptionsChange({
        ...options,
        xAxis: {
          ...options.xAxis,
          min: dashboardTimeFrom,
          max: dashboardTimeTo,
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardTimeFrom, dashboardTimeTo, savedMin, savedMax, xFields, isTimeBasedXAxis, onOptionsChange]);

  if (_.isError(xFields)) {
    return renderErrorView(props, xFields.message);
  }

  axisLabels.xAxis = _(xFields).map('name').uniq().join(',');

  for (let i = 0; i < data.series.length; i++) {
    const dataframe = data.series[i];
    const xField = xFields[i];

    setDataFrameId(dataframe);

    const { yFields, yFields2 } = getYFields(dataframe, xField, options.yAxis.fields, options.yAxis2?.fields);

    for (const yField of yFields) {
      const yName = getFieldDisplayName(yField, dataframe, data.series);
      const plotlyXAxisField = options.displayVertically ? xField : yField;
      const plotlyYAxisField = options.displayVertically ? yField : xField;
      axisLabels.yAxis = _.union(axisLabels.yAxis, [(yField).name]);
      plotData.push({
        x: plotlyXAxisField ? getFieldValues(plotlyXAxisField) : [],
        y: plotlyYAxisField ? getFieldValues(plotlyYAxisField) : [],
        name: yName,
        ...getModeAndType(options.series.plotType),
        fill: options.series.areaFill && options.series.plotType === 'line' ? 'tozeroy' : 'none',
        marker: {
          size: options.series.markerSize,
          color: getFixedColor(yField, theme)
        },
        line: {
          width: options.series.lineWidth,
          shape: options.series.staircase ? 'hv' : 'linear',
        },
        orientation: options.displayVertically ? 'v' : 'h',
        customdata: [dataframe.meta?.custom?.id],
      });
    }

    if (yFields2 && props.options.showYAxis2) {
      for (const yField2 of yFields2) {
        const yName = getFieldDisplayName(yField2, dataframe, data.series);
        const plotlyXAxisField = options.displayVertically ? xField : yField2;
        const plotlyYAxisField = options.displayVertically ? yField2 : xField;
        axisLabels.yAxis2 = _.union(axisLabels.yAxis2, [(yField2).name]);
        plotData.push({
          x: plotlyXAxisField ? getFieldValues(plotlyXAxisField) : [],
          y: plotlyYAxisField ? getFieldValues(plotlyYAxisField) : [],
          xaxis: options.displayVertically ? 'x' : 'x2',
          yaxis: options.displayVertically ? 'y2' : 'y',
          name: yName,
          ...getModeAndType(options.series2.plotType),
          fill: options.series2.areaFill && options.series2.plotType === 'line' ? 'tozeroy' : 'none',
          marker: {
            size: options.series2.markerSize,
            color: getFixedColor(yField2, theme)
          },
          line: {
            width: options.series2.lineWidth,
            shape: options.series2.staircase ? 'hv' : 'linear',
          },
          orientation: options.displayVertically ? 'v' : 'h',
          customdata: [dataframe.meta?.custom?.id],
        });
      }
    }
  }

  const handlePlotClick = (plotEvent: Readonly<Plotly.PlotMouseEvent>) => {
    const point = plotEvent.points[0];
    const [id] = point.data.customdata;
    const frame = data.series.find((frame) => frame.meta?.custom?.id === id);
    if (!frame) {
      return;
    }

    const field = frame.fields.find((field) => point.data.name === getFieldDisplayName(field, frame, data.series));

    if (!field?.getLinks || !hasLinks(field)) {
      return;
    }

    const links = field.getLinks({ valueRowIndex: point.pointIndex });
    setMenu({
      x: plotEvent.event.x,
      y: plotEvent.event.y,
      show: true,
      items: [{ label: 'Data links', items: linkModelToContextMenuItems(() => links) }],
    });
  };

  const handlePlotRelayout = (event: Readonly<Plotly.PlotRelayoutEvent>) => {
    const { "xaxis.range[0]": xAxisMin, "xaxis.range[1]": xAxisMax, "xaxis.autorange": autoRange } = event;

    if (autoRange) {
      onOptionsChange({...options, xAxis: { ...options.xAxis, min: undefined, max: undefined }});
      return;
    }

    if (!xAxisMin || !xAxisMax) {
      return;
    }

    if (typeof xAxisMin === 'string' && typeof xAxisMax === 'string') {
      const from = dateTimeParse(xAxisMin);
      const to = dateTimeParse(xAxisMax);

      if (from.isValid() && to.isValid()) {
        props.onChangeTimeRange({ from: from.valueOf(), to: to.valueOf() });
        onOptionsChange({...options, xAxis: { ...options.xAxis, min: from.valueOf(), max: to.valueOf() } });
      }
    } else {
      if (!Number.isFinite(xAxisMin) || !Number.isFinite(xAxisMax)) {
        return;
      }
      
      props.onOptionsChange({...options, xAxis: { ...options.xAxis, min: xAxisMin, max: xAxisMax } });
      syncNumericXAxisRange(xAxisMin, xAxisMax);
    }
  };

  const syncNumericXAxisRange = (xAxisMin: number, xAxisMax: number) => {
    if(!options.xAxis.field) {
      return;
    }

    const queryParams = locationService.getSearchObject();
    const syncTargetsQueryParam = queryParams['nisl-syncXAxisRangeTargets'];
    const syncTargets =
      typeof syncTargetsQueryParam === 'string'
        ? syncTargetsQueryParam
            .split(',')
            .map(id => Number(id.trim()))
            .filter(id => !isNaN(id) && id >= 0)
        : [];

    if (!syncTargets.includes(props.id)) {
      return;
    }
    
    const xAxisPrecisionDecimals = 6;
    const updatedXAxisMin = Number(xAxisMin.toFixed(xAxisPrecisionDecimals));
    const updatedXAxisMax = Number(xAxisMax.toFixed(xAxisPrecisionDecimals));
    const existingXAxisMinParam = queryParams[`nisl-${options.xAxis.field}-min`];
    const existingXAxisMaxParam = queryParams[`nisl-${options.xAxis.field}-max`];
    const existingXAxisMin = parseNumericQueryParam(existingXAxisMinParam);
    const existingXAxisMax = parseNumericQueryParam(existingXAxisMaxParam);

    if (
      updatedXAxisMin !== existingXAxisMin ||
      updatedXAxisMax !== existingXAxisMax
    ) {
      publishXAxisRangeUpdate(
        updatedXAxisMin, 
        updatedXAxisMax, 
        options.xAxis.field
      );
    }
  };

  const parseNumericQueryParam = (paramValue: UrlQueryValue): number | undefined => {
    if (typeof paramValue === 'string' && paramValue !== '') {
      return Number(paramValue);
    }

    return undefined;
  };

  const handleImageDownload = (gd: PlotlyHTMLElement) =>
    toImage(gd, { format: 'png', width, height }).then((data) => saveAs(data, props.title));

  return (
    <div>
      <Plot
        data={plotData}
        layout={{
          width,
          height,
          annotations:
            plotData.length === 0 || !plotData.find((d) => d.y?.length) ? [{ text: 'No data', showarrow: false }] : [],
          ...getLayout(theme, traceColors, options, plotData, axisLabels),
        }}
        config={getConfig(options, handleImageDownload)}
        onClick={handlePlotClick}
        onRelayout={handlePlotRelayout}
      />
      {menu.show && (
        <ContextMenu
          renderMenuItems={() => renderMenuItems(menu.items)}
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu({ ...menu, show: false })}
        />
      )}
    </div>
  );
};

// Fingerprint a dataframe so we can backreference it when a plot is clicked
const setDataFrameId = (frame: DataFrame) => {
  if (frame.meta?.custom?.id) {
    return;
  }
  _.set(frame, 'meta.custom.id', _.uniqueId());
};

const getXFields = (frames: DataFrame[], selectedField?: string) => {
  if (frames.length === 0) {
    throw Error('No data');
  } else if (frames.some(frame => frame.fields.length < 2)) {
    throw Error(`One or more series does not contain at least two fields.`)
  }

  // If user explicitly picked an X Field, try to grab it from every data frame,
  // throwing an error if it's missing or the types aren't consistent.
  if (selectedField) {
    const fields = getFieldsByName(frames, selectedField);

    if (fields.length !== frames.length) {
      throw Error('Configured X field is missing in one or more series.');
    } else if (_(fields).countBy('type').size() > 1) {
      throw Error('Configured X field is not the same type across every series.');
    }

    return fields;
  }

  // Otherwise, we try to pick fields automatically.
  const fieldsByType = frames.map(frame => _.groupBy(frame.fields, 'type'));

  // First, look to see if every data frame has a matching time field.
  const timeField = _.find(fieldsByType[0].time,
    f => fieldsByType.every(fields => _.some(fields.time, ['name', f.name])));

  if (timeField) {
    return getFieldsByName(frames, timeField.name);
  }

  // Try to find a time field in every frame, even if the names don't match
  const timeFields = fieldsByType.map(fields => _.first(fields.time)).filter(notEmpty);
  if (timeFields.length === frames.length) {
    return timeFields;
  }

  // Matching numeric fields
  const numberField = _.find(fieldsByType[0].number,
      f => fieldsByType.every(fields => _.some(fields.number, ['name', f.name])));

  if (numberField) {
    return getFieldsByName(frames, numberField.name);
  }

  // Lastly, try matching string fields
  const stringField = _.find(fieldsByType[0].string,
    f => fieldsByType.every(fields => _.some(fields.string, ['name', f.name])));

  if (stringField) {
    return getFieldsByName(frames, stringField.name);
  }

  throw Error('The X field could not be automatically configured.');
};

const getYFields = (frame: DataFrame, xField: Field, selectedYFields: string[] = [], selectedY2Fields: string[] = []) => {
  // Don't consider X field.
  const frameFields = _.without(frame.fields, xField);

  const yFields = selectedYFields.length ?
    frameFields.filter(f => selectedYFields.includes(f.name)) :
    frameFields.filter(f => f.type === FieldType.number); // If not configured, select all numeric fields.

  const yFields2 = selectedY2Fields.length ?
    frame.fields.filter(f => selectedY2Fields.includes(f.name)) :
    [];

  return { yFields, yFields2 };
};

const getFixedColor = (field: Field, theme: GrafanaTheme2) => {
  if (!field.config.color?.fixedColor || field.config.color.mode !== FieldColorModeId.Fixed) {
    return;
  }

  return theme.visualization.getColorByName(field.config.color.fixedColor);
};

const getModeAndType = (type: string) => {
  switch (type) {
    case 'line':
      return { mode: 'lines' as PlotData['mode'], type: 'scatter' as PlotType };
    case 'points':
      return { mode: 'markers' as PlotData['mode'], type: 'scatter' as PlotType };
    default:
      return { type: type as PlotType };
  }
};

const getFieldValues = (field: Field) => {
  if (field.type === FieldType.time) {
    return field.values.toArray().map((value) => {
      return typeof value === 'number' ? new Date(value) : value;
    });
  } else {
    return field.values.toArray();
  }
};

const getRange = (minimum: number | undefined, maximum: number | undefined, axisData: any[]) => {
  const data = _.flatten(axisData);
  if (minimum !== undefined) {
    if (maximum !== undefined) {
      return [minimum, maximum];
    }

    return [minimum, Math.ceil(_.max(data))];
  }

  if (maximum !== undefined) {
    return [Math.floor(_.min(data)), maximum];
  }

  return;
};

const getConfig = (options: PanelOptions, handleImageDownload: (gd: PlotlyHTMLElement) => void): Partial<Plotly.Config> => ({
  displayModeBar: options.showModeBar ? 'hover' : false,
  modeBarButtonsToAdd: [
    {
      // unique id prevents Plotly from caching the click callback, leading to stale closures
      name: 'toImageGrafana' + _.uniqueId(),
      title: 'Download plot as png',
      icon: Icons.camera,
      click: handleImageDownload,
    },
  ],
  modeBarButtonsToRemove: ['toImage'],
  displaylogo: false,
  showTips: false,
});

const getLayout = (theme: GrafanaTheme2, traceColors: string[], options: PanelOptions, data: Array<Partial<PlotData>>, axisLabels: AxisLabels) => {
  const originalAxisTitleX = getTemplateSrv().replace(options.xAxis.title) || axisLabels.xAxis;
  const originalAxisTitleY = getTemplateSrv().replace(options.yAxis.title) || axisLabels.yAxis.join(', ');
  const xAxisOptions = options.displayVertically ? options.xAxis : options.yAxis;
  const xAxisTitle = options.displayVertically ? originalAxisTitleX : originalAxisTitleY;
  const yAxisOptions = options.displayVertically ? options.yAxis : options.xAxis;
  const yAxisTitle = options.displayVertically ? originalAxisTitleY : originalAxisTitleX;
  const showXAxis2 = options.showYAxis2 && !options.displayVertically;
  const showYAxis2 = options.showYAxis2 && options.displayVertically;
  const layout: Partial<Plotly.Layout> = {
    colorway: traceColors,
    margin: { r: 40, l: 40, t: 20, b: 40 },
    paper_bgcolor: theme.components.panel.background,
    plot_bgcolor: theme.components.panel.background,
    font: {
      color: theme.colors.text.primary,
      family: theme.typography.fontFamily,
    },
    xaxis: {
      automargin: true,
      title: xAxisTitle,
      range: getRange(
        xAxisOptions.min,
        xAxisOptions.max,
        data.filter((d) => d.xaxis !== 'x2').map((d) => d.x)
      ),
      type: xAxisOptions.scale as AxisType,
      tickformat: xAxisOptions.decimals ? `.${xAxisOptions.decimals}f` : '',
      ticksuffix: xAxisOptions.unit ? ` ${xAxisOptions.unit}` : '',
      zeroline: false,
    },
    xaxis2: {
      visible: showXAxis2,
      automargin: true,
      overlaying: 'x',
      side: 'top',
      title: getTemplateSrv().replace(options.yAxis2?.title) || axisLabels.yAxis2.join(', '),
      range: getRange(
        options.yAxis2?.min,
        options.yAxis2?.max,
        data.filter((d) => d.xaxis === 'x2').map((d) => d.x)
      ),
      type: options.yAxis2?.scale as AxisType,
      tickformat: options.yAxis2?.decimals ? `.${options.yAxis2?.decimals}f` : '',
      ticksuffix: options.yAxis2?.unit ? ` ${getTemplateSrv().replace(options.yAxis2?.unit)}` : '',
      zeroline: false,
    },
    yaxis: {
      fixedrange: true,
      automargin: true,
      title: yAxisTitle,
      range: getRange(
        yAxisOptions.min,
        yAxisOptions.max,
        data.filter((d) => d.yaxis !== 'y2').map((d) => d.y)
      ),
      type: yAxisOptions.scale as AxisType,
      tickformat: yAxisOptions.decimals ? `.${yAxisOptions.decimals}f` : '',
      ticksuffix: yAxisOptions.unit ? ` ${getTemplateSrv().replace(options.yAxis.unit)}` : '',
      autorange: shouldInvertVerticalAxis(options) ? 'reversed' : undefined,
      zeroline: false,
    },
    yaxis2: {
      fixedrange: true,
      visible: showYAxis2,
      automargin: true,
      overlaying: 'y',
      side: 'right',
      title: getTemplateSrv().replace(options.yAxis2?.title) || axisLabels.yAxis2.join(', '),
      range: getRange(
        options.yAxis2?.min,
        options.yAxis2?.max,
        data.filter((d) => d.yaxis === 'y2').map((d) => d.y)
      ),
      type: options.yAxis2?.scale as AxisType,
      tickformat: options.yAxis2?.decimals ? `.${options.yAxis2?.decimals}f` : '',
      ticksuffix: options.yAxis2?.unit ? ` ${getTemplateSrv().replace(options.yAxis2?.unit)}` : '',
      zeroline: false,
    },
    showlegend: options.showLegend,
    legend: getLegendLayout(options.legendPosition, showYAxis2, !!xAxisOptions.title),
    barmode: options.series.stackBars ? 'stack' : 'group',
    hovermode: 'closest',
  };

  return layout;
};

const getLegendLayout = (position: string, showYAxis2: boolean, showXAxisLabel: boolean): Partial<Legend> => {
  if (position === 'bottom') {
    return {
      orientation: 'h',
      x: 0,
      xanchor: 'left',
      y: showXAxisLabel ? -0.3 : -0.2,
      yanchor: 'top',
    };
  }
  return {
    orientation: 'v',
    x: showYAxis2 ? 1.1 : 1,
    xanchor: 'left',
    y: 1,
    yanchor: 'top',
  };
};

const shouldInvertVerticalAxis = (options: PanelOptions) => {
  return options.displayVertically === false && options.invertXAxis;
};

const renderErrorView = (props: Props, message: string) => {
  return <PanelDataErrorView panelId={props.id} data={props.data} message={message}></PanelDataErrorView>
};
