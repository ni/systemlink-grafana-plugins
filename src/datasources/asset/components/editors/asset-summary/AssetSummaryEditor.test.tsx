import { DataSourceInstanceSettings } from '@grafana/data';
import { BackendSrv, TemplateSrv } from '@grafana/runtime';
import { mock } from 'jest-mock-extended';

import { AssetSummaryResponse } from 'datasources/asset/types/AssetSummaryQuery.types';
import { AssetDataSourceOptions, AssetQuery, AssetQueryType } from 'datasources/asset/types/types';
import { AssetSummaryDataSource } from '../../../data-sources/asset-summary/AssetSummaryDataSource';
import { assetSummaryFields } from '../../../constants/AssetSummaryQuery.constants';
import { firstValueFrom, of, throwError } from 'rxjs';

describe('AssetSummaryDataSource', () => {
  let dataSource: AssetSummaryDataSource;
  const instanceSettings = mock<DataSourceInstanceSettings<AssetDataSourceOptions>>();
  const backendSrv = mock<BackendSrv>();
  const templateSrv = mock<TemplateSrv>();
  const assetSummary: AssetSummaryResponse = {
    total: 10,
    active: 5,
    notActive: 3,
    approachingRecommendedDueDate: 1,
    pastRecommendedDueDate: 1,
    outForCalibration: 2
  };

  beforeEach(() => {
    dataSource = new AssetSummaryDataSource(instanceSettings, backendSrv, templateSrv);
  });

  it('should process metadata query correctly', async () => {
    const query: AssetQuery = { refId: 'A', type: AssetQueryType.AssetSummary, };
    const result = await dataSource.processSummaryQuery(query, assetSummary);

    expect(result).toEqual({
      refId: 'A',
      fields: [
        { name: assetSummaryFields.TOTAL, values: [10] },
        { name: assetSummaryFields.ACTIVE, values: [5] },
        { name: assetSummaryFields.NOT_ACTIVE, values: [3] },
        { name: assetSummaryFields.APPROACHING_DUE_DATE, values: [1] },
        { name: assetSummaryFields.PAST_DUE_DATE, values: [1] },
        { name: assetSummaryFields.OUT_FOR_CALIBRATION, values: [2] }
      ],
    });
  });

  it('should get asset summary correctly', async () => {
    jest.spyOn(dataSource, 'get$').mockImplementation(() => of(assetSummary));

    const result = await firstValueFrom(dataSource.getAssetSummary());

    expect(result).toEqual(assetSummary);
  });

  it('should handle error in getAssetSummary', async () => {
    jest.spyOn(dataSource, 'get$').mockReturnValue(throwError(() => (new Error('Network error'))));

    await expect(firstValueFrom(dataSource.getAssetSummary())).rejects.toThrow('Network error');
  });
});
