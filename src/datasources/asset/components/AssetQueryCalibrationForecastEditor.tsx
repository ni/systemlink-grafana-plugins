import { SelectableValue, toOption } from '@grafana/data';
import { AssetDataSource } from '../AssetDataSource';
import { AssetCalibrationForecastGroupByType, AssetCalibrationForecastQuery, AssetQuery } from '../types';
import { InlineField, MultiSelect } from '@grafana/ui';
import React from 'react';
import { enumToOptions } from '../../../core/utils';
import _ from 'lodash';

type Props = {
  query: AssetCalibrationForecastQuery;
  handleQueryChange: (value: AssetQuery, runQuery: boolean) => void;
  datasource: AssetDataSource;
};

export function QueryCalibrationForecastEditor({ query, handleQueryChange, datasource }: Props) {
  query = datasource.prepareQuery(query) as AssetCalibrationForecastQuery;
  const handleGroupByChange = (items?: Array<SelectableValue<string>>): void => {
    if (!items || _.isEqual(query.groupBy, items)) {
      return;
    }

    let groupBy = [];
    let locationIndex = items.findIndex(item => item.value === AssetCalibrationForecastGroupByType.Location);
    if (locationIndex !== -1) {
      groupBy.push(AssetCalibrationForecastGroupByType.Location);
      items.splice(locationIndex, 1);
    }

    if (items.length) {
      groupBy.push(items[items.length - 1].value!);
    }

    if (!_.isEqual(query.groupBy, groupBy)) {
      handleQueryChange({ ...query, groupBy: groupBy }, true);
    }
  };

  return (
    <>
      <InlineField label="Group by" tooltip={tooltips.calibrationForecast.groupBy} labelWidth={22}>
        <MultiSelect
          isClearable
          options={enumToOptions(AssetCalibrationForecastGroupByType)}
          onChange={handleGroupByChange}
          width={85}
          value={query.groupBy.map(toOption) || []}
        />
      </InlineField>
    </>
  );
}

const tooltips = {
  calibrationForecast: {
    groupBy: `Group the calibration forecast by day, week, or month.`,
    timeSpan: `The number of days to forecast calibration.`,
  },
};
