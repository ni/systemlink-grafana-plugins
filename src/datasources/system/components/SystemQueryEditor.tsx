import React, { useEffect, useState } from 'react';
import { RadioButtonGroup } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
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
      setWorkspaces(Array.from(datasource.workspacesCache.values()));
      setAreDependenciesLoaded(true);
    });
  }, [datasource]);

  const onQueryTypeChange = (value: SystemQueryType) => {
    onChange({ ...query, queryKind: value });
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
          <InlineField label="Filter" labelWidth={14} tooltip={tooltips.filter}>
            <SystemsQueryBuilder
              filter={query.filter}
              onChange={(event: any) => onParameterChange(event)}
              globalVariableOptions={datasource.getVariableOptions()}
              workspaces={workspaces}
              areDependenciesLoaded={areDependenciesLoaded}
            />
          </InlineField>
        </>
      )}
    </>
  );
}

const tooltips = {
  queryType: `Properties allows you to visualize one or more systems' properties.
              Summary allows you to visualize the number of disconnected and connected systems.`,
  filter: `Filter the systems by various properties.`,
};
