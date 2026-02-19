import React, { FormEvent, useEffect, useState } from 'react';
import { AutoSizeInput, RadioButtonGroup, Select } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { SystemDataSource } from '../SystemDataSource';
import { SystemQueryType, SystemQuery } from '../types';
import { enumToOptions } from 'core/utils';
import { InlineField } from 'core/components/InlineField';
import { LEGACY_METADATA_TYPE, Workspace } from 'core/types';
import { SystemsQueryBuilder } from './query-builder/SystemsQueryBuilder';

type Props = QueryEditorProps<SystemDataSource, SystemQuery>;

export function SystemQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  query = datasource.prepareQuery(query);

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [areDependenciesLoaded, setAreDependenciesLoaded] = useState<boolean>(false);
  const [workspaceOptions, setWorkspaceOptions] = useState<Array<SelectableValue<string>>>([]);

  //Handle existing dashboards with MetaData queries
  if ((query.queryKind as any) === LEGACY_METADATA_TYPE) {
    query.queryKind = SystemQueryType.Properties;
  }

  useEffect(() => {
    if (query.queryKind === SystemQueryType.Summary) {
      onChange(query);
      onRunQuery();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  useEffect(() => {
    Promise.all([datasource.areWorkspacesLoaded$]).then(() => {
      const loadedWorkspaces = Array.from(datasource.workspacesCache.values());
      setWorkspaces(loadedWorkspaces);

      const options = loadedWorkspaces.map(w => ({
        label: w.name,
        value: w.id
      }));
      setWorkspaceOptions(options);

      setAreDependenciesLoaded(true);
    });
  }, [datasource]);

  const onQueryTypeChange = (value: SystemQueryType) => {
    onChange({ ...query, queryKind: value });
    onRunQuery();
  };

  const onSystemChange = (event: FormEvent<HTMLInputElement>) => {
    onChange({ ...query, systemName: event.currentTarget.value });
    onRunQuery();
  };

  const onWorkspaceChange = (option?: SelectableValue<string>) => {
    onChange({ ...query, workspace: option?.value ?? '' });
    onRunQuery();
  };

  function onParameterChange(ev: CustomEvent) {
    if (query.filter !== ev.detail.linq) {
      query.filter = ev.detail.linq;
      onChange(query);
      onRunQuery();
    }
  }

  return (
    <>
      <InlineField label="Query type" labelWidth={14} tooltip={tooltips.queryType}>
        <RadioButtonGroup
          options={enumToOptions(SystemQueryType)}
          onChange={onQueryTypeChange}
          value={query.queryKind}
        />
      </InlineField>
      {query.queryKind === SystemQueryType.Properties && (
        <>
          {datasource.isQueryBuilderActive() ? (
            <InlineField label="Filter" labelWidth={14} tooltip={tooltips.filter}>
              <SystemsQueryBuilder
                filter={query.filter}
                onChange={(event: any) => onParameterChange(event)}
                globalVariableOptions={datasource.getVariableOptions()}
                workspaces={workspaces}
                areDependenciesLoaded={areDependenciesLoaded}
              />
            </InlineField>
          ) : (
            <>
              <InlineField label="System" labelWidth={14} tooltip={tooltips.system}>
                <AutoSizeInput
                  defaultValue={query.systemName}
                  maxWidth={80}
                  minWidth={20}
                  onCommitChange={onSystemChange}
                  placeholder="All systems"
                />
              </InlineField>
              {(query.systemName === '' || query.systemName === undefined) && (
                <InlineField label="Workspace" labelWidth={14} tooltip={tooltips.workspace}>
                  <Select
                    isClearable
                    isLoading={!areDependenciesLoaded}
                    onChange={onWorkspaceChange}
                    options={workspaceOptions}
                    placeholder="Any workspace"
                    value={query.workspace}
                  />
                </InlineField>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}

const tooltips = {
  queryType: `Properties allows you to visualize one or more systems' properties.
              Summary allows you to visualize the number of disconnected and connected systems.`,
  system: `Query for a specific system by its name or ID. If left blank, the plugin returns all
            available systems. You can enter a variable into this field.`,
  workspace: `The workspace to search for the system specified.`,
  filter: `Filter the systems by various properties.`,
};
