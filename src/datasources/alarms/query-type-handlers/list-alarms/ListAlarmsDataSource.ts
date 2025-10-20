import { DataFrameDTO, DataQueryRequest } from '@grafana/data';
import { AlarmsDataSourceCore } from 'datasources/alarms/AlarmsDataSourceCore';
import { defaultListAlarmsQuery } from 'datasources/alarms/constants/defaultQueries';
import { ListAlarmsQuery } from 'datasources/alarms/types/ListAlarms.types';

export class ListAlarmsDataSource extends AlarmsDataSourceCore {
  public readonly defaultQuery = defaultListAlarmsQuery;

  public async runQuery(query: ListAlarmsQuery, _: DataQueryRequest): Promise<DataFrameDTO> {
    return {
      refId: query.refId,
      name: query.refId,
      fields: [{ name: query.refId, values: [] }],
    };
  }
}
