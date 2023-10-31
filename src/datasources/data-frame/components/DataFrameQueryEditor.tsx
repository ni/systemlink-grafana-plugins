import React, { useState } from 'react';
import { useAsync } from 'react-use';
import { CoreApp, QueryEditorProps, SelectableValue, toOption } from '@grafana/data';
import { DataFrameDataSource } from '../DataFrameDataSource';
import { DataFrameQuery, DataFrameQueryType } from '../types';
import {
  InlineField,
  InlineSwitch,
  MultiSelect,
  Select,
  AsyncSelect,
  LoadOptionsCallback,
  RadioButtonGroup,
} from '@grafana/ui';
import { decimationMethods } from '../constants';
import _ from 'lodash';
import { getTemplateSrv } from '@grafana/runtime';
import { isValidId } from '../utils';
import { FloatingError, parseErrorMessage } from '../errors';
import { enumToOptions, getWorkspaceName } from 'core/utils';

type Props = QueryEditorProps<DataFrameDataSource, DataFrameQuery>;

export const DataFrameQueryEditor = (props: Props) => {
  const { datasource, onChange } = props;
  const query = datasource.processQuery(props.query);
  const onRunQuery = () => props.app !== CoreApp.Explore && props.onRunQuery();

  const [errorMsg, setErrorMsg] = useState<string>('');
  const handleError = (error: Error) => setErrorMsg(parseErrorMessage(error));

  const tableMetadata = useAsync(() => datasource.getTableMetadata(query.tableId).catch(handleError), [query.tableId]);

  const handleQueryChange = (value: DataFrameQuery, runQuery: boolean) => {
    onChange(value);
    if (runQuery) {
      onRunQuery();
    }
  };

  const handleIdChange = (item: SelectableValue<string>) => {
    if (query.tableId !== item.value) {
      handleQueryChange({ ...query, tableId: item.value, columns: [] }, query.type === DataFrameQueryType.Metadata);
    }
  };

  const handleColumnChange = (items: Array<SelectableValue<string>>) => {
    handleQueryChange({ ...query, columns: items.map(i => i.value!) }, false);
  };

  const loadTableOptions = _.debounce((query: string, cb?: LoadOptionsCallback<string>) => {
    Promise.all([datasource.queryTables(query), datasource.getWorkspaces()])
      .then(([tables, workspaces]) =>
        cb?.(
          tables.map(t => ({
            label: t.name,
            value: t.id,
            title: t.id,
            description: getWorkspaceName(workspaces, t.workspace),
          }))
        )
      )
      .catch(handleError);
  }, 300);

  const handleLoadOptions = (query: string, cb?: LoadOptionsCallback<string>) => {
    if (!query || query.startsWith('$')) {
      return cb?.(getVariableOptions().filter(v => v.value?.includes(query)));
    }

    loadTableOptions(query, cb);
  };

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
          loadOptions={handleLoadOptions}
          onChange={handleIdChange}
          placeholder="Search by name or enter id"
          width={30}
          value={query.tableId ? toOption(query.tableId) : null}
        />
      </InlineField>
      {query.type === DataFrameQueryType.Data && (
        <>
          <InlineField label="Columns" shrink={true} tooltip={tooltips.columns}>
            <MultiSelect
              isLoading={tableMetadata.loading}
              options={(tableMetadata.value?.columns ?? []).map(c => toOption(c.name))}
              onChange={handleColumnChange}
              onBlur={onRunQuery}
              value={query.columns.map(toOption)}
            />
          </InlineField>
          <InlineField label="Decimation" tooltip={tooltips.decimation}>
            <Select
              options={decimationMethods}
              onChange={item => handleQueryChange({ ...query, decimationMethod: item.value! }, true)}
              value={query.decimationMethod}
            />
          </InlineField>
          <InlineField label="Filter nulls" tooltip={tooltips.filterNulls}>
            <InlineSwitch
              value={query.filterNulls}
              onChange={event => handleQueryChange({ ...query, filterNulls: event.currentTarget.checked }, true)}
            ></InlineSwitch>
          </InlineField>
          <InlineField label="Use time range" tooltip={tooltips.useTimeRange}>
            <InlineSwitch
              value={query.applyTimeFilters}
              onChange={event => handleQueryChange({ ...query, applyTimeFilters: event.currentTarget.checked }, true)}
            ></InlineSwitch>
          </InlineField>
        </>
      )}
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
  queryType: `Data allows you to visualize the rows of data in a table. Metadata allows you
              to visualize the properties associated with a table.`,

  columns: `Specifies the columns to include in the response data.`,

  decimation: `Specifies the method used to decimate the data.`,

  filterNulls: `Filters out null and NaN values before decimating the data.`,

  useTimeRange: `Queries only for data within the dashboard time range if the table index is a
                timestamp. Enable when interacting with your data on a graph.`,
};
