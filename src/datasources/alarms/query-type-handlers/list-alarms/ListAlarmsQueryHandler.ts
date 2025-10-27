import { DataFrameDTO, DataQueryRequest } from '@grafana/data';
import { defaultListAlarmsQuery } from 'datasources/alarms/constants/DefaultQueries.constants';
import { ListAlarmsQuery } from 'datasources/alarms/types/ListAlarms.types';
import { AlarmsQueryHandlerCore } from '../AlarmsQueryHandlerCore';

export class ListAlarmsQueryHandler extends AlarmsQueryHandlerCore {
  public readonly defaultQuery = defaultListAlarmsQuery;

  public async runQuery(query: ListAlarmsQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    return {
      refId: query.refId,
      name: query.refId,
      fields: [{ name: query.refId, values: [] }],
    };
  }
}
