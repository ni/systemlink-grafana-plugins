import React, { FormEvent } from 'react';
import { AutoSizeInput, RadioButtonGroup, Select } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { InlineField } from 'core/components/InlineField';
import { TestInsightDataSource } from '../TestInsightDataSource';
import { TestInsightQuery, TestInsightQueryType } from '../types';
import { enumToOptions, useWorkspaceOptions } from 'core/utils';

type Props = QueryEditorProps<TestInsightDataSource, TestInsightQuery>;

export function TestInsightQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  query = datasource.prepareQuery(query);
  const workspaces = useWorkspaceOptions(datasource);

  const onQueryTypeChange = (value: TestInsightQueryType) => {
    onChange({...query, type: value });
    onRunQuery();
  };

  const onWorkspaceChange = (option?: SelectableValue<string>) => {
    onChange({ ...query, workspace: option?.value ?? '' });
    onRunQuery();
  };

  const onFamilyNameChange = (event: FormEvent<HTMLInputElement>) => {
    onChange({ ...query, family: event.currentTarget.value });
    onRunQuery();
  }

  const onPartNumberChange = (event: FormEvent<HTMLInputElement>) => {
    onChange({ ...query, partNumber: event.currentTarget.value });
    onRunQuery();
  }

  const onNameChange = (event: FormEvent<HTMLInputElement>) => {
    onChange({ ...query, name: event.currentTarget.value });
    onRunQuery();
  }

  return (
    <>
      <InlineField label="Query type">
        <RadioButtonGroup
          options={enumToOptions(TestInsightQueryType)}
          value={query.type}
          onChange={onQueryTypeChange}
        />
      </InlineField>
      <InlineField label="Family" labelWidth={14}>
         <AutoSizeInput
          defaultValue={query.family}
           maxWidth={80}
           minWidth={20}
           placeholder="Family name"
           onCommitChange={onFamilyNameChange}
         />
      </InlineField>
      <InlineField label="Part Number" labelWidth={14}>
       <AutoSizeInput
          defaultValue={query.partNumber}
           maxWidth={80}
           minWidth={20}
           placeholder="Part number"
           onCommitChange={onPartNumberChange}
         />
      </InlineField>
      <InlineField label="Name" labelWidth={14}>
         <AutoSizeInput
          defaultValue={query.name}
           maxWidth={80}
           minWidth={20}
           placeholder="Name"
           onCommitChange={onNameChange}
         />
      </InlineField>
      <InlineField label="Workspace" labelWidth={14}>
        <Select
          isClearable
          isLoading={workspaces.loading}
          onChange={onWorkspaceChange}
          options={workspaces.value}
          placeholder="Any workspace"
          value={query.workspace}
        />
      </InlineField>
     </>
 )};
 
