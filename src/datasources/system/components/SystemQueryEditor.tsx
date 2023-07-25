import React from 'react';
import { InlineField, InlineFieldRow, RadioButtonGroup } from '@grafana/ui';
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
    onChange({ ...query, queryKind: value })
    onRunQuery();
  }

  return (
    <div>
      <InlineFieldRow >
        <InlineField label="Query type">
          <RadioButtonGroup options={QUERY_TYPES} onChange={onQueryTypeChange} value={query.queryKind} />
        </InlineField>
      </InlineFieldRow>
    </div>
  );
}
