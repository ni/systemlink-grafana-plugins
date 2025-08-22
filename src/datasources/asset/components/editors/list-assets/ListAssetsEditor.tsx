import './ListAssetsEditor.scss';

import React, { useEffect, useState } from 'react';

import { AutoSizeInput, InlineField, MultiSelect, RadioButtonGroup, Stack } from '@grafana/ui';
import _ from 'lodash';
import { FloatingError } from '../../../../../core/errors';
import { SystemProperties } from '../../../../system/types';
import { AssetQuery } from '../../../types/types';
import { ListAssetsQuery, OutputType, AssetFilterProperties, AssetFilterPropertiesOption } from '../../../types/ListAssets.types';
import { AssetQueryBuilder } from './query-builder/AssetQueryBuilder';
import { Workspace } from '../../../../../core/types';
import { ListAssetsDataSource } from '../../../data-sources/list-assets/ListAssetsDataSource';
import { SelectableValue } from '@grafana/data';
import { takeErrorMessages } from 'datasources/asset/constants/constants';
import { validateNumericInput } from 'core/utils';
import { TAKE_LIMIT } from 'datasources/asset/constants/ListAssets.constants';

type Props = {
  query: ListAssetsQuery;
  handleQueryChange: (value: AssetQuery, runQuery: boolean) => void;
  datasource: ListAssetsDataSource;
};

export function ListAssetsEditor({ query, handleQueryChange, datasource }: Props) {
  query = datasource.patchListAssetQuery(query)

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [systems, setSystems] = useState<SystemProperties[]>([]);
  const [areDependenciesLoaded, setAreDependenciesLoaded] = useState<boolean>(false);
  const outputTypeOptions = Object.values(OutputType).map(value => ({ label: value, value })) as SelectableValue[];
  const assetFilterOptions = Object.values(AssetFilterProperties).map(AssetFilterProperties => ({ label: AssetFilterProperties.label, value: AssetFilterProperties.value, })) as SelectableValue[]
  const [recordCountInvalidMessage, setRecordCountInvalidMessage] = useState<string>('');
  const [isPropertiesValid, setIsPropertiesValid] = useState<boolean>(true);

  useEffect(() => {
    Promise.all([datasource.areSystemsLoaded$, datasource.areWorkspacesLoaded$]).then(() => {
      setWorkspaces(Array.from(datasource.workspacesCache.values()));
      setSystems(Array.from(datasource.systemAliasCache.values()));
      setAreDependenciesLoaded(true);
    });
  }, [datasource]);

  function onParameterChange(ev: CustomEvent) {
    if (query.filter !== ev.detail.linq) {
      query.filter = ev.detail.linq;
      handleQueryChange(query, true);
    }
  }

  function onOutputTypeChange(newValue: OutputType) {
    let updatedQuery: ListAssetsQuery = { ...query };
    if (query.outputType !== newValue) {
      updatedQuery = {
        ...query, outputType: newValue,
      }
    }
    handleQueryChange(updatedQuery, true);
  }

  function validateTakeValue(value: number, TAKE_LIMIT: number) {
    if (isNaN(value) || value < 0) {
      return { message: takeErrorMessages.greaterOrEqualToZero };
    }
    if (value > TAKE_LIMIT) {
      return { message: takeErrorMessages.lessOrEqualToTenThousand };
    }
    return { message: '', take: value };
  }

  function onTakeChange(event: React.FormEvent<HTMLInputElement>) {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    const { message, take } = validateTakeValue(value, TAKE_LIMIT);
    setRecordCountInvalidMessage(message);
    if (query.take !== take) {
      const updatedQuery = { ...query, take };
      handleQueryChange(updatedQuery, true);
    }
  };


  function onPropertiesChange(items: Array<SelectableValue<string>>) {
    setIsPropertiesValid(items.length > 0);
    const updatedQuery = { ...query, properties: items.map(i => i.value as AssetFilterPropertiesOption) };
    handleQueryChange(updatedQuery, true);
  }

  return (
    <>
      <Stack direction="row">
        <Stack direction="column">
          <InlineField label="Output" labelWidth={22} tooltip={tooltips.listAssets.outputType}>
            <RadioButtonGroup
              options={outputTypeOptions}
              value={query.outputType}
              onChange={onOutputTypeChange}
            />
          </InlineField>
          {query.outputType === OutputType.Properties && (
            <InlineField
              label="Properties"
              labelWidth={22}
              tooltip={tooltips.listAssets.properties}
              invalid={!isPropertiesValid}
              error='You must select at least one property.'
            >
              <MultiSelect
                placeholder="Select the properties to query"
                options={assetFilterOptions}
                onChange={onPropertiesChange}
                value={query.properties}
                defaultValue={query.properties!}
                width={65}
                allowCustomValue={false}
                closeMenuOnSelect={false}
              />
            </InlineField>
          )}
          <div className="workorders-horizontal-control-group">
            <InlineField
              label="Filter"
              labelWidth={22}
              tooltip={tooltips.listAssets.filter}
            >
              <AssetQueryBuilder
                filter={query.filter}
                workspaces={workspaces}
                systems={systems}
                globalVariableOptions={datasource.globalVariableOptions()}
                areDependenciesLoaded={areDependenciesLoaded}
                onChange={(event: any) => onParameterChange(event)}
              ></AssetQueryBuilder>

            </InlineField>
            {query.outputType === OutputType.Properties && (
              <div className="workorders-right-query-control">
                <Stack direction="column">
                  <InlineField
                    label="Take"
                    labelWidth={18}
                    tooltip={tooltips.listAssets.take}
                    invalid={!!recordCountInvalidMessage}
                    error={recordCountInvalidMessage}
                  >
                    <AutoSizeInput
                      minWidth={26}
                      maxWidth={26}
                      type="number"
                      value={query.take}
                      onChange={onTakeChange}
                      placeholder="Enter record count"
                      onKeyDown={(event) => { validateNumericInput(event) }}
                    />
                  </InlineField>
                </Stack>
              </div>
            )}
          </div>
        </Stack>
      </Stack >
      <FloatingError message={datasource.error} />
    </>
  );
}

const tooltips = {
  listAssets: {
    filter: `Filter the assets by various properties. This is an optional field.`,
    outputType: 'This field specifies the output type of the query. The query can fetch work order properties or the work order total count.',
    properties: 'This field specifies the query properties.',
    take: 'This field specifies the maximum number of assets to return.'
  },
};
