import { DataFrameDTO, DataQueryRequest, LegacyMetricFindQueryOptions, MetricFindValue } from '@grafana/data';
import { ListAlarmsQuery } from '../../types/ListAlarms.types';
import { AlarmsVariableQuery } from '../../types/types';
import { AlarmsQueryHandlerCore } from '../AlarmsQueryHandlerCore';
import { defaultListAlarmsQuery } from 'datasources/alarms/constants/DefaultQueries.contants';

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
      const take = query.take;
      const orderByDescending = query.descending;
      const returnMostRecentlyOccurredOnly = true;
      const requestBody = {filter, take, orderByDescending, returnMostRecentlyOccurredOnly}
      const response = await this.queryAlarms(requestBody);

      const alarmsOptions = response.alarms
        ? response.alarms.map(alarm => ({
          text: `${alarm.displayName} (${alarm.alarmId})`,
          value: alarm.alarmId
        }))
        : [];
      
      const sortedOptions = alarmsOptions.sort((a, b) => a.text.localeCompare(b.text));

      return sortedOptions;
    } catch (error) {
      return [];
    }
  }
}
