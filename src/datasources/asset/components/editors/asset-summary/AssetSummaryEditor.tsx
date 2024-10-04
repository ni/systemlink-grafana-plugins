import React from 'react';

import { AssetQuery, AssetSummaryQuery } from '../../../types';
import { AssetSummaryDataSource } from './AssetSummaryDataSource';

type Props = {
  query: AssetSummaryQuery;
  handleQueryChange: (value: AssetQuery, runQuery: boolean) => void;
  datasource: AssetSummaryDataSource;
};

export function AssetSummaryEditor({ query, handleQueryChange, datasource }: Props) {
  query = datasource.prepareQuery(query) as AssetSummaryQuery;

  return <div style={{ position: 'relative' }}>Asset Summary</div>;
}
