import { AppEvents, DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, FieldType, MetricFindValue, TimeRange } from "@grafana/data";
import { DataFrameDataSourceBase } from "../../DataFrameDataSourceBase";
import { BackendSrv, getBackendSrv, TemplateSrv, getTemplateSrv } from "@grafana/runtime";
import { Column, DataFrameDataSourceOptions, DataFrameQuery, DataFrameQueryType, DataFrameQueryV2, DataTableProjectionLabelLookup, DataTableProjections, DataTableProperties, defaultQueryV2, FlattenedTableProperties, TableDataRows, TableProperties, TablePropertiesList, ValidDataFrameQuery, ValidDataFrameQueryV2 } from "../../types";
import { TAKE_LIMIT } from "datasources/data-frame/constants";
import { ExpressionTransformFunction, multipleValuesQuery, timeFieldsQuery, transformComputedFieldsQuery } from "core/query-builder.utils";
import { getWorkspaceName } from "core/utils";
import { Workspace } from "core/types";
import { extractErrorInfo } from "core/errors";
import { DataTableQueryBuilderFieldNames } from "datasources/data-frame/components/v2/constants/DataTableQueryBuilder.constants";

export class DataFrameDataSourceV2 extends DataFrameDataSourceBase<DataFrameQueryV2> {
    defaultQuery = defaultQueryV2;

    public constructor(
        public readonly instanceSettings: DataSourceInstanceSettings<DataFrameDataSourceOptions>,
        public readonly backendSrv: BackendSrv = getBackendSrv(),
        public readonly templateSrv: TemplateSrv = getTemplateSrv()
    ) {
        super(instanceSettings, backendSrv, templateSrv);
    }

    async runQuery(
        query: DataFrameQueryV2,
        options: DataQueryRequest<DataFrameQueryV2>
    ): Promise<DataFrameDTO> {
        const processedQuery = this.processQuery(query);

        if (processedQuery.dataTableFilter) {
            processedQuery.dataTableFilter = transformComputedFieldsQuery(
                this.templateSrv.replace(processedQuery.dataTableFilter, options.scopedVars),
                this.dataTableComputedDataFields,
            );
        }

        if (this.shouldQueryForProperties(processedQuery)) {
            return this.getFieldsForPropertiesQuery(processedQuery);
        }

        return { fields: [] };
    }

    async metricFindQuery(_query: DataFrameQueryV2): Promise<MetricFindValue[]> {
        // TODO: Implement logic to fetch and return metric find values based on the query.
        return [];
    }

    shouldRunQuery(query: ValidDataFrameQuery): boolean {
        const processedQuery = this.processQuery(query);

        return !processedQuery.hide && processedQuery.type === DataFrameQueryType.Properties;
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
                { useApiIngress: true }
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

    private shouldQueryForProperties(query: ValidDataFrameQueryV2): boolean {
        const isDataTableOrColumnPropertiesSelected = (
            query.dataTableProperties.length > 0
            || query.columnProperties.length > 0
        );
        const isTakeValid = query.take > 0 && query.take <= TAKE_LIMIT;

        return (
            query.type === DataFrameQueryType.Properties
            && isDataTableOrColumnPropertiesSelected
            && isTakeValid
        );
    }

    private get dataTableComputedDataFields(): Map<string, ExpressionTransformFunction> {
        const computedFields = new Map<string, ExpressionTransformFunction>();
        const queryBuilderFieldNames = new Set(Object.values(DataTableQueryBuilderFieldNames));

        for (const property of Object.values(DataTableProperties)) {
            const fieldName = DataTableProjectionLabelLookup[property].field;

            if (queryBuilderFieldNames.has(fieldName as DataTableQueryBuilderFieldNames)) {
                computedFields.set(
                    fieldName,
                    this.isTimeField(property) ? timeFieldsQuery(fieldName) : multipleValuesQuery(fieldName)
                );
            }
        }

        return computedFields;
    }

    private isTimeField(field: DataTableProperties): boolean {
        const timeFields = [
            DataTableProperties.CreatedAt,
            DataTableProperties.MetadataModifiedAt,
            DataTableProperties.RowsModifiedAt
        ];
        return timeFields.includes(field);
    };

    private isNumberField(field: DataTableProperties): boolean {
        const numberFields = [
            DataTableProperties.ColumnCount,
            DataTableProperties.RowCount,
            DataTableProperties.MetadataRevision
        ];
        return numberFields.includes(field);
    };

    private isBooleanField(field: DataTableProperties): boolean {
        return field === DataTableProperties.SupportsAppend;
    };

    private isObjectField(field: DataTableProperties): boolean {
        const fields = [
            DataTableProperties.ColumnProperties,
            DataTableProperties.Properties,
        ];
        return fields.includes(field);
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

    private getFieldValues(
        tables: FlattenedTableProperties[],
        property: DataTableProperties,
        workspaces: Map<string, Workspace>
    ): any {
        return tables.map(table => {
            const field = DataTableProjectionLabelLookup[property].field;
            const value = table[field];

            if (property === DataTableProperties.Workspace) {
                const workspace = workspaces.get(value as string);
                return workspace ? getWorkspaceName([workspace], value as string) : value;
            }

            return value;
        });
    }

    private async getFieldsForPropertiesQuery(processedQuery: ValidDataFrameQueryV2): Promise<DataFrameDTO> {
        const propertiesToQuery = [
            ...processedQuery.dataTableProperties,
            ...processedQuery.columnProperties
        ];
        const projections = propertiesToQuery
            .map(property => DataTableProjectionLabelLookup[property].projection);
        const projectionExcludingId = projections
            .filter(projection => projection !== DataTableProjections.Id);
        const tables = await this.queryTables(
            processedQuery.dataTableFilter,
            processedQuery.take,
            projectionExcludingId
        );
        const flattenedTablesWithColumns = this.flattenTablesWithColumns(tables);
        const workspaces = await this.loadWorkspaces();

        const fields = propertiesToQuery.map(property => {
            const values = this.getFieldValues(
                flattenedTablesWithColumns,
                property,
                workspaces
            );
            return {
                name: property,
                type: this.getFieldType(property),
                values
            };
        });

        return {
            refId: processedQuery.refId,
            name: processedQuery.refId,
            fields: fields,
        };
    }
}
