import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  const [queryType, setQueryType] = useState(AssetQueryType.ListAssets);
  const [assetFeatures, setAssetFeatures] = useState({
    assetListEnabled: datasource.instanceSettings.jsonData?.assetListEnabled ?? true,
    calibrationForecastEnabled: datasource.instanceSettings.jsonData?.calibrationForecastEnabled ?? false,
    assetSummaryEnabled: datasource.instanceSettings.jsonData?.assetSummaryEnabled ?? false,
  });

  useEffect(() => {
    setAssetFeatures({
      assetListEnabled: datasource.instanceSettings.jsonData?.assetListEnabled ?? true,
      calibrationForecastEnabled: datasource.instanceSettings.jsonData?.calibrationForecastEnabled ?? false,
      assetSummaryEnabled: datasource.instanceSettings.jsonData?.assetSummaryEnabled ?? false,
    });
  }, [datasource.instanceSettings.jsonData]);

  const handleQueryChange = useCallback((value: AssetQuery, runQuery = false): void => {
    onChange({ ...query, ...value });
    if (runQuery) {
      onRunQuery();
    }
  }, [query, onChange, onRunQuery]);

  const handleQueryTypeChange = useCallback((item: SelectableValue<AssetQueryType>): void => {
    setQueryType(item.value!);
    handleQueryChange({ ...query, queryType: item.value! }, true);
  }, [query, handleQueryChange]);

  useEffect(() => {
    if(queryType === query.queryType) {
      return;
    }

    if (queryType === AssetQueryType.ListAssets && assetFeatures.assetListEnabled) {
      handleQueryChange({ ...query, queryType: AssetQueryType.ListAssets, ...defaultListAssetsQuery }, true);
    }
    if (queryType === AssetQueryType.CalibrationForecast && assetFeatures.calibrationForecastEnabled) {
      handleQueryChange({ ...query, queryType: AssetQueryType.CalibrationForecast, ...defaultCalibrationForecastQuery }, true);
    }
    if (queryType === AssetQueryType.AssetSummary && assetFeatures.assetSummaryEnabled) {
      handleQueryChange({ ...query, queryType: AssetQueryType.AssetSummary, ...defaultAssetSummaryQuery }, true);
    }
  }, [
    query, queryType, handleQueryChange, onRunQuery,
    assetFeatures.assetListEnabled, assetFeatures.calibrationForecastEnabled, assetFeatures.assetSummaryEnabled
  ]);

  const filterOptions = useMemo(() => {
    return queryTypeOptions.filter(option => {
      return (option.value === AssetQueryType.ListAssets && assetFeatures.assetListEnabled) ||
        (option.value === AssetQueryType.CalibrationForecast && assetFeatures.calibrationForecastEnabled) ||
        (option.value === AssetQueryType.AssetSummary && assetFeatures.assetSummaryEnabled)
    });
  }, [assetFeatures.assetListEnabled, assetFeatures.calibrationForecastEnabled, assetFeatures.assetSummaryEnabled]);

  return (
    <div style={{ position: 'relative' }}>
      <InlineField label="Query type" labelWidth={22} tooltip={tooltips.queryType}>
        <Select options={filterOptions} onChange={handleQueryTypeChange} value={queryType} width={85} />
      </InlineField>
      {assetFeatures.assetListEnabled && queryType === AssetQueryType.ListAssets && (
        <ListAssetsEditor
          query={query as ListAssetsQuery}
          handleQueryChange={handleQueryChange}
          datasource={datasource.getListAssetsSource()}
        />
      )}
      {assetFeatures.calibrationForecastEnabled && queryType === AssetQueryType.CalibrationForecast && (
        <CalibrationForecastEditor
          query={query as AssetCalibrationQuery}
          handleQueryChange={handleQueryChange}
          datasource={datasource.getCalibrationForecastSource()}
        />
      )}
      {assetFeatures.assetSummaryEnabled && queryType === AssetQueryType.AssetSummary && (
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
