import React, { FormEvent } from 'react';
import { AutoSizeInput, RadioButtonGroup } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { TagDataSource } from '../TagDataSource';
import { TagQuery, TagQueryType } from '../types';
import { InlineField } from 'core/components/InlineField';
import { enumToOptions } from 'core/utils';

type Props = QueryEditorProps<TagDataSource, TagQuery>;

export function TagQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  query = datasource.prepareQuery(query);

  const onTypeChange = (value: TagQueryType) => {
    onChange({ ...query, type: value });
    onRunQuery();
  };

  const onPathChange = (event: FormEvent<HTMLInputElement>) => {
    onChange({ ...query, path: event.currentTarget.value });
    onRunQuery();
  };

  return (
    <>
      <InlineField label="Query type">
        <RadioButtonGroup options={enumToOptions(TagQueryType)} value={query.type} onChange={onTypeChange} />
      </InlineField>
      <InlineField label="Tag path">
        <AutoSizeInput minWidth={20} defaultValue={query.path} onCommitChange={onPathChange} />
      </InlineField>
    </>
  );
}
