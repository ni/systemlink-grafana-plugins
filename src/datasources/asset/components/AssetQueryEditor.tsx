import React from 'react';
import { QueryEditorProps } from '@grafana/data';
import { InlineField } from 'core/components/InlineField';
import { AssetDataSource } from '../AssetDataSource';
import { AssetCalibrationForecastQuery, AssetMetadataQuery, AssetQuery, AssetQueryType } from '../types';
import { RadioButtonGroup } from '@grafana/ui';

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

  const handleQueryTypeChange = (item: AssetQueryType): void => {
    handleQueryChange({ ...query, queryKind: item }, true);
  };

  return (
    <div style={{ position: 'relative' }}>
      <InlineField label="Query type" labelWidth={22}>
        <RadioButtonGroup options={queryTypeOptions} onChange={handleQueryTypeChange} value={query.queryKind} />
      </InlineField>
      {query.queryKind === AssetQueryType.CalibrationForecast &&
        QueryCalibrationForecastEditor({ query: query as AssetCalibrationForecastQuery, handleQueryChange, datasource })}
      {query.queryKind === AssetQueryType.Metadata &&
        QueryMetadataEditor({ query: query as AssetMetadataQuery, handleQueryChange, datasource })}
    </div>
  );
}

const queryTypeOptions = [
  { label: AssetQueryType.Metadata, value: AssetQueryType.Metadata },
  { label: 'Calibration forecast', value: AssetQueryType.CalibrationForecast },
];
