import TTLCache from '@isaacs/ttlcache';
import deepEqual from 'fast-deep-equal';
import { DataQueryRequest, DataSourceInstanceSettings, FieldType, TimeRange, FieldDTO, dateTime, DataFrameDTO, MetricFindValue } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import {
  ColumnDataType,
  DataFrameQueryV1,
  TableProperties,
  TablePropertiesList,
  TableDataRows,
  ColumnFilter,
  Column,
  defaultQueryV1,
  ValidDataFrameQueryV1,
  DataFrameQueryType,
  DataFrameDataSourceOptions,
  DataTableProjections,
} from '../../types';
import { propertiesCacheTTL } from '../../constants';
import _ from 'lodash';
import { DataFrameDataSourceBase } from '../../DataFrameDataSourceBase';
import { replaceVariables } from 'core/utils';
import { LEGACY_METADATA_TYPE } from 'core/types';
import { Observable, of } from 'rxjs';

export class DataFrameDataSourceV1 extends DataFrameDataSourceBase {
  private readonly propertiesCache: TTLCache<string, TableProperties> = new TTLCache({ ttl: propertiesCacheTTL });
  defaultQuery = defaultQueryV1;

  public constructor(
    public readonly instanceSettings: DataSourceInstanceSettings<DataFrameDataSourceOptions>,
    public readonly backendSrv: BackendSrv = getBackendSrv(),
    public readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
  }

  async runQuery(query: DataFrameQueryV1, { range, scopedVars, maxDataPoints }: DataQueryRequest): Promise<DataFrameDTO> {
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

  shouldRunQuery(query: ValidDataFrameQueryV1): boolean {
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

  async getDecimatedTableData(
    query: DataFrameQueryV1,
    columns: Column[],
    timeRange: TimeRange,
    intervals = 1000
  ): Promise<TableDataRows> {
    const filters: ColumnFilter[] = [];

    if (query.applyTimeFilters) {
      filters.push(...this.constructTimeFilters(columns, timeRange));
    }

    if (query.filterNulls) {
      filters.push(...this.constructNullFilters(columns));
    }

    return await this.post<TableDataRows>(
      `${this.baseUrl}/tables/${query.tableId}/query-decimated-data`,
      {
        columns: query.columns,
        filters,
        decimation: {
          intervals,
          method: query.decimationMethod,
          yColumns: this.getNumericColumns(columns).map(c => c.name),
        },
      }
    );
  }

  queryTables$(
    query: string,
    take = 5,
    projection?: DataTableProjections[]
  ): Observable<TableProperties[]> {
    return of([]);
  }

  async queryTables(query: string, take = 5, projection?: DataTableProjections[]): Promise<TableProperties[]> {
    const filter = `name.Contains("${query}")`;

    return (await this.post<TablePropertiesList>(`${this.baseUrl}/query-tables`, { filter, take, projection })).tables;
  }

  processQuery(query: DataFrameQueryV1): ValidDataFrameQueryV1 {
    const migratedQuery = { ...defaultQueryV1, ...query };

    // Handle existing dashboards with 'MetaData' type
    if ((migratedQuery.type as any) === LEGACY_METADATA_TYPE) {
      migratedQuery.type = DataFrameQueryType.Properties;
    }

    // Migration for 1.6.0: DataFrameQuery.columns changed to string[]
    if (_.isObject(migratedQuery.columns[0])) {
      migratedQuery.columns = (migratedQuery.columns as any[]).map(c => c.name);
    }

    // If we didn't make any changes to the query, then return the original object
    return deepEqual(migratedQuery, query) ? (query as ValidDataFrameQueryV1) : migratedQuery;
  }

  async metricFindQuery(tableQuery: DataFrameQueryV1): Promise<MetricFindValue[]> {
    const tableProperties = await this.getTableProperties((tableQuery as DataFrameQueryV1).tableId);
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
