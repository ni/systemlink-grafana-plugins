import React, { useEffect, useState } from 'react';
import { SystemQueryReturnType, SystemVariableQuery } from '../types';
import { Select } from '@grafana/ui';
import { SystemDataSource } from '../SystemDataSource';
import { InlineField } from 'core/components/InlineField';
import { Workspace } from 'core/types';
import { SystemsQueryBuilder } from './query-builder/SystemsQueryBuilder';

interface Props {
  query: SystemVariableQuery;
  onChange: (query: SystemVariableQuery) => void;
  datasource: SystemDataSource;
}

export function SystemVariableQueryEditor({ onChange, query, datasource }: Props) {
  const SystemVariableQuery = query as SystemVariableQuery;
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [areDependenciesLoaded, setAreDependenciesLoaded] = useState<boolean>(false);
  const returnTypeOptions = Object.values(SystemQueryReturnType).map((type) => ({
    label: type,
    value: type
  }));

  useEffect(() => {
    Promise.all([datasource.areWorkspacesLoaded$]).then(() => {
      setWorkspaces(Array.from(datasource.workspacesCache.values()));
      setAreDependenciesLoaded(true);
    });
  }, [datasource]);

  useEffect(() => {
    if (query.workspace && !query.filter) {
      const migratedFilter = `workspace = "${query.workspace}"`;
      onChange({ ...query, filter: migratedFilter, workspace: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  function changeQueryReturnType(queryReturnType: SystemQueryReturnType) {
    onChange({ ...SystemVariableQuery, queryReturnType: queryReturnType } as SystemVariableQuery);
  }

  function onParameterChange(ev: CustomEvent) {
    if (query.filter !== ev.detail.linq) {
      onChange({ ...query, filter: ev.detail.linq, workspace: '' });
    }
  }
  return (
    <>
      <InlineField label="Filter" labelWidth={25} tooltip={"Filter the systems by various properties."}>
        <SystemsQueryBuilder
          filter={query.filter || ''}
          onChange={(event: any) => onParameterChange(event)}
          globalVariableOptions={datasource.getVariableOptions()}
          workspaces={workspaces}
          areDependenciesLoaded={areDependenciesLoaded}
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
        />
      </InlineField>
    </>
  );
}
