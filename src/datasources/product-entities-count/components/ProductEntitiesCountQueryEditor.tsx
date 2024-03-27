import React, { FormEvent } from 'react';
import { AutoSizeInput } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { InlineField } from 'core/components/InlineField';
import { ProductEntitiesCountDataSource } from '../ProductEntitiesCountDataSource';
import { ProductQuery } from 'datasources/product/types';

type Props = QueryEditorProps<ProductEntitiesCountDataSource, ProductQuery>;

export function ProductEntitiesCountQueryEditor({ query, onChange, onRunQuery }: Props) {

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
