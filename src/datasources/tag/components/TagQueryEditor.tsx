import React, { FormEvent } from 'react';
import { AutoSizeInput, InlineField, MultiSelect } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { TagDataSource } from '../TagDataSource';
import { TagQuery } from '../types';

type Props = QueryEditorProps<TagDataSource, TagQuery>;

export function TagQueryEditor({ query, onChange, onRunQuery }: Props) {
  const options = [
    { label: 'Min', value: 'min' },
    { label: 'Max', value: 'max' },
    { label: 'Average', value: 'avg' },
    { label: 'Count', value: 'count' },
  ];

  const onPathChange = (event: FormEvent<HTMLInputElement>): void => {
    onChange({ ...query, path: event.currentTarget.value });
    onRunQuery();
  };

  const handleAggChange = (items: Array<SelectableValue<string>>) => {
    onChange({ ...query, aggregates: items.map((item) => item.value!) });
    onRunQuery();
  };

  return (
    <>
      <InlineField label="Tag path">
        <AutoSizeInput minWidth={150} defaultValue={query.path} onCommitChange={onPathChange} />
      </InlineField>
      <InlineField label="Aggregates">
        <MultiSelect options={options} value={query.aggregates} onChange={handleAggChange} />
      </InlineField>
    </>
  );
}
