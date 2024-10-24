import { DataFrameDTO, DataQueryRequest, TestDataSourceResponse } from "@grafana/data";
import { AssetDataSourceOptions, AssetQuery } from "../types/types";
import { DataSourceBase } from "../../../core/DataSourceBase";
import { defaultOrderBy, defaultProjection } from "../../system/constants";
import { SystemMetadata } from "../../system/types";
import { parseErrorMessage } from "../../../core/errors";
import { QueryBuilderOption, Workspace } from "../../../core/types";
import { ExpressionTransformFunction } from "../../../core/query-builder.utils";
import { QueryBuilderOperations } from "../../../core/query-builder.constants";
import { AllFieldNames } from "../constants/constants";
import { getVariableOptions } from "core/utils";

export abstract class AssetDataSourceBase extends DataSourceBase<AssetQuery, AssetDataSourceOptions> {
  private systemsLoaded!: () => void;
  private workspacesLeaded!: () => void;

  public areSystemsLoaded$ = new Promise<void>(resolve => this.systemsLoaded = resolve);
  public areWorkspacesLoaded$ = new Promise<void>(resolve => this.workspacesLeaded = resolve);

  public error = '';

  public readonly systemAliasCache = new Map<string, SystemMetadata>([]);
  public readonly workspacesCache = new Map<string, Workspace>([]);


  abstract runQuery(query: AssetQuery, options: DataQueryRequest): Promise<DataFrameDTO>;

  abstract shouldRunQuery(query: AssetQuery): boolean;

  testDatasource(): Promise<TestDataSourceResponse> {
    throw new Error("Method not implemented.");
  }

  public async querySystems(filter = '', projection = defaultProjection): Promise<SystemMetadata[]> {
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

  getQueryParams(): URLSearchParams {
    return new URLSearchParams(window.location.search);
  }

  getQueryParam(param: string): string | null {
    return this.getQueryParams().get(param);
  }

  public getCachedSystems(): SystemMetadata[] {
    return Array.from(this.systemAliasCache.values());
  }

  public getCachedWorkspaces(): Workspace[] {
    return Array.from(this.workspacesCache.values());
  }

  public readonly globalVariableOptions = (): QueryBuilderOption[] => getVariableOptions(this);

  public async loadDependencies(): Promise<void> {
    this.error = '';

    await this.loadSystems();
    await this.loadWorkspaces();
  }

  private async loadSystems(): Promise<void> {
    if (this.systemAliasCache.size > 0) {
      return;
    }

    const systems = await this.querySystems('', ['id', 'alias', 'connected.data.state', 'workspace'])
      .catch(error => {
        this.error = parseErrorMessage(error)!;
      });

    systems?.forEach(system => this.systemAliasCache.set(system.id, system));

    this.systemsLoaded();
  }

  private async loadWorkspaces(): Promise<void> {
    if (this.workspacesCache.size > 0) {
      return;
    }

    const workspaces = await this.getWorkspaces()
      .catch(error => {
        this.error = parseErrorMessage(error)!;
      });

    workspaces?.forEach(workspace => this.workspacesCache.set(workspace.id, workspace));

    this.workspacesLeaded();
  }

  public readonly queryTransformationOptions = new Map<string, Map<string, unknown>>([
    [AllFieldNames.LOCATION, this.systemAliasCache]
  ]);

  public readonly assetComputedDataFields = new Map<string, ExpressionTransformFunction>([
    ...Object.values(AllFieldNames).map(field => [field, this.multipleValuesQuery(field)] as [string, ExpressionTransformFunction]),
    [
      AllFieldNames.LOCATION,
      (value: string, operation: string, options?: Map<string, unknown>) => {
        let values = [value];

        if (this.isMultiSelectValue(value)) {
          values = this.getMultipleValuesArray(value);
        }

        if (values.length > 1) {
          return `(${values.map(val => `Location.MinionId ${operation} "${val}"`).join(` ${this.getLocicalOperator(operation)} `)})`;
        }

        if (options?.has(value)) {
          return `Location.MinionId ${operation} "${value}"`
        }

        return `Locations.Any(l => l.MinionId ${operation} "${value}" ${this.getLocicalOperator(operation)} l.PhysicalLocation ${operation} "${value}")`;
      }]]);

  protected multipleValuesQuery(field: string): ExpressionTransformFunction {
    return (value: string, operation: string, _options?: any) => {
      if (this.isMultiSelectValue(value)) {
        const query = this.getMultipleValuesArray(value)
          .map(val => `${field} ${operation} "${val}"`)
          .join(` ${this.getLocicalOperator(operation)} `);
        return `(${query})`;
      }

      return `${field} ${operation} "${value}"`
    }
  }

  private isMultiSelectValue(value: string): boolean {
    return value.startsWith('{') && value.endsWith('}');
  }

  private getMultipleValuesArray(value: string): string[] {
    return value.replace(/({|})/g, '').split(',');
  }

  private getLocicalOperator(operation: string): string {
    return operation === QueryBuilderOperations.EQUALS.name ? '||' : '&&';
  }
}
