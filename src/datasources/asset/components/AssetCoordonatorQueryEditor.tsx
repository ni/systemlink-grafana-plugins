import React, { useCallback, useEffect, useRef, useState } from 'react';
import { QueryEditorProps, SelectableValue } from '@grafana/data';

import _ from 'lodash';
import { ListAssetsQuery, AssetQuery, AssetQueryType, AssetSummaryQuery } from '../types';
import { InlineField, Select } from '@grafana/ui';
import { AssetCoordonatorDataSource } from '../AssetCoordonatorDataSource';
import { AssetSummaryEditor } from './editors/asset-summary/AssetSummaryEditor';
import { CalibrationForecastEditor } from './editors/calibration-forecast/CalibrationForecastEditor';
import { AssetCalibrationQuery } from '../../asset-calibration/types';
import { ListAssetsEditor } from './editors/list-assets/ListAssetsEditor';
import { defaultAssetSummaryQuery, defaultCalibrationForecastQuery, defaultListAssetsQuery } from '../defaults';

type Props = QueryEditorProps<AssetCoordonatorDataSource, AssetQuery>;

export function AssetCoordonatorQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  const queryRef = useRef(query);
  const onChangeRef = useRef(onChange);
  const onRunQueryRef = useRef(onRunQuery);
  const [queryType, setQueryType] = useState(AssetQueryType.ListAssets);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onRunQueryRef.current = onRunQuery;
  }, [onRunQuery]);

  const handleQueryChange = useCallback((value: AssetQuery, runQuery = false): void => {
    onChangeRef.current({ ...queryRef.current, ...value });
    if (runQuery) {
      onRunQueryRef.current();
    }
  }, []);

  const handleQueryTypeChange = (item: SelectableValue<AssetQueryType>): void => {
    setQueryType(item.value!);
  };

  useEffect(() => {
    if (queryType === AssetQueryType.ListAssets) {
      handleQueryChange({ ...queryRef.current, queryType: AssetQueryType.ListAssets, ...defaultListAssetsQuery }, true);
    }
    if (queryType === AssetQueryType.CalibrationForecast) {
      handleQueryChange({
        ...queryRef.current,
        queryType: AssetQueryType.CalibrationForecast,
        ...defaultCalibrationForecastQuery,
      });
    }
    if (queryType === AssetQueryType.AssetSummary) {
      handleQueryChange({ ...queryRef.current, queryType: AssetQueryType.AssetSummary, ...defaultAssetSummaryQuery });
    }
  }, [queryType, handleQueryChange]);

  return (
    <div style={{ position: 'relative' }}>
      <InlineField label="Query type" labelWidth={22} tooltip={tooltips.queryType}>
        <Select options={queryTypeOptions} onChange={handleQueryTypeChange} value={queryType} width={85} />
      </InlineField>
      {queryType === AssetQueryType.ListAssets && (
        <ListAssetsEditor
          query={query as ListAssetsQuery}
          handleQueryChange={handleQueryChange}
          datasource={datasource.getListAssetsSource()}
        />
      )}
      {queryType === AssetQueryType.CalibrationForecast && (
        <CalibrationForecastEditor
          query={query as AssetCalibrationQuery}
          handleQueryChange={handleQueryChange}
          datasource={datasource.getCalibrationForecastSource()}
        />
      )}
      {queryType === AssetQueryType.AssetSummary && (
        <AssetSummaryEditor
          query={query as AssetSummaryQuery}
          handleQueryChange={handleQueryChange}
          datasource={datasource.getAssetSummarySource()}
        />
      )}
    </div>
  );
}

const queryTypeOptions = [
  {
    label: AssetQueryType.ListAssets,
    value: AssetQueryType.ListAssets,
    description: 'List assets allows you to search for assets based on various filters.',
  },
  {
    label: AssetQueryType.CalibrationForecast,
    value: AssetQueryType.CalibrationForecast,
    description:
      'Calibration forecast allows you visualize the upcoming asset calibrations in the configured timeframe.',
  },
  {
    label: AssetQueryType.AssetSummary,
    value: AssetQueryType.AssetSummary,
    description: 'Asset summary allows you to view information about all the assets.',
  },
];

const tooltips = {
  queryType: `Select the type of query you want to run.`,
};
