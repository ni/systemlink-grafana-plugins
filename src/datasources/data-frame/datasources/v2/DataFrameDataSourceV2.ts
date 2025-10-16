import { DataFrameDTO, DataQueryRequest, MetricFindValue, TimeRange } from "@grafana/data";
import { DataFrameDataSourceBase } from "datasources/data-frame/DataFrameDataSourceBase";
import { Column, DataFrameQueryV2, defaultQueryV2, TableDataRows, TableProperties, ValidDataFrameQueryV2 } from "datasources/data-frame/types";

export class DataFrameDataSourceV2 extends DataFrameDataSourceBase {

    defaultQuery = defaultQueryV2;

    async runQuery(_query: DataFrameQueryV2, _options: DataQueryRequest<DataFrameQueryV2>): Promise<DataFrameDTO> {
        // TODO: Implement logic to fetch and return DataFrameDTO based on the query and options.
        return { fields: [] }
    }

    async metricFindQuery(_query: DataFrameQueryV2): Promise<MetricFindValue[]> {
        // TODO: Implement logic to fetch and return metric find values based on the query.
        return [];
    }

    shouldRunQuery(_query: ValidDataFrameQueryV2): boolean {
        // TODO: Implement logic to determine if the query should run. Currently always returns false.
        return false;
    }

    processQuery(query: DataFrameQueryV2): ValidDataFrameQueryV2 {
        return {
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
    async queryTables(_query: string): Promise<TableProperties[]> {
        // TODO: Implement logic to query and return table properties
        throw new Error('Method not implemented.');
    }
}
