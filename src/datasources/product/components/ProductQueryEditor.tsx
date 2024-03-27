import React, { FormEvent } from 'react';
import { AutoSizeInput } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { InlineField } from 'core/components/InlineField';
import { ProductQuery } from 'datasources/product/types';
import { ProductDataSource } from '../ProductDataSource';

type Props = QueryEditorProps<ProductDataSource, ProductQuery>;

export function ProductQueryEditor({ query, onChange, onRunQuery }: Props) {

  const onPartNumberChange = (event: FormEvent<HTMLInputElement>) => {
    onChange({ ...query, partNumber: event.currentTarget.value });
    // executes the query
    onRunQuery();
  };

  return (
    <>
      <InlineField label="Part Number">
        <AutoSizeInput onCommitChange={onPartNumberChange} defaultValue={query.partNumber}/>
      </InlineField>
    </>
  );
}
