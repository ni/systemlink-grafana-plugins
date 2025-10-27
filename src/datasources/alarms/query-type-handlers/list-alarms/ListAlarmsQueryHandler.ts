import { DataFrameDTO, DataQueryRequest, LegacyMetricFindQueryOptions, MetricFindValue } from '@grafana/data';
import { ListAlarmsQuery } from '../../types/ListAlarms.types';
import { AlarmsVariableQuery } from '../../types/types';
import { AlarmsQueryHandlerCore } from '../AlarmsQueryHandlerCore';
import { defaultListAlarmsQuery } from 'datasources/alarms/constants/DefaultQueries.constants';

export class ListAlarmsQueryHandler extends AlarmsQueryHandlerCore {
  public readonly defaultQuery = defaultListAlarmsQuery;

  public async runQuery(query: ListAlarmsQuery, _options: DataQueryRequest): Promise<DataFrameDTO> {
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
          text: `${alarm.displayName} (${alarm.alarmId})`,
          value: alarm.alarmId
        }))
        : [];
      
      const uniqueOptions = Array.from(
        new Map(alarmsOptions.map(option => [option.value, option])).values()
      );
      
      const sortedOptions = uniqueOptions.sort((a, b) => a.text.localeCompare(b.text));

      return sortedOptions;
    } catch (error) {
      return [];
    }
  }
}
