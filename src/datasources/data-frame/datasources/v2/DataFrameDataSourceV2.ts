import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, MetricFindValue, TimeRange } from "@grafana/data";
import { DataFrameDataSourceBase } from "../../DataFrameDataSourceBase";
import { BackendSrv, getBackendSrv, TemplateSrv, getTemplateSrv } from "@grafana/runtime";
import { Column, DataFrameDataSourceOptions, DataFrameQuery, DataFrameQueryV2, DataTableProjections, defaultQueryV2, TableDataRows, TableProperties, TablePropertiesList, ValidDataFrameQueryV2 } from "../../types";
import { COLUMN_OPTION_LIMIT, TAKE_LIMIT } from "datasources/data-frame/constants";
import { ComboboxOption } from "@grafana/ui";

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

    public async getColumnOption(filter: string): Promise<ComboboxOption[]> {
        const tables = await this.queryTables(filter, TAKE_LIMIT, [
            DataTableProjections.Name,
            DataTableProjections.ColumnName,
            DataTableProjections.ColumnDataType,
            DataTableProjections.ColumnType,
        ]);

        if (tables.length === 0 || !tables.some(table => table.columns && table.columns.length > 0)) {
            return [];
        }

        const columnTypeMap = this.createColumnTypeMap(tables);
        const formattedOptions = this.formatColumnOptions(columnTypeMap);
        const limitedOptions = this.limitColumnOptions(formattedOptions, COLUMN_OPTION_LIMIT);

        return limitedOptions.map(column => ({ label: column.label, value: column.value }));
    }

    /**
     * Aggregates columns from all tables into a map of column name to set of data types.
     */
    private createColumnTypeMap(tables: TableProperties[]): Record<string, Set<string>>  {
        const columnTypeMap: Record<string, Set<string>> = {};
        tables.forEach(table => {
            table.columns?.forEach((column: { name: string; dataType: string }) => {
                if (column?.name && column?.dataType) {
                    const type = ['INT32', 'INT64', 'FLOAT32', 'FLOAT64'].includes(column.dataType)
                        ? 'Numeric'
                        : this.toSentenceCase(column.dataType);
                    (columnTypeMap[column.name] ??= new Set()).add(type);
                }
            });
        });
        return columnTypeMap;
    };

    /**
     * Formats column options for the dropdown, grouping numeric types and formatting labels.
     */
    private formatColumnOptions(columnTypeMap: Record<string, Set<string>>): ComboboxOption[] {
        const options: ComboboxOption[] = [];

        Object.entries(columnTypeMap).forEach(([name, dataTypes]) => {
            const columnDataType = Array.from(dataTypes);

            if (columnDataType.length === 1) {
                // Single type: show just the name as label and value as name with type in sentence case
                options.push({ label: name, value: `${name}-${columnDataType[0]}` }); 
            } else {
                // Multiple types: group numeric, show others in sentence case
                Array.from(new Set(columnDataType)).forEach(type => {
                    options.push({ label: `${name} (${type})`, value: `${name}-${type}` });
                });
            }
        });
        return options;
    };

    /**
     * Converts a string to sentence case (e.g., 'TIMESTAMP' -> 'Timestamp').
     */
    private toSentenceCase(str: string) {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
    };
    
    /**
     * Limits the number of column options to a maximum value.
     */
    private limitColumnOptions<T,>(columns: T[], max: number): T[] {
        return columns.slice(0, max);
    };
}
