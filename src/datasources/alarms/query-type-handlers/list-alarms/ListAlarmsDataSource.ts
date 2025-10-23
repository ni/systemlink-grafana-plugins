import { DataFrameDTO, DataQueryRequest, LegacyMetricFindQueryOptions, MetricFindValue } from '@grafana/data';
import { AlarmsDataSourceCore } from '../../AlarmsDataSourceCore';
import { ListAlarmsQuery } from '../../types/ListAlarms.types';
import { defaultListAlarmsQuery } from '../../constants/defaultQueries';
import { AlarmsVariableQuery } from '../../types/types';

export class ListAlarmsDataSource extends AlarmsDataSourceCore {
  public readonly defaultQuery = defaultListAlarmsQuery

  public async runQuery(query: ListAlarmsQuery, _: DataQueryRequest): Promise<DataFrameDTO> {
    return {
      refId: query.refId,
      name: query.refId,
      fields: [{ name: query.refId, values: [] }],
    };
  }

  public async metricFindQuery(query: AlarmsVariableQuery, options?: LegacyMetricFindQueryOptions): Promise<MetricFindValue[]> {
    try {
      const filter = this.transformAlarmsQuery(options?.scopedVars || {}, query.filter);
      const response = await this.queryAlarms({filter});

      const alarmsOptions = response.alarms
        ? response.alarms.map(alarm => ({
          text: `${alarm.displayName} (${alarm.instanceId})`,
          value: alarm.instanceId
        }))
        : [];
      const sortedOptions = alarmsOptions.sort((a, b) => a.text.localeCompare(b.text));

      return sortedOptions;
    } catch (error) {
      return [];
    }
  }
}
