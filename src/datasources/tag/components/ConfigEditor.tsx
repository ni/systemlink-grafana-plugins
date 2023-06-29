import React from 'react';
import { DataSourceHttpSettings } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';

type Props = DataSourcePluginOptionsEditorProps;

export const ConfigEditor: React.FC<Props> = ({ options, onOptionsChange }) => {
  return (
    <DataSourceHttpSettings
      defaultUrl=""
      dataSourceConfig={options}
      showAccessOptions={true}
      onChange={onOptionsChange}
    />
  );
};
