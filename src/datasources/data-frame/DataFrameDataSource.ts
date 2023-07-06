import { lastValueFrom, map } from 'rxjs';
import TTLCache from '@isaacs/ttlcache';
import deepEqual from 'fast-deep-equal';
import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  toDataFrame,
  TableData,
  FieldType,
  standardTransformers,
  DataFrame,
  TimeRange,
  DataQueryError,
  CoreApp,
} from '@grafana/data';

import { BackendSrvRequest, getBackendSrv, getTemplateSrv, isFetchError } from '@grafana/runtime';

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

interface TestingStatus {
  message?: string;
  status: string;
}

export class DataFrameDataSource extends DataSourceApi<DataFrameQuery> {
  private readonly metadataCache: TTLCache<string, TableMetadata> = new TTLCache({ ttl: metadataCacheTTL });

  constructor(private instanceSettings: DataSourceInstanceSettings) {
    super(instanceSettings);
  }

  async query(options: DataQueryRequest<DataFrameQuery>): Promise<DataQueryResponse> {
    try {
      const targets = options.targets.map(this.processQuery).filter(this.shouldRunQuery);

      const data = await Promise.all(
        targets.map(async (query) => {
          query.tableId = getTemplateSrv().replace(query.tableId, options.scopedVars);

          const tableMetadata = await this.getTableMetadata(query.tableId);
          const columns = this.getColumnTypes(query.columns, tableMetadata?.columns ?? []);

          const tableData = await this.getDecimatedTableData(query, columns, options.range, options.maxDataPoints);

          const frame = toDataFrame({
            refId: query.refId,
            name: query.tableId,
            columns: query.columns.map((name) => ({ text: name })),
            rows: tableData.frame.data,
          } as TableData);

          return this.convertDataFrameFields(frame, columns);
        })
      );

      return { data };
    } catch (error) {
      return { data: [], error: this.createDataQueryError(error) };
    }
  }

  getDefaultQuery(_core: CoreApp): Partial<DataFrameQuery> {
    return _.clone(defaultQuery);
  }

  async getTableMetadata(id?: string) {
    const resolvedId = getTemplateSrv().replace(id);
    if (!resolvedId) {
      return null;
    }

    let metadata = this.metadataCache.get(resolvedId);

    if (!metadata) {
      metadata = await lastValueFrom(
        this.fetch<TableMetadata>('GET', `tables/${resolvedId}`).pipe(map((res) => res.data))
      );
      this.metadataCache.set(resolvedId, metadata);
    }

    return metadata;
  }

  async getDecimatedTableData(query: DataFrameQuery, columns: Column[], timeRange: TimeRange, intervals = 1000) {
    const filters: ColumnFilter[] = [];

    if (query.applyTimeFilters) {
      filters.push(...this.constructTimeFilters(columns, timeRange));
    }

    if (query.filterNulls) {
      filters.push(...this.constructNullFilters(columns));
    }

    return lastValueFrom(
      this.fetch<TableDataRows>('POST', `tables/${query.tableId}/query-decimated-data`, {
        data: {
          columns: query.columns,
          filters,
          decimation: {
            intervals,
            method: query.decimationMethod,
            yColumns: this.getNumericColumns(columns).map((c) => c.name),
          },
        },
      }).pipe(map((res) => res.data))
    );
  }

  async queryTables(query: string) {
    const filter = `name.Contains("${query}")`;

    return lastValueFrom(
      this.fetch<TableMetadataList>('POST', 'query-tables', { data: { filter, take: 5 } }).pipe(
        map((res) => res.data.tables)
      )
    );
  }

  async testDatasource(): Promise<TestingStatus> {
    return lastValueFrom(
      this.fetch<TableMetadataList>('GET', 'tables', { params: { take: 1 } }).pipe(
        map((_) => {
          return { status: 'success', message: 'Data source connected and authentication successful!' };
        })
      )
    );
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

  private getColumnTypes(columnNames: string[], tableMetadata: Column[]) {
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

  private convertDataFrameFields(frame: DataFrame, columns: Column[]) {
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

  private getNumericColumns(columns: Column[]) {
    return columns.filter(this.isColumnNumeric);
  }

  private isColumnNumeric(column: Column) {
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

  private fetch<T>(method: string, route: string, config?: Omit<BackendSrvRequest, 'url' | 'method'>) {
    const url = `${this.instanceSettings.url}/nidataframe/v1/${route}`;
    const req: BackendSrvRequest = {
      url,
      method,
      ...config,
    };

    return getBackendSrv().fetch<T>(req);
  }

  private createDataQueryError(error: unknown): DataQueryError {
    if (!isFetchError(error)) {
      throw error;
    }

    return {
      message: `${error.status} - ${error.statusText}`,
      status: error.status,
      statusText: error.statusText,
      data: error.data,
    };
  }

  private shouldRunQuery(query: ValidDataFrameQuery) {
    return Boolean(query.tableId) && Boolean(query.columns.length);
  }
}
