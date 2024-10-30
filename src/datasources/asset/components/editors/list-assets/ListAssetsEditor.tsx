import React, { useEffect, useState } from 'react';

import { InlineField } from '@grafana/ui';
import _ from 'lodash';
import { FloatingError } from '../../../../../core/errors';
import { SystemMetadata } from '../../../../system/types';
import { AssetQuery } from '../../../types/types';
import { ListAssetsQuery } from '../../../types/ListAssets.types';
import { AssetQueryBuilder } from './query-builder/AssetQueryBuilder';
import { Workspace } from '../../../../../core/types';
import { ListAssetsDataSource } from '../../../data-sources/list-assets/ListAssetsDataSource';
import { filterXSSLINQExpression } from 'core/utils';

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
    Promise.all([datasource.areSystemsLoaded$, datasource.areWorkspacesLoaded$]).then(() => {
      setWorkspaces(Array.from(datasource.workspacesCache.values()));
      setSystems(Array.from(datasource.systemAliasCache.values()));
      setAreDependenciesLoaded(true);
    });
  }, [datasource]);

  function onParameterChange(ev: CustomEvent) {
    if (query.filter !== ev.detail.linq) {
      query.filter = filterXSSLINQExpression(ev.detail.linq);
      handleQueryChange(query, true);
    }
  }

  return (
    <>
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
      <FloatingError message={datasource.error} />
    </>
  );
}

const tooltips = {
  listAssets: {
    filter: `Filter the assets by various properties. This is an optional field.`,
  },
};
