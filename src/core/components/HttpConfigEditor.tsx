import React from 'react';
import { DataSourceHttpSettings } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';

type Props = DataSourcePluginOptionsEditorProps;

export const HttpConfigEditor: React.FC<Props> = ({ options, onOptionsChange }) => {
  return (
    <DataSourceHttpSettings
      defaultUrl=""
      dataSourceConfig={options}
      onChange={onOptionsChange}
    />
  );
};
