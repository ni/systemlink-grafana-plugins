import React, { useEffect, useState } from 'react';
import { QueryEditorProps } from "@grafana/data";
import _ from "lodash";
import { AssetDataSourceOptions, AssetQuery } from 'datasources/asset/types/types';
import { AssetDataSource } from 'datasources/asset/AssetDataSource';
import { FloatingError } from 'core/errors';
import { AssetQueryBuilder } from '../editors/list-assets/query-builder/AssetQueryBuilder';
import { Workspace } from 'core/types';
import { SystemMetadata } from 'datasources/system/types';
import { ListAssetsQuery } from 'datasources/asset/types/ListAssets.types';

type Props = QueryEditorProps<AssetDataSource, AssetQuery, AssetDataSourceOptions>;

export function AssetVariableQueryEditor({ datasource, query, onChange }: Props) {
  const [errorMsg] = useState<string | undefined>('');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [systems, setSystems] = useState<SystemMetadata[]>([]);
  const [areDependenciesLoaded, setAreDependenciesLoaded] = useState<boolean>(false);
  const listAssetQuery: ListAssetsQuery = query as ListAssetsQuery;

  useEffect(() => {
    Promise.all([datasource.getListAssetsSource().areSystemsLoaded$, datasource.getListAssetsSource().areWorkspacesLoaded$]).then(() => {
      setWorkspaces(Array.from(datasource.getListAssetsSource().workspacesCache.values()));
      setSystems(Array.from(datasource.getListAssetsSource().systemAliasCache.values()));
      setAreDependenciesLoaded(true);
    });
  }, [datasource]);

  function onParameterChange(ev: CustomEvent) {
    if (listAssetQuery?.filter !== ev.detail.linq) {
      onChange({...query, filter: ev.detail.linq});
    }
  }

  return (
    <div>
      <AssetQueryBuilder
        filter={listAssetQuery.filter}
        workspaces={workspaces}
        systems={systems}
        areDependenciesLoaded={areDependenciesLoaded}
        onChange={(event: any) => onParameterChange(event)}
      ></AssetQueryBuilder>
      <FloatingError message={errorMsg} />
    </div>
  );
}
