import { DataQueryRequest, DataFrameDTO, DataSourceInstanceSettings } from '@grafana/data';
import { BackendSrv, getBackendSrv, getTemplateSrv, TemplateSrv } from '@grafana/runtime';

import { AssetSummaryResponse } from 'datasources/asset/types/AssetSummaryQuery.types';
import { AssetDataSourceBase } from '../AssetDataSourceBase';
import { AssetDataSourceOptions, AssetQuery, AssetQueryType } from '../../types/types';
import { assetSummaryFields } from '../../constants/AssetSummaryQuery.constants';
import { catchError, map, Observable, throwError } from 'rxjs';

export class AssetSummaryDataSource extends AssetDataSourceBase {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings<AssetDataSourceOptions>,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
  }

  baseUrl = this.instanceSettings.url + '/niapm/v1';

  defaultQuery = {
    type: AssetQueryType.AssetSummary,
  };

  runQuery(query: AssetQuery, options: DataQueryRequest): Observable<DataFrameDTO> {
    return this.getAssetSummary().pipe(
      map((assetSummary: AssetSummaryResponse) => {
        return this.processSummaryQuery(query, assetSummary);
      })
    );
  }

  shouldRunQuery(query: AssetQuery): boolean {
    return !query.hide;
  }

  processSummaryQuery(query: AssetQuery, assets: AssetSummaryResponse) {
    return {
      refId: query.refId,
      fields: [
        { name: assetSummaryFields.TOTAL, values: [assets.total] },
        { name: assetSummaryFields.ACTIVE, values: [assets.active] },
        { name: assetSummaryFields.NOT_ACTIVE, values: [assets.notActive] },
        { name: assetSummaryFields.APPROACHING_DUE_DATE, values: [assets.approachingRecommendedDueDate] },
        { name: assetSummaryFields.PAST_DUE_DATE, values: [assets.pastRecommendedDueDate] },
        { name: assetSummaryFields.OUT_FOR_CALIBRATION, values: [assets.outForCalibration] }
      ]
    };
  }

  getAssetSummary(): Observable<AssetSummaryResponse> {
    return this.get$<AssetSummaryResponse>(this.baseUrl + '/asset-summary').pipe(
      catchError(error => {
        return throwError(() => new Error(`An error occurred while getting asset summary: ${error}`));
      }));
  }
}
