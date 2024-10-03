import React from 'react';

import _ from 'lodash';
import { AssetQuery, AssetSummaryQuery } from '../../../types';
import { AssetDataSource } from '../../../AssetDataSource';

type Props = {
  query: AssetSummaryQuery;
  handleQueryChange: (value: AssetQuery, runQuery: boolean) => void;
  datasource: AssetDataSource;
};

export function AssetSummaryEditor({ query, handleQueryChange, datasource }: Props) {
  query = datasource.prepareQuery( query ) as AssetSummaryQuery;
  
  return (
    <div style={{ position: 'relative' }}>
        Asset Summary
    </div>
  );
}

