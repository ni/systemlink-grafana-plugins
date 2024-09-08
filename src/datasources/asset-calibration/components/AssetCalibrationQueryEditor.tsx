import { QueryEditorProps, SelectableValue, toOption } from '@grafana/data';
import { AssetCalibrationDataSource } from '../AssetCalibrationDataSource';
import { AssetCalibrationForecastGroupByType, AssetCalibrationQuery } from '../types';
import { InlineField, MultiSelect } from '@grafana/ui';
import React from 'react';
import { enumToOptions } from '../../../core/utils';
import _ from 'lodash';

type Props = QueryEditorProps<AssetCalibrationDataSource, AssetCalibrationQuery>;

export function AssetCalibrationQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  query = datasource.prepareQuery(query) as AssetCalibrationQuery;
  const handleGroupByChange = (items?: Array<SelectableValue<string>>): void => {
    if (!items || _.isEqual(query.groupBy, items)) {
      return;
    }

    const handleQueryChange = (value: AssetCalibrationQuery, runQuery: boolean): void => {
      onChange(value);
      if (runQuery) {
        onRunQuery();
      }
    };

    let groupBy: string[] = [];
    let timeGrouping: string = null!;

    for (let item of items) {
        if (item.value === AssetCalibrationForecastGroupByType.Day || item.value === AssetCalibrationForecastGroupByType.Week || item.value === AssetCalibrationForecastGroupByType.Month) {
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

  return (
    <div style={{ position: 'relative' }}>
      <InlineField label="Group by" tooltip={tooltips.calibrationForecast.groupBy} labelWidth={22}>
        <MultiSelect
          options={enumToOptions(AssetCalibrationForecastGroupByType)}
          onChange={handleGroupByChange}
          width={85}
          value={query.groupBy.map(toOption) || []}
        />
      </InlineField>
    </div>
  );
}

const tooltips = {
  calibrationForecast: {
    groupBy: `Group the calibration forecast by day, week, month. Only one time-based grouping is allowed. Only two groupings are allowed. This is a required field.`,
  },
};
