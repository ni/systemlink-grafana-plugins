import React, { useState } from 'react';
import { QueryEditorProps, SelectableValue, toOption } from '@grafana/data';
import { InlineField } from 'core/components/InlineField';
import { AssetDataSource } from "../AssetDataSource";
import {
  AssetQuery,
  EntityType,
} from '../types';
import { FloatingError, parseErrorMessage } from "../../../core/errors";
import { MultiSelect, Select } from "@grafana/ui";
import { isValidId } from "../../data-frame/utils";
import { useWorkspaceOptions } from "../../../core/utils";
import { SystemMetadata } from "../../system/types";
import _ from "lodash";
import { useAsync } from "react-use";
import { selectors } from "../../../test/selectors";

type Props = QueryEditorProps<AssetDataSource, AssetQuery>;

export function AssetQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {

  query = datasource.prepareQuery(query);
  const workspaces = useWorkspaceOptions(datasource);
  const [errorMsg, setErrorMsg] = useState<string | undefined>('');
  const handleError = (error: Error) => setErrorMsg(parseErrorMessage(error));

  const minionIds = useAsync(() => {
    let filterString = '';
    if (query.workspace) {
      filterString += `workspace = "${query.workspace}"`;
    }
    return datasource.querySystems(filterString).catch(handleError);
  }, [query.workspace]);

  const handleQueryChange = (value: AssetQuery, runQuery: boolean): void => {
    onChange(value);
    if (runQuery) {
      onRunQuery();
    }
  };

  const onWorkspaceChange = (item?: SelectableValue<string>): void => {
    if (item?.value) {
      // if workspace changed, reset Systems and Assets fields
      handleQueryChange(
        { ...query, workspace: item.value, minionIds: [] },
        // do not run query if workspace not changed
        query.workspace !== item.value
      );
    } else {
      handleQueryChange({ ...query, workspace: '' }, true);
    }
  };
  const handleMinionIdChange = (items: Array<SelectableValue<string>>): void => {
    if (items) {
      handleQueryChange(
        { ...query, minionIds: items.map(i => i.value!) },
        // do not run query if minionIds not changed
        !_.isEqual(query.minionIds, items)
      );
    } else {
      handleQueryChange({ ...query, minionIds: [] }, true);
    }
  };

  const getVariableOptions = (): Array<SelectableValue<string>> => {
    return datasource.templateSrv
      .getVariables()
      .map((v) => toOption('$' + v.name));
  };
  const loadMinionIdOptions = (): Array<SelectableValue<string>> => {
    let options: SelectableValue[] = (minionIds.value ?? []).map((system: SystemMetadata): SelectableValue<string> => ({
        'label': system.alias ?? system.id,
        'value': system.id,
        'description': system.state,
      })
    )
    options.unshift(...getVariableOptions());

    return options;
  }

  return (
    <div style={{ position: 'relative' }}>
      <InlineField label="Workspace"
                   tooltip={tooltips.workspace[EntityType.Asset]}
                   labelWidth={22}
                   data-testid={selectors.components.assetPlugin.workspace}>
        <Select
          isClearable
          isLoading={workspaces.loading}
          onChange={onWorkspaceChange}
          options={workspaces.value}
          placeholder="Any workspace"
          value={query.workspace}
        />
      </InlineField>
      <InlineField label="Systems"
                   tooltip={tooltips.system[EntityType.Asset]}
                   labelWidth={22}
                   data-testid={selectors.components.assetPlugin.system}>
        <MultiSelect
          isClearable
          allowCreateWhileLoading
          options={loadMinionIdOptions()}
          isValidNewOption={isValidId}
          onChange={handleMinionIdChange}
          placeholder="Select systems"
          width={85}
          value={query.minionIds.map(toOption)}
        />
      </InlineField>
      <FloatingError message={errorMsg}/>
    </div>
  );
}

const tooltips = {

  queryType: `Metadata allows you to visualize the properties of one or more assets.
              Utilization allows you to visualize usage as a percentage.`,

  entityType: `Calculate utilization for one or more systems or assets.`,

  workspace: {
    [EntityType.Asset]: `The workspace where you want to search for the assets.`,
    [EntityType.System]: `The workspace where you want to search for the systems.`,
  },

  system: {
    [EntityType.Asset]: `Filter assets by system.`,
    [EntityType.System]: `Search systems by name or enter id`,
  },

  vendor: {
    [EntityType.Asset]: `Filter assets by vendor.`,
    [EntityType.System]: `Filter systems by vendor.`,
  },

  assetIdentifier: 'Search assets by name or enter id.',

  utilizationCategory: {
    [EntityType.Asset]: `Filter assets by vendor.`,
    [EntityType.System]: `Filter systems by vendor.`,
  },

  timeFrequency: `Calculate utilization for different spans of time.`,

  workingHoursPolicy: `Account for typical working hours when calculating utilization.`,

  workingHours: `Calculate utilization for peak or non-peak hours.`,

  peakDays: `Calculate utilization for peak or non-peak days.`
};


