/**
 * AssetConfigEditor is a React component that implements the UI for editing the asset
 * datasource configuration options.
 */
import React, { ChangeEvent, useCallback } from 'react';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { DataSourceHttpSettings, InlineField, InlineSegmentGroup, InlineSwitch, Tag, Text } from '@grafana/ui';
import { FeatureToggleDataSourceOptions, FeatureTogglesDefaults } from 'core/feature-toggle';

interface Props extends DataSourcePluginOptionsEditorProps<FeatureToggleDataSourceOptions> { }

export const AssetConfigEditor: React.FC<Props> = ({ options, onOptionsChange }) => {
  const handleFeatureChange =  useCallback((featureKey: string) => (event: ChangeEvent<HTMLInputElement>) => {
    const jsonData = {
      ...options.jsonData,
      ...{ featureToggles: { ...options.jsonData.featureToggles, [featureKey]: event.target.checked } }
    };
    onOptionsChange({ ...options, jsonData });
  }, [options, onOptionsChange]);

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
        <InlineSegmentGroup>
          <InlineField label="Asset list" labelWidth={25}>
            <InlineSwitch
              value={options.jsonData?.featureToggles?.assetList ?? FeatureTogglesDefaults.assetList.enabledByDefault}
              onChange={handleFeatureChange('assetList')} />
          </InlineField>
          <Tag name='Beta' colorIndex={5} />
        </InlineSegmentGroup>
        <InlineSegmentGroup>
          <InlineField label="Calibration forecast" labelWidth={25}>
            <InlineSwitch
              value={options.jsonData?.featureToggles?.calibrationForecast ?? FeatureTogglesDefaults.calibrationForecast.enabledByDefault}
              onChange={handleFeatureChange('calibrationForecast')} />
          </InlineField>
          <Tag name='Beta' colorIndex={5} />
        </InlineSegmentGroup>
        <InlineSegmentGroup>
          <InlineField label="Asset summary" labelWidth={25}>
            <InlineSwitch
              value={options.jsonData?.featureToggles?.assetSummary ?? FeatureTogglesDefaults.assetSummary.enabledByDefault}
              onChange={handleFeatureChange('assetSummary')} />
          </InlineField>
          <Tag name='Beta' colorIndex={5} />
        </InlineSegmentGroup>
      </>
    </>
  );
}
