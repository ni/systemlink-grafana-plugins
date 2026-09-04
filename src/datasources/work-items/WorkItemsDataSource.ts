import {
  DataFrameDTO,
  DataQueryRequest,
  DataSourceInstanceSettings,
  TestDataSourceResponse,
} from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { QueryBuilderOption, Workspace } from 'core/types';
import { extractErrorInfo } from 'core/errors';
import { ProductUtils } from 'shared/product.utils';
import { ProductPartNumberAndName } from 'shared/types/QueryProducts.types';
import { SystemUtils } from 'shared/system.utils';
import { SystemAlias } from 'shared/types/QuerySystems.types';
import { UsersUtils } from 'shared/users.utils';
import { User } from 'shared/types/QueryUsers.types';
import { WorkspaceUtils } from 'shared/workspace.utils';
import {
  OrderByOptions,
  OutputType,
  WorkItemPropertiesOptions,
  WorkItemsQuery,
  WorkItemTypeOptions,
} from './types';
import { DEFAULT_TAKE } from './constants';

export class WorkItemsDataSource extends DataSourceBase<WorkItemsQuery> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
    this.productUtils = new ProductUtils(instanceSettings, backendSrv);
    this.usersUtils = new UsersUtils(instanceSettings, backendSrv);
    this.workspaceUtils = new WorkspaceUtils(instanceSettings, backendSrv);
    this.systemUtils = new SystemUtils(instanceSettings, backendSrv);
  }

  baseUrl = `${this.instanceSettings.url}/niworkitem/v1`;
  queryWorkItemsUrl = `${this.baseUrl}/query-workitems`;
  errorTitle = '';
  errorDescription = '';
  productUtils: ProductUtils;
  usersUtils: UsersUtils;
  workspaceUtils: WorkspaceUtils;
  systemUtils: SystemUtils;

  defaultQuery = {
    outputType: OutputType.Properties,
    types: Object.values(WorkItemTypeOptions),
    properties: [
      WorkItemPropertiesOptions.NAME,
      WorkItemPropertiesOptions.STATE,
      WorkItemPropertiesOptions.ASSIGNED_TO,
      WorkItemPropertiesOptions.PLANNED_START_DATE,
      WorkItemPropertiesOptions.DUE_DATE,
    ],
    orderBy: OrderByOptions.UPDATED_AT,
    descending: true,
    take: DEFAULT_TAKE,
  };

  readonly globalVariableOptions = (): QueryBuilderOption[] => this.getVariableOptions();

  // TODO: AB#3923375 - Query work items and return the requested properties instead of an empty frame.
  async runQuery(query: WorkItemsQuery, _options: DataQueryRequest<WorkItemsQuery>): Promise<DataFrameDTO> {
    return {
      refId: query.refId,
      name: query.refId,
      fields: [],
    };
  }

  shouldRunQuery(query: WorkItemsQuery): boolean {
    return !query.hide;
  }

  public async loadProductNamesAndPartNumbers(): Promise<Map<string, ProductPartNumberAndName>> {
    try {
      return await this.productUtils.getProductNamesAndPartNumbers();
    } catch (error) {
      if (!this.errorTitle) {
        this.handleDependenciesError(error);
      }
      return new Map<string, ProductPartNumberAndName>();
    }
  }

  public async loadUsers(): Promise<Map<string, User>> {
    try {
      return await this.usersUtils.getUsers();
    } catch (error) {
      if (!this.errorTitle) {
        this.handleDependenciesError(error);
      }
      return new Map<string, User>();
    }
  }

  public async loadWorkspaces(): Promise<Map<string, Workspace>> {
    try {
      return await this.workspaceUtils.getWorkspaces();
    } catch (error) {
      if (!this.errorTitle) {
        this.handleDependenciesError(error);
      }
      return new Map<string, Workspace>();
    }
  }

  public async loadSystemAliases(): Promise<Map<string, SystemAlias>> {
    try {
      return await this.systemUtils.getSystemAliases();
    } catch (error) {
      if (!this.errorTitle) {
        this.handleDependenciesError(error);
      }
      return new Map<string, SystemAlias>();
    }
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    await this.post(this.queryWorkItemsUrl, { take: 1 }, { showErrorAlert: false });
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }

  private handleDependenciesError(error: unknown): void {
    const errorDetails = extractErrorInfo((error as Error).message);
    this.errorTitle = 'Warning during work items query';
    switch (errorDetails.statusCode) {
      case '404':
        this.errorDescription = 'The query builder lookups failed because the requested resource was not found. Please check the query parameters and try again.';
        break;
      case '429':
        this.errorDescription = 'The query builder lookups failed due to too many requests. Please try again later.';
        break;
      case '504':
        this.errorDescription = 'The query builder lookups experienced a timeout error. Some values might not be available. Narrow your query with a more specific filter and try again.';
        break;
      default:
        this.errorDescription = errorDetails.message
          ? `Some values may not be available in the query builder lookups due to the following error: ${errorDetails.message}.`
          : 'Some values may not be available in the query builder lookups due to an unknown error.';
        break;
    }
  }
}
