import React, { useEffect, useState } from 'react';

import { CalibrationForecastDataSource } from '../../../data-sources/calibration-forecast/CalibrationForecastDataSource';
import {
  AssetCalibrationPropertyGroupByType,
  AssetCalibrationTimeBasedGroupByType,
  CalibrationForecastQuery,
} from '../../../types/CalibrationForecastQuery.types';
import _ from 'lodash';
import { SelectableValue, toOption } from '@grafana/data';
import { Workspace } from '../../../../../core/types';
import { SystemMetadata } from '../../../../system/types';
import { InlineField, MultiSelect } from '@grafana/ui';
import { FloatingError } from '../../../../../core/errors';
import { enumToOptions } from '../../../../../core/utils';
import { CalibrationForecastQueryBuilder } from './query-builder/CalibrationForecastQueryBuilder';
import './CalibrationForecastEditor.scss';

type Props = {
  query: CalibrationForecastQuery;
  handleQueryChange: (value: CalibrationForecastQuery, runQuery: boolean) => void;
  datasource: CalibrationForecastDataSource;
};

export function CalibrationForecastEditor({ query, handleQueryChange, datasource }: Props) {
  query = datasource.prepareQuery(query) as CalibrationForecastQuery;
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

  const handleGroupByChange = (items?: Array<SelectableValue<string>>): void => {
    if (!items || _.isEqual(query.groupBy, items)) {
      return;
    }

    let groupBy: string[] = [];
    let timeGrouping: string = null!;

    for (let item of items) {
      if (
        item.value === AssetCalibrationTimeBasedGroupByType.Day ||
        item.value === AssetCalibrationTimeBasedGroupByType.Week ||
        item.value === AssetCalibrationTimeBasedGroupByType.Month
      ) {
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
    <>
      <InlineField
        shrink={true}
        style={{ maxWidth: '400px' }}
        label="Group by"
        tooltip={tooltips.calibrationForecast.groupBy}
        labelWidth={22}
      >
        <MultiSelect
          width={65}
          options={[
            ...enumToOptions(AssetCalibrationTimeBasedGroupByType),
            ...enumToOptions(AssetCalibrationPropertyGroupByType),
          ]}
          onChange={handleGroupByChange}
          value={query.groupBy.map(toOption) || []}
        />
      </InlineField>

      <InlineField
        label="Filter"
        labelWidth={22}
        tooltip={tooltips.calibrationForecast.filter}
        >
        <CalibrationForecastQueryBuilder
          filter={query.filter}
          workspaces={workspaces}
          systems={systems}
          globalVariableOptions={datasource.globalVariableOptions}
          areDependenciesLoaded={areDependenciesLoaded}
          onChange={(event: any) => onParameterChange(event)}
        ></CalibrationForecastQueryBuilder>
      </InlineField>

      <FloatingError message={datasource.error} />
    </>
  );
}

const tooltips = {
  calibrationForecast: {
    groupBy: `Group the calibration forecast by time and properties. Only one time-based selection is allowed. There can be at most two selections. This is a required field.`,
    filter: `Filter the calibration forecast assets by various properties. This is an optional field.`,
  },
};
