import React from 'react';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { DataSourceHttpSettings } from '@grafana/ui';
import { DataFrameDataSourceOptions } from '../types';

interface Props extends DataSourcePluginOptionsEditorProps<DataFrameDataSourceOptions> { }

export const DataFrameConfigEditor: React.FC<Props> = ({ options, onOptionsChange }) => {
    return (
        <DataSourceHttpSettings
            defaultUrl=""
            dataSourceConfig={options}
            showAccessOptions={false}
            onChange={onOptionsChange}
        />
    );
};
