/**
 * ConfigEditor is a React component that implements the UI for editing the notebook
 * datasource configuration options, including the server URL, authentication, etc.
 */
import React, { PureComponent } from 'react';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { DataSourceHttpSettings } from '@grafana/ui';
import { NotebookDataSourceOptions } from './types';

interface Props extends DataSourcePluginOptionsEditorProps<NotebookDataSourceOptions> {}

interface State {}

export class ConfigEditor extends PureComponent<Props, State> {
  render() {
    const { options, onOptionsChange } = this.props;
    return (
      <DataSourceHttpSettings
        defaultUrl=""
        dataSourceConfig={options}
        showAccessOptions={false}
        onChange={onOptionsChange}
      />
    );
  }
}
