import React, { useState } from 'react';
import { useAsync } from 'react-use';
import { SelectableValue, toOption } from '@grafana/data';
import { InlineField, InlineSwitch, MultiSelect, Select, AsyncSelect, RadioButtonGroup, MultiCombobox, ComboboxOption } from '@grafana/ui';
import { decimationMethods } from '../constants';
import _ from 'lodash';
import { getTemplateSrv } from '@grafana/runtime';
import { isValidId } from '../utils';
import { FloatingError, parseErrorMessage } from '../../../core/errors';
import { DataFrameQueryEditorCommon, Props } from './DataFrameQueryEditorCommon';
import { enumToOptions } from 'core/utils';
import { Column, DataFrameQueryType } from '../types';

export const DataFrameQueryEditor = (props: Props) => {
  const [errorMsg, setErrorMsg] = useState<string | undefined>('');
  const handleError = (error: Error) => setErrorMsg(parseErrorMessage(error));
  const common = new DataFrameQueryEditorCommon(props, handleError);
  const tableProperties = useAsync(() => common.datasource.getTableProperties(common.query.tableId).catch(handleError), [common.query.tableId]);
  
  const handleColumnChange = (items: Array<ComboboxOption<string | number>>) => {
    common.handleQueryChange(
      {
        ...common.query,
        columns: items
          .map(i => typeof i.value === 'string' ? i.value : String(i.value))
      },
      false
    );
  };

  const loadColumnOptions = (): Array<{ label: string; value: string }> => {
    const columns = tableProperties.value && 'columns' in tableProperties.value ? tableProperties.value.columns : [];
    const name = tableProperties.value && 'name' in tableProperties.value ? tableProperties.value.name : '';
    const columnOptions = columns.map((c: Column) => ({
      label: c.name,
      value: c.name,
      group: name
    }));
    columnOptions.unshift(...getVariableOptions().map(opt => ({
      label: opt.label ?? opt.value ?? '',
      value: opt.value ?? '',
      group: opt.label ?? opt.value ?? ''
    })));
    return columnOptions;
  }

  return (
    <div style={{ position: 'relative' }}>
      <InlineField label="Query type" tooltip={tooltips.queryType}>
        <RadioButtonGroup
          options={enumToOptions(DataFrameQueryType)}
          value={common.query.type}
          onChange={value => common.handleQueryChange({ ...common.query, type: value }, true)}
        />
      </InlineField>
      <InlineField label="Id">
        <AsyncSelect
          allowCreateWhileLoading
          allowCustomValue
          cacheOptions={false}
          defaultOptions
          isValidNewOption={isValidId}
          loadOptions={common.handleLoadOptions}
          onChange={common.handleIdChange}
          placeholder="Search by name or enter id"
          width={30}
          value={common.query.tableId ? toOption(common.query.tableId) : null}
        />
      </InlineField>
      {common.query.type === DataFrameQueryType.Data && (
        <>
            <InlineField label="Columns" shrink={true} tooltip={tooltips.columns}>
            <MultiCombobox
              options={loadColumnOptions()}
              onChange={handleColumnChange}
              onBlur={common.onRunQuery}
              value={common.query.columns.map(col => ({ label: col, value: col }))}
              width='auto'
              minWidth={20}
            />
            </InlineField>
          <InlineField label="Decimation" tooltip={tooltips.decimation}>
            <Select
              options={decimationMethods}
              onChange={item => common.handleQueryChange({ ...common.query, decimationMethod: item.value! }, true)}
              value={common.query.decimationMethod}
            />
          </InlineField>
          <InlineField label="Filter nulls" tooltip={tooltips.filterNulls}>
            <InlineSwitch
              value={common.query.filterNulls}
              onChange={event => common.handleQueryChange({ ...common.query, filterNulls: event.currentTarget.checked }, true)}
            ></InlineSwitch>
          </InlineField>
          <InlineField label="Use time range" tooltip={tooltips.useTimeRange}>
            <InlineSwitch
              value={common.query.applyTimeFilters}
              onChange={event => common.handleQueryChange({ ...common.query, applyTimeFilters: event.currentTarget.checked }, true)}
            ></InlineSwitch>
          </InlineField>
        </>
      )}
      <FloatingError message={errorMsg}/>
    </div>
  );
};

const getVariableOptions = () => {
  return getTemplateSrv()
    .getVariables()
    .map(v => toOption('$' + v.name));
};

const tooltips = {
  queryType: `Specifies whether to visualize the data rows or properties associated with a table.`,

  columns: `Specifies the columns to include in the response data.`,

  decimation: `Specifies the method used to decimate the data.`,

  filterNulls: `Specifies whether to filter out null and NaN values before decimating the data.`,

  useTimeRange: `Specifies whether to query only for data within the dashboard time range if the
                table index is a timestamp. Enable when interacting with your data on a graph.`,
};
