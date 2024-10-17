import React, { useEffect, useRef, useState } from 'react';
import { QueryEditorProps } from "@grafana/data";
import { AssetDataSourceOptions, AssetQuery } from 'datasources/asset/types/types';
import { AssetDataSource } from 'datasources/asset/AssetDataSource';
import { FloatingError } from 'core/errors';
import { AssetQueryBuilder } from '../editors/list-assets/query-builder/AssetQueryBuilder';
import { Workspace } from 'core/types';
import { SystemMetadata } from 'datasources/system/types';
import { ListAssetsQuery } from 'datasources/asset/types/ListAssets.types';

type Props = QueryEditorProps<AssetDataSource, AssetQuery, AssetDataSourceOptions>;

export function AssetVariableQueryEditor({ datasource, query, onChange }: Props) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [systems, setSystems] = useState<SystemMetadata[]>([]);
  const [areDependenciesLoaded, setAreDependenciesLoaded] = useState<boolean>(false);
  const listAssetQuery: ListAssetsQuery = query as ListAssetsQuery;
  const assetListDatasource = useRef(datasource.getListAssetsSource());

  useEffect(() => {
    Promise.all([assetListDatasource.current.areSystemsLoaded$, assetListDatasource.current.areWorkspacesLoaded$]).then(() => {
      setWorkspaces(Array.from(assetListDatasource.current.workspacesCache.values()));
      setSystems(Array.from(assetListDatasource.current.systemAliasCache.values()));
      setAreDependenciesLoaded(true);
    });
  }, [datasource]);

  function onParameterChange(ev: CustomEvent) {
    if (listAssetQuery?.filter !== ev.detail.linq) {
      onChange({...query, filter: ev.detail.linq});
    }
  }

  return (
    <div style={{ width: "525px"}}>
      <AssetQueryBuilder
        filter={listAssetQuery.filter}
        workspaces={workspaces}
        systems={systems}
        areDependenciesLoaded={areDependenciesLoaded}
        onChange={(event: any) => onParameterChange(event)}
      ></AssetQueryBuilder>
      <FloatingError message={assetListDatasource.current.error} />
    </div>
  );
}
