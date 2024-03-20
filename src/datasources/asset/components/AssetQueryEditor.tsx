import React, { useState } from 'react';
import { QueryEditorProps, SelectableValue, toOption, dateTime } from '@grafana/data';
import { InlineField } from 'core/components/InlineField';
import { AssetDataSource } from "../AssetDataSource";
import {
  AssetFilterProperties,
  AssetQueryType,
  AssetQuery,
  EntityType,
  IsNIAsset,
  IsPeak,
  PolicyOption,
  TimeFrequency,
  UtilizationCategory,
  Weekday, AssetModel
} from '../types';
import { FloatingError, parseErrorMessage } from "../../../core/errors";
import { useAsync } from "react-use";
import { arraysEqual, } from "../helper";
import { HorizontalGroup, MultiSelect, RadioButtonGroup, Select, TimeOfDayPicker } from "@grafana/ui";
import { isValidId } from "../../data-frame/utils";
import {
  assetQueryTypeOptions,
  entityTypeOptions,
  isNIAssetOptions,
  isPeakOptions,
  peakDayOptions,
  policyOptions,
  timeFrequencyOptions,
  utilizationCategoryOptions
} from "../constants";
import { useWorkspaceOptions } from "../../../core/utils";
import { SystemMetadata } from "../../system/types";

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
  const assetIds = useAsync(() => {
    const filterArray: string[] = [];
    if (query.isNIAsset === IsNIAsset.NIASSET) {
      filterArray.push(`${AssetFilterProperties.IsNIAsset} = "true"`);
    } else if (query.isNIAsset === IsNIAsset.NOTNIASSET) {
      filterArray.push(`${AssetFilterProperties.IsNIAsset} = "false"`);
    }
    if (query.minionId) {
      const resolvedId = datasource.templateSrv.replace(query.minionId);
      filterArray.push(`${AssetFilterProperties.LocationMinionId} = "${resolvedId}"`);
    }
    if (query.workspace) {
      filterArray.push(`workspace = "${query.workspace}"`);
    }
    let filter = filterArray.filter(Boolean).join(' and ');
    return datasource.queryAssets(filter).catch(handleError);
  }, [query.workspace, query.minionId, query.isNIAsset]);
  const servicePolicy = useAsync(() => {
    return datasource.getServicePolicy();
  });

  const handleQueryChange = (value: AssetQuery, runQuery: boolean): void => {
    onChange(value);
    if (runQuery) {
      onRunQuery();
    }
  };

  const onWorkspaceChange = (item?: SelectableValue<string>): void => {
    if (item?.value && query.workspace !== item.value) {
      const { assetIdentifier, minionId, ...changedQuery } = query;
      handleQueryChange({ ...changedQuery, workspace: item.value, minionId: '', assetIdentifier: '' }, true);
    } else {
      handleQueryChange({ ...query, workspace: '' }, true);
    }
  };
  const handleMinionIdChange = (item: SelectableValue<string>): void => {
    if (item?.value && query.minionId !== item.value) {
      const { assetIdentifier, ...changedQuery } = query;
      handleQueryChange({ ...changedQuery, minionId: item.value, assetIdentifier: '' }, true);
    } else {
      handleQueryChange({ ...query, minionId: '' }, true);
    }
  };
  const handleAssetIdentifierChange = (item: SelectableValue<string>): void => {
    if (item?.value && query.assetIdentifier !== item.value) {
      handleQueryChange({ ...query, assetIdentifier: item.value }, true);
    } else {
      handleQueryChange({ ...query, assetIdentifier: '' }, true);
    }
  };
  const handleIsNIAssetChange = (value: IsNIAsset): void => {
    if (query.isNIAsset !== value) {
      handleQueryChange({ ...query, isNIAsset: value }, false);
    }
  };
  const handleAssetQueryTypeChange = (value: AssetQueryType): void => {
    if (query.assetQueryType !== value) {
      handleQueryChange({ ...query, assetQueryType: value }, true);
    }
  };
  const handleEntityTypeChange = (value: EntityType): void => {
    if (query.entityType !== value) {
      handleQueryChange({ ...query, entityType: value }, true);
    }
  };
  const handleUtilizationTimeFrequencyChange = (item: TimeFrequency): void => {
    if (query.timeFrequency !== item) {
      handleQueryChange({ ...query, timeFrequency: item }, true);
    }
  };
  const handleUtilizationCategoryChange = (value: UtilizationCategory): void => {
    if (query.utilizationCategory !== value) {
      handleQueryChange({ ...query, utilizationCategory: value }, true);
    }
  };
  const handlePeakDaysChange = (items: Array<SelectableValue<Weekday>>): void => {
    if (!arraysEqual(items, query.peakDays)) {
      handleQueryChange({ ...query, peakDays: items.map(item => item.value!) }, true);
    }
  };
  const handleIsPeakChange = async (item: IsPeak): Promise<void> => {
    if (query.isPeak !== item) {
      handleQueryChange({ ...query, isPeak: item }, true);
    }
  };
  const handlePolicyOptionChange = async (item: PolicyOption): Promise<void> => {
    if (query.policyOption !== item) {
      if (item === PolicyOption.ALL) {
        const startDate = new Date((new Date()).setHours(0, 0, 0));
        const endDate = new Date((new Date()).setHours(0, 0, 0));
        handleQueryChange({
          ...query,
          policyOption: item,
          peakStart: dateTime(startDate),
          nonPeakStart: dateTime(endDate)
        }, true);
      } else if (item === PolicyOption.DEFAULT) {
        const workingHoursPolicy = (await datasource.getServicePolicy()).workingHoursPolicy;
        const [startHours, startMinutes, startSeconds] = workingHoursPolicy.startTime.split(':').map(Number);
        const [endHours, endMinutes, endSeconds] = workingHoursPolicy.endTime.split(':').map(Number);
        const startDate = new Date((new Date()).setHours(startHours, startMinutes, startSeconds));
        const endDate = new Date((new Date()).setHours(endHours, endMinutes, endSeconds));
        handleQueryChange({
          ...query,
          policyOption: item,
          peakStart: dateTime(startDate),
          nonPeakStart: dateTime(endDate),
        }, true);
      } else {
        handleQueryChange({ ...query, policyOption: item }, true);
      }
    }
  };
  const handlePeakStartChange = (time: any): void => {
    handleQueryChange({ ...query, peakStart: dateTime(time.toISOString()) }, true);
  };
  const handleNonPeakStartChange = (time: any): void => {
    handleQueryChange({ ...query, nonPeakStart: dateTime(time.toISOString()) }, true)
  };
  const getVariableOptions = (): Array<SelectableValue<string>> => {
    return datasource.templateSrv
      .getVariables()
      .map((v) => toOption('$' + v.name));
  };
  const loadMinionIdOptions = (): Array<SelectableValue<string>> => {
    let options: SelectableValue[] = (minionIds.value ?? []).map((system: SystemMetadata): SelectableValue<string> => ({
        'label': system.alias,
        'value': system.id,
        'description': system.state,
      })
    )
    options.unshift(...getVariableOptions());

    return options;
  }

  const loadAssetIdOptions = (): Array<SelectableValue<string>> => {
    let options: SelectableValue[] = (assetIds.value ?? []).map((asset: AssetModel): SelectableValue<string> => ({
        'label': asset.name,
        'value': asset.id,
        description: asset.id
      })
    );
    options.unshift(...getVariableOptions());

    return options;
  }

  return (
    <div style={{ position: 'relative' }}>
      <InlineField label={"Query Type"} tooltip="Metadata or utilization" labelWidth={22}>
        <RadioButtonGroup
          options={assetQueryTypeOptions}
          value={query.assetQueryType}
          onChange={(item: any) => handleAssetQueryTypeChange(item)}
        />
      </InlineField>
      {query.assetQueryType === AssetQueryType.METADATA &&
        (<>
          <InlineField label="Systems"
                       tooltip="Filter assets based on their connection to a specific system"
                       labelWidth={22}>
            <Select
              isClearable
              allowCreateWhileLoading
              options={loadMinionIdOptions()}
              isValidNewOption={isValidId}
              onChange={handleMinionIdChange}
              placeholder="Select Systems"
              width={85}
              value={query.minionId ? toOption(query.minionId) : null}
            />
          </InlineField>
          <InlineField label="Workspace" labelWidth={22} tooltip={'Choose workspace'}>
            <Select
              isClearable
              isLoading={workspaces.loading}
              onChange={onWorkspaceChange}
              options={workspaces.value}
              placeholder="Any workspace"
              value={query.workspace}
            />
          </InlineField>
        </>)}
      {
        query.assetQueryType === AssetQueryType.UTILIZATION &&
        (<>
          <InlineField label={"Calculate utilization for"}
                       tooltip="Calculate utilization for system(s) or asset(s)" labelWidth={22} htmlFor={'ss'}>
            <RadioButtonGroup
              options={entityTypeOptions}
              value={query.entityType}
              onChange={(item: any) => handleEntityTypeChange(item)}
              id={'ss'}
            />
          </InlineField>
          <InlineField label="Workspace" labelWidth={22} tooltip={'Choose workspace'}>
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
                       tooltip="Filter assets based on their connection to a specific system"
                       labelWidth={22}>
            <Select
              isClearable
              allowCreateWhileLoading
              options={loadMinionIdOptions()}
              isValidNewOption={isValidId}
              onChange={handleMinionIdChange}
              placeholder="Select System"
              width={85}
              value={query.minionId ? toOption(query.minionId) : null}
            />
          </InlineField>
          <InlineField label={"Vendor"} tooltip="Filter assets by vendor" labelWidth={22}>
            <RadioButtonGroup
              options={isNIAssetOptions}
              value={query.isNIAsset}
              onChange={(item: any) => handleIsNIAssetChange(item)}
            />
          </InlineField>
          {query.entityType === EntityType.ASSET && (
            <InlineField label="Asset Identifier"
                         tooltip="Select an asset from the list, search by name or enter the asset ID to visualize the utilization"
                         labelWidth={22}>
              <Select
                width={85}
                allowCreateWhileLoading
                isClearable={true}
                isValidNewOption={isValidId}
                options={loadAssetIdOptions()}
                onChange={handleAssetIdentifierChange}
                placeholder="Search by name or enter id"
                value={query.assetIdentifier ? toOption(query.assetIdentifier) : null}
              />
            </InlineField>
          )}
          <InlineField label={"Utilization Category"}
                       tooltip="Analyze asset utilization based on the purpose of asset usage?"
                       labelWidth={22}>
            <RadioButtonGroup
              options={utilizationCategoryOptions}
              value={query.utilizationCategory}
              onChange={handleUtilizationCategoryChange}
            />
          </InlineField>
          <InlineField label={"Frequency of Intervals"}
                       tooltip={"You want daily or hourly utilization?"}
                       labelWidth={22}>
            <RadioButtonGroup
              fullWidth={true}
              options={timeFrequencyOptions}
              value={query.timeFrequency}
              onChange={handleUtilizationTimeFrequencyChange}
            />
          </InlineField>
          <InlineField label={"Peak / Non-peak"}
                       tooltip="Analyze data based on peak or non-peak hours specified in SystemLink"
                       labelWidth={22}>
            <RadioButtonGroup
              options={isPeakOptions}
              value={query.isPeak}
              onChange={handleIsPeakChange}
            />
          </InlineField>
          <InlineField label={"Working Hours Policy"}
                       tooltip="Working Hours Policy"
                       labelWidth={22}>
            <HorizontalGroup label={"Set Working Hours Policy"}>
              <RadioButtonGroup
                options={policyOptions}
                value={query.policyOption}
                onChange={handlePolicyOptionChange}
              />
              <TimeOfDayPicker
                value={
                  !query.peakStart && servicePolicy.value
                    ? dateTime(new Date(`2024-01-01T${servicePolicy.value?.workingHoursPolicy.startTime}`))
                    : dateTime(query.peakStart)
                }
                onChange={handlePeakStartChange}
                disabled={query.policyOption !== PolicyOption.CUSTOM}
              />
              <TimeOfDayPicker
                value={
                  !query.nonPeakStart && servicePolicy.value
                    ? dateTime(`2024-01-01T${servicePolicy.value?.workingHoursPolicy.endTime}`)
                    : dateTime(query.nonPeakStart)
                }
                onChange={handleNonPeakStartChange}
                disabled={query.policyOption !== PolicyOption.CUSTOM}
              />
            </HorizontalGroup>
          </InlineField>
          <InlineField label={"Peak days"}
                       tooltip="Analyze asset utilization based on peak or non-peak days specified in SystemLink"
                       labelWidth={22}>
            <MultiSelect
              width={85}
              options={peakDayOptions}
              value={query.peakDays.map(day => {
                return peakDayOptions[day]
              })}
              onChange={(item: any) => handlePeakDaysChange(item)}
            />
          </InlineField>
        </>)
      }
      <FloatingError message={errorMsg}/>
    </div>
  );
}
