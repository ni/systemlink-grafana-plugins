import TTLCache from '@isaacs/ttlcache';
import deepEqual from 'fast-deep-equal';
import { DataQueryRequest, DataSourceInstanceSettings, FieldType, TimeRange, FieldDTO, dateTime, DataFrameDTO, MetricFindValue, TestDataSourceResponse } from '@grafana/data';
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
import { replaceVariables } from 'core/utils';

export class DataFrameDataSource extends DataSourceBase<DataFrameQuery> {
  private readonly propertiesCache: TTLCache<string, TableProperties> = new TTLCache({ ttl: propertiesCacheTTL });

  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
  }

  baseUrl = this.instanceSettings.url + '/nidataframe/v1';

  defaultQuery = defaultQuery;

  async runQuery(query: DataFrameQuery, { range, scopedVars, maxDataPoints }: DataQueryRequest): Promise<DataFrameDTO> {
    const processedQuery = this.processQuery(query);
    processedQuery.tableId = this.templateSrv.replace(processedQuery.tableId, scopedVars);
    processedQuery.columns = replaceVariables(processedQuery.columns, this.templateSrv);
    const properties = await this.getTableProperties(processedQuery.tableId);

    if (processedQuery.type === DataFrameQueryType.Properties) {
      return {
        refId: processedQuery.refId,
        name: properties.name,
        fields: Object.entries(properties.properties).map(([name, value]) => ({ name, values: [value] })),
      };
    } else {
      const columns = this.getColumnTypes(processedQuery.columns, properties?.columns ?? []);
      const tableData = await this.getDecimatedTableData(processedQuery, columns, range, maxDataPoints);
      return {
        refId: processedQuery.refId,
        name: properties.name,
        fields: this.dataFrameToFields(tableData.frame.data, columns),
      };
    }
  }

  shouldRunQuery(query: ValidDataFrameQuery): boolean {
    return Boolean(query.tableId) && (query.type === DataFrameQueryType.Properties || Boolean(query.columns.length));
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

  async getDecimatedTableData(query: DataFrameQuery, columns: Column[], timeRange: TimeRange, intervals = 1000): Promise<TableDataRows> {
    const filters: ColumnFilter[] = [];

    if (query.applyTimeFilters) {
      filters.push(...this.constructTimeFilters(columns, timeRange));
    }

    if (query.filterNulls) {
      filters.push(...this.constructNullFilters(columns));
    }

    return await this.post<TableDataRows>(`${this.baseUrl}/tables/${query.tableId}/query-decimated-data`, {
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
    const filter = `name.Contains("${query}")`;

    return (await this.post<TablePropertiesList>(`${this.baseUrl}/query-tables`, { filter, take: 5 })).tables;
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    await this.get(`${this.baseUrl}/tables`, { take: 1 });
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }

  processQuery(query: DataFrameQuery): ValidDataFrameQuery {
    const migratedQuery = { ...defaultQuery, ...query };

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
