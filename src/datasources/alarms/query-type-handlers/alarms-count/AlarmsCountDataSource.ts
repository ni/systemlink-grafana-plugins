import { DataFrameDTO, DataQueryRequest, FieldType, LegacyMetricFindQueryOptions, MetricFindValue } from '@grafana/data';
import { AlarmsDataSourceCore } from 'datasources/alarms/AlarmsDataSourceCore';
import { defaultAlarmsCountQuery } from 'datasources/alarms/constants/defaultQueries';
import { MINIMUM_TAKE } from 'datasources/alarms/constants/QueryAlarms.constants';
import { AlarmsCountQuery } from 'datasources/alarms/types/AlarmsCount.types';
import { AlarmsVariableQuery } from 'datasources/alarms/types/types';

export class AlarmsCountDataSource extends AlarmsDataSourceCore {
  public readonly defaultQuery = defaultAlarmsCountQuery;

  public async runQuery(query: AlarmsCountQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    const transformedAlarmsQuery = this.transformAlarmsQuery(options.scopedVars, query.filter);
    const alarmsCount = await this.queryAlarmsCount(transformedAlarmsQuery);

    return {
      refId: query.refId,
      name: query.refId,
      fields: [{ name: query.refId, type: FieldType.number, values: [alarmsCount] }],
    };
  }

  private async queryAlarmsCount(filter = ''): Promise<number> {
    const requestBody = {
      filter,
      take: MINIMUM_TAKE,
      returnCount: true,
    };

    const response = await this.queryAlarms(requestBody);
    return response.totalCount ?? 0;
  }
}
