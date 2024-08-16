import React, { useState } from 'react';
import { QueryEditorProps, SelectableValue, toOption } from '@grafana/data';
import { InlineField } from 'core/components/InlineField';
import { AssetDataSource } from "../AssetDataSource";
import {
  AssetCalibrationForecastGroupByType,
  AssetQuery,
  AssetQueryType,
  EntityType,
} from '../types';
import { FloatingError, parseErrorMessage } from "../../../core/errors";
import { MultiSelect, RadioButtonGroup, Select } from "@grafana/ui";
import { isValidId } from "../../data-frame/utils";
import { enumToOptions, useWorkspaceOptions } from "../../../core/utils";
import { SystemMetadata } from "../../system/types";
import _ from "lodash";
import { useAsync } from "react-use";

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

  const handleQueryTypeChange = (item: AssetQueryType): void => {
    handleQueryChange({ ...query, queryKind: item}, true);
  };

  const handleGroupByChange = (items?: Array<SelectableValue<string>>): void => {
    if (items && !_.isEqual(query.groupBy, items)) {

      let groupBy = [];
      let locationIndex = items.findIndex((item) => item.value === AssetCalibrationForecastGroupByType.Location)
      if (locationIndex !== -1) {
        groupBy.push(AssetCalibrationForecastGroupByType.Location);
        items.splice(locationIndex, 1);
      }
        
      if (items.length) {
        groupBy.push(items[items.length - 1].value!);
      }
      
      if (!_.isEqual(query.groupBy, groupBy)) {
        handleQueryChange({ ...query, groupBy: groupBy }, true);
      }
    }
  };

  const onWorkspaceChange = (item?: SelectableValue<string>): void => {
    if (item?.value && item.value !== query.workspace) {
      // if workspace changed, reset Systems and Assets fields
      handleQueryChange(
        { ...query, workspace: item.value, minionIds: [] },
        // do not run query if workspace not changed
        true
      );
    } else {
      handleQueryChange({ ...query, workspace: '' }, true);
    }
  };
  const handleMinionIdChange = (items: Array<SelectableValue<string>>): void => {
    if (items && !_.isEqual(query.minionIds, items)) {
      handleQueryChange(
        { ...query, minionIds: items.map(i => i.value!) },
        // do not run query if minionIds not changed
        true
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
      <InlineField label="Query type" labelWidth={22}>
        <RadioButtonGroup
          options={queryTypeOptions}
          onChange={handleQueryTypeChange}
          value={query.queryKind}
        />
      </InlineField>
      {query.queryKind === AssetQueryType.CalibrationForecast && (
        <>
          <InlineField label="Group by" tooltip={tooltips.calibrationForecast.groupBy} labelWidth={22}>
            <MultiSelect
              isClearable
              options={enumToOptions(AssetCalibrationForecastGroupByType)}
              placeholder="Day / Weak / Month and Location"
              onChange={handleGroupByChange}
              width={85}
              value={query.groupBy.map(toOption) || []}
            />
          </InlineField>
        </>
      )}
      {query.queryKind === AssetQueryType.Metadata && (
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
            options={loadMinionIdOptions()}
            isValidNewOption={isValidId}
            onChange={handleMinionIdChange}
            placeholder="Select systems"
            width={85}
            value={query.minionIds.map(toOption) || []} // Add default value
          />
        </InlineField>
        </>
      )}
      <FloatingError message={errorMsg} />
    </div>
  );
}

const queryTypeOptions = [
  { label: AssetQueryType.Metadata, value: AssetQueryType.Metadata },
  { label: "Calibration forecast", value: AssetQueryType.CalibrationForecast },
];

const tooltips = {
  queryType: `Metadata allows you to visualize the properties of one or more assets.
  Calibration forecast allows you to forecast calibration for one or more assets.`,
    
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

  peakDays: `Calculate utilization for peak or non-peak days.`,

  calibrationForecast: {
    groupBy: `Group the calibration forecast by day, week, or month.`,
    timeSpan: `The number of days to forecast calibration.`,
  }
};


