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

  //Handle existing dashboards with MetaData queries
  if ((query.queryKind as any) === LEGACY_METADATA_TYPE) {
    query.queryKind = SystemQueryType.Properties;
  }

  const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null);

  useEffect(() => {
    if (query.queryKind === SystemQueryType.Summary) {
      onChange(query);
      onRunQuery();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  useEffect(() => {
    const loadWorkspaces = async () => {
      const workspaces = await datasource.loadWorkspaces();
      setWorkspaces(Array.from(workspaces.values()));
    };

    loadWorkspaces();
  }, [datasource]);

  const onQueryTypeChange = (value: SystemQueryType) => {
    onChange({ ...query, queryKind: value });
    onRunQuery();
  };

  function onParameterChange(ev: CustomEvent) {
    const newFilter = ev.detail?.linq ?? '';

    if (query.filter !== newFilter) {
      const updatedQuery = {
        ...query,
        filter: newFilter,
        systemName: '',
        workspace: ''
      };
      onChange(updatedQuery);
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
  filter: `Filter the systems by various properties. This is an optional field.`,
};
