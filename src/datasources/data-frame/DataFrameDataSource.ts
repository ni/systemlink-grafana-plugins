import TTLCache from '@isaacs/ttlcache';
import deepEqual from 'fast-deep-equal';
import {
  DataQueryRequest,
  DataSourceInstanceSettings,
  toDataFrame,
  TableData,
  FieldType,
  standardTransformers,
  DataFrame,
  TimeRange
} from '@grafana/data';
import {
  BackendSrv,
  TemplateSrv,
  TestingStatus,
  getBackendSrv,
  getTemplateSrv
} from '@grafana/runtime';
import {
  ColumnDataType,
  DataFrameQuery,
  TableMetadata,
  TableMetadataList,
  TableDataRows,
  ColumnFilter,
  Column,
  defaultQuery,
  ValidDataFrameQuery,
} from './types';
import { metadataCacheTTL } from './constants';
import _ from 'lodash';
import { DataSourceBase } from 'core/DataSourceBase';

export class DataFrameDataSource extends DataSourceBase<DataFrameQuery> {
  private readonly metadataCache: TTLCache<string, TableMetadata> = new TTLCache({ ttl: metadataCacheTTL });

  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
  }

  baseUrl = this.instanceSettings.url + '/nidataframe/v1';

  defaultQuery = defaultQuery

  async runQuery(query: DataFrameQuery, { range, scopedVars, maxDataPoints }: DataQueryRequest): Promise<DataFrame> {
    const processedQuery = this.processQuery(query);
    processedQuery.tableId = getTemplateSrv().replace(processedQuery.tableId, scopedVars);
    const tableMetadata = await this.getTableMetadata(processedQuery.tableId);
    const columns = this.getColumnTypes(processedQuery.columns, tableMetadata?.columns ?? []);
    const tableData = await this.getDecimatedTableData(processedQuery, columns, range, maxDataPoints);
    const frame = toDataFrame({
      refId: processedQuery.refId,
      name: processedQuery.tableId,
      columns: processedQuery.columns.map((name) => ({ text: name })),
      rows: tableData.frame.data,
    } as TableData);
    return this.convertDataFrameFields(frame, columns);
  }

  shouldRunQuery(query: ValidDataFrameQuery): boolean {
    return Boolean(query.tableId) && Boolean(query.columns.length);
  }

  async getTableMetadata(id?: string): Promise<TableMetadata | null> {
    const resolvedId = getTemplateSrv().replace(id);
    if (!resolvedId) {
      return null;
    }

    let metadata = this.metadataCache.get(resolvedId);

    if (!metadata) {
      metadata = await this.get<TableMetadata>(`${this.baseUrl}/tables/${resolvedId}`);
      this.metadataCache.set(resolvedId, metadata);
    }

    return metadata;
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
        yColumns: this.getNumericColumns(columns).map((c) => c.name),
      },
    });
  }

  async queryTables(query: string): Promise<TableMetadata[]> {
    const filter = `name.Contains("${query}")`;

    return (await this.post<TableMetadataList>(`${this.baseUrl}/query-tables`,  { filter, take: 5 })).tables;
  }

  async testDatasource(): Promise<TestingStatus> {
    await this.get(`${this.baseUrl}/tables`, { take: 1 });
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }

  processQuery(query: DataFrameQuery): ValidDataFrameQuery {
    const migratedQuery = { ...defaultQuery, ...query };

    // Migration for 1.6.0: DataFrameQuery.columns changed to string[]
    if (_.isObject(migratedQuery.columns[0])) {
      migratedQuery.columns = (migratedQuery.columns as any[]).map((c) => c.name);
    }

    // If we didn't make any changes to the query, then return the original object
    return deepEqual(migratedQuery, query) ? query as ValidDataFrameQuery : migratedQuery;
  };

  private getColumnTypes(columnNames: string[], tableMetadata: Column[]): Column[] {
    return columnNames.map((c) => {
      const column = tableMetadata.find(({ name }) => name === c);

      if (!column) {
        throw `The table does not contain the column '${c}'`;
      }

      return column;
    });
  }

  private getFieldType(dataType: ColumnDataType): FieldType {
    switch (dataType) {
      case 'BOOL':
        return FieldType.boolean;
      case 'STRING':
        return FieldType.string;
      case 'TIMESTAMP':
        return FieldType.time;
      default:
        return FieldType.number;
    }
  }

  private convertDataFrameFields(frame: DataFrame, columns: Column[]): DataFrame {
    const transformer = standardTransformers.convertFieldTypeTransformer.transformer;
    const conversions = columns.map(({ name, dataType }) => ({
      targetField: name,
      destinationType: this.getFieldType(dataType),
      dateFormat: 'YYYY-MM-DDTHH:mm:ss.SZ',
    }));
    return transformer({ conversions }, { interpolate: _.identity })([frame])[0];
  }

  private constructTimeFilters(columns: Column[], timeRange: TimeRange): ColumnFilter[] {
    const timeIndex = columns.find((c) => c.dataType === 'TIMESTAMP' && c.columnType === 'INDEX');

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
