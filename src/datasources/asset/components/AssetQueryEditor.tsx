import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import _ from 'lodash';
import { InlineField, Select } from '@grafana/ui';

import { AssetDataSource } from '../AssetDataSource';
import { AssetSummaryEditor } from './editors/asset-summary/AssetSummaryEditor';
import { CalibrationForecastEditor } from './editors/calibration-forecast/CalibrationForecastEditor';
import { ListAssetsEditor } from './editors/list-assets/ListAssetsEditor';
import { defaultAssetSummaryQuery, defaultCalibrationForecastQuery, defaultListAssetsQuery } from '../defaults';
import { ListAssetsQuery } from '../types/ListAssets.types';
import { AssetSummaryQuery } from '../types/AssetSummaryQuery.types';
import { AssetQuery, AssetQueryType } from '../types/types';
import { CalibrationForecastQuery } from '../types/CalibrationForecastQuery.types';
import { FeatureToggleDataSourceOptions, FeatureToggleNames, getFeatureFlagValue } from 'core/feature-toggle';

type Props = QueryEditorProps<AssetDataSource, AssetQuery, FeatureToggleDataSourceOptions>;

export function AssetQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  const [queryType, setQueryType] = useState(query.type);
  const assetFeatures = useRef<{ [key: string]: boolean }>({
    assetList: getFeatureFlagValue(datasource.instanceSettings.jsonData, FeatureToggleNames.assetList),
    calibrationForecast: getFeatureFlagValue(datasource.instanceSettings.jsonData, FeatureToggleNames.calibrationForecast),
    assetSummary: getFeatureFlagValue(datasource.instanceSettings.jsonData, FeatureToggleNames.assetSummary),
  });

  const handleQueryChange = useCallback((value: AssetQuery, runQuery = false): void => {
    onChange(value);
    if (runQuery) {
      onRunQuery();
    }
  }, [onChange, onRunQuery]);

  const handleQueryTypeChange = useCallback((item: SelectableValue<AssetQueryType>): void => {
    setQueryType(item.value!);
  
    if (item.value === AssetQueryType.ListAssets && assetFeatures.current.assetList) {
      handleQueryChange({ ...query, type: AssetQueryType.ListAssets, ...defaultListAssetsQuery }, true);
    }
    if (item.value === AssetQueryType.CalibrationForecast && assetFeatures.current.calibrationForecast) {
      handleQueryChange({ ...query, type: AssetQueryType.CalibrationForecast, ...defaultCalibrationForecastQuery }, true);
    }
    if (item.value === AssetQueryType.AssetSummary && assetFeatures.current.assetSummary) {
      handleQueryChange({ ...query, type: AssetQueryType.AssetSummary, ...defaultAssetSummaryQuery }, true);
    }

  }, [query, handleQueryChange]);

  const filterOptions = useMemo(() => {
    return queryTypeOptions.filter(option => {
      return (option.value === queryType) ||
        (option.value === AssetQueryType.ListAssets && assetFeatures.current.assetList) ||
        (option.value === AssetQueryType.CalibrationForecast && assetFeatures.current.calibrationForecast) ||
        (option.value === AssetQueryType.AssetSummary && assetFeatures.current.assetSummary)
    });
  }, [queryType]);

  useEffect(() => {
    if (!query.type) {
      const firstFilterOption = filterOptions.length > 0 ? filterOptions[0].value : undefined;
      if (firstFilterOption) {
        handleQueryTypeChange({ value: firstFilterOption });
      }
    }
  }, [query.type, handleQueryTypeChange, filterOptions]);

  return (
    <div style={{ position: 'relative' }}>
      <InlineField label="Query type" labelWidth={22} tooltip={tooltips.queryType}>
        <Select
          options={filterOptions}
          onChange={handleQueryTypeChange}
          value={queryType}
          width={65}
        />
      </InlineField>
      {((assetFeatures.current.assetList && queryType === AssetQueryType.ListAssets) || (query.type === AssetQueryType.ListAssets)) && (
        <ListAssetsEditor
          query={query as ListAssetsQuery}
          handleQueryChange={handleQueryChange}
          datasource={datasource.getListAssetsSource()}
        />
      )}
      {((assetFeatures.current.calibrationForecast && queryType === AssetQueryType.CalibrationForecast) || (query.type === AssetQueryType.CalibrationForecast)) && (
        <CalibrationForecastEditor
          query={query as CalibrationForecastQuery}
          handleQueryChange={handleQueryChange}
          datasource={datasource.getCalibrationForecastSource()}
        />
      )}
      {((assetFeatures.current.assetSummary && queryType === AssetQueryType.AssetSummary) || (query.type === AssetQueryType.AssetSummary)) && (
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
