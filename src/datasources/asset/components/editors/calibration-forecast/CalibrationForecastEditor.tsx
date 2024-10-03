import React from 'react';

import _ from 'lodash';
import { AssetQuery } from '../../../types';
import { AssetDataSource } from '../../../AssetDataSource';
import { AssetCalibrationQuery } from '../../../../asset-calibration/types';

type Props = {
  query: AssetCalibrationQuery;
  handleQueryChange: (value: AssetQuery, runQuery: boolean) => void;
  datasource: AssetDataSource;
};

export function CalibrationForecastEditor({ query, handleQueryChange, datasource }: Props) {
  query = datasource.prepareQuery( query ) as AssetCalibrationQuery;
  
  return (
    <div style={{ position: 'relative' }}>
        Calibration Forecast
    </div>
  );
}

