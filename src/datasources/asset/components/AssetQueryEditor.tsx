import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import _ from 'lodash';
import { AssetDataSourceOptions, AssetFeatureToggles, AssetFeatureTogglesDefaults, AssetQuery, AssetQueryType } from '../types/types';
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
  const [queryType, setQueryType] = useState(query.queryType as AssetQueryType);

  const assetFeatures = useRef<AssetFeatureToggles>({
    assetList: datasource.instanceSettings.jsonData?.featureToggles?.assetList ?? AssetFeatureTogglesDefaults.assetList,
    calibrationForecast: datasource.instanceSettings.jsonData?.featureToggles?.calibrationForecast ?? AssetFeatureTogglesDefaults.calibrationForecast,
    assetSummary: datasource.instanceSettings.jsonData?.featureToggles?.assetSummary ?? AssetFeatureTogglesDefaults.assetSummary,
  });

  const handleQueryChange = useCallback((value: AssetQuery, runQuery = false): void => {
    onChange(value);
    if (runQuery) {
      onRunQuery();
    }
  }, [onChange, onRunQuery]);

  const handleQueryTypeChange = useCallback((item: SelectableValue<AssetQueryType>): void => {
    if(query.queryType === item.value){
      return;
    }
    setQueryType(item.value!);
  
    if (item.value === AssetQueryType.ListAssets && assetFeatures.current.assetList) {
      handleQueryChange({ ...query, queryType: AssetQueryType.ListAssets, ...defaultListAssetsQuery }, true);
    }
    if (item.value === AssetQueryType.CalibrationForecast && assetFeatures.current.calibrationForecast) {
      handleQueryChange({ ...query, queryType: AssetQueryType.CalibrationForecast, ...defaultCalibrationForecastQuery }, true);
    }
    if (item.value === AssetQueryType.AssetSummary && assetFeatures.current.assetSummary) {
      handleQueryChange({ ...query, queryType: AssetQueryType.AssetSummary, ...defaultAssetSummaryQuery }, true);
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
    if (!queryType) {
      const firstFilterOption = filterOptions.length > 0 ? filterOptions[0].value : undefined;
      if(firstFilterOption){
        handleQueryTypeChange({ value: firstFilterOption });
      }
    }
  }, [handleQueryTypeChange, filterOptions, queryType]);

  return (
    <div style={{ position: 'relative' }}>
      <InlineField label="Query type" labelWidth={22} tooltip={tooltips.queryType}>
        <Select
          options={filterOptions}
          onChange={handleQueryTypeChange}
          value={queryType}
          width={85}
        />
      </InlineField>
      {((assetFeatures.current.assetList && queryType === AssetQueryType.ListAssets) || (query.queryType === AssetQueryType.ListAssets)) && (
        <ListAssetsEditor
          query={query as ListAssetsQuery}
          handleQueryChange={handleQueryChange}
          datasource={datasource.getListAssetsSource()}
        />
      )}
      {((assetFeatures.current.calibrationForecast && queryType === AssetQueryType.CalibrationForecast) || (query.queryType === AssetQueryType.CalibrationForecast)) && (
        <CalibrationForecastEditor
          query={query as AssetCalibrationQuery}
          handleQueryChange={handleQueryChange}
          datasource={datasource.getCalibrationForecastSource()}
        />
      )}
      {((assetFeatures.current.assetSummary && queryType === AssetQueryType.AssetSummary) || (query.queryType === AssetQueryType.AssetSummary)) && (
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
