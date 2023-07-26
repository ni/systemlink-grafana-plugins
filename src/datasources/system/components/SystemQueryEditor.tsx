import React from 'react';
import { InlineField, InlineFieldRow, RadioButtonGroup } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { SystemDataSource } from '../SystemDataSource';
import { QueryType, SystemQuery } from '../types';
import { enumToOptions } from 'core/utils';

type Props = QueryEditorProps<SystemDataSource, SystemQuery>;

export function SystemQueryEditor({ query, onChange, onRunQuery }: Props) {
  const onQueryTypeChange = (value: QueryType) => {
    onChange({ ...query, queryKind: value })
    onRunQuery();
  }

  return (
    <div>
      <InlineFieldRow >
        <InlineField label="Query type">
          <RadioButtonGroup options={enumToOptions(QueryType)} onChange={onQueryTypeChange} value={query.queryKind} />
        </InlineField>
      </InlineFieldRow>
    </div>
  );
}
