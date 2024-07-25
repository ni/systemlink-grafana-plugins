import React from 'react';
import { AutoSizeInput, InlineSwitch, MultiSelect, Select } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { InlineField } from 'core/components/InlineField';
import { productsDataSource } from '../productsDataSource';
import { ProductsQuery, OrderBy, MetaData } from '../types';
import _ from 'lodash';
import { TestResultsQueryBuilder } from '../QueryBuilder';

type Props = QueryEditorProps<productsDataSource, ProductsQuery>;

export function productsQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  query = datasource.prepareQuery(query);

  const onMetaDataChange = (items: Array<SelectableValue<string>>) => {
    if (items !== undefined) {
      onChange({ ...query, metaData: items.map(i => i.value as MetaData) });
    }
  };

  const onOrderByChange = (item: SelectableValue<string>) => {
    onChange({ ...query, orderBy: item.value });
    onRunQuery();
  }

  const onQueryByChange = (value: string) => {
    onChange({ ...query, queryBy: value});
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
      <InlineField label="Metadata" labelWidth={15}>
        <MultiSelect
          placeholder='Select Metadata'
          options={Object.keys(MetaData).map(value => ({ label: value, value })) as SelectableValue[]}
          onChange={onMetaDataChange}
          value={query.metaData}
          defaultValue={query.metaData!}
          width={40}
        />
      </InlineField>
      <InlineField label="Query By" labelWidth={15}>
        <TestResultsQueryBuilder
          autoComplete={datasource.queryProductValues.bind(datasource)}
          onChange={(event: any) => onQueryByChange(event.detail.linq) }
          defaultValue={query.queryBy}
        />
      </InlineField>
      <InlineField label="Records to Query" labelWidth={15}>
        <AutoSizeInput 
          minWidth={20}
          maxWidth={40}
          defaultValue={query.recordCount}
          onCommitChange={recordCountChange}
        />
      </InlineField>
      <InlineField label="OrderBy" labelWidth={15}>
          <Select 
            options={OrderBy as SelectableValue[]}
            onChange={onOrderByChange}
            value={query.orderBy}
            defaultValue={OrderBy[0]}
            width={25}
          />
      </InlineField>
      <InlineField label="Descending" labelWidth={15}> 
       <InlineSwitch 
          onChange={event => onDescendingChange(event.currentTarget.checked)} 
          value={query.descending}
        />
      </InlineField>

    </>
  );
}
