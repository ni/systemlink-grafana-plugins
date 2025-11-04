import { DataFrameDTO, DataQueryRequest, FieldType } from '@grafana/data';
import { AlarmsQueryHandlerCore } from 'datasources/alarms/query-type-handlers/AlarmsQueryHandlerCore';
import { defaultAlarmsTrendQuery } from 'datasources/alarms/constants/DefaultQueries.constants';
import { AlarmsTrendQuery } from 'datasources/alarms/types/AlarmsTrend.types';

export class AlarmsTrendQueryHandler extends AlarmsQueryHandlerCore {
  public readonly defaultQuery = defaultAlarmsTrendQuery;

  public async runQuery(query: AlarmsTrendQuery, options: DataQueryRequest): Promise<DataFrameDTO> {

    // TODO: alarms trend query logic will be implemented here in future
    return {
      refId: query.refId,
      name: query.refId,
      fields: [{ name: query.refId, type: FieldType.number, values: [] }],
    };
  }
}
