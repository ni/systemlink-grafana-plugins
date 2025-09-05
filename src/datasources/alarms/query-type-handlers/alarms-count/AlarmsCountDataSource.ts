import { DataFrameDTO, DataQueryRequest } from '@grafana/data';
import { AlarmsDataSourceCore } from 'datasources/alarms/AlarmsDataSourceCore';
import { defaultAlarmsCountQuery } from 'datasources/alarms/constants/defaultQueries';
import { AlarmsCountQuery } from 'datasources/alarms/types/AlarmsCount.types';

export class AlarmsCountDataSource extends AlarmsDataSourceCore {
  defaultQuery = defaultAlarmsCountQuery;

  async runQuery(query: AlarmsCountQuery, _: DataQueryRequest): Promise<DataFrameDTO> {
    return {
      refId: query.refId,
      fields: [],
    };
  }

  shouldRunQuery(_: AlarmsCountQuery): boolean {
    return true;
  }
}
