import React from 'react';
import { SystemQueryReturnType, SystemVariableQuery } from '../types';
import { Select, Stack } from '@grafana/ui';
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
  const returnTypeOptions = Object.values(SystemQueryReturnType).map((type) => ({
    label: type,
    value: type
  }));
  const SystemVariableQuery = query as SystemVariableQuery;
  function changeQueryReturnType(queryReturnType: SystemQueryReturnType) {
    onChange({ ...SystemVariableQuery, queryReturnType: queryReturnType } as SystemVariableQuery);
  }
  return (
    <Stack direction="column">
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
      <InlineField
        label="Return Type"
        labelWidth={25}
        tooltip={"This field specifies the return type of the query."}
      >
        <Select
          options={returnTypeOptions}
          defaultValue={SystemQueryReturnType.MinionId}
          value={SystemVariableQuery.queryReturnType || SystemQueryReturnType.MinionId}
          onChange={(item) => {
            changeQueryReturnType(item.value!);
          }}
          width={26}
        />
      </InlineField>
    </Stack>
  );
}
