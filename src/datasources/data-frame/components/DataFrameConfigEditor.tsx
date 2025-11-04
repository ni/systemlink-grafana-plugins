import React, { ChangeEvent } from 'react';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { DataSourceHttpSettings, InlineField, InlineSegmentGroup, InlineSwitch, Text } from '@grafana/ui';
import { DataFrameDataSourceOptions, DataFrameFeatureTogglesDefaults } from '../types';

interface Props extends DataSourcePluginOptionsEditorProps<DataFrameDataSourceOptions> { }

export const DataFrameConfigEditor: React.FC<Props> = ({ options, onOptionsChange }) => {
    const handleFeatureChange = (featureKey: string) => (event: ChangeEvent<HTMLInputElement>) => {
        const jsonData = {
            ...options.jsonData,
            featureToggles: { ...options.jsonData.featureToggles, [featureKey]: event.target.checked },
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
                <div style={{ paddingBottom: '10px' }}>
                    <Text element="h6">{labels.features}</Text>
                </div>
                <InlineSegmentGroup>
                    <InlineField label={labels.datatableQueryBuilder} labelWidth={25}>
                        <InlineSwitch
                            value={
                                options.jsonData?.featureToggles?.queryByDataTableProperties
                                ?? DataFrameFeatureTogglesDefaults.queryByDataTableProperties
                            }
                            onChange={handleFeatureChange('queryByDataTableProperties')}
                        />
                    </InlineField>
                </InlineSegmentGroup>
            </>
        </>
    );
};

const labels = {
    features: 'Features',
    datatableQueryBuilder: 'Filter by result and column properties'
};
