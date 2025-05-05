import React, { ChangeEvent, useCallback } from 'react';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { DataSourceHttpSettings, InlineField, InlineSegmentGroup, InlineSwitch, Tag, Text } from '@grafana/ui';
import { ResultsDataSourceOptions, ResultsFeatureTogglesDefaults } from './types/types';

interface Props extends DataSourcePluginOptionsEditorProps<ResultsDataSourceOptions> {}

export const ResultsConfigEditor: React.FC<Props> = ({ options, onOptionsChange }) => {
    const handleFeatureChange = useCallback(
    (featureKey: string) => (event: ChangeEvent<HTMLInputElement>) => {
      const jsonData = {
        ...options.jsonData,
        ...{ featureToggles: { ...options.jsonData.featureToggles, [featureKey]: event.target.checked } },
      };
      onOptionsChange({ ...options, jsonData });
    },
    [options, onOptionsChange]
  );

  return (
    <>
      <DataSourceHttpSettings
        defaultUrl=""
        dataSourceConfig={options}
        showAccessOptions={false}
        onChange={onOptionsChange}
      />
      <>
        <div style={{ paddingBottom: '10px' }}>
          <Text element="h6">Features</Text>
        </div>
        <InlineSegmentGroup>
          <InlineField label="Results Query Builder" labelWidth={25}>
            <InlineSwitch
              value={options.jsonData?.featureToggles?.queryByResults ?? ResultsFeatureTogglesDefaults.queryByResults}
              onChange={handleFeatureChange('queryByResults')}
            />
          </InlineField>
        </InlineSegmentGroup>
        <InlineSegmentGroup>
          <InlineField label="Steps Query Builder" labelWidth={25}>
            <InlineSwitch
              value={options.jsonData?.featureToggles?.queryBySteps ?? ResultsFeatureTogglesDefaults.queryBySteps}
              onChange={handleFeatureChange('queryBySteps')}
            />
          </InlineField>
        </InlineSegmentGroup>
      </>
    </>
  );
};
