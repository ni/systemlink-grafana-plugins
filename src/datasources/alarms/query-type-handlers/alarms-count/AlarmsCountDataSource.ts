import { DataFrameDTO, DataQueryRequest, FieldType } from '@grafana/data';
import { AlarmsDataSourceCore } from 'datasources/alarms/AlarmsDataSourceCore';
import { defaultAlarmsCountQuery } from 'datasources/alarms/constants/defaultQueries';
import { MINIMUM_TAKE } from 'datasources/alarms/constants/QueryAlarms.constants';
import { AlarmsCountQuery } from 'datasources/alarms/types/AlarmsCount.types';

export class AlarmsCountDataSource extends AlarmsDataSourceCore {
  defaultQuery = defaultAlarmsCountQuery;

  async runQuery(query: AlarmsCountQuery, _: DataQueryRequest): Promise<DataFrameDTO> {
    const alarmsCount = await this.queryAlarmsCount();

    return {
      refId: query.refId,
      name: query.refId,
      fields: [{ name: query.refId, type: FieldType.number, values: [alarmsCount] }],
    };
  }

  async queryAlarmsCount(): Promise<number> {
    const body = {
      take: MINIMUM_TAKE,
      returnCount: true,
    };

    const response = await this.queryAlarms(body);
    return response.totalCount ?? 0;
  }

  shouldRunQuery(_: AlarmsCountQuery): boolean {
    return true;
  }
}
