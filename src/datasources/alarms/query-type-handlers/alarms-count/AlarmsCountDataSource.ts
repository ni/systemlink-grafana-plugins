import { DataFrameDTO, DataQueryRequest, FieldType } from '@grafana/data';
import { AlarmsQueryHandlersCore } from 'datasources/alarms/query-type-handlers/AlarmsQueryHandlersCore';
import { MINIMUM_TAKE } from 'datasources/alarms/constants/QueryAlarms.constants';
import { AlarmsCountQuery } from 'datasources/alarms/types/AlarmsCount.types';
import { defaultAlarmsCountQuery } from 'datasources/alarms/constants/defaultQueries';

export class AlarmsCountDataSource extends AlarmsQueryHandlersCore {
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
