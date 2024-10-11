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
  handleFeatureChange = (featureKey: string) => (event: ChangeEvent<HTMLInputElement>) => {
    console.log(event.target.value);
    const jsonData = {
      ...this.props.options.jsonData,
      [featureKey]: event.target.checked,
    };
    this.props.onOptionsChange({ ...this.props.options, jsonData });
  };


  render() {
    const { options, onOptionsChange } = this.props;
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
              value={this.props.options.jsonData.assetListEnabled ?? true}
              onChange={this.handleFeatureChange('assetListEnabled')} />
          </InlineField>
          <InlineField label="Asset summary" labelWidth={25}>
            <InlineSwitch
              value={this.props.options.jsonData.assetSummaryEnabled ?? false}
              onChange={this.handleFeatureChange('assetSummaryEnabled')} />
          </InlineField>
          <InlineField label="Calibration forecast" labelWidth={25}>
            <InlineSwitch
              value={this.props.options.jsonData.calibrationForecastEnabled ?? false}
              onChange={this.handleFeatureChange('calibrationForecastEnabled')} />
          </InlineField>
        </>
      </>
    );
  }
}
