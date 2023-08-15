import React, { FormEvent } from 'react';
import { AutoSizeInput, InlineField } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { TagDataSource } from '../TagDataSource';
import { TagQuery } from '../types';

type Props = QueryEditorProps<TagDataSource, TagQuery>;

export function TagQueryEditor({ query, onChange, onRunQuery }: Props) {
  const options = [
    { label: 'Min', value: 'min' },
    { label: 'Max', value: 'max' },
    { label: 'Mean', value: 'mean' },
    { label: 'Count', value: 'count' },
  ];

  const onPathChange = (event: FormEvent<HTMLInputElement>): void => {
    onChange({ ...query, path: event.currentTarget.value });
    onRunQuery();
  };

  const handleAggChange = (val: SelectableValue<string>['']) => {
    set_agg(val);
    query.aggregates = val;
    onRunQuery();
  };

  return (
    <>
      <InlineField label="Tag path">
        <AutoSizeInput minWidth={150} defaultValue={query.path} onCommitChange={onPathChange} />
      </InlineField>
      <InlineField label="Aggregates">
        <MultiSelect options={options} value={current_agg} onChange={handleAggChange} onBlur={onRunQuery} />
      </InlineField>
    </>
  );
}
