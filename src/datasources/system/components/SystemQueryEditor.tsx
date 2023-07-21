import React from 'react';
import { InlineField, InlineFieldRow, Input, RadioButtonGroup } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { SystemDataSource } from '../SystemDataSource';
import { QueryType, SystemQuery } from '../types';

type Props = QueryEditorProps<SystemDataSource, SystemQuery>;

const QUERY_TYPES = [
  {label: "Metadata", value: QueryType.Metadata},
  {label: "Summary", value: QueryType.Summary}
]

export function SystemQueryEditor({ query, onChange, onRunQuery }: Props) {

  const onQueryTypeChange = (value: QueryType) => {
    onChange({ ...query, queryClass: value })
    onRunQuery();
  }

  return (
    <div>
      <InlineFieldRow >
        <InlineField label="Query Type">
          <RadioButtonGroup options={QUERY_TYPES} onChange={onQueryTypeChange} value={query.queryClass} />
        </InlineField>
      </InlineFieldRow>
    </div>
  );
}
