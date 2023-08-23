import React, { FormEvent } from 'react';
import { AutoSizeInput, Badge, RadioButtonGroup } from '@grafana/ui';
import { QueryEditorProps, toOption } from '@grafana/data';
import { InlineField } from 'core/components/InlineField';
import { AzureDevopsDataSource } from '../AzureDevopsDataSource';
import { AzureDevopsQuery } from '../types';

type Props = QueryEditorProps<AzureDevopsDataSource, AzureDevopsQuery>;

export function AzureDevopsQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  query = datasource.prepareQuery(query);

  const onTypeChange = (value: string) => {
    onChange({ ...query, type: value });
    onRunQuery();
  };

  const onProjectChange = (event: FormEvent<HTMLInputElement>) => {
    onChange({ ...query, project: event.currentTarget.value });
    onRunQuery();
  };

  return (
    <>
      <Badge color='green' text="Hello NITech 2023!" icon='rocket' style={{marginBottom: 5}} />
      <InlineField label="Query type">
        <RadioButtonGroup options={['Git stats', 'Build metrics'].map(toOption)} value={query.type} onChange={onTypeChange} />
      </InlineField>
      <InlineField label="Project">
        <AutoSizeInput defaultValue={query.project} onCommitChange={onProjectChange} />
      </InlineField>
    </>
  );
}
