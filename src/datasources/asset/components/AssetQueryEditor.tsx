import React from 'react';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { InlineField } from 'core/components/InlineField';
import { AssetDataSource } from '../AssetDataSource';
import { AssetCalibrationForecastQuery, AssetMetadataQuery, AssetQuery, AssetQueryLabel, AssetQueryType } from '../types';
import { Select } from '@grafana/ui';

import _ from 'lodash';
import { QueryCalibrationForecastEditor } from './AssetQueryCalibrationForecastEditor';
import { QueryMetadataEditor } from './AssetQueryMetadataEditor';

type Props = QueryEditorProps<AssetDataSource, AssetQuery>;

export function AssetQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  query = datasource.prepareQuery(query);

  const handleQueryChange = (value: AssetQuery, runQuery: boolean): void => {
    onChange(value);
    if (runQuery) {
      onRunQuery();
    }
  };

  const handleQueryTypeChange = (item: SelectableValue<AssetQueryType>): void => {
    if (item.value === AssetQueryType.CalibrationForecast) {
      handleQueryChange({ ...query, queryKind: item.value! }, isValidAssetCalibrationForecastQuery(query as AssetCalibrationForecastQuery));
      return;
    }
    handleQueryChange({ ...query, queryKind: item.value! }, true);
  };

  const isValidAssetCalibrationForecastQuery = (query: AssetCalibrationForecastQuery): boolean => {
    return query.groupBy.length > 0;
  }

  return (
    <div style={{ position: 'relative' }}>
      <InlineField label="Query type" labelWidth={22} tooltip={tooltips.queryType}>
        <Select
          options={queryTypeOptions}
          onChange={handleQueryTypeChange}
          value={query.queryKind}
          width={85} />
      </InlineField>
      {query.queryKind === AssetQueryType.CalibrationForecast &&
        QueryCalibrationForecastEditor({
          query: query as AssetCalibrationForecastQuery,
          handleQueryChange,
          datasource,
        })}
      {query.queryKind === AssetQueryType.Metadata &&
        QueryMetadataEditor({ query: query as AssetMetadataQuery, handleQueryChange, datasource })}
    </div>
  );
}

const queryTypeOptions = [
  {
    label: AssetQueryLabel.Metadata,
    value: AssetQueryType.Metadata,
    description: 'Metadata allows you to visualize the properties of one or more assets.',
  },
  {
    label: AssetQueryLabel.CalibrationForecast,
    value: AssetQueryType.CalibrationForecast,
    description:
      'Calibration forecast allows you visualize the upcoming asset calibrations in the configured timeframe.',
  },
];

const tooltips = {
  queryType: 'Select the type of query you want to run.',
};
