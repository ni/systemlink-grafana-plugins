import { DataFrameDTO, DataQueryRequest } from '@grafana/data';
import { AlarmsDataSourceBase } from 'datasources/alarms/AlarmsDataSourceBase';
import { AlarmsCountQuery } from 'datasources/alarms/types/AlarmsCount.types';

export class AlarmsCountDataSource extends AlarmsDataSourceBase {
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
