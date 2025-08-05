import React, { useEffect, useState } from 'react';

import { InlineField, RadioButtonGroup } from '@grafana/ui';
import _ from 'lodash';
import { FloatingError } from '../../../../../core/errors';
import { SystemProperties } from '../../../../system/types';
import { AssetQuery } from '../../../types/types';
import { ListAssetsQuery, OutputType } from '../../../types/ListAssets.types';
import { AssetQueryBuilder } from './query-builder/AssetQueryBuilder';
import { Workspace } from '../../../../../core/types';
import { ListAssetsDataSource } from '../../../data-sources/list-assets/ListAssetsDataSource';
import { SelectableValue } from '@grafana/data';

type Props = {
  query: ListAssetsQuery;
  handleQueryChange: (value: AssetQuery, runQuery: boolean) => void;
  datasource: ListAssetsDataSource;
};

export function ListAssetsEditor({ query, handleQueryChange, datasource }: Props) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [systems, setSystems] = useState<SystemProperties[]>([]);
  const [areDependenciesLoaded, setAreDependenciesLoaded] = useState<boolean>(false);
  const outputTypeOptions = Object.values(OutputType).map(value => ({ label: value, value })) as SelectableValue[];

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

  return (
    <>
      <InlineField label="Output" labelWidth={22} tooltip={tooltips.listAssets.outputType}>
        <RadioButtonGroup
          options={outputTypeOptions}
          value={query.outputType || OutputType.Properties}
          onChange={onOutputTypeChange}
        />
      </InlineField>
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
    outputType: 'This field specifies the output type of the query. The query can fetch work order properties or the work order total count.',
    properties: 'This field specifies the query properties.',
  },
};
