/**
 * TagConfigEditor is a React component that implements the UI for editing the tag
 * datasource configuration options.
 */
import React, { ChangeEvent, useCallback } from 'react';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { DataSourceHttpSettings, InlineField, InlineSegmentGroup, InlineSwitch, Tag, Text } from '@grafana/ui';
import { TagDataSourceOptions, TagFeatureTogglesDefaults } from './types';

interface Props extends DataSourcePluginOptionsEditorProps<TagDataSourceOptions> {
}

export const TagConfigEditor: React.FC<Props> = ({ options, onOptionsChange }) => {
  const handleFeatureChange = useCallback((featureKey: string) => (event: ChangeEvent<HTMLInputElement>) => {
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
          <InlineField label="Parse Multi-Select Values" labelWidth={25}>
            <InlineSwitch
              value={options.jsonData?.featureToggles?.parseMultiSelectValues ?? TagFeatureTogglesDefaults.parseMultiSelectValues}
              onChange={handleFeatureChange('parseMultiSelectValues')}/>
          </InlineField>
          <Tag name='Beta' colorIndex={5}/>
        </InlineSegmentGroup>
      </>
    </>
  );
}
