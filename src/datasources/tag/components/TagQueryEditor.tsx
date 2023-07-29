import React, { FormEvent } from 'react';
import { AutoSizeInput } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { TagDataSource } from '../TagDataSource';
import { TagQuery } from '../types';
import { InlineField } from 'core/components/InlineField';

type Props = QueryEditorProps<TagDataSource, TagQuery>;

export function TagQueryEditor({ query, onChange, onRunQuery }: Props) {
  const onPathChange = (event: FormEvent<HTMLInputElement>): void => {
    onChange({ ...query, path: event.currentTarget.value });
    onRunQuery();
  };

  return (
    <>
      <InlineField label="Tag path">
        <AutoSizeInput minWidth={20} defaultValue={query.path} onCommitChange={onPathChange} />
      </InlineField>
    </>
  );
}
