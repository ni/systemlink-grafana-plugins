import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QueryEditorProps, SelectableValue } from '@grafana/data';

import _ from 'lodash';
import { AssetDataSourceOptions, AssetQuery, AssetQueryType } from '../types/types';
import { InlineField, Select } from '@grafana/ui';
import { AssetDataSource } from '../AssetDataSource';
import { AssetSummaryEditor } from './editors/asset-summary/AssetSummaryEditor';
import { CalibrationForecastEditor } from './editors/calibration-forecast/CalibrationForecastEditor';
import { AssetCalibrationQuery } from '../../asset-calibration/types';
import { ListAssetsEditor } from './editors/list-assets/ListAssetsEditor';
import { defaultAssetSummaryQuery, defaultCalibrationForecastQuery, defaultListAssetsQuery } from '../defaults';
import { ListAssetsQuery } from '../types/ListAssets.types';
import { AssetSummaryQuery } from '../types/AssetSummaryQuery.types';

type Props = QueryEditorProps<AssetDataSource, AssetQuery, AssetDataSourceOptions>;

export function AssetQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
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

  const filterOptions = useMemo(() => {
    return queryTypeOptions.filter(option => {
      return (option.label === AssetQueryType.ListAssets && (datasource.instanceSettings.jsonData.assetListEnabled ?? true)) ||
             (option.label === AssetQueryType.CalibrationForecast && (datasource.instanceSettings.jsonData.calibrationForecastEnabled ?? false)) ||
             (option.label === AssetQueryType.AssetSummary && (datasource.instanceSettings.jsonData.assetSummaryEnabled ?? false))
    });
  }, [datasource.instanceSettings.jsonData])

  return (
    <div style={{ position: 'relative' }}>
      <InlineField label="Query type" labelWidth={22} tooltip={tooltips.queryType}>
        <Select options={filterOptions} onChange={handleQueryTypeChange} value={queryType} width={85} />
      </InlineField>
      {datasource.instanceSettings.jsonData.assetListEnabled && queryType === AssetQueryType.ListAssets && (
        <ListAssetsEditor
          query={query as ListAssetsQuery}
          handleQueryChange={handleQueryChange}
          datasource={datasource.getListAssetsSource()}
        />
      )}
      {datasource.instanceSettings.jsonData.calibrationForecastEnabled && queryType === AssetQueryType.CalibrationForecast && (
        <CalibrationForecastEditor
          query={query as AssetCalibrationQuery}
          handleQueryChange={handleQueryChange}
          datasource={datasource.getCalibrationForecastSource()}
        />
      )}
      {datasource.instanceSettings.jsonData.assetSummaryEnabled && queryType === AssetQueryType.AssetSummary && (
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
