import React, { useCallback } from 'react';
import { AutoSizeInput, HorizontalGroup, InlineSwitch, MultiSelect, Select, VerticalGroup } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { InlineField } from 'core/components/InlineField';
import { ProductDataSource } from '../ProductDataSource';
import { OrderBy, ProductQuery, Properties } from '../types';

type Props = QueryEditorProps<ProductDataSource, ProductQuery>;

export function ProductQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  query = datasource.prepareQuery(query);

  const handleQueryChange = useCallback((query: ProductQuery, runQuery = true): void => {
      onChange(query);
      if (runQuery) {
        onRunQuery();
      }
    }, [onChange, onRunQuery]);

  const onPropertiesChange = (items: Array<SelectableValue<string>>) => {
    if (items !== undefined) {
      handleQueryChange({ ...query, properties: items.map(i => i.value as Properties) });
    }
  };

  const onOrderByChange = (item: SelectableValue<string>) => {
    handleQueryChange({ ...query, orderBy: item.value });
  }

  const onDescendingChange = (isDescendingChecked: boolean) => {
    handleQueryChange({ ...query, descending: isDescendingChecked });
    
  }

  const recordCountChange = (event: React.FormEvent<HTMLInputElement>) => {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    handleQueryChange({ ...query, recordCount: value });
  }

  return (
    <>
      <HorizontalGroup>
        <VerticalGroup>
          <InlineField label="Properties" labelWidth={18} tooltip={tooltips.properties}>
            <MultiSelect
              placeholder='Select properties to fetch'
              options={Object.keys(Properties).map(value => ({ label: value, value })) as SelectableValue[]}
              onChange={onPropertiesChange}
              value={query.properties}
              defaultValue={query.properties!}
              maxVisibleValues={5}
              allowCustomValue={false}
              closeMenuOnSelect={false}
            />
          </InlineField>
          <div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <InlineField label="OrderBy" labelWidth={18} tooltip={tooltips.orderBy}>
                <Select
                  options={OrderBy as SelectableValue[]}
                  onChange={onOrderByChange}
                  value={query.orderBy}
                  defaultValue={query.orderBy}
                  width={25}
                />
              </InlineField>
              <InlineField label="Descending" tooltip={tooltips.descending}>
                <InlineSwitch
                  onChange={event => onDescendingChange(event.currentTarget.checked)}
                  value={query.descending}
                />
              </InlineField>
            </div>
            <InlineField label="Records to Query" labelWidth={18} tooltip={tooltips.recordCount}>
              <AutoSizeInput
                minWidth={20}
                maxWidth={40}
                defaultValue={query.recordCount}
                onCommitChange={recordCountChange}
              />
            </InlineField>
          </div>
        </VerticalGroup> 
      </HorizontalGroup>
    </>
  );
}

const tooltips = {
  properties: 'Select the properties fields to query',
  recordCount: 'Enter the number of records to query',
  orderBy: 'Select the field to order the results by',
  descending: 'Select to order the results in descending order'
}
