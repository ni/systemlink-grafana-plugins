import React, { useEffect, useRef, useState } from 'react';
import { QueryEditorProps } from "@grafana/data";
import { AssetDataSourceOptions, AssetQuery } from '../../../asset/types/types';
import { AssetDataSource } from '../../AssetDataSource'
import { FloatingError } from '../../../../core/errors';
import { AssetQueryBuilder } from '../editors/list-assets/query-builder/AssetQueryBuilder';
import { Workspace } from '../../../../core/types';
import { SystemProperties } from '../../../system/types';
import { AssetVariableQuery } from '../../../asset/types/AssetVariableQuery.types';
import { Select } from '@grafana/ui';

type Props = QueryEditorProps<AssetDataSource, AssetQuery, AssetDataSourceOptions>;

export function AssetVariableQueryEditor({ datasource, query, onChange }: Props) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [systems, setSystems] = useState<SystemProperties[]>([]);
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

  return (
    <div style={{ width: "525px" }}>
      <AssetQueryBuilder
        filter={assetVariableQuery.filter}
        workspaces={workspaces}
        systems={systems}
        globalVariableOptions={assetListDatasource.current.globalVariableOptions()}
        areDependenciesLoaded={areDependenciesLoaded}
        onChange={(event: any) => onParameterChange(event)}
      ></AssetQueryBuilder>
      <Select
        options={[{ label: 'Default', value: 'default' }, { label: 'ID', value: 'id' }]}
        value={datasource.getReturnType()}
        onChange={(item) => {
          datasource.setReturnType(item.value as 'default' | 'id');
          onChange({ ...assetVariableQuery, returnType: item.value } as AssetVariableQuery);
        }}
      />
      <FloatingError message={assetListDatasource.current.error} />
    </div>
  );
}
