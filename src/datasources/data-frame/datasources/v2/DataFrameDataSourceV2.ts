import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, FieldType, MetricFindValue, TimeRange } from "@grafana/data";
import { DataFrameDataSourceBase } from "../../DataFrameDataSourceBase";
import { BackendSrv, getBackendSrv, TemplateSrv, getTemplateSrv } from "@grafana/runtime";
import { Column, DataFrameDataSourceOptions, DataFrameQuery, DataFrameQueryType, DataFrameQueryV2, DataTableProjectionLabelLookup, DataTableProjections, DataTableProjectionType, DataTableProperties, defaultQueryV2, TableDataRows, TableProperties, TablePropertiesList, ValidDataFrameQuery, ValidDataFrameQueryV2 } from "../../types";
import { TAKE_LIMIT } from "datasources/data-frame/constants";
import { ExpressionTransformFunction, multipleValuesQuery, timeFieldsQuery, transformComputedFieldsQuery } from "core/query-builder.utils";
import { getWorkspaceName } from "core/utils";
import { Workspace } from "core/types";

export class DataFrameDataSourceV2 extends DataFrameDataSourceBase<DataFrameQueryV2> {
    defaultQuery = defaultQueryV2;

    public constructor(
        public readonly instanceSettings: DataSourceInstanceSettings<DataFrameDataSourceOptions>,
        public readonly backendSrv: BackendSrv = getBackendSrv(),
        public readonly templateSrv: TemplateSrv = getTemplateSrv()
    ) {
        super(instanceSettings, backendSrv, templateSrv);
    }

    async runQuery(query: DataFrameQueryV2, options: DataQueryRequest<DataFrameQueryV2>): Promise<DataFrameDTO> {
        const processedQuery = this.processQuery(query);
        const workspaces = await this.loadWorkspaces();
        let fields = [];

        if (processedQuery.dataTableFilter) {
            processedQuery.dataTableFilter = transformComputedFieldsQuery(
                this.templateSrv.replace(processedQuery.dataTableFilter, options.scopedVars),
                this.dataTableComputedDataFields,
            );
        }

        const propertiesToQuery = [...processedQuery.dataTableProperties, ...processedQuery.columnProperties];

        if (processedQuery.type === DataFrameQueryType.Properties && propertiesToQuery.length > 0 && processedQuery.take > 0 && processedQuery.take <= TAKE_LIMIT) {
            const projections = propertiesToQuery.map(property => DataTableProjectionLabelLookup[property].projection);
            const projectionExcludingId = projections.filter(projection => projection !== DataTableProjections.Id);
            const tables = await this.queryTables(processedQuery.dataTableFilter, processedQuery.take, projectionExcludingId);

            fields = propertiesToQuery.map(property => {
                const values = this.getDataTableFieldValues(tables, property, workspaces);
                return {
                    name: property,
                    type: this.getFieldType(property),
                    values
                };
            });

            return {
                refId: query.refId,
                name: query.refId,
                fields: fields,
            };
        }

        return { fields: [] };
    }

    async metricFindQuery(_query: DataFrameQueryV2): Promise<MetricFindValue[]> {
        // TODO: Implement logic to fetch and return metric find values based on the query.
        return [];
    }

    shouldRunQuery(query: ValidDataFrameQuery): boolean {
        const processedQuery = this.processQuery(query);
        return processedQuery.type === DataFrameQueryType.Properties;
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
            {},
            true
        );
        return response.tables;
    }

    private readonly dataTableComputedDataFields = new Map<string, ExpressionTransformFunction>(
        Object.values(DataTableProperties).map(field =>
            [
                field,
                this.isTimeField(field)
                    ? timeFieldsQuery(field)
                    : multipleValuesQuery(field)
            ]
        )
    );

    private isTimeField(field: string): boolean {
        const timeFields = [
            DataTableProperties.CreatedAt,
            DataTableProperties.MetadataModifiedAt,
            DataTableProperties.RowsModifiedAt
        ];
        return timeFields.includes(field as DataTableProperties);
    };

    private isNumberField(field: string): boolean {
        const numberFields = [
            DataTableProperties.ColumnCount,
            DataTableProperties.RowCount,
            DataTableProperties.MetadataRevision
        ];
        return numberFields.includes(field as DataTableProperties);
    };

    private isBooleanField(field: string): boolean {
        return field === DataTableProperties.SupportsAppend;
    };

    private isListOrObjectField(field: string): boolean {
        const fields = [
            DataTableProperties.ColumnName,
            DataTableProperties.ColumnDataType,
            DataTableProperties.ColumnType,
            DataTableProperties.ColumnProperties,
            DataTableProperties.Properties,
        ];
        return fields.includes(field as DataTableProperties);
    };

    private getFieldType(property: DataTableProperties): FieldType {
        switch (true) {
            case this.isTimeField(property):
                return FieldType.time;
            case this.isNumberField(property):
                return FieldType.number;
            case this.isBooleanField(property):
                return FieldType.boolean;
            case this.isListOrObjectField(property):
                return FieldType.other;
            default:
                return FieldType.string;
        }
    }

    private getDataTableFieldValues(
        tables: TableProperties[],
        property: DataTableProperties,
        workspaces: Map<string, Workspace>
    ): any {
        return tables.map(table => {
            const value = DataTableProjectionLabelLookup[property].type === DataTableProjectionType.Column
                ? table.columns.map(column => (column as any)[DataTableProjectionLabelLookup[property].field])
                : (table as any)[DataTableProjectionLabelLookup[property].field];

            if (property === DataTableProperties.Workspace) {
                const workspace = workspaces.get(value);
                return workspace ? getWorkspaceName([workspace], value) : value;
            }

            return value;
        });
    }
}
