import React, { FormEvent } from 'react';
import { AutoSizeInput, Select } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { InlineField } from 'core/components/InlineField';
import { productDataSource } from '../productDataSource';
import { ProductQuery, ProductQueryOutput } from '../types';


type Props = QueryEditorProps<productDataSource, ProductQuery>;


export function productQueryEditor({ query, onChange, onRunQuery }: Props) {

  const onPartNumberChange = (event: FormEvent<HTMLInputElement>) => {
    onChange({ ...query, partNumber: event.currentTarget.value });
    // executes the query
    // onRunQuery();
  };

  const onSelectionChange = (value: SelectableValue<ProductQueryOutput>) => {
    if (value.value !== undefined) {
      onChange({ ...query, output: value.value });
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <InlineField label="Part Number">
        <AutoSizeInput onCommitChange={onPartNumberChange} defaultValue={query.partNumber} />
      </InlineField>
      <InlineField label="Output">
        <Select options={Object.values(ProductQueryOutput).map(value => ({ label: value, value }))} onChange={onSelectionChange} value={query.output} />
      </InlineField>
    </div>
  );
}
