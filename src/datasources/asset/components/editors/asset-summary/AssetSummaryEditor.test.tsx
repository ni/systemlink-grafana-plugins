import { DataSourceInstanceSettings } from '@grafana/data';
import { BackendSrv, TemplateSrv } from '@grafana/runtime';
import { mock } from 'jest-mock-extended';

import { AssetSummaryDataSource } from './AssetSummaryDataSource';
import { AssetSummaryQuery } from 'datasources/asset/types/AssetSummaryQuery.types';
import { AssetQuery } from 'datasources/asset/types/types';
import { assetSummaryFields } from 'datasources/asset-calibration/constants';

describe('AssetSummaryDataSource', () => {
  let dataSource: AssetSummaryDataSource;
  const instanceSettings = mock<DataSourceInstanceSettings>();
  const backendSrv = mock<BackendSrv>();
  const templateSrv = mock<TemplateSrv>();
  const assetSummary: AssetSummaryQuery = {
    total: 10,
    active: 5,
    notActive: 3,
    approachingRecommendedDueDate: 1,
    pastRecommendedDueDate: 1,
    refId: '',
  };

  beforeEach(() => {
    dataSource = new AssetSummaryDataSource(instanceSettings, backendSrv, templateSrv);
  });

  it('should process metadata query correctly', async () => {
    const query: AssetQuery = { refId: 'A' };

    jest.spyOn(dataSource, 'getAssetSummary').mockResolvedValue(assetSummary);
    const result = await dataSource.processMetadataQuery(query);

    expect(result).toEqual({
      refId: 'A',
      fields: [
        { name: assetSummaryFields.TOTAL, values: [10] },
        { name: assetSummaryFields.ACTIVE, values: [5] },
        { name: assetSummaryFields.NOT_ACTIVE, values: [3] },
        { name: assetSummaryFields.APPROACHING_DUE_DATE, values: [1] },
        { name: assetSummaryFields.PAST_DUE_DATE, values: [1] },
      ],
    });
  });

  it('should get asset summary correctly', async () => {
    jest.spyOn(dataSource, 'get').mockResolvedValue(assetSummary);

    const result = await dataSource.getAssetSummary();

    expect(result).toEqual(assetSummary);
  });

  it('should handle error in getAssetSummary', async () => {
    jest.spyOn(dataSource, 'get').mockRejectedValue(new Error('Network error'));

    await expect(dataSource.getAssetSummary()).rejects.toThrow('Network error');
  });
});
