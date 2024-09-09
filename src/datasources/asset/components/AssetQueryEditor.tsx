import React, { useState } from 'react';
import { QueryEditorProps, SelectableValue, toOption } from '@grafana/data';

import _ from 'lodash';
import { AssetMetadataQuery, EntityType } from '../types';
import { InlineField, MultiSelect, Select } from '@grafana/ui';
import { AssetDataSource } from '../AssetDataSource';
import { useWorkspaceOptions } from '../../../core/utils';
import { FloatingError, parseErrorMessage } from '../../../core/errors';
import { isValidId } from '../../data-frame/utils';
import { SystemMetadata } from '../../system/types';
import { useAsync } from 'react-use';

type Props = QueryEditorProps<AssetDataSource, AssetMetadataQuery>;

export function AssetQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  query = datasource.prepareQuery(query);

  const handleQueryChange = (value: AssetMetadataQuery, runQuery: boolean): void => {
    onChange(value);
    if (runQuery) {
      onRunQuery();
    }
  };

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
        <InlineField label="Workspace" tooltip={tooltips.workspace[EntityType.Asset]} labelWidth={22}>
          <Select
            isClearable
            isLoading={workspaces.loading}
            onChange={onWorkspaceChange}
            options={workspaces.value}
            placeholder="Any workspace"
            value={query.workspace}
          />
        </InlineField>
        <InlineField label="Systems" tooltip={tooltips.system[EntityType.Asset]} labelWidth={22}>
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
  entityType: `Calculate utilization for one or more systems or assets.`,

  workspace: {
    [EntityType.Asset]: `The workspace where you want to search for the assets.`,
    [EntityType.System]: `The workspace where you want to search for the systems.`,
  },

  system: {
    [EntityType.Asset]: `Filter assets by system.`,
    [EntityType.System]: `Search systems by name or enter an ID`,
  },

  vendor: {
    [EntityType.Asset]: `Filter assets by vendor.`,
    [EntityType.System]: `Filter systems by vendor.`,
  },
};

