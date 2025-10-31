import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, MetricFindValue, TimeRange } from "@grafana/data";
import { DataFrameDataSourceBase } from "../../DataFrameDataSourceBase";
import { BackendSrv, getBackendSrv, TemplateSrv, getTemplateSrv } from "@grafana/runtime";
import { Column, DataFrameDataSourceOptions, DataFrameQuery, DataFrameQueryV2, DataTableProjections, defaultQueryV2, TableDataRows, TableProperties, TablePropertiesList, ValidDataFrameQueryV2 } from "../../types";
import { TAKE_LIMIT } from "datasources/data-frame/constants";

export class DataFrameDataSourceV2 extends DataFrameDataSourceBase<DataFrameQueryV2> {
    defaultQuery = defaultQueryV2;

    public constructor(
        public readonly instanceSettings: DataSourceInstanceSettings<DataFrameDataSourceOptions>,
        public readonly backendSrv: BackendSrv = getBackendSrv(),
        public readonly templateSrv: TemplateSrv = getTemplateSrv()
    ) {
        super(instanceSettings, backendSrv, templateSrv);
    }

    async runQuery(_query: DataFrameQueryV2, _options: DataQueryRequest<DataFrameQueryV2>): Promise<DataFrameDTO> {
        // TODO: Implement logic to fetch and return DataFrameDTO based on the query and options.
        return { fields: [] };
    }

    async metricFindQuery(_query: DataFrameQueryV2): Promise<MetricFindValue[]> {
        // TODO: Implement logic to fetch and return metric find values based on the query.
        return [];
    }

    shouldRunQuery(_query: ValidDataFrameQueryV2): boolean {
        // TODO: Implement logic to determine if the query should run. Currently always returns false.
        return false;
    }

    processQuery(query: DataFrameQuery): ValidDataFrameQueryV2 {
        // TODO: #3259801 - Implement Migration of DataFrameQueryV1 to ValidDataFrameQueryV2.
        return {
            ...defaultQueryV2,
            ...query
        } as ValidDataFrameQueryV2;
    }

    async getTableProperties(_id?: string): Promise<TableProperties> {
        throw new Error('Method not implemented.');
    }

    async getDecimatedTableData(
        _query: DataFrameQueryV2,
        _columns: Column[],
        _timeRange: TimeRange,
        _intervals?: number | undefined
    ): Promise<TableDataRows> {
        // TODO: Implement logic to fetch and return decimated table data based on the query, columns, time range, and intervals.
        throw new Error('Method not implemented.');
    }

    async queryTables(filter: string, take = TAKE_LIMIT, projection?: DataTableProjections[]): Promise<TableProperties[]> {
        const response = await this.post<TablePropertiesList>(
            `${this.baseUrl}/query-tables`,
            { filter, take, projection },
            { useApiIngress: true }
        );
        return response.tables;
    }
}
