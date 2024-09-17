import { SelectableValue, toOption } from '@grafana/data';
import { AssetMetadataQuery, EntityType } from '../types';
import { InlineField, MultiSelect, Select } from '@grafana/ui';
import React, { useState } from 'react';
import { useWorkspaceOptions } from '../../../core/utils';
import _ from 'lodash';
import { FloatingError, parseErrorMessage } from '../../../core/errors';
import { isValidId } from '../../data-frame/utils';
import { useAsync } from 'react-use';
import { AssetQueryEditorCommon, Props } from "./AssetQueryEditorCommon";

export function QueryMetadataEditor(props: Props) {
  const [errorMsg, setErrorMsg] = useState<string | undefined>('');
  const handleError = (error: Error) => setErrorMsg(parseErrorMessage(error));
  const common = new AssetQueryEditorCommon(props, handleError);
  const query = common.query as AssetMetadataQuery;
  const workspaces = useWorkspaceOptions(common.datasource);

  const minionIds = useAsync(() => {
    let filterString = '';
    if (query.workspace) {
      filterString += `workspace = "${query.workspace}"`;
    }
    return common.datasource.querySystems(filterString).catch(handleError);
  }, [query.workspace]);
  const handleMinionIdsChange = (items: Array<SelectableValue<string>>): void => {
    if (items && !_.isEqual(query.minionIds, items)) {
      common.handleQueryChange(
        { ...query, minionIds: items.map(i => i.value!) },
        // do not run query if minionIds not changed
        true
      );
    } else {
      common.handleQueryChange({ ...query, minionIds: [] }, true);
    }
  };
  const onWorkspaceChange = (item?: SelectableValue<string>): void => {
    if (item?.value && item.value !== query.workspace) {
      // if workspace changed, reset Systems and Assets fields
      common.handleQueryChange(
        { ...query, workspace: item.value, minionIds: [] },
        // do not run query if workspace not changed
        true
      );
    } else {
      common.handleQueryChange({ ...query, workspace: '' }, true);
    }

  };

  return (
    <>
      <InlineField label="Workspace" tooltip={tooltips.workspace[EntityType.Asset]} labelWidth={22}>
        <Select
          isClearable
          isLoading={workspaces.loading}
          onChange={onWorkspaceChange}
          options={workspaces.value}
          placeholder="Any workspace"
          value={query.workspace}
        />
      </InlineField>
      <InlineField label="Systems" tooltip={tooltips.system[EntityType.Asset]} labelWidth={22}>
        <MultiSelect
          isClearable
          allowCreateWhileLoading
          options={common.loadMinionIdOptions(minionIds.value)}
          isValidNewOption={isValidId}
          onChange={handleMinionIdsChange}
          placeholder="Select systems"
          width={85}
          value={query.minionIds.map(toOption) || []} // Add default value
        />
      </InlineField>
      <FloatingError message={errorMsg}/>
    </>
  );
}

const tooltips = {
  workspace: {
    [EntityType.Asset]: `The workspace where you want to search for the assets.`,
    [EntityType.System]: `The workspace where you want to search for the systems.`,
  },

  system: {
    [EntityType.Asset]: `Filter assets by system.`,
    [EntityType.System]: `Search systems by name or enter an ID`,
  },
};
