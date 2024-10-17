import { DataFrameDTO, DataQueryRequest, TestDataSourceResponse } from "@grafana/data";
import { AssetDataSourceOptions, AssetQuery } from "../types/types";
import { DataSourceBase } from "../../../core/DataSourceBase";
import { defaultOrderBy, defaultProjection } from "../../system/constants";
import { SystemProperties } from "../../system/types";
import { parseErrorMessage } from "../../../core/errors";
import { Workspace } from "../../../core/types";

export abstract class AssetDataSourceBase extends DataSourceBase<AssetQuery, AssetDataSourceOptions> {
  private systemsLoaded!: () => void;
  private workspacesLeaded!: () => void;

  public areSystemsLoaded$ = new Promise<void>(resolve => this.systemsLoaded = resolve);
  public areWorkspacesLoaded$ = new Promise<void>(resolve => this.workspacesLeaded = resolve);

  public error = '';

  public readonly systemAliasCache = new Map<string, SystemProperties>([]);
  public readonly workspacesCache = new Map<string, Workspace>([]);

  abstract runQuery(query: AssetQuery, options: DataQueryRequest): Promise<DataFrameDTO>;

  abstract shouldRunQuery(query: AssetQuery): boolean;

  testDatasource(): Promise<TestDataSourceResponse> {
    throw new Error("Method not implemented.");
  }

  public async querySystems(filter = '', projection = defaultProjection): Promise<SystemProperties[]> {
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

  public getCachedSystems(): SystemProperties[] {
    return Array.from(this.systemAliasCache.values());
  }
  
  public getCachedWorkspaces(): Workspace[] {
    return Array.from(this.workspacesCache.values());
  }

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
}
