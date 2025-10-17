import React, { useEffect, useRef, useState } from 'react';
import { QueryEditorProps } from "@grafana/data";
import { AssetQuery, AssetQueryReturnType } from '../../../asset/types/types';
import { AssetDataSource } from '../../AssetDataSource'
import { FloatingError } from '../../../../core/errors';
import { AssetQueryBuilder } from '../editors/list-assets/query-builder/AssetQueryBuilder';
import { Workspace } from '../../../../core/types';
import { SystemProperties } from '../../../system/types';
import { AssetVariableQuery } from '../../../asset/types/AssetVariableQuery.types';
import { AutoSizeInput, InlineField, Stack, Select } from '@grafana/ui';
import { takeErrorMessages } from 'datasources/asset/constants/constants';
import { TAKE_LIMIT, tooltips } from 'datasources/asset/constants/ListAssets.constants';
import { validateNumericInput } from 'core/utils';
import { LocationModel } from 'datasources/asset/types/ListLocations.types';
import { FeatureToggleDataSourceOptions } from 'core/feature-toggle';

type Props = QueryEditorProps<AssetDataSource, AssetQuery, FeatureToggleDataSourceOptions>;

export function AssetVariableQueryEditor({ datasource, query, onChange }: Props) {
  query = datasource.patchListAssetQueryVariable(query);

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [systems, setSystems] = useState<SystemProperties[]>([]);
  const [locations, setLocations] = useState<LocationModel[]>([]);
  const [areDependenciesLoaded, setAreDependenciesLoaded] = useState<boolean>(false);
  const assetVariableQuery = query as AssetVariableQuery;
  const assetListDatasource = useRef(datasource.getListAssetsSource());
  const [recordCountInvalidMessage, setRecordCountInvalidMessage] = useState<string>('');
  const returnTypeOptions = Object.values(AssetQueryReturnType).map((type) => ({
    label: type,
    value: type
  }));

  useEffect(() => {
    Promise.all([assetListDatasource.current.areSystemsLoaded$, assetListDatasource.current.areLocationsLoaded$, assetListDatasource.current.areWorkspacesLoaded$]).then(() => {
      setWorkspaces(Array.from(assetListDatasource.current.workspacesCache.values()));
      setSystems(Array.from(assetListDatasource.current.systemAliasCache.values()));
      setLocations(Array.from(assetListDatasource.current.locationCache.values()));
      setAreDependenciesLoaded(true);
    });
  }, [datasource]);

  function onParameterChange(ev: CustomEvent) {
    if (assetVariableQuery?.filter !== ev.detail.linq) {
      onChange({ ...assetVariableQuery, filter: ev.detail.linq } as AssetVariableQuery);
    }
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
    if (assetVariableQuery.take !== take) {
      onChange({ ...assetVariableQuery, take: take } as AssetVariableQuery);
    }
  };

  function changeQueryReturnType(queryReturnType: AssetQueryReturnType) {
    onChange({ ...assetVariableQuery, queryReturnType: queryReturnType } as AssetVariableQuery);
  }
  return (
    <Stack direction="column">
      <InlineField label="Filter" labelWidth={25} tooltip={tooltips.filter}>
        <AssetQueryBuilder
          filter={assetVariableQuery.filter}
          workspaces={workspaces}
          systems={systems}
          locations={locations}
          globalVariableOptions={assetListDatasource.current.globalVariableOptions()}
          areDependenciesLoaded={areDependenciesLoaded}
          onChange={(event: any) => onParameterChange(event)}
        ></AssetQueryBuilder>
      </InlineField>
      <InlineField
        label="Return Type"
        labelWidth={25}
        tooltip={tooltips.queryReturnType}>
        <Select
          options={returnTypeOptions}
          defaultValue={AssetQueryReturnType.AssetTagPath}
          value={assetVariableQuery.queryReturnType || AssetQueryReturnType.AssetTagPath}
          onChange={(item) => {
            changeQueryReturnType(item.value!);
          }}
          width={26}
        />
      </InlineField>
      <FloatingError message={assetListDatasource.current.error} />
      <InlineField
        label="Take"
        labelWidth={25}
        tooltip={tooltips.take}
        invalid={!!recordCountInvalidMessage}
        error={recordCountInvalidMessage}
      >
        <AutoSizeInput
          minWidth={26}
          maxWidth={26}
          type="number"
          value={assetVariableQuery.take}
          onChange={onTakeChange}
          placeholder="Enter record count"
          onKeyDown={(event) => { validateNumericInput(event) }}
        />
      </InlineField>
    </Stack>
  );
}


