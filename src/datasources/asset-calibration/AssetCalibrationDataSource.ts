import {
  DataFrameDTO,
  DataQueryRequest,
  DataSourceInstanceSettings,
  FieldDTO,
  TestDataSourceResponse,
} from '@grafana/data';
import { BackendSrv, getBackendSrv, getTemplateSrv, TemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import {
  AssetCalibrationForecastKey,
  AssetCalibrationQuery,
  AssetCalibrationTimeBasedGroupByType,
  CalibrationForecastResponse,
  ColumnDescriptorType,
  FieldDTOWithDescriptor,
} from './types';
import { ExpressionTransformFunction, transformComputedFieldsQuery } from 'core/query-builder.utils';
import { AssetCalibrationFieldNames } from './constants';
import { AssetModel, AssetsResponse } from 'datasources/asset-common/types';
import TTLCache from '@isaacs/ttlcache';
import { metadataCacheTTL } from 'datasources/data-frame/constants';
import { SystemMetadata } from 'datasources/system/types';
import { defaultOrderBy, defaultProjection } from 'datasources/system/constants';
import { QueryBuilderOperations } from 'core/query-builder.constants';
import { Workspace } from 'core/types';
import { parseErrorMessage } from 'core/errors';

export class AssetCalibrationDataSource extends DataSourceBase<AssetCalibrationQuery> {
  public defaultQuery = {
    groupBy: [],
    filter: ''
  };

  public areSystemsLoaded = false;
  public areWorkspacesLoaded = false;

  public error = '';

  public readonly systemAliasCache: TTLCache<string, SystemMetadata> = new TTLCache<string, SystemMetadata>({ ttl: metadataCacheTTL });
  public readonly workspacesCache: TTLCache<string, Workspace> = new TTLCache<string, Workspace>({ ttl: metadataCacheTTL });

  private readonly baseUrl = this.instanceSettings.url + '/niapm/v1';

  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv(),
  ) {
    super(instanceSettings, backendSrv, templateSrv);
  }

  private readonly assetComputedDataFields = new Map<AssetCalibrationFieldNames, ExpressionTransformFunction>([
    [
      AssetCalibrationFieldNames.LOCATION,
      (value: string, operation: string, options?: TTLCache<string, unknown>) => {
        if (options?.has(value)) {
          return `Location.MinionId ${operation} "${value}"`
        }

        const logicalOperator = operation === QueryBuilderOperations.EQUALS.name ? '||' : '&&';
        return `(Location.MinionId ${operation} "${value}" ${logicalOperator} Location.PhysicalLocation ${operation} "${value}")`;
      }
    ],
  ]);

  private readonly queryTransformationOptions = new Map<AssetCalibrationFieldNames, TTLCache<string, unknown>>([
    [AssetCalibrationFieldNames.LOCATION, this.systemAliasCache]
  ]);

  async runQuery(query: AssetCalibrationQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    await this.loadDependencies();

    if (query.filter) {
      const transformedQuery = transformComputedFieldsQuery(query.filter, this.assetComputedDataFields, this.queryTransformationOptions);
      query.filter = this.templateSrv.replace(transformedQuery, options.scopedVars);
    }

    return await this.processCalibrationForecastQuery(query as AssetCalibrationQuery, options);
  }

  async processCalibrationForecastQuery(query: AssetCalibrationQuery, options: DataQueryRequest) {
    const result: DataFrameDTO = { refId: query.refId, fields: [] };
    const from = options.range!.from.toISOString();
    const to = options.range!.to.toISOString();

    const calibrationForecastResponse: CalibrationForecastResponse = await this.queryCalibrationForecast(query.groupBy, from, to, query.filter);

    result.fields = calibrationForecastResponse.calibrationForecast.columns || [];
    if (this.isGroupByTime(query)) {
      this.processResultsGroupedByTime(result)
    } else {
      this.processResultsGroupedByProperties(result)
    }

    return result;
  }

  isGroupByTime(query: AssetCalibrationQuery) {
    return query.groupBy.includes(AssetCalibrationTimeBasedGroupByType.Day) ||
      query.groupBy.includes(AssetCalibrationTimeBasedGroupByType.Week) ||
      query.groupBy.includes(AssetCalibrationTimeBasedGroupByType.Month);
  }

  processResultsGroupedByTime(result: DataFrameDTO) {
    result.fields.forEach(field => {
      field.name = this.createColumnNameFromDescriptor(field as FieldDTOWithDescriptor);
      switch (field.name) {
        case AssetCalibrationForecastKey.Day:
          field.values = field.values!.map(this.formatDateForDay)
          break;
        case AssetCalibrationForecastKey.Week:
          field.values = field.values!.map(this.formatDateForWeek)
          break;
        case AssetCalibrationForecastKey.Month:
          field.values = field.values!.map(this.formatDateForMonth)
          break;
        default:
          break;
      }
    });
  }

  processResultsGroupedByProperties(result: DataFrameDTO) {
    const formattedFields = [] as FieldDTO[];
    formattedFields.push({ name: "Group", values: [] } as FieldDTO);
    formattedFields.push({ name: "Assets", values: [] } as FieldDTO);

    for (let columnIndex = 0; columnIndex < result.fields.length; columnIndex++) {
      const columnName = this.createColumnNameFromDescriptor(result.fields[columnIndex] as FieldDTOWithDescriptor);
      const columnValue = result.fields[columnIndex].values?.at(0);
      formattedFields[0].values!.push(columnName);
      formattedFields[1].values!.push(columnValue);
    }

    result.fields = formattedFields;
  }

  createColumnNameFromDescriptor(field: FieldDTOWithDescriptor): string {
    return field.columnDescriptors.map(descriptor => {
      if (descriptor.type === ColumnDescriptorType.MinionId && this.systemAliasCache) {
        const system = this.systemAliasCache.get(descriptor.value);

        return system?.alias || descriptor.value;
      }

      if (descriptor.type === ColumnDescriptorType.WorkspaceId && this.workspacesCache) {
        const workspace = this.workspacesCache.get(descriptor.value);

        return workspace?.name || descriptor.value
      }
      return descriptor.value
    }).join(' - ');
  }

  formatDateForDay(date: string): string {
    return new Date(date).toISOString().split('T')[0];
  }

  formatDateForWeek(date: string): string {
    const startDate = new Date(date);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    return `${startDate.toISOString().split('T')[0]} : ${endDate.toISOString().split('T')[0]}`;
  }

  formatDateForMonth(date: string): string {
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  }

  shouldRunQuery(calibrationQuery: AssetCalibrationQuery): boolean {
    return calibrationQuery.groupBy.length > 0;
  }

  async queryAssets(filter = '', take = -1): Promise<AssetModel[]> {
    let data = { filter, take };
    try {
      let response = await this.post<AssetsResponse>(this.baseUrl + '/query-assets', data);
      return response.assets;
    } catch (error) {
      throw new Error(`An error occurred while querying assets: ${error}`);
    }
  }

  async queryCalibrationForecast(groupBy: string[], startTime: string, endTime: string, filter = ''): Promise<CalibrationForecastResponse> {
    let data = { groupBy, startTime, endTime, filter };
    try {
      let response = await this.post<CalibrationForecastResponse>(this.baseUrl + '/assets/calibration-forecast', data);
      return response;
    } catch (error) {
      throw new Error(`An error occurred while querying assets calibration forecast: ${error}`);
    }
  }

  async querySystems(filter = '', projection = defaultProjection): Promise<SystemMetadata[]> {
    try {
      let response = await this.getSystems({
        filter: filter,
        projection: `new(${projection.join()})`,
        orderBy: defaultOrderBy,
      })

      return response.data;
    } catch (error) {
      throw new Error(`An error occurred while querying systems: ${error}`);
    }
  }

  private async loadSystems(): Promise<void> {
    if (this.systemAliasCache.size > 0) {
      return;
    }

    const systems = await this.querySystems('', ['id', 'alias', 'connected.data.state', 'workspace'])
      .catch(error => {
        this.error = parseErrorMessage(error)!;
      });

    this.areSystemsLoaded = true;
    systems?.forEach(system => this.systemAliasCache.set(system.id, system));
  }

  private async loadWorkspaces(): Promise<void> {
    if (this.workspacesCache.size > 0) {
      return;
    }

    const workspaces = await this.getWorkspaces()
      .catch(error => {
        this.error = parseErrorMessage(error)!;
      });

    this.areWorkspacesLoaded = true;
    workspaces?.forEach(workspace => this.workspacesCache.set(workspace.id, workspace));
  }

  async loadDependencies(): Promise<void> {
    this.error = '';

    await this.loadSystems();
    await this.loadWorkspaces();
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    await this.get(this.baseUrl + '/assets?take=1');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
