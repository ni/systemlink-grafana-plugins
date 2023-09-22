import React from 'react';
import { SystemVariableQuery } from '../types';
import { Select } from '@grafana/ui';
import { useWorkspaceOptions } from 'core/utils';
import { SystemDataSource } from '../SystemDataSource';
import { InlineField } from 'core/components/InlineField';
import { SelectableValue } from '@grafana/data';

interface Props {
  query: SystemVariableQuery;
  onChange: (query: SystemVariableQuery) => void;
  datasource: SystemDataSource;
}

export function SystemVariableQueryEditor({ onChange, query, datasource }: Props) {
  const workspaces = useWorkspaceOptions(datasource);
  return (
    <InlineField label="Workspace">
      <Select
        isClearable
        isLoading={workspaces.loading}
        onChange={(option?: SelectableValue<string>) => onChange({ workspace: option?.value ?? '' })}
        options={workspaces.value}
        placeholder="Any workspace"
        value={query.workspace}
      />
    </InlineField>
  );
}
