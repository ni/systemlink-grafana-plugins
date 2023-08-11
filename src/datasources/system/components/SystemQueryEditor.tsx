import React from 'react';
import { InlineField, InlineFieldRow, Input, RadioButtonGroup } from '@grafana/ui';
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

  const onIdBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const id = e.currentTarget.value;
    if (query.systemName !== id) {
      onChange({ ...query, systemName: id })
      onRunQuery(); 
    }
  }

  return (
    <div>
      <InlineFieldRow >
        <InlineField label="Query type">
          <RadioButtonGroup options={enumToOptions(QueryType)} onChange={onQueryTypeChange} value={query.queryKind} />
        </InlineField>
      </InlineFieldRow>
      <InlineFieldRow>
        <InlineField label="System" tooltip="Enter system ID or alias" >
          <Input placeholder="All systems" onBlur={onIdBlur} defaultValue={query.systemName} />
        </InlineField>
      </InlineFieldRow>
    </div>
  );
}
