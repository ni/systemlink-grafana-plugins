import React, { useState } from 'react';
import { useAsync } from 'react-use';
import { CoreApp, QueryEditorProps, SelectableValue, toOption } from '@grafana/data';
import { DataFrameDataSource } from '../DataFrameDataSource';
import { DataFrameQuery } from '../types';
import { InlineField, InlineSwitch, MultiSelect, Select, AsyncSelect, LoadOptionsCallback } from '@grafana/ui';
import { decimationMethods } from '../constants';
import _ from 'lodash';
import { getTemplateSrv } from '@grafana/runtime';
import { isValidId } from '../utils';
import { FloatingError, parseErrorMessage } from '../errors';

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
      handleQueryChange({ ...query, tableId: item.value, columns: [] }, false);
    }
  };

  const handleColumnChange = (items: Array<SelectableValue<string>>) => {
    handleQueryChange({ ...query, columns: items.map(i => i.value!) }, false);
  };

  const loadTableOptions = _.debounce((query: string, cb?: LoadOptionsCallback<string>) => {
    datasource
      .queryTables(query)
      .then((tables) => cb?.(tables.map((t) => ({ label: t.name, value: t.id, description: t.id }))))
      .catch(handleError);
  }, 300);

  const handleLoadOptions = (query: string, cb?: LoadOptionsCallback<string>) => {
    if (!query || query.startsWith('$')) {
      return cb?.(getVariableOptions().filter((v) => v.value?.includes(query)));
    }

    loadTableOptions(query, cb);
  };

  return (
    <div style={{ position: 'relative' }}>
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
      <InlineField label="Columns" shrink={true} tooltip="Specifies the columns to include in the response data.">
        <MultiSelect
          isLoading={tableMetadata.loading}
          options={(tableMetadata.value?.columns ?? []).map(c => toOption(c.name))}
          onChange={handleColumnChange}
          onBlur={onRunQuery}
          value={(query.columns).map(toOption)}
        />
      </InlineField>
      <InlineField label="Decimation" tooltip="Specifies the method used to decimate the data.">
        <Select
          options={decimationMethods}
          onChange={(item) => handleQueryChange({ ...query, decimationMethod: item.value! }, true)}
          value={query.decimationMethod}
        />
      </InlineField>
      <InlineField label="Filter nulls" tooltip="Filters out null and NaN values before decimating the data.">
        <InlineSwitch
          value={query.filterNulls}
          onChange={(event) => handleQueryChange({ ...query, filterNulls: event.currentTarget.checked }, true)}
        ></InlineSwitch>
      </InlineField>
      <InlineField
        label="Use time range"
        tooltip="Queries only for data within the dashboard time range if the table index is a timestamp. Enable when interacting with your data on a graph."
      >
        <InlineSwitch
          value={query.applyTimeFilters}
          onChange={(event) => handleQueryChange({ ...query, applyTimeFilters: event.currentTarget.checked }, true)}
        ></InlineSwitch>
      </InlineField>
      <FloatingError message={errorMsg} />
    </div>
  );
};

const getVariableOptions = () => {
  return getTemplateSrv()
    .getVariables()
    .map((v) => toOption('$' + v.name));
};
