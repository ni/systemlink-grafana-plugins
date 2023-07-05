import React from 'react';
import { InlineField, RadioButtonGroup } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { JobDataSource } from '../JobDataSource';
import { JobQuery, QueryType } from '../types';

type Props = QueryEditorProps<JobDataSource, JobQuery>;

const QUERY_OPTIONS = [
  {label: "Whatever", value: QueryType.Whatever},
  {label: "Summary", value: QueryType.Summmary}
];

export function JobQueryEditor({ query, onChange, onRunQuery }: Props) {

  const onQueryTypeChange = (value: QueryType) => {
    onChange({ ...query, type: value });
    onRunQuery();
  }

  return (
    <div className="gf-form">
      <InlineField label="Query type">
        <RadioButtonGroup options={QUERY_OPTIONS} onChange={onQueryTypeChange} value={query.type} />
      </InlineField>
    </div>
  );
}
