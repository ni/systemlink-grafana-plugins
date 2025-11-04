import { AppEvents, DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, FieldType, MetricFindValue, TimeRange } from "@grafana/data";
import { DataFrameDataSourceBase } from "../../DataFrameDataSourceBase";
import { BackendSrv, getBackendSrv, TemplateSrv, getTemplateSrv } from "@grafana/runtime";
import { Column, DataFrameDataSourceOptions, DataFrameQuery, DataFrameQueryType, DataFrameQueryV2, DataTableProjectionLabelLookup, DataTableProjections, DataTableProperties, defaultQueryV2, FlattenedTableProperties, TableDataRows, TableProperties, TablePropertiesList, ValidDataFrameQuery, ValidDataFrameQueryV2 } from "../../types";
import { TAKE_LIMIT } from "datasources/data-frame/constants";
import { ExpressionTransformFunction, multipleValuesQuery, timeFieldsQuery, transformComputedFieldsQuery } from "core/query-builder.utils";
import { getWorkspaceName } from "core/utils";
import { Workspace } from "core/types";
import { extractErrorInfo } from "core/errors";

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
        const propertiesToQuery = [
            ...processedQuery.dataTableProperties,
            ...processedQuery.columnProperties
        ];

        if (processedQuery.dataTableFilter) {
            processedQuery.dataTableFilter = transformComputedFieldsQuery(
                this.templateSrv.replace(processedQuery.dataTableFilter, options.scopedVars),
                this.dataTableComputedDataFields,
            );
        }

        if (
            processedQuery.type === DataFrameQueryType.Properties
            && propertiesToQuery.length > 0
            && processedQuery.take > 0
            && processedQuery.take <= TAKE_LIMIT
        ) {
            const projections = propertiesToQuery.map(property => DataTableProjectionLabelLookup[property].projection);
            const projectionExcludingId = projections.filter(projection => projection !== DataTableProjections.Id);
            const tables = await this.queryTables(processedQuery.dataTableFilter, processedQuery.take, projectionExcludingId);
            const flattenedTablesWithColumns = this.flattenTablesWithColumns(tables);

            const fields = propertiesToQuery.map(property => {
                const values = this.getDataTableFieldValues(flattenedTablesWithColumns, property, workspaces);
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
        try {
            const response = await this.post<TablePropertiesList>(
                `${this.baseUrl}/query-tables`,
                { filter, take, projection },
                {},
                true
            );
            return response.tables;
        } catch (error) {
            const errorDetails = extractErrorInfo((error as Error).message);
            let errorMessage: string;

            switch (errorDetails.statusCode) {
                case '':
                    errorMessage = 'The query failed due to an unknown error.';
                    break;
                case '429':
                    errorMessage = 'The query to fetch data tables failed due to too many requests. Please try again later.';
                    break;
                case '504':
                    errorMessage = 'The query to fetch data tables experienced a timeout error. Narrow your query with a more specific filter and try again.';
                    break;
                default:
                    errorMessage = `The query failed due to the following error: (status ${errorDetails.statusCode}) ${errorDetails.message}.`;
                    break;
            }

            this.appEvents?.publish?.({
                type: AppEvents.alertError.name,
                payload: ['Error during data tables query', errorMessage],
            });

            throw new Error(errorMessage);
        }
    }

    private readonly dataTableComputedDataFields = new Map<string, ExpressionTransformFunction>(
        Object.values(DataTableProperties).map(property => {
            const fieldName = DataTableProjectionLabelLookup[property].field;

            return [
                fieldName,
                this.isTimeField(property)
                    ? timeFieldsQuery(fieldName)
                    : multipleValuesQuery(fieldName)
            ];
        })
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

    private isObjectField(field: string): boolean {
        const fields = [
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
            case this.isObjectField(property):
                return FieldType.other;
            default:
                return FieldType.string;
        }
    }

    private flattenTablesWithColumns(tables: TableProperties[]): FlattenedTableProperties[] {
        return tables.flatMap(table => {
            const baseData = {
                id: table.id,
                name: table.name,
                columnCount: table.columnCount,
                createdAt: table.createdAt,
                metadataModifiedAt: table.metadataModifiedAt,
                metadataRevision: table.metadataRevision,
                rowCount: table.rowCount,
                rowsModifiedAt: table.rowsModifiedAt,
                supportsAppend: table.supportsAppend,
                workspace: table.workspace,
                properties: table.properties,
            };

            return table.columns?.length > 0
                ? table.columns.map(column => ({
                    ...baseData,
                    columnName: column.name,
                    columnDataType: column.dataType,
                    columnType: column.columnType,
                    columnProperties: column.properties,
                }))
                : [baseData];
        });
    }

    private getDataTableFieldValues(
        tables: FlattenedTableProperties[],
        property: DataTableProperties,
        workspaces: Map<string, Workspace>
    ): any {
        return tables.map(table => {
            const value = (table as any)[DataTableProjectionLabelLookup[property].field];

            if (property === DataTableProperties.Workspace) {
                const workspace = workspaces.get(value);
                return workspace ? getWorkspaceName([workspace], value) : value;
            }

            return value;
        });
    }
}
