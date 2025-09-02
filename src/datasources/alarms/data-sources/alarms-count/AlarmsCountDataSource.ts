import { DataFrameDTO, DataQueryRequest } from '@grafana/data';
import { AlarmsDataSourceCore } from 'datasources/alarms/AlarmsDataSourceCore';
import { AlarmsCountQuery } from 'datasources/alarms/types/AlarmsCount.types';

export class AlarmsCountDataSource extends AlarmsDataSourceCore {
  defaultQuery = {};

  async runQuery(query: AlarmsCountQuery, _: DataQueryRequest): Promise<DataFrameDTO> {
    return {
      refId: query.refId,
      fields: [],
    };
  }

  shouldRunQuery(): boolean {
    return true;
  }
}
