import {
  PanelPlugin,
  FieldOverrideContext,
  FieldConfigProperty,
  FieldColorModeId,
  SelectableValue,
  SelectFieldConfigSettings,
} from '@grafana/data';
import { getFieldTypeIcon } from '@grafana/ui';
import { PanelOptions } from './types';
import { PlotlyPanel } from './PlotlyPanel';

export const plugin = new PanelPlugin<PanelOptions>(PlotlyPanel)
  .setPanelOptions((builder) => {
    return builder
      .addFieldNamePicker({
        path: 'xAxis.field',
        name: 'Field',
        settings: { placeholderText: 'Auto' },
        category: ['X Axis'],
      })
      .addTextInput({
        path: 'xAxis.title',
        name: 'Label',
        defaultValue: '',
        settings: {
          placeholder: 'Auto',
        },
        category: ['X Axis'],
      })
      .addSelect({
        path: 'xAxis.scale',
        name: 'Scale',
        settings: {
          options: [],
          getOptions: getScaleOptions,
        },
        defaultValue: '',
        category: ['X Axis'],
      })
      .addNumberInput({
        path: 'xAxis.min',
        name: 'Min',
        settings: {
          placeholder: 'Auto',
        },
        category: ['X Axis'],
      })
      .addNumberInput({
        path: 'xAxis.max',
        name: 'Max',
        settings: {
          placeholder: 'Auto',
        },
        category: ['X Axis'],
      })
      .addNumberInput({
        path: 'xAxis.decimals',
        name: 'Decimals',
        settings: {
          placeholder: 'Auto',
          min: 0,
        },
        category: ['X Axis'],
      })
      .addTextInput({
        path: 'xAxis.unit',
        name: 'Unit',
        defaultValue: '',
        category: ['X Axis'],
      })
      .addMultiSelect<string, SelectFieldConfigSettings<string>>({
        path: 'yAxis.fields',
        name: 'Field',
        settings: {
          options: [],
          getOptions: (context) => getFieldOptions(context, (context.options as PanelOptions)?.yAxis.fields),
        },
        category: ['Y Axis'],
      })
      .addTextInput({
        path: 'yAxis.title',
        name: 'Label',
        defaultValue: '',
        settings: {
          placeholder: 'Auto',
        },
        category: ['Y Axis'],
      })
      .addSelect({
        path: 'yAxis.scale',
        name: 'Scale',
        settings: {
          options: [],
          getOptions: getScaleOptions,
        },
        defaultValue: '',
        category: ['Y Axis'],
      })
      .addNumberInput({
        path: 'yAxis.min',
        name: 'Min',
        settings: {
          placeholder: 'Auto',
        },
        category: ['Y Axis'],
      })
      .addNumberInput({
        path: 'yAxis.max',
        name: 'Max',
        settings: {
          placeholder: 'Auto',
        },
        category: ['Y Axis'],
      })
      .addNumberInput({
        path: 'yAxis.decimals',
        name: 'Decimals',
        settings: {
          placeholder: 'Auto',
          min: 0,
        },
        category: ['Y Axis'],
      })
      .addTextInput({
        path: 'yAxis.unit',
        name: 'Unit',
        defaultValue: '',
        category: ['Y Axis'],
      })
      .addRadio({
        path: 'series.plotType',
        name: 'Plot type',
        settings: {
          options: [
            { label: 'Line', value: 'line' },
            { label: 'Bar', value: 'bar' },
            { label: 'Points', value: 'points' },
            { label: 'Box', value: 'box' },
            { label: 'Violin', value: 'violin' },
            { label: 'Histogram', value: 'histogram' },
          ],
        },
        defaultValue: 'line',
        category: ['Y Axis'],
      })
      .addBooleanSwitch({
        path: 'series.stackBars',
        name: 'Stack bars',
        defaultValue: false,
        showIf: (options) => options.series.plotType === 'bar',
        category: ['Y Axis'],
      })
      .addBooleanSwitch({
        path: 'series.areaFill',
        name: 'Area fill',
        defaultValue: false,
        showIf: (options) => options.series.plotType === 'line',
        category: ['Y Axis'],
      })
      .addBooleanSwitch({
        path: 'series.staircase',
        name: 'Staircase',
        defaultValue: false,
        showIf: (options) => options.series.plotType === 'line',
        category: ['Y Axis'],
      })
      .addNumberInput({
        path: 'series.lineWidth',
        name: 'Line width',
        defaultValue: 1,
        settings: {
          min: 1,
        },
        showIf: (options) => options.series.plotType === 'line',
        category: ['Y Axis'],
      })
      .addNumberInput({
        path: 'series.markerSize',
        name: 'Point size',
        defaultValue: 6,
        settings: {
          min: 1,
        },
        showIf: (options) => options.series.plotType === 'points',
        category: ['Y Axis'],
      })
      .addBooleanSwitch({
        path: 'showYAxis2',
        name: 'Show',
        defaultValue: false,
        category: ['Secondary Y Axis'],
      })
      .addMultiSelect<string, SelectFieldConfigSettings<string>>({
        path: 'yAxis2.fields',
        settings: {
          options: [],
          getOptions: (context) => getFieldOptions(context, (context.options as PanelOptions)?.yAxis2.fields),
          allowCustomValue: true,
        },
        name: 'Field',
        showIf: (options) => options.showYAxis2,
        category: ['Secondary Y Axis'],
      })
      .addTextInput({
        path: 'yAxis2.title',
        name: 'Label',
        defaultValue: '',
        settings: {
          placeholder: 'Auto',
        },
        showIf: (options) => options.showYAxis2,
        category: ['Secondary Y Axis'],
      })
      .addSelect({
        path: 'yAxis2.scale',
        name: 'Scale',
        settings: {
          options: [],
          getOptions: getScaleOptions,
        },
        defaultValue: '',
        showIf: (options) => options.showYAxis2,
        category: ['Secondary Y Axis'],
      })
      .addNumberInput({
        path: 'yAxis2.min',
        name: 'Min',
        settings: {
          placeholder: 'Auto',
        },
        showIf: (options) => options.showYAxis2,
        category: ['Secondary Y Axis'],
      })
      .addNumberInput({
        path: 'yAxis2.max',
        name: 'Max',
        settings: {
          placeholder: 'Auto',
        },
        showIf: (options) => options.showYAxis2,
        category: ['Secondary Y Axis'],
      })
      .addNumberInput({
        path: 'yAxis2.decimals',
        name: 'Decimals',
        settings: {
          placeholder: 'Auto',
          min: 0,
        },
        showIf: (options) => options.showYAxis2,
        category: ['Secondary Y Axis'],
      })
      .addTextInput({
        path: 'yAxis2.unit',
        name: 'Unit',
        defaultValue: '',
        showIf: (options) => options.showYAxis2,
        category: ['Secondary Y Axis'],
      })
      .addRadio({
        path: 'series2.plotType',
        name: 'Plot type',
        settings: {
          options: [
            { label: 'Line', value: 'line' },
            { label: 'Bar', value: 'bar' },
            { label: 'Points', value: 'points' },
            { label: 'Box', value: 'box' },
            { label: 'Violin', value: 'violin' },
            { label: 'Histogram', value: 'histogram' },
          ],
        },
        defaultValue: 'line',
        showIf: (options) => options.showYAxis2,
        category: ['Secondary Y Axis'],
      })
      .addBooleanSwitch({
        path: 'series2.stackBars',
        name: 'Stack bars',
        defaultValue: false,
        showIf: (options) => options.showYAxis2 && options.series2.plotType === 'bar',
        category: ['Secondary Y Axis'],
      })
      .addBooleanSwitch({
        path: 'series2.areaFill',
        name: 'Area fill',
        defaultValue: false,
        showIf: (options) => options.showYAxis2 && options.series2.plotType === 'line',
        category: ['Secondary Y Axis'],
      })
      .addBooleanSwitch({
        path: 'series2.staircase',
        name: 'Staircase',
        defaultValue: false,
        showIf: (options) => options.showYAxis2 && options.series2.plotType === 'line',
        category: ['Secondary Y Axis'],
      })
      .addNumberInput({
        path: 'series2.lineWidth',
        name: 'Line width',
        defaultValue: 1,
        settings: {
          min: 1,
        },
        showIf: (options) => options.showYAxis2 && options.series2.plotType === 'line',
        category: ['Secondary Y Axis'],
      })
      .addNumberInput({
        path: 'series2.markerSize',
        name: 'Point size',
        defaultValue: 6,
        settings: {
          min: 1,
        },
        category: ['Secondary Y Axis'],
        showIf: (options) => options.showYAxis2 && options.series2.plotType === 'points',
      })
      .addBooleanSwitch({
        path: 'showLegend',
        name: 'Show legend',
        defaultValue: false,
      })
      .addRadio({
        path: 'legendPosition',
        name: 'Legend position',
        settings: {
          options: [
            { label: 'Right', value: 'right' },
            { label: 'Bottom', value: 'bottom' },
          ],
        },
        defaultValue: 'right',
      })
      .addBooleanSwitch({
        path: 'showModeBar',
        name: 'Show plot tools',
        defaultValue: false,
      })
      .addRadio({
        path: 'displayVertically',
        name: 'Orientation',
        settings: {
          options: [
            { label: 'Vertical', value: true },
            { label: 'Horizontal', value: false },
          ],
        },
        defaultValue: true,
      })
      .addBooleanSwitch({
        path: 'invertXAxis',
        name: 'Invert X axis',
        defaultValue: true,
        showIf: (options) => options.displayVertically === false,
      });
  })
  .useFieldConfig({
    standardOptions: {
      [FieldConfigProperty.Color]: {
        settings: {
          byValueSupport: false,
          bySeriesSupport: true,
          preferThresholdsMode: false,
        },
        defaultValue: {
          mode: FieldColorModeId.PaletteClassic,
        },
      },
    },
    disableStandardOptions: [
      FieldConfigProperty.Min,
      FieldConfigProperty.Max,
      FieldConfigProperty.NoValue,
      FieldConfigProperty.Decimals,
      FieldConfigProperty.Mappings,
      FieldConfigProperty.Thresholds,
      FieldConfigProperty.Unit,
      FieldConfigProperty.DisplayName,
    ],
  });

const getFieldOptions = async (context: FieldOverrideContext, selectedFields: string[] = []) => {
  const options: Array<SelectableValue<string>> = [];
  if (context && context.data) {
    for (const frame of context.data) {
      if (frame.fields.length < 2) {
        continue;
      }
      for (const field of frame.fields) {
        if (!options.find((o) => o.label === field.name)) {
          options.push({ value: field.name, label: field.name, icon: getFieldTypeIcon(field) });
        }
      }
    }
  }

  // Add user selected fields, even if they're not part of the data.
  for (const fieldName of selectedFields) {
    if (!options.find(o => o.value === fieldName)) {
      options.push({ value: fieldName, label: `${fieldName} (not found)` });
    }
  }

  return options;
};

const getScaleOptions = async (_: FieldOverrideContext) => {
  return [
    { value: '', label: 'Auto' },
    { value: 'linear', label: 'Linear' },
    { value: 'log', label: 'Log' },
  ];
};
