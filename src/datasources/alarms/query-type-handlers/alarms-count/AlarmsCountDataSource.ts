import { DataFrameDTO, DataQueryRequest, FieldType } from '@grafana/data';
import { AlarmsDataSourceCore } from 'datasources/alarms/AlarmsDataSourceCore';
import { defaultAlarmsCountQuery } from 'datasources/alarms/constants/defaultQueries';
import { MINIMUM_TAKE } from 'datasources/alarms/constants/QueryAlarms.constants';
import { AlarmsCountQuery } from 'datasources/alarms/types/AlarmsCount.types';

export class AlarmsCountDataSource extends AlarmsDataSourceCore {
  public readonly defaultQuery = defaultAlarmsCountQuery;

  public async runQuery(query: AlarmsCountQuery, _: DataQueryRequest): Promise<DataFrameDTO> {
    const alarmsCount = await this.queryAlarmsCount(query.queryBy);

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
