import React, { ChangeEvent } from 'react';
import { Input } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { InlineField } from 'core/components/InlineField';
import { AzureDevopsDataSource } from '../AzureDevopsDataSource';
import { AzureDevopsQuery } from '../types';

type Props = QueryEditorProps<AzureDevopsDataSource, AzureDevopsQuery>;

export function AzureDevopsQueryEditor({ query, onChange, onRunQuery }: Props) {
  const onQueryTextChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...query, queryText: event.target.value });
  };

  const onConstantChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...query, constant: parseFloat(event.target.value) });
    // executes the query
    onRunQuery();
  };

  const { queryText, constant } = query;

  return (
    <>
      <InlineField label="Constant">
        <Input onChange={onConstantChange} value={constant} width={8} type="number" step="0.1" />
      </InlineField>
      <InlineField label="Query Text" labelWidth={16} tooltip="Not used yet">
        <Input onChange={onQueryTextChange} value={queryText || ''} />
      </InlineField>
    </>
  );
}
