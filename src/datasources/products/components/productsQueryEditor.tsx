import React, { } from 'react';
import { AutoSizeInput, VerticalGroup, InlineFormLabel, InlineSwitch, MultiSelect, Select, HorizontalGroup } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { InlineField } from 'core/components/InlineField';
import { productsDataSource } from '../productsDataSource';
import { ProductsQuery, OrderBy, MetaData } from '../types';
import _ from 'lodash';
import { TestProductsQueryBuilder } from '../QueryBuilder';
import './productsQueryEditor.scss'


type Props = QueryEditorProps<productsDataSource, ProductsQuery>;

export function productsQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  query = datasource.prepareQuery(query);
  const workspaces = datasource.getWorkspaceNames()

  const onMetaDataChange = (items: Array<SelectableValue<string>>) => {
    if (items !== undefined) {
      onChange({ ...query, metaData: items.map(i => i.value as MetaData) });
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

  return (
    <>
      <HorizontalGroup spacing='lg' align='flex-start'>
        <VerticalGroup spacing='md'>
          <InlineField label="Metadata" labelWidth={20} tooltip={tooltip.metaData}>
            <MultiSelect
              placeholder='Select Metadata'
              options={Object.keys(MetaData).map(value => ({ label: value, value })) as SelectableValue[]}
              onChange={onMetaDataChange}
              value={query.metaData}
              defaultValue={query.metaData!}
              width={40}
              allowCustomValue={true}
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
          <TestProductsQueryBuilder
            autoComplete={datasource.queryProductValues.bind(datasource)}
            onChange={(event: any) => onQueryByChange(event.detail.linq)}
            defaultValue={query.queryBy}
            workspaceList={workspaces}
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
