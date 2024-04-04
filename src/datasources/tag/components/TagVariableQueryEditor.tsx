import { InlineField } from 'core/components/InlineField';
import { useWorkspaceOptions } from "../../../core/utils";
import { AutoSizeInput, Select } from "@grafana/ui";
import { SelectableValue } from "@grafana/data";
import React, { FormEvent } from "react";
import { TagVariableQuery } from "../types";
import { TagDataSource } from "../TagDataSource";


interface Props {
  query: TagVariableQuery,
  onChange: (query: TagVariableQuery) => void,
  datasource: TagDataSource;
}

export const TagVariableQueryEditor = ({ onChange, query, datasource }: Props) => {
  const workspaces = useWorkspaceOptions(datasource);

  const onPathChange = (event: FormEvent<HTMLInputElement>) => {
    onChange({ ...query, path: event.currentTarget.value });
  };

  return (
    <>
      <InlineField label="Tag path" labelWidth={14} tooltip={tooltips.tagPath}>
        <AutoSizeInput
          placeholder={'Enter path'}
          minWidth={20}
          maxWidth={80}
          defaultValue={query.path}
          onCommitChange={onPathChange}
          onVolumeChange={onPathChange}
        />
      </InlineField>
      <InlineField label="Workspace" labelWidth={14} tooltip={tooltips.workspace}>
        <Select
          isClearable
          isLoading={workspaces.loading}
          onChange={(option?: SelectableValue<string>) => onChange({ ...query, workspace: option?.value ?? '' })}
          options={workspaces.value}
          placeholder="Any workspace"
          value={query.workspace}
        />
      </InlineField>
    </>
  );
}

const tooltips = {
  tagPath: `Specify a path to find matching tags. You can enter a variable or glob-style wildcards into this field.`,

  workspace: `The workspace to search for the given tag path. If left blank, the plugin
              finds the most recently updated tag in any workspace.`,
};
