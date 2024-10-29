import React, { useState } from 'react';
import { useAsync } from 'react-use';
import { SelectableValue, toOption } from '@grafana/data';
import { InlineField, InlineSwitch, MultiSelect, Select, AsyncSelect, RadioButtonGroup, InlineFormLabel, VerticalGroup, HorizontalGroup } from '@grafana/ui';
import { decimationMethods } from '../constants';
import _ from 'lodash';
import { getTemplateSrv } from '@grafana/runtime';
import { isValidId } from '../utils';
import { FloatingError, parseErrorMessage } from '../../../core/errors';
import { DataFrameQueryEditorCommon, Props } from './DataFrameQueryEditorCommon';
import { enumToOptions } from 'core/utils';
import { DataFrameQueryType, DataTablesProperties } from '../types';
import { TestMonitorQueryBuilder } from 'shared/queryBuilder';
import { Properties } from 'datasources/products/types';

export const DataFrameQueryEditor = (props: Props) => {
  const [errorMsg, setErrorMsg] = useState<string | undefined>('');
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

  const onQueryByChange = (value: string) => {
    common.handleQueryChange({ ...common.query, queryBy: value }, true);
  };

  const onPropertiesChange = (items: Array<SelectableValue<string>>) => {
    if (items !== undefined) {
      common.handleQueryChange({ ...common.query, properties: items.map(i => i.value as Properties) }, true);
    }
  };

  const fields = [
    {
      label: 'Created',
      dataField: 'updatedAt',
      dataType: 'string',
      filterOperations: ['>', '>=', '<', '<='],
      lookup: {
        dataSource: [
          { label: 'From', value: '${__from:date}' },
          { label: 'To', value: '${__to:date}' },
          { label: 'From (YYYY-MM-DD)', value: '${__from:date:YYYY-MM-DD}' },
          { label: 'To (YYYY-MM-DD)', value: '${__to:date:YYYY-MM-DD}' },
        ],
      },
    },
    {
      label: 'ID',
      dataField: 'id',
      dataType: 'string',
      filterOperations: ['=', '<>', 'contains', 'notcontains',],
    },
    {
      label: 'Name',
      dataField: 'name',
      dataType: 'string',
      filterOperations: ['=', '<>', 'contains', 'notcontains',],
    },
    {
      label: 'Metadata modified',
      dataField: 'metadataModified',
      dataType: 'string',
      filterOperations: ['>', '>=', '<', 'isequal'],
      lookup: {
        dataSource: [
          { label: 'From', value: '${__from:date}' },
          { label: 'To', value: '${__to:date}' },
          { label: 'From (YYYY-MM-DD)', value: '${__from:date:YYYY-MM-DD}' },
          { label: 'To (YYYY-MM-DD)', value: '${__to:date:YYYY-MM-DD}' },
        ],
      },
    },
    {
      label: 'Rows modified',
      dataField: 'rowsModified',
      dataType: 'string',
      filterOperations: ['>', '>=', '<', '<='],
      lookup: {
        dataSource: [
          { label: 'From', value: '${__from:date}' },
          { label: 'To', value: '${__to:date}' },
          { label: 'From (YYYY-MM-DD)', value: '${__from:date:YYYY-MM-DD}' },
          { label: 'To (YYYY-MM-DD)', value: '${__to:date:YYYY-MM-DD}' },
        ],
      },
    },
    {
      label: 'Rows',
      dataField: 'rows',
      dataType: 'string',
      filterOperations: ['=', '<>', 'contains', 'notcontains', 'isblank', 'isnotblank', 'isgreaterthan'],
    },
    {
      label: 'Property',
      dataField: 'properties',
      dataType: 'Object',
      filterOperations: ['key_value_matches'],
    },
    {
      label: 'Supports append',
      dataField: 'supportsAppend',
      dataType: 'boolean',
      filterOperations: ['=', '<>',],
    },
    {
      label: 'Updated at',
      dataField: 'updatedAt',
      dataType: 'string',
      filterOperations: ['>', '>=', '<', '<='],
      lookup: {
        dataSource: [
          { label: 'From', value: '${__from:date}' },
          { label: 'To', value: '${__to:date}' },
          { label: 'From (YYYY-MM-DD)', value: '${__from:date:YYYY-MM-DD}' },
          { label: 'To (YYYY-MM-DD)', value: '${__to:date:YYYY-MM-DD}' },
        ],
      },
    },
  ];

  return (
    <div style={{ position: 'relative' }}>
      <HorizontalGroup spacing='lg' align='flex-start'>
        <VerticalGroup spacing='md'>
          <div>
            <InlineField label="Query type" tooltip={tooltips.queryType}>
              <RadioButtonGroup
                options={enumToOptions(DataFrameQueryType)}
                value={common.query.type}
                onChange={value => common.handleQueryChange({ ...common.query, type: value }, true)}
              />
            </InlineField>
            {common.query.type === DataFrameQueryType.Data && (
              <>
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
                <InlineField label="Columns" shrink={true} tooltip={tooltips.columns}>
                  <MultiSelect
                    isLoading={tableMetadata.loading}
                    options={loadColumnOptions()}
                    onChange={handleColumnChange}
                    onBlur={common.onRunQuery}
                    value={common.query.columns.map(toOption)}
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
            {common.query.type === DataFrameQueryType.Metadata && (
              <InlineField label="Properties">
                <MultiSelect
                  placeholder='Select properties to fetch'
                  options={Object.keys(DataTablesProperties).map(value => ({ label: value, value })) as SelectableValue[]}
                  onChange={onPropertiesChange}
                  // value={query.properties}
                  defaultValue={common.query.properties!}
                  width={40}
                  allowCustomValue={false}
                  closeMenuOnSelect={false}
                />
              </InlineField>
            )}
          </div>
        </VerticalGroup>
        <VerticalGroup spacing='none'>
          <InlineFormLabel>Filter By</InlineFormLabel>
          <TestMonitorQueryBuilder
            onChange={(event: any) => onQueryByChange(event.detail.linq)}
            defaultValue={common.query.queryBy}
            fields={fields}
          />
        </VerticalGroup>
      </HorizontalGroup>
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
