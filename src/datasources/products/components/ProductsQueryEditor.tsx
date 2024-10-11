import React from 'react';
import { HorizontalGroup, MultiSelect, VerticalGroup } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { InlineField } from 'core/components/InlineField';
import { ProductsDataSource } from '../ProductsDataSource';
import { Properties, ProductsQuery } from '../types';

type Props = QueryEditorProps<ProductsDataSource, ProductsQuery>;

export function ProductsQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  const workspaces = datasource.getWorkspaceNames();

  const onMetaDataChange = (items: Array<SelectableValue<string>>) => {
		if (items !== undefined) {
			onChange({ ...query, properties: items.map(i => i.value as Properties) });
			onRunQuery();
		}
	};

  // const { metaData } = query;

  return (
    <>
      <HorizontalGroup spacing='lg' align='flex-start'>
        <VerticalGroup spacing='md'>
          <InlineField label="Properties" labelWidth={20} tooltip={tooltip.properties}>
            <MultiSelect
              placeholder='Select Properties to query'
              options={Object.keys(Properties).map(value => ({ label: value, value })) as SelectableValue[]}
              onChange={onMetaDataChange}
              value={query.properties}
              defaultValue={query.properties!}
              allowCustomValue={false}
              closeMenuOnSelect={false}
            />
          </InlineField>
        </VerticalGroup>
      </HorizontalGroup>
    </>
  );
}

const tooltip = {
	properties: 'Select the properties to query',
	queryBy: 'Enter the query to filter the results',
	recordCount: 'Enter the number of records to query',
	orderBy: 'Select the field to order the results by',
	descending: 'Select to order the results in descending order'
}
