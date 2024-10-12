/**
 * AssetConfigEditor is a React component that implements the UI for editing the asset
 * datasource configuration options.
 */
import React, { ChangeEvent } from 'react';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { DataSourceHttpSettings, InlineField, InlineSwitch, Text } from '@grafana/ui';
import { AssetDataSourceOptions, AssetFeatureTogglesDefaults } from './types/types';

interface Props extends DataSourcePluginOptionsEditorProps<AssetDataSourceOptions> { }

export const AssetConfigEditor: React.FC<Props> = ({ options, onOptionsChange }) => {
  const handleFeatureChange = (featureKey: string) => (event: ChangeEvent<HTMLInputElement>) => {
    const jsonData = {
      ...options.jsonData,
      ...{ featureToggles: { ...options.jsonData.featureToggles, [featureKey]: event.target.checked } }
    };
    onOptionsChange({ ...options, jsonData });
  };

  return (
    <>
      <DataSourceHttpSettings
        defaultUrl=""
        dataSourceConfig={options}
        showAccessOptions={false}
        onChange={onOptionsChange}
      />
      <>
        <div style={{ paddingBottom: "10px" }}>
          <Text element="h6">
            Features
          </Text>
        </div>
        <InlineField label="Asset list" labelWidth={25}>
          <InlineSwitch
            value={options.jsonData?.featureToggles?.assetList ?? AssetFeatureTogglesDefaults.assetList}
            onChange={handleFeatureChange('assetList')} />
        </InlineField>
        <InlineField label="Calibration forecast" labelWidth={25}>
          <InlineSwitch
            value={options.jsonData?.featureToggles?.calibrationForecast ?? AssetFeatureTogglesDefaults.calibrationForecast}
            onChange={handleFeatureChange('calibrationForecast')} />
        </InlineField>
        <InlineField label="Asset summary" labelWidth={25}>
          <InlineSwitch
            value={options.jsonData?.featureToggles?.assetSummary ?? AssetFeatureTogglesDefaults.assetSummary}
            onChange={handleFeatureChange('assetSummary')} />
        </InlineField>
      </>
    </>
  );
}
