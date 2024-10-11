import React, { } from 'react';
import { AutoSizeInput, VerticalGroup, InlineFormLabel, InlineSwitch, MultiSelect, Select, HorizontalGroup } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { InlineField } from 'core/components/InlineField';
import { productsDataSource } from '../productsDataSource';
import { ProductsQuery, OrderBy, Properties } from '../types';
import _ from 'lodash';
import './productsQueryEditor.scss'
import { TestMonitorQueryBuilder } from 'shared/queryBuilder';


type Props = QueryEditorProps<productsDataSource, ProductsQuery>;

export function productsQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  query = datasource.prepareQuery(query);
  const workspaces = datasource.getWorkspaceNames()

  const onMetaDataChange = (items: Array<SelectableValue<string>>) => {
    if (items !== undefined) {
      onChange({ ...query, properties: items.map(i => i.value as Properties) });
      onRunQuery();
    }
  };

  const onOrderByChange = (item: SelectableValue<string>) => {
    onChange({ ...query, orderBy: item.value });
    onRunQuery();
  }

  const onQueryByChange = (value: string) => {
    onChange({ ...query, queryBy: value });
    onRunQuery();
  };

  const recordCountChange = (event: React.FormEvent<HTMLInputElement>) => {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    onChange({ ...query, recordCount: value });
    onRunQuery();
  }

  const onDescendingChange = (isDescendingChecked: boolean) => {
    onChange({ ...query, descending: isDescendingChecked });
    onRunQuery();
  }

  const getDataSource = (field: string) => {
    return async (query: string, callback: Function) => {
      callback(await datasource.queryProductValues(field, query));
    };
  };

  const fields = [
    {
      label: 'Part Number',
      dataField: 'partNumber',
      dataType: 'string',
      filterOperations: ['=', '<>', 'startswith', 'endswith', 'contains', 'notcontains', 'isblank', 'isnotblank',],
      lookup: { dataSource: getDataSource('PART_NUMBER'), minLength: 1 },
    },
    {
      label: 'Family',
      dataField: 'family',
      dataType: 'string',
      filterOperations: ['=', '<>', 'contains', 'notcontains', 'isblank', 'isnotblank'],
      lookup: { dataSource: getDataSource('FAMILY'), minLength: 1},
    },
    {
      label: 'Name',
      dataField: 'name',
      dataType: 'string',
      filterOperations: ['=', '<>', 'contains', 'notcontains', 'isblank', 'isnotblank'],
      lookup: { dataSource: getDataSource('NAME'), minLength: 1 },
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
      lookup: { dataSource: workspaces},
    },
  ];

  return (
    <>
      <HorizontalGroup spacing='lg' align='flex-start'>
        <VerticalGroup spacing='md'>
          <InlineField label="Metadata" labelWidth={20} tooltip={tooltip.metaData}>
            <MultiSelect
              placeholder='Select Metadata'
              options={Object.keys(Properties).map(value => ({ label: value, value })) as SelectableValue[]}
              onChange={onMetaDataChange}
              value={query.properties}
              defaultValue={query.properties!}
              width={40}
              allowCustomValue={false}
              closeMenuOnSelect={false}
            />
          </InlineField>
          <div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <InlineField label="OrderBy" labelWidth={20} tooltip={tooltip.orderBy}>
                <Select
                  options={OrderBy as SelectableValue[]}
                  onChange={onOrderByChange}
                  value={query.orderBy}
                  defaultValue={OrderBy[0]}
                  width={25}
                />
              </InlineField>
              <InlineField label="Descending" tooltip={tooltip.descending}>
                <InlineSwitch
                  onChange={event => onDescendingChange(event.currentTarget.checked)}
                  value={query.descending}
                />
              </InlineField>
            </div>
            <InlineField label="Records to Query" labelWidth={20} tooltip={tooltip.recordCount}>
              <AutoSizeInput
                minWidth={20}
                maxWidth={40}
                defaultValue={query.recordCount}
                onCommitChange={recordCountChange}
              />
            </InlineField>
          </div>
        </VerticalGroup>
        <VerticalGroup spacing='none'>
          <InlineFormLabel>Query By</InlineFormLabel>
          <TestMonitorQueryBuilder
            onChange={(event: any) => onQueryByChange(event.detail.linq)}
            defaultValue={query.queryBy}
            fields={fields}
          />
        </VerticalGroup>
      </HorizontalGroup>
    </>
  );
}

const tooltip = {
  partNumber: 'Enter the part number to query',
  family: 'Enter the family name to query',
  workspace: 'Select the workspace to query',
  metaData: 'Select the metadata fields to query',
  queryBy: 'Enter the query to filter the results',
  recordCount: 'Enter the number of records to query',
  orderBy: 'Select the field to order the results by',
  descending: 'Select to order the results in descending order'
}
