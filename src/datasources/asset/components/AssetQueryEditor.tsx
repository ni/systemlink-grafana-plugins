import React from 'react';
import { QueryEditorProps } from '@grafana/data';
import { AssetDataSource } from '../AssetDataSource';
import { AssetMetadataQuery } from '../types';

import _ from 'lodash';
import { QueryMetadataEditor } from './AssetQueryMetadataEditor';

type Props = QueryEditorProps<AssetDataSource, AssetMetadataQuery>;

export function AssetQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  query = datasource.prepareQuery(query);

  const handleQueryChange = (value: AssetMetadataQuery, runQuery: boolean): void => {
    onChange(value);
    if (runQuery) {
      onRunQuery();
    }
  };
  
  return (
    <div style={{ position: 'relative' }}>
        {QueryMetadataEditor({ query: query as AssetMetadataQuery, handleQueryChange, datasource })}
    </div>
  );
}
