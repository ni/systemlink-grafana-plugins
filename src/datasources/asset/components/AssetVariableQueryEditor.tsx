import React, { useState } from 'react';
import { InlineField, MultiSelect, Select } from "@grafana/ui";
import { useAsync } from "react-use";
import { useWorkspaceOptions } from "../../../core/utils";
import { isValidId } from "../../data-frame/utils";
import { SelectableValue, toOption } from "@grafana/data";
import _ from "lodash";
import { AssetQueryEditorCommon, Props } from "./AssetQueryEditorCommon";
import { AssetQuery } from "../types";
import { FloatingError, parseErrorMessage } from "../../../core/errors";

export function AssetVariableQueryEditor(props: Props) {
  const [errorMsg, setErrorMsg] = useState<string | undefined>('');
  const handleError = (error: Error) => setErrorMsg(parseErrorMessage(error));
  const common = new AssetQueryEditorCommon(props, handleError)
  const query = common.query as AssetQuery
  const workspaces = useWorkspaceOptions(common.datasource);

  const minionIds = useAsync(() => {
    let filterString = '';
    if (query.workspace) {
      filterString += `workspace = "${query.workspace}"`;
    }
    return common.datasource.querySystems(filterString).catch(handleError);
  }, [query.workspace]);

  const onWorkspaceChange = (item?: SelectableValue<string>): void => {
    if (item?.value && item.value !== query.workspace) {
      // if workspace changed, reset Systems and Assets fields
      common.onChange(
        { ...query, workspace: item.value, minionIds: [] },
        // do not run query if workspace not changed
      );
    } else {
      common.onChange({ ...query, workspace: '' });
    }
  }

  const handleMinionIdsChange = (items: Array<SelectableValue<string>>): void => {
    if (items && !_.isEqual(query.minionIds, items)) {
      common.onChange(
        { ...query, minionIds: items.map(i => i.value!) },
        // do not run query if minionIds not changed
      );
    } else {
      common.onChange({ ...query, minionIds: [] });
    }
  };

  return (
    <>
      <InlineField label="Workspace" labelWidth={22}>
        <Select
          isClearable
          isLoading={workspaces.loading}
          onChange={onWorkspaceChange}
          options={workspaces.value}
          placeholder="Any workspace"
          value={query.workspace}
        />
      </InlineField>
      <InlineField label="System" labelWidth={22}>
        <MultiSelect
          isClearable
          allowCreateWhileLoading
          options={common.loadMinionIdOptions(minionIds.value)}
          isValidNewOption={isValidId}
          onChange={handleMinionIdsChange}
          placeholder="Select system"
          width={85}
          value={query.minionIds.map(toOption) || []}
        />
      </InlineField>
      <FloatingError message={errorMsg}/>
    </>
  );
}
