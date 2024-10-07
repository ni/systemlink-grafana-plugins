import React from 'react';

import { CalibrationForecastDataSource } from './CalibrationForecastDataSource';
import { AssetQuery } from '../../../types/types';
import { CalibrationForecastQuery } from '../../../types/CalibrationForecastQuery.types';

type Props = {
  query: CalibrationForecastQuery;
  handleQueryChange: (value: AssetQuery, runQuery: boolean) => void;
  datasource: CalibrationForecastDataSource;
};

export function CalibrationForecastEditor({ query, handleQueryChange, datasource }: Props) {
  query = datasource.prepareQuery(query) as CalibrationForecastQuery;

  return <div style={{ position: 'relative' }}>Calibration Forecast</div>;
}
