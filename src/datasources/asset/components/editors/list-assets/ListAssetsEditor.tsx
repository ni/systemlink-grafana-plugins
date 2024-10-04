import { SelectableValue, toOption } from '@grafana/data';
import React, { useState } from 'react';

import { InlineField, MultiSelect, Select } from '@grafana/ui';
import _ from 'lodash';
import { useAsync } from 'react-use';
import { FloatingError, parseErrorMessage } from '../../../../../core/errors';
import { useWorkspaceOptions } from '../../../../../core/utils';
import { isValidId } from '../../../../data-frame/utils';
import { SystemMetadata } from '../../../../system/types';
import { AssetQuery, ListAssetsQuery } from '../../../types';
import { ListAssetsDataSource } from './ListAssetsDataSource';

type Props = {
  query: ListAssetsQuery;
  handleQueryChange: (value: AssetQuery, runQuery: boolean) => void;
  datasource: ListAssetsDataSource;
};

export function ListAssetsEditor({ query, handleQueryChange, datasource }: Props) {
  query = datasource.prepareQuery(query) as ListAssetsQuery;

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

  const onWorkspaceChange = (item?: SelectableValue<string>): void => {
    if (item?.value && item.value !== query.workspace) {
      // if workspace changed, reset Systems and Assets fields
      handleQueryChange(
        { ...query, workspace: item.value, minionIds: [] },
        // do not run query if workspace not changed
        true
      );
    } else {
      handleQueryChange({ ...query, workspace: '' }, true);
    }
  };

  const handleMinionIdChange = (items: Array<SelectableValue<string>>): void => {
    if (items && !_.isEqual(query.minionIds, items)) {
      handleQueryChange(
        { ...query, minionIds: items.map(i => i.value!) },
        // do not run query if minionIds not changed
        true
      );
    } else {
      handleQueryChange({ ...query, minionIds: [] }, true);
    }
  };

  const getVariableOptions = (): Array<SelectableValue<string>> => {
    return datasource.templateSrv.getVariables().map(v => toOption('$' + v.name));
  };
  const loadMinionIdOptions = (): Array<SelectableValue<string>> => {
    let options: SelectableValue[] = (minionIds.value ?? []).map(
      (system: SystemMetadata): SelectableValue<string> => ({
        label: system.alias ?? system.id,
        value: system.id,
        description: system.state,
      })
    );
    options.unshift(...getVariableOptions());

    return options;
  };

  return (
    <div style={{ position: 'relative' }}>
      <InlineField label="Workspace" tooltip={tooltips.workspace} labelWidth={22}>
        <Select
          isClearable
          isLoading={workspaces.loading}
          onChange={onWorkspaceChange}
          options={workspaces.value}
          placeholder="Any workspace"
          value={query.workspace}
        />
      </InlineField>
      <InlineField label="Systems" tooltip={tooltips.system} labelWidth={22}>
        <MultiSelect
          isClearable
          allowCreateWhileLoading
          options={loadMinionIdOptions()}
          isValidNewOption={isValidId}
          onChange={handleMinionIdChange}
          placeholder="Select systems"
          width={85}
          value={query.minionIds.map(toOption) || []} // Add default value
        />
      </InlineField>
      <FloatingError message={errorMsg} />
    </div>
  );
}
const tooltips = {
  workspace: `The workspace where you want to search for the assets.`,
  system: `Filter assets by system.`,
};
