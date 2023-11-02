import React, { useState } from 'react';
import { useAsync } from 'react-use';
import { SelectableValue, toOption } from '@grafana/data';
import { InlineField, InlineSwitch, MultiSelect, Select, AsyncSelect } from '@grafana/ui';
import { decimationMethods } from '../constants';
import _ from 'lodash';
import { getTemplateSrv } from '@grafana/runtime';
import { isValidId } from '../utils';
import { FloatingError, parseErrorMessage } from '../errors';
import { DataFrameQueryEditorCommon, Props } from './DataFrameQueryEditorCommon';

export const DataFrameQueryEditor = (props: Props) => {
  const [errorMsg, setErrorMsg] = useState<string>('');
  const handleError = (error: Error) => setErrorMsg(parseErrorMessage(error));
  const common = new DataFrameQueryEditorCommon(props, handleError);
  const tableMetadata = useAsync(() => common.datasource.getTableMetadata(common.query.tableId).catch(handleError), [common.query.tableId]);

  const handleColumnChange = (items: Array<SelectableValue<string>>) => {
    common.handleQueryChange({ ...common.query, columns: items.map(i => i.value!) }, false);
  };

  const loadColumnOptions = () => {
    const columnOptions = (tableMetadata.value?.columns ?? []).map(c => toOption(c.name));
    columnOptions.unshift(...getVariableOptions());
    return columnOptions;
  }

  return (
    <div style={{ position: 'relative' }}>
      <InlineField label="Query type" tooltip={tooltips.queryType}>
        <RadioButtonGroup
          options={enumToOptions(DataFrameQueryType)}
          value={query.type}
          onChange={value => handleQueryChange({ ...query, type: value }, true)}
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
      <InlineField label="Columns" shrink={true} tooltip="Specifies the columns to include in the response data.">
        <MultiSelect
          isLoading={tableMetadata.loading}
          options={loadColumnOptions()}
          onChange={handleColumnChange}
          onBlur={common.onRunQuery}
          value={(common.query.columns).map(toOption)}
        />
      </InlineField>
      <InlineField label="Decimation" tooltip="Specifies the method used to decimate the data.">
        <Select
          options={decimationMethods}
          onChange={(item) => common.handleQueryChange({ ...common.query, decimationMethod: item.value! }, true)}
          value={common.query.decimationMethod}
        />
      </InlineField>
      <InlineField label="Filter nulls" tooltip="Filters out null and NaN values before decimating the data.">
        <InlineSwitch
          value={common.query.filterNulls}
          onChange={(event) => common.handleQueryChange({ ...common.query, filterNulls: event.currentTarget.checked }, true)}
        ></InlineSwitch>
      </InlineField>
      <InlineField
        label="Use time range"
        tooltip="Queries only for data within the dashboard time range if the table index is a timestamp. Enable when interacting with your data on a graph."
      >
        <InlineSwitch
          value={common.query.applyTimeFilters}
          onChange={(event) => common.handleQueryChange({ ...common.query, applyTimeFilters: event.currentTarget.checked }, true)}
        ></InlineSwitch>
      </InlineField>
      <FloatingError message={errorMsg} />
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
