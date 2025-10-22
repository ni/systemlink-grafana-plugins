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
            const filter = query.queryBy
            ? this.transformAlarmsQuery(options?.scopedVars || {}, query.queryBy)
            : undefined;
            const response = await this.queryAlarms({filter});

            return (response.alarms
            ? response.alarms.map(alarm => ({
                text: `${alarm.displayName} (${alarm.instanceId})`,
                value: alarm.instanceId
                }))
            : []).sort((a, b) => a.text.localeCompare(b.text));
        } catch (error) {
            return [];
        }
    }
}
