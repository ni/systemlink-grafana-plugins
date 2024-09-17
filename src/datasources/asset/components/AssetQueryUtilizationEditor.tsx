import { SelectableValue, toOption } from '@grafana/data';
import {
  AssetFilterProperties,
  AssetModel,
  AssetUtilizationQuery,
  EntityType
} from '../types';
import { FloatingError, parseErrorMessage } from "../../../core/errors";
import { RadioButtonGroup, InlineField, MultiSelect, Select } from '@grafana/ui';
import React, { useState } from 'react';
import { isValidId } from '../../data-frame/utils';
import {
  entityTypeOptions,
} from "../constants";
import { replaceVariables, useWorkspaceOptions } from "../../../core/utils";
import _ from "lodash";
import { useAsync } from "react-use";
import { AssetQueryEditorCommon, Props } from "./AssetQueryEditorCommon";

export function QueryUtilizationEditor(props: Props) {
  const [errorMsg, setErrorMsg] = useState<string | undefined>('');
  const handleError = (error: Error) => setErrorMsg(parseErrorMessage(error));
  const common = new AssetQueryEditorCommon(props, handleError)
  const query = common.query as AssetUtilizationQuery
  const workspaces = useWorkspaceOptions(common.datasource);

  const minionIds = useAsync(() => {
    let filterString = '';
    if (query.workspace) {
      filterString += `workspace = "${query.workspace}"`;
    }
    return common.datasource.querySystems(filterString).catch(handleError);
  }, [query.workspace]);
  const handleMinionIdsChange = (items: Array<SelectableValue<string>>): void => {
    if (items) {
      const { assetIdentifiers, ...changedQuery } = query;
      // if minionIds changed, reset Assets field
      common.handleQueryChange(
        { ...changedQuery, minionIds: items.map(i => i.value!), assetIdentifiers: [] },
        // do not run query if minionIds not changed
        !_.isEqual(query.minionIds, items)
      );
    } else {
      common.handleQueryChange({ ...query, minionIds: [] }, true);
    }
  };
  const onWorkspaceChange = (item?: SelectableValue<string>): void => {
    if (item?.value) {
      const { assetIdentifiers, minionIds, ...changedQuery } = query;
      // if workspace changed, reset Systems and Assets fields
      common.handleQueryChange(
        { ...changedQuery, workspace: item.value, minionIds: [], assetIdentifiers: [] },
        // do not run query if workspace not changed
        query.workspace !== item.value
      );
    } else {
      common.handleQueryChange({ ...query, workspace: '' }, true);
    }
  };
  const assetIds = useAsync(() => {
    const filterArray: string[] = [];
    if (!_.isEmpty(query.minionIds)) {
      const minionIds = replaceVariables(query.minionIds, common.datasource.templateSrv);
      const systemsCondition = minionIds.map(id => `${AssetFilterProperties.LocationMinionId} = "${id}"`)
      filterArray.push(systemsCondition.join(" or "));
    }
    if (query.workspace) {
      filterArray.push(`workspace = "${query.workspace}"`);
    }
    let filter = filterArray.filter(Boolean).join(' and ');
    return common.datasource.queryAssets(filter).catch(handleError);
  }, [query.workspace, query.minionIds]);
  const handleAssetIdentifierChange = (items: Array<SelectableValue<string>>): void => {
    if (items) {
      common.handleQueryChange(
        { ...query, assetIdentifiers: items.map(i => i.value!) },
        // do not run query if assetIdentifier not changed
        !_.isEqual(query.assetIdentifiers, items)
      );
    } else {
      common.handleQueryChange({ ...query, assetIdentifiers: [] }, true);
    }
  };
  const handleEntityTypeChange = (value: EntityType): void => {
    if (query.entityType !== value) {
      common.handleQueryChange({ ...query, entityType: value }, true);
    }
  };
  const loadAssetIdOptions = (): Array<SelectableValue<string>> => {
    let options: SelectableValue[] = (assetIds.value ?? []).map((asset: AssetModel): SelectableValue<string> => ({
        'label': asset.name,
        'value': asset.id,
        description: asset.id
      })
    );
    options.unshift(...common.getVariableOptions());

    return options;
  }

  return (
    <>
      <InlineField label={"Calculate utilization for"}
                   tooltip={tooltips.entityType} labelWidth={22}>
        <RadioButtonGroup
          options={entityTypeOptions}
          value={query.entityType}
          onChange={(item: any) => handleEntityTypeChange(item)}
        />
      </InlineField>
      <InlineField label="Workspace" labelWidth={22} tooltip={'The workspace to search for the asset specified.'}>
        <Select
          isClearable
          isLoading={workspaces.loading}
          onChange={onWorkspaceChange}
          options={workspaces.value}
          placeholder="Any workspace"
          value={query.workspace}
        />
      </InlineField>
      <InlineField label="System"
                   tooltip={tooltips.system[query.entityType]}
                   labelWidth={22}>
        <MultiSelect
          isClearable
          allowCreateWhileLoading
          options={common.loadMinionIdOptions(minionIds.value)}
          isValidNewOption={isValidId}
          onChange={handleMinionIdsChange}
          placeholder="Select systems"
          width={85}
          value={query.minionIds.map(toOption)}
        />
      </InlineField>
      {query.entityType === EntityType.Asset && (
        <InlineField label="Asset Identifier"
                     tooltip={tooltips.assetIdentifiers}
                     labelWidth={22}>
          <MultiSelect
            width={85}
            allowCreateWhileLoading
            isClearable={true}
            isValidNewOption={isValidId}
            options={loadAssetIdOptions()}
            onChange={handleAssetIdentifierChange}
            placeholder="Search by name or enter id"
            value={query.assetIdentifiers.map(toOption)}
          />
        </InlineField>
      )}
      <FloatingError message={errorMsg}/>
    </>
  )
}

const tooltips = {
  entityType: `Calculate utilization for one or more systems or assets.`,

  workspace: {
    [EntityType.Asset]: `The workspace where you want to search for the assets.`,
    [EntityType.System]: `The workspace where you want to search for the systems.`,
  },

  assetIdentifiers: 'Search assets by name or enter an ID.',

  system: {
    [EntityType.Asset]: `Filter assets by system.`,
    [EntityType.System]: `Search systems by name or enter an ID.`,
  },
};
