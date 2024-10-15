import React, { useEffect, useState } from 'react';

import { Label } from '@grafana/ui';
import _ from 'lodash';
import { FloatingError } from '../../../../../core/errors';
import { SystemMetadata } from '../../../../system/types';
import { AssetQuery } from '../../../types/types';
import { ListAssetsDataSource } from './ListAssetsDataSource';
import { ListAssetsQuery } from '../../../types/ListAssets.types';
import { AssetQueryBuilder } from './query-builder/AssetQueryBuilder';
import { Workspace } from '../../../../../core/types';

type Props = {
  query: ListAssetsQuery;
  handleQueryChange: (value: AssetQuery, runQuery: boolean) => void;
  datasource: ListAssetsDataSource;
};

export function ListAssetsEditor({ query, handleQueryChange, datasource }: Props) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [systems, setSystems] = useState<SystemMetadata[]>([]);
  const [areDependenciesLoaded, setAreDependenciesLoaded] = useState<boolean>(false);

  useEffect(() => {
    if (datasource.areWorkspacesLoaded) {
      setWorkspaces(datasource.getCachedWorkspaces());
    }

    if (datasource.areSystemsLoaded) {
      setSystems(datasource.getCachedSystems());
    }

    setAreDependenciesLoaded(datasource.areSystemsLoaded && datasource.areWorkspacesLoaded);
  }, [datasource, datasource.areSystemsLoaded, datasource.areWorkspacesLoaded]);

  function onParameterChange(ev: CustomEvent) {
    if (query.filter !== ev.detail.linq) {
      query.filter = ev.detail.linq;
      handleQueryChange(query, true);
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <Label>Filter</Label>

      <AssetQueryBuilder
        filter={query.filter}
        workspaces={workspaces}
        systems={systems}
        areDependenciesLoaded={areDependenciesLoaded}
        onChange={(event: any) => onParameterChange(event)}
      ></AssetQueryBuilder>

      <FloatingError message={datasource.error} />
    </div>
  );
}
