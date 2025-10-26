import { DataFrameDTO, DataQueryRequest } from '@grafana/data';
import { defaultListAlarmsQuery } from 'datasources/alarms/constants/DefaultQueries.contants';
import { ListAlarmsQuery } from 'datasources/alarms/types/ListAlarms.types';
import { AlarmsQueryHandlerCore } from '../AlarmsQueryHandlerCore';

export class ListAlarmsDataSource extends AlarmsQueryHandlerCore {
  public readonly defaultQuery = defaultListAlarmsQuery;

  public async runQuery(query: ListAlarmsQuery, _: DataQueryRequest): Promise<DataFrameDTO> {
    return {
      refId: query.refId,
      name: query.refId,
      fields: [{ name: query.refId, values: [] }],
    };
  }
}
