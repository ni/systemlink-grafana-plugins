import { QueryEditorProps, SelectableValue, toOption } from '@grafana/data';
import { AssetCalibrationDataSource } from '../AssetCalibrationDataSource';
import { AssetCalibrationPropertyGroupByType, AssetCalibrationQuery, AssetCalibrationTimeBasedGroupByType } from '../types';
import { InlineField, MultiSelect } from '@grafana/ui';
import React, { useEffect, useState } from 'react';
import { enumToOptions } from '../../../core/utils';
import _ from 'lodash';
import { AssetCalibrationQueryBuilder } from './AssetCalibrationQueryBuilder';
import { Workspace } from 'core/types';
import { FloatingError, parseErrorMessage } from 'core/errors';

type Props = QueryEditorProps<AssetCalibrationDataSource, AssetCalibrationQuery>;

export function AssetCalibrationQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  query = datasource.prepareQuery(query) as AssetCalibrationQuery;

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const getWorkspaces = async () => {
      const workspaces = await datasource.getWorkspaces();
      setWorkspaces(workspaces);
    }

    getWorkspaces().catch(error => setError(parseErrorMessage(error) || 'Failed to fetch workspaces'));
  }, [datasource]);

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
    <div style={{ position: 'relative' }}>
      <InlineField label="Group by" tooltip={tooltips.calibrationForecast.groupBy} labelWidth={22}>
        <MultiSelect
          options={[...enumToOptions(AssetCalibrationTimeBasedGroupByType), ...enumToOptions(AssetCalibrationPropertyGroupByType)]}
          onChange={handleGroupByChange}
          width={85}
          value={query.groupBy.map(toOption) || []}
        />
      </InlineField>

      <AssetCalibrationQueryBuilder
        filter={query.filter}
        workspaces={workspaces}
        onChange={(event: any) => onParameterChange(event)}>
      </AssetCalibrationQueryBuilder>

      <FloatingError message={error} />
    </div>
  );
}

const tooltips = {
  calibrationForecast: {
    groupBy: `Group the calibration forecast by time and properties. Only one time-based selection is allowed. There can be at most two selections. This is a required field.`,
  },
};
