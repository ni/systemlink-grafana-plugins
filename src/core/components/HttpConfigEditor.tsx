import React from 'react';
import { DataSourceHttpSettings, InlineField, InlineSwitch } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';

// TODO: implement onchange
export function getConfigEditor(showServerToggle: boolean) {
  return ({ options, onOptionsChange }: DataSourcePluginOptionsEditorProps) => (
    <>
      {showServerToggle && (
        <div className="gf-form-group">
          <h3 className="page-heading">SystemLink</h3>
          <div className="gf-form-inline">
            <InlineField label="SystemLink Server" labelWidth={26} disabled={options.readOnly}>
              <InlineSwitch
                onChange={() => onOptionsChange({ ...options, jsonData: { ...options.jsonData, isServer: !options.jsonData.isServer }})}
                value={options.jsonData.isServer}
                />
            </InlineField>
          </div>
        </div>
      )}
      <DataSourceHttpSettings defaultUrl="" dataSourceConfig={options} onChange={onOptionsChange} />
    </>
  );
}
