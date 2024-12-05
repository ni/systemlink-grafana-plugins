import React, { useCallback, useEffect, useRef, useState } from 'react';
import { QueryEditorProps } from "@grafana/data";
import { AssetDataSourceOptions, AssetFeatureToggles, AssetFeatureTogglesDefaults, AssetQuery } from '../../../asset/types/types';
import { AssetDataSource } from '../../AssetDataSource'
import { FloatingError } from '../../../../core/errors';
import { AssetQueryBuilder } from '../editors/list-assets/query-builder/AssetQueryBuilder';
import { Workspace } from '../../../../core/types';
import { SystemMetadata } from '../../../system/types';
import { AssetVariableQuery } from '../../../asset/types/AssetVariableQuery.types';

type Props = QueryEditorProps<AssetDataSource, AssetQuery, AssetDataSourceOptions>;

export function AssetVariableQueryEditor ( { datasource, query, onRunQuery, onChange }: Props )
{
  const assetFeatures = useRef<AssetFeatureToggles>({
    assetList: datasource.instanceSettings.jsonData?.featureToggles?.assetList ?? AssetFeatureTogglesDefaults.assetList,
    calibrationForecast: datasource.instanceSettings.jsonData?.featureToggles?.calibrationForecast ?? AssetFeatureTogglesDefaults.calibrationForecast,
    assetSummary: datasource.instanceSettings.jsonData?.featureToggles?.assetSummary ?? AssetFeatureTogglesDefaults.assetSummary,
    advancedFilter: datasource.instanceSettings.jsonData?.featureToggles?.advancedFilter ?? AssetFeatureTogglesDefaults.advancedFilter,
  });
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [systems, setSystems] = useState<SystemMetadata[]>([]);
  const [areDependenciesLoaded, setAreDependenciesLoaded] = useState<boolean>(false);
  const assetVariableQuery = query as AssetVariableQuery;
  const assetListDatasource = useRef(datasource.getListAssetsSource());

  useEffect(() => {
    Promise.all([assetListDatasource.current.areSystemsLoaded$, assetListDatasource.current.areWorkspacesLoaded$]).then(() => {
      setWorkspaces(Array.from(assetListDatasource.current.workspacesCache.values()));
      setSystems(Array.from(assetListDatasource.current.systemAliasCache.values()));
      setAreDependenciesLoaded(true);
    });
  }, [datasource]);

  function onParameterChange(ev: CustomEvent) {
    if (assetVariableQuery?.filter !== ev.detail.linq) {
      onChange({ ...assetVariableQuery, filter: ev.detail.linq } as AssetVariableQuery);
    }
  }

  const handleQueryChange = useCallback((value: AssetQuery, runQuery = false): void => {
    onChange(value);
    if (runQuery) {
      onRunQuery();
    }
  }, [onChange, onRunQuery]);

  return (
    <div style={{ width: "520px" }}>
      <AssetQueryBuilder
        filter={assetVariableQuery.filter}
        workspaces={workspaces}
        systems={systems}
        globalVariableOptions={assetListDatasource.current.globalVariableOptions()}
        areDependenciesLoaded={areDependenciesLoaded}
        onChange={(event: any) => onParameterChange(event)}
        query={assetVariableQuery}
        handleQueryChange={ handleQueryChange }
        complexFilterEnabled={assetFeatures.current.advancedFilter}
      ></AssetQueryBuilder>
      <FloatingError message={assetListDatasource.current.error} />
    </div>
  );
}
