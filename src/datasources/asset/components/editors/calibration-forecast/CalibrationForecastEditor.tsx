import React from 'react';

import { AssetCalibrationQuery } from '../../../../asset-calibration/types';
import { AssetQuery } from '../../../types';
import { CalibrationForecastDataSource } from './CalibrationForecastDataSource';

type Props = {
  query: AssetCalibrationQuery;
  handleQueryChange: (value: AssetQuery, runQuery: boolean) => void;
  datasource: CalibrationForecastDataSource;
};

export function CalibrationForecastEditor({ query, handleQueryChange, datasource }: Props) {
  query = datasource.prepareQuery(query) as AssetCalibrationQuery;

  return <div style={{ position: 'relative' }}>Calibration Forecast</div>;
}
