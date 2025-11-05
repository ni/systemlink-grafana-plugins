import { DataFrameDTO, DataQueryRequest, FieldType } from '@grafana/data';
import { AlarmsQueryHandlerCore } from 'datasources/alarms/query-type-handlers/AlarmsQueryHandlerCore';
import { defaultAlarmsCountQuery } from 'datasources/alarms/constants/DefaultQueries.constants';
import { MINIMUM_TAKE } from 'datasources/alarms/constants/QueryAlarms.constants';
import { AlarmsCountQuery } from 'datasources/alarms/types/AlarmsCount.types';

export class AlarmsCountQueryHandler extends AlarmsQueryHandlerCore {
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
