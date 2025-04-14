/**
 * TagConfigEditor is a React component that implements the UI for editing the tag
 * datasource configuration options.
 */
import React from 'react';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { DataSourceHttpSettings } from '@grafana/ui';
import { TagDataSourceOptions } from './types';

interface Props extends DataSourcePluginOptionsEditorProps<TagDataSourceOptions> {
}

export const TagConfigEditor: React.FC<Props> = ({ options, onOptionsChange }) => {
  return (
    <>
      <DataSourceHttpSettings
        defaultUrl=""
        dataSourceConfig={options}
        showAccessOptions={false}
        onChange={onOptionsChange}
      />
    </>
  );
}
