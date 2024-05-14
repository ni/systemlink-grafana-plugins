import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { AutoSizeInput, InlineSwitch, RadioButtonGroup, Select } from '@grafana/ui';
import { InlineField } from 'core/components/InlineField';
import { enumToOptions, useWorkspaceOptions } from 'core/utils';
import React, { FormEvent } from 'react';
import { TagDataSource } from '../TagDataSource';
import { TagQuery, TagQueryType } from '../types';

type Props = QueryEditorProps<TagDataSource, TagQuery>;

export function TagQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  query = datasource.prepareQuery(query);
  const workspaces = useWorkspaceOptions(datasource);

  const onTypeChange = (value: TagQueryType) => {
    onChange({ ...query, type: value });
    onRunQuery();
  };

  const onPathChange = (event: FormEvent<HTMLInputElement>) => {
    onChange({ ...query, path: event.currentTarget.value });
    onRunQuery();
  };

  const onWorkspaceChange = (option?: SelectableValue<string>) => {
    onChange({ ...query, workspace: option?.value ?? '' });
    onRunQuery();
  };

  const onPropertiesChange = () => {
    onChange({ ...query, properties: !query.properties });
    onRunQuery();
  };

  return (
    <>
      <InlineField label="Query type" labelWidth={14} tooltip={tooltips.queryType}>
        <RadioButtonGroup options={enumToOptions(TagQueryType)} value={query.type} onChange={onTypeChange}/>
      </InlineField>
      <InlineField label="Tag path" labelWidth={14} tooltip={tooltips.tagPath}>
        <AutoSizeInput minWidth={20} maxWidth={80} defaultValue={query.path} onCommitChange={onPathChange}/>
      </InlineField>
      <InlineField label="Workspace" labelWidth={14} tooltip={tooltips.workspace}>
        <Select
          isClearable
          isLoading={workspaces.loading}
          onChange={onWorkspaceChange}
          options={workspaces.value}
          placeholder="Any workspace"
          value={query.workspace}
        />
      </InlineField>
      {query.type === TagQueryType.Current && (
        <InlineField label="Properties" labelWidth={14} tooltip={tooltips.properties}>
          <InlineSwitch onChange={onPropertiesChange} value={query.properties}/>
        </InlineField>
      )}
    </>
  );
}

const tooltips = {
  queryType: `Current allows you to visualize the most recent value of multiple tags. History allows you to
              visualize the values of multiple tags over time. Historical values use the time range set on the
              dashboard and are decimated according to the width of the panel.`,

  tagPath: `The path to search for the tags you want to visualize. You can enter a variable into this field and use glob-style patterns as wildcards.`,

  workspace: `The workspace to search for the given tag path. If left blank, the plugin
              finds the most recently updated tag in any workspace.`,

  properties: `If enabled, include the tag properties in the query result.`,
};
