/**
 * ConfigEditor is a React component that implements the UI for editing the asset
 * datasource configuration options.
 */
import React, { ChangeEvent, PureComponent } from 'react';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { DataSourceHttpSettings, InlineField, InlineSwitch, Text } from '@grafana/ui';
import { AssetDataSourceOptions } from './types/types';

interface Props extends DataSourcePluginOptionsEditorProps<AssetDataSourceOptions> { }

interface State { }

export class AssetConfigEditor extends PureComponent<Props, State> {
  render() {
    const { options, onOptionsChange } = this.props;

    const onCalibrationFeatureEnabledChange = (event: ChangeEvent<HTMLInputElement>) => {
      console.log(event.target.value);
      const jsonData: AssetDataSourceOptions = {
        ...this.props.options.jsonData,
        calibrationForecastEnabled: !this.props.options.jsonData.calibrationForecastEnabled,
      };

      onOptionsChange({ ...this.props.options, jsonData });
    };

    const onAssetSummaryFeatureEnabledChange = (event: ChangeEvent<HTMLInputElement>) => {
      console.log(event.target.value);
      const jsonData: AssetDataSourceOptions = {
        ...this.props.options.jsonData,
        assetSummaryEnabled: !this.props.options.jsonData.assetSummaryEnabled,
      };

      onOptionsChange({ ...this.props.options, jsonData });
    };

    const onAssetListEnabledChange = (event: ChangeEvent<HTMLInputElement>) => {
      console.log(event.target.value);
      const jsonData: AssetDataSourceOptions = {
        ...this.props.options.jsonData,
        assetListEnabled: !this.props.options.jsonData.assetListEnabled,
      };

      onOptionsChange({ ...this.props.options, jsonData });
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
            <InlineSwitch disabled={false} value={this.props.options.jsonData.assetListEnabled ?? true} onChange={onAssetListEnabledChange} />
          </InlineField>
          <InlineField label="Asset summary" labelWidth={25}>
            <InlineSwitch disabled={false} value={this.props.options.jsonData.assetSummaryEnabled ?? false} onChange={onAssetSummaryFeatureEnabledChange} />
          </InlineField>
          <InlineField label="Calibration forecast" labelWidth={25}>
            <InlineSwitch disabled={false} value={this.props.options.jsonData.calibrationForecastEnabled ?? false} onChange={onCalibrationFeatureEnabledChange} />
          </InlineField>
        </>
      </>
    );
  }
}
