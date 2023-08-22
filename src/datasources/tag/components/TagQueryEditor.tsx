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

  const onWorkspaceChange = (event: FormEvent<HTMLInputElement>) => {
    onChange({ ...query, workspace: event.currentTarget.value });
    onRunQuery();
  };

  return (
    <>
      <InlineField label="Query type" labelWidth={14} tooltip={tooltips.queryType}>
        <RadioButtonGroup options={enumToOptions(TagQueryType)} value={query.type} onChange={onTypeChange} />
      </InlineField>
      <InlineField label="Tag path" labelWidth={14} tooltip={tooltips.tagPath}>
        <AutoSizeInput minWidth={20} defaultValue={query.path} onCommitChange={onPathChange} />
      </InlineField>
      <InlineField label="Workspace" labelWidth={14} tooltip={tooltips.workspace}>
        <AutoSizeInput
          minWidth={20}
          placeholder="Any workspace"
          defaultValue={query.workspace}
          onCommitChange={onWorkspaceChange}
        />
      </InlineField>
    </>
  );
}

const tooltips = {
  queryType: `Current allows you to visualize the most recent tag value. History allows you to
              visualize tag values over time. Historical values use the time range set on the
              dashboard and are decimated according to the width of the panel.`,

  tagPath: `The full path of the tag to visualize. You can enter a variable into this field.`,

  workspace: `The ID of the workspace to search for the given tag path. If left blank, the plugin
              finds the most recently updated tag in any workspace.`,
};
