import { QueryEditorProps, SelectableValue, toOption } from '@grafana/data';
import { AssetCalibrationDataSource } from '../AssetCalibrationDataSource';
import { AssetCalibrationPropertyGroupByType, AssetCalibrationQuery, AssetCalibrationTimeBasedGroupByType } from '../types';
import { InlineField, Label, MultiSelect } from '@grafana/ui';
import React, { useEffect, useState } from 'react';
import { enumToOptions } from '../../../core/utils';
import _ from 'lodash';
import { AssetCalibrationQueryBuilder } from './AssetCalibrationQueryBuilder';
import { Workspace } from 'core/types';
import { FloatingError } from 'core/errors';
import { SystemProperties } from 'datasources/system/types';
import './AssetCalibrationQueryEditor.scss';

type Props = QueryEditorProps<AssetCalibrationDataSource, AssetCalibrationQuery>;

export const AssetCalibrationQueryEditor = ({ query, onChange, onRunQuery, datasource }: Props) => {
  query = datasource.prepareQuery(query) as AssetCalibrationQuery;

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [systems, setSystems] = useState<SystemProperties[]>([]);
  const [areDependenciesLoaded, setAreDependenciesLoaded] = useState<boolean>(false);

  useEffect(() => {
    if (datasource.areWorkspacesLoaded) {
      setWorkspaces(Array.from(datasource.workspacesCache.values()));
    }

    if (datasource.areSystemsLoaded) {
      setSystems(Array.from(datasource.systemAliasCache.values()));
    }

    setAreDependenciesLoaded(datasource.areSystemsLoaded && datasource.areWorkspacesLoaded);
  }, [datasource, datasource.areSystemsLoaded, datasource.areWorkspacesLoaded]);

  const handleQueryChange = (value: AssetCalibrationQuery, runQuery: boolean): void => {
    onChange(value);
    if (runQuery) {
      onRunQuery();
    }
  };

  const handleGroupByChange = (items?: Array<SelectableValue<string>>): void => {
    if (!items || _.isEqual(query.groupBy, items)) {
      return;
    }

    let groupBy: string[] = [];
    let timeGrouping: string = null!;

    for (let item of items) {
      if (item.value === AssetCalibrationTimeBasedGroupByType.Day || item.value === AssetCalibrationTimeBasedGroupByType.Week || item.value === AssetCalibrationTimeBasedGroupByType.Month) {
        timeGrouping = item.value;
        continue;
      }

      groupBy.push(item.value!);
    }

    if (timeGrouping) {
      groupBy.push(timeGrouping);
    }

    groupBy = groupBy.slice(-2);

    if (!_.isEqual(query.groupBy, groupBy)) {
      handleQueryChange({ ...query, groupBy: groupBy }, groupBy.length !== 0);
    }
  };

  function onParameterChange(ev: CustomEvent) {
    if (query.filter !== ev.detail.linq) {
      query.filter = ev.detail.linq;
      handleQueryChange(query, true);
    }
  }

  return (
    <div className='asset-calibration-forecast'>
      <InlineField shrink={true} style={{ maxWidth: '400px' }} label="Group by" tooltip={tooltips.calibrationForecast.groupBy} labelWidth={22}>
        <MultiSelect
          options={[...enumToOptions(AssetCalibrationTimeBasedGroupByType), ...enumToOptions(AssetCalibrationPropertyGroupByType)]}
          onChange={handleGroupByChange}
          value={query.groupBy.map(toOption) || []}
        />
      </InlineField>

      <div>
        <Label>Filter</Label>

        <AssetCalibrationQueryBuilder
          filter={query.filter}
          workspaces={workspaces}
          systems={systems}
          areDependenciesLoaded={areDependenciesLoaded}
          onChange={(event: any) => onParameterChange(event)}>
        </AssetCalibrationQueryBuilder>
      </div>

      <FloatingError message={datasource.error} />
    </div>
  );
}

const tooltips = {
  calibrationForecast: {
    groupBy: `Group the calibration forecast by time and properties. Only one time-based selection is allowed. There can be at most two selections. This is a required field.`,
  },
};
