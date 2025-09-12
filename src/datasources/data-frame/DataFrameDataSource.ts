import TTLCache from '@isaacs/ttlcache';
import deepEqual from 'fast-deep-equal';
import { DataQueryRequest, DataSourceInstanceSettings, FieldType, TimeRange, FieldDTO, dateTime, DataFrameDTO, MetricFindValue, TestDataSourceResponse, DataSourceJsonData } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import {
  ColumnDataType,
  DataFrameQuery,
  TableProperties,
  TablePropertiesList,
  TableDataRows,
  ColumnFilter,
  Column,
  defaultQuery,
  ValidDataFrameQuery,
  DataFrameQueryType,
} from './types';
import { propertiesCacheTTL } from './constants';
import _ from 'lodash';
import { DataSourceBase } from 'core/DataSourceBase';
import { getVariableOptions, replaceVariables } from 'core/utils';
import { LEGACY_METADATA_TYPE, QueryBuilderOption, Workspace } from 'core/types';
import { WorkspaceUtils } from 'shared/workspace.utils';
import { QueryResultsResponse, ResultsProperties, ResultsPropertiesOptions, ResultsResponseProperties } from 'datasources/results/types/QueryResults.types';

export class DataFrameDataSource extends DataSourceBase<DataFrameQuery, DataSourceJsonData> {
  private readonly propertiesCache: TTLCache<string, TableProperties> = new TTLCache({ ttl: propertiesCacheTTL });

  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
    this.workspaceUtils = new WorkspaceUtils(this.instanceSettings, this.backendSrv);

  }

  baseUrl = this.instanceSettings.url + '/nidataframe/v1';
  filteredTableColumns: TableProperties[] = [];

  defaultQuery = defaultQuery;
  workspaceUtils: WorkspaceUtils;
  queryResultsValuesUrl = this.instanceSettings.url + '/nitestmonitor/v2/query-result-values';
  queryResultsUrl = this.instanceSettings.url + '/nitestmonitor/v2/query-results';

  queryByDataTableProperties = '';
  tableData: TableProperties[] = [];


  readonly globalVariableOptions = (): QueryBuilderOption[] => getVariableOptions(this);
  private static _partNumbersCache: Promise<string[]> | null = null;

  async queryResults(
    filter?: string,
    orderBy?: string,
    projection?: ResultsProperties[],
    take?: number,
    descending?: boolean,
    returnCount = false
  ): Promise<QueryResultsResponse> {
    try {
      return await this.post<QueryResultsResponse>(
        `${this.queryResultsUrl}`,
        {
          filter,
          orderBy,
          descending,
          projection,
          take,
          returnCount,
        },
        { showErrorAlert: false },// suppress default error alert since we handle errors manually
      );
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : String(error));
    }
  }

  async runQuery(query: DataFrameQuery, { range, scopedVars, maxDataPoints }: DataQueryRequest): Promise<DataFrameDTO> {
    if (query.queryByResults || query.queryBy) {
      const processedQuery = this.processQuery(query);
      let idFilterString = '';
      if (processedQuery.type === DataFrameQueryType.Data) {
        // let metadata: ResultsResponseProperties[] = [];
        // if (query.queryByResults) {
        //   metadata = (await this.queryResults(
        //     query.queryByResults,
        //     "STARTED_AT",
        //     [ResultsProperties.dataTableIds],
        //     100000,
        //     true
        //   )).results;

        //   let uniqueIDs: string | string[] = [];
        //   const uniqueTableIdsPerIndex = metadata.map((item: ResultsResponseProperties) => {
        //     item.dataTableIds?.map(id => {
        //       if (id && !uniqueIDs.includes(id)) {
        //         uniqueIDs.push(id);
        //       };
        //     });
        //     return uniqueIDs;
        //   });
        //   const ids = uniqueIDs.slice(0, 500);
        //   idFilterString = `(${ids.map(id => `id = "${id}"`).join(' || ')})`;
        //   // Do something with metadata
        // }
        if (this.queryByChanged(query.queryBy!)) {
          this.tableData = await this.queryTables(processedQuery.queryBy);
          this.setFilteredColumns(this.tableData)
        }
        if (!this.tableData || this.tableData.length === 0) {
          return {
            refId: processedQuery.refId,
            fields: [],
          };
        }
        if ((query.columns?.length ?? 0) !== 0) {
          for (const table of this.tableData) {
            const id = table.id;
            const properties = await this.getTableProperties(id);
            const columns = this.getColumnTypes(query.columns!, properties?.columns ?? []);
            processedQuery.columns = columns.map(c => c.name);
            let tableData = await this.getDecimatedTableData(processedQuery, id, columns, range, maxDataPoints);
            if (typeof(tableData) === 'string') {
              tableData = JSON.parse(tableData);
            }
            return {
              refId: processedQuery.refId,
              name: properties.name,
              fields: this.dataFrameToFields(tableData.frame.data, columns),
            };
          }
        }
        // else {
        //   for (const table of tableData) {
        //     const id = table.id;
        //     const properties = await this.getTableProperties(id);
        //     const tableRows = await this.post<TableDataRows>(`${this.baseUrl}/tables/${id}/query-data`, {
        //       columns: properties?.columns.map(col => col.name) ?? [],
        //       filters: [],
        //     });
        //     if (tableRows && tableRows.frame && tableRows.frame.data) {
        //       return {
        //         refId: processedQuery.refId,
        //         name: properties.name,
        //         fields: this.dataFrameToFields(
        //           tableRows.frame.data,
        //           this.getColumnTypes(table.columns.map(col => col.name), properties?.columns ?? [])
        //         ),
        //       };
        //     }
        //   }

        // }
      }
      return {
        refId: processedQuery.refId,
        fields: [],
      }
    } else {
      return {
        fields: [],
      }
    }


  }

  private queryByChanged(queryBy: string): boolean {
    if (queryBy !== this.queryByDataTableProperties) {
      this.queryByDataTableProperties = queryBy;
      return true;
    }
    return false
  }

  shouldRunQuery(query: ValidDataFrameQuery): boolean {
    return true;
  }

  async getTableProperties(id?: string): Promise<TableProperties> {
    const resolvedId = this.templateSrv.replace(id);
    let properties = this.propertiesCache.get(resolvedId);

    if (!properties) {
      properties = await this.get<TableProperties>(`${this.baseUrl}/tables/${resolvedId}`);
      this.propertiesCache.set(resolvedId, properties);
    }

    return properties;
  }

  getTableColumns(): TableProperties[] {
    return this.filteredTableColumns;
  }

  async getDecimatedTableData(query: DataFrameQuery, id: string, columns: Column[], timeRange: TimeRange, intervals = 1000): Promise<TableDataRows> {
    const filters: ColumnFilter[] = [];

    if (query.applyTimeFilters) {
      filters.push(...this.constructTimeFilters(columns, timeRange));
    }

    if (query.filterNulls) {
      filters.push(...this.constructNullFilters(columns));
    }

    return await this.post<TableDataRows>(`${this.baseUrl}/tables/${id}/query-decimated-data`, {
      columns: query.columns,
      filters,
      decimation: {
        intervals,
        method: query.decimationMethod,
        yColumns: this.getNumericColumns(columns).map(c => c.name),
      },
    });
  }

  async queryTables(query: string): Promise<TableProperties[]> {
    const filter = query;

    let allTables: TableProperties[] = [];
    let continuationToken: string | undefined = undefined;

    do {
      const response: TablePropertiesList = await this.post<TablePropertiesList>(
        `${this.baseUrl}/query-tables`,
        { filter, take: 1000, continuationToken }
      );
      allTables = allTables.concat(response.tables);
      continuationToken = response.continuationToken;
    } while (continuationToken && allTables.length < 5000);

    return allTables;
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    await this.get(`${this.baseUrl}/tables`, { take: 1 });
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }

  processQuery(query: DataFrameQuery): ValidDataFrameQuery {
    const migratedQuery = { ...defaultQuery, ...query };

    // Handle existing dashboards with 'MetaData' type
    if ((migratedQuery.type as any) === LEGACY_METADATA_TYPE) {
      migratedQuery.type = DataFrameQueryType.Properties;
    }

    if ((migratedQuery.tableId !== '')) {
      migratedQuery.queryBy = 'Id = "8123kj8123kkjbeonk"';
    }

    // Migration for 1.6.0: DataFrameQuery.columns changed to string[]
    if (_.isObject(migratedQuery.columns[0])) {
      migratedQuery.columns = (migratedQuery.columns as any[]).map(c => c.name);
    }

    // If we didn't make any changes to the query, then return the original object
    return deepEqual(migratedQuery, query) ? (query as ValidDataFrameQuery) : migratedQuery;
  }

  async metricFindQuery(tableQuery: DataFrameQuery): Promise<MetricFindValue[]> {
    const tableProperties = await this.getTableProperties(tableQuery.tableId);
    return tableProperties.columns.map(col => ({ text: col.name, value: col.name }));
  }

  get partNumbersCache(): Promise<string[]> {
    return this.getPartNumbers();
  }

  async getPartNumbers(): Promise<string[]> {
    if (DataFrameDataSource._partNumbersCache) {
      return DataFrameDataSource._partNumbersCache;
    }

    DataFrameDataSource._partNumbersCache = this.queryResultsValues(ResultsPropertiesOptions.PART_NUMBER, undefined)
      .catch(error => {
        return [];
      });
    return DataFrameDataSource._partNumbersCache;
  }

  async queryResultsValues(fieldName: string, filter?: string): Promise<string[]> {
    return await this.post<string[]>(
      this.queryResultsValuesUrl,
      {
        field: fieldName,
        filter
      },
      { showErrorAlert: false } // suppress default error alert since we handle errors manually
    );
  }

  public async loadWorkspaces(): Promise<Map<string, Workspace>> {
    try {
      return await this.workspaceUtils.getWorkspaces();
    } catch (error) {
      return new Map<string, Workspace>();
    }
  }

  private setFilteredColumns(tableData: TableProperties[]): void {
    this.filteredTableColumns = tableData;
  }

  private getColumnTypes(columnNames: string[], tableProperties: Column[]): Column[] {
    return columnNames.map(c => {
      const column = tableProperties.find(({ name }) => name === c);

      if (!column) {
        throw `The table does not contain the column '${c}'`;
      }

      return column;
    });
  }

  private getFieldTypeAndConverter(dataType: ColumnDataType): [FieldType, (v: string) => any] {
    switch (dataType) {
      case 'BOOL':
        return [FieldType.boolean, v => v.toLowerCase() === 'true'];
      case 'STRING':
        return [FieldType.string, v => v];
      case 'TIMESTAMP':
        return [FieldType.time, v => dateTime(v).valueOf()];
      default:
        return [FieldType.number, v => Number(v)];
    }
  }

  private dataFrameToFields(rows: string[][], columns: Column[]): FieldDTO[] {
    return columns.map((col, ix) => {
      const [type, converter] = this.getFieldTypeAndConverter(col.dataType);
      return {
        name: col.name,
        type,
        values: rows.map(row => (row[ix] !== null ? converter(row[ix]) : null)),
        ...(col.name.toLowerCase() === 'value' && { config: { displayName: col.name } }),
      };
    });
  }

  private constructTimeFilters(columns: Column[], timeRange: TimeRange): ColumnFilter[] {
    const timeIndex = columns.find(c => c.dataType === 'TIMESTAMP' && c.columnType === 'INDEX');

    if (!timeIndex) {
      return [];
    }

    return [
      { column: timeIndex.name, operation: 'GREATER_THAN_EQUALS', value: timeRange.from.toISOString() },
      { column: timeIndex.name, operation: 'LESS_THAN_EQUALS', value: timeRange.to.toISOString() },
    ];
  }

  private constructNullFilters(columns: Column[]): ColumnFilter[] {
    return columns.flatMap(({ name, columnType, dataType }) => {
      const filters: ColumnFilter[] = [];

      if (columnType === 'NULLABLE') {
        filters.push({ column: name, operation: 'NOT_EQUALS', value: null });
      }
      if (dataType === 'FLOAT32' || dataType === 'FLOAT64') {
        filters.push({ column: name, operation: 'NOT_EQUALS', value: 'NaN' });
      }
      return filters;
    });
  }

  private getNumericColumns(columns: Column[]): Column[] {
    return columns.filter(this.isColumnNumeric);
  }

  private isColumnNumeric(column: Column): boolean {
    switch (column.dataType) {
      case 'FLOAT32':
      case 'FLOAT64':
      case 'INT32':
      case 'INT64':
      case 'TIMESTAMP':
        return true;
      default:
        return false;
    }
  }
}
