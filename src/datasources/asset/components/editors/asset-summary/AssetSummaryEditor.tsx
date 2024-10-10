import React from 'react';

import { AssetSummaryDataSource } from './AssetSummaryDataSource';
import { AssetSummaryQuery } from '../../../types/AssetSummaryQuery.types';

type Props = {
  query: AssetSummaryQuery;
  handleQueryChange: (value: AssetSummaryQuery, runQuery: boolean) => void;
  datasource: AssetSummaryDataSource;
};

export function AssetSummaryEditor({ query, handleQueryChange, datasource }: Props) {
  query = datasource.prepareQuery(query) as AssetSummaryQuery;

  return <div style={{ position: 'relative' }}></div>;
}
