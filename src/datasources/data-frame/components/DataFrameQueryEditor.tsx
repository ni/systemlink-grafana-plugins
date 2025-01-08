import React, { useState } from 'react';
import { useAsync } from 'react-use';
import { SelectableValue, toOption } from '@grafana/data';
import { InlineField, InlineSwitch, MultiSelect, Select, AsyncSelect, RadioButtonGroup, AutoSizeInput, HorizontalGroup, VerticalGroup } from '@grafana/ui';
import { decimationMethods } from '../constants';
import _ from 'lodash';
import { getTemplateSrv } from '@grafana/runtime';
import { isValidId } from '../utils';
import { FloatingError, parseErrorMessage } from '../../../core/errors';
import { DataFrameQueryEditorCommon, Props } from './DataFrameQueryEditorCommon';
import { enumToOptions } from 'core/utils';
import { DataFrameQueryType } from '../types';
import { TestMonitorQueryBuilder } from 'shared/queryBuilder';

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

  const fields = [
    {
      label: 'Id',
      dataField: 'partNumber',
      dataType: 'string',
      filterOperations: ['=', '<>', 'startswith', 'endswith', 'contains', 'notcontains', 'isblank', 'isnotblank',],
      // lookup: { dataSource: getDataSource('PART_NUMBER'), minLength: 1 },
    },
    {
      label: 'Family',
      dataField: 'family',
      dataType: 'string',
      filterOperations: ['=', '<>', 'contains', 'notcontains', 'isblank', 'isnotblank'],
      // lookup: { dataSource: getDataSource('FAMILY'), minLength: 1},
    },
    {
      label: 'Name',
      dataField: 'name',
      dataType: 'string',
      filterOperations: ['=', '<>', 'contains', 'notcontains', 'isblank', 'isnotblank'],
      // lookup: { dataSource: getDataSource('NAME'), minLength: 1 },
    },
    {
      label: 'Properties',
      dataField: 'properties',
      dataType: 'Object',
      filterOperations: ['key_value_matches'],
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
    {
      label: 'Workspace',
      dataField: 'workspace',
      dataType: 'string',
      filterOperations: ['=', '<>'],
      // lookup: { dataSource: workspaces},
    },
  ];

  return (
    <div>

      {/* <InlineField label="Query type" tooltip={tooltips.queryType} labelWidth={18}>
        <RadioButtonGroup
          options={enumToOptions(DataFrameQueryType)}
          value={common.query.type}
          onChange={value => common.handleQueryChange({ ...common.query, type: value }, true)}
        />
      </InlineField> */}
      {/* <InlineField label="Id">
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
      </InlineField> */}
      <>

      </>
      <HorizontalGroup spacing='lg' align='flex-start'>
        <VerticalGroup>
          <InlineField label="Query type" tooltip={tooltips.queryType} labelWidth={18}>
            <RadioButtonGroup
              options={enumToOptions(DataFrameQueryType)}
              value={common.query.type}
              onChange={value => common.handleQueryChange({ ...common.query, type: value }, true)}
            />
          </InlineField>
          <InlineField label='Query By' labelWidth={18} tooltip={tooltips.queryType}>
            <TestMonitorQueryBuilder
              onChange={(event: any) => { }}
              // defaultValue={query.queryBy}
              fields={fields}
            />
          </InlineField>
        </VerticalGroup>
        {common.query.type === DataFrameQueryType.Properties && (
          <VerticalGroup>
            <>
              <div style={{ padding: '7% 0 0 0' }}>
                <InlineField label="Properties" labelWidth={20} tooltip={tooltips.columns}>
                  <MultiSelect
                    placeholder='Select properties to fetch'
                    // options={Object.keys(Properties).map(value => ({ label: value, value })) as SelectableValue[]}
                    onChange={() => { }}
                    // value={query.properties}
                    // defaultValue={query.properties!}
                    width={40}
                    allowCustomValue={false}
                    closeMenuOnSelect={false} />
                </InlineField>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <InlineField label="OrderBy" labelWidth={20} tooltip={tooltips.queryType}>
                      <Select
                        // options={OrderBy as SelectableValue[]}
                        onChange={() => { }}
                        // value={query.orderBy}
                        // defaultValue={OrderBy[0]}
                        width={25} />
                    </InlineField>
                    <InlineField label="Descending" tooltip={tooltips.queryType}>
                      <InlineSwitch
                        onChange={event => { }}
                      // value={query.descending} 
                      />
                    </InlineField>
                  </div>
                  <InlineField label="Records to Query" labelWidth={20} tooltip={tooltips.queryType}>
                    <AutoSizeInput
                      minWidth={20}
                      maxWidth={40}
                      defaultValue={100}
                      onCommitChange={() => { }} />
                  </InlineField>
                </div>
              </div>
            </>
          </VerticalGroup>
        )}
        {common.query.type === DataFrameQueryType.Data && (
          <VerticalGroup>
              <>
              <div style={{ padding: '15% 0 0 0' }}>
                <InlineField label="Columns" shrink={true} tooltip={tooltips.columns} labelWidth={18}>
                  <MultiSelect
                    isLoading={tableMetadata.loading}
                    options={loadColumnOptions()}
                    onChange={handleColumnChange}
                    onBlur={common.onRunQuery}
                    value={common.query.columns.map(toOption)}
                  />
                </InlineField>
                <InlineField label="Decimation" tooltip={tooltips.decimation} labelWidth={18}>
                  <Select
                    options={decimationMethods}
                    onChange={item => common.handleQueryChange({ ...common.query, decimationMethod: item.value! }, true)}
                    value={common.query.decimationMethod}
                  />
                </InlineField>
                <InlineField label="Filter nulls" tooltip={tooltips.filterNulls} labelWidth={18}>
                  <InlineSwitch
                    value={common.query.filterNulls}
                    onChange={event => common.handleQueryChange({ ...common.query, filterNulls: event.currentTarget.checked }, true)}
                  ></InlineSwitch>
                </InlineField>
                <InlineField label="Use time range" tooltip={tooltips.useTimeRange} labelWidth={18}>
                  <InlineSwitch
                    value={common.query.applyTimeFilters}
                    onChange={event => common.handleQueryChange({ ...common.query, applyTimeFilters: event.currentTarget.checked }, true)}
                  ></InlineSwitch>
                </InlineField>
                <InlineField label="Records to Query" tooltip={tooltips.columns} labelWidth={18} >
                  <AutoSizeInput
                    minWidth={10}
                    maxWidth={40}
                    defaultValue={100}
                    onCommitChange={() => { }}
                  />
                </InlineField>
          </div>
              </>
            </VerticalGroup>
        )}
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
  queryType: `Specifies whether to visualijze the data rows or properties associated with a table.`,

  columns: `Specifies the columns to include in the response data.`,

  decimation: `Specifies the method used to decimate the data.`,

  filterNulls: `Specifies whether to filter out null and NaN values before decimating the data.`,

  useTimeRange: `Specifies whether to query only for data within the dashboard time range if the
                table index is a timestamp. Enable when interacting with your data on a graph.`,
};
