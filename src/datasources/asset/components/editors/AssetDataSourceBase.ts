import { DataFrameDTO, DataQueryRequest, TestDataSourceResponse } from "@grafana/data";
import { AssetDataSourceOptions, AssetQuery } from "../../types/types";
import { DataSourceBase } from "../../../../core/DataSourceBase";
import { defaultOrderBy, defaultProjection } from "../../../system/constants";
import { SystemMetadata } from "../../../system/types";
import { parseErrorMessage } from "../../../../core/errors";
import TTLCache from "@isaacs/ttlcache";
import { Workspace } from "../../../../core/types";
import { metadataCacheTTL } from "../../../data-frame/constants";

export abstract class AssetDataSourceBase extends DataSourceBase<AssetQuery, AssetDataSourceOptions> {
  public areSystemsLoaded = false;
  public areWorkspacesLoaded = false;

  public error = '';

  private readonly systemAliasCache: TTLCache<string, SystemMetadata> = new TTLCache<string, SystemMetadata>({ ttl: metadataCacheTTL });
  private readonly workspacesCache: TTLCache<string, Workspace> = new TTLCache<string, Workspace>({ ttl: metadataCacheTTL });

  abstract runQuery(query: AssetQuery, options: DataQueryRequest): Promise<DataFrameDTO>;

  abstract shouldRunQuery(query: AssetQuery): boolean;

  testDatasource(): Promise<TestDataSourceResponse> {
    throw new Error("Method not implemented.");
  }

  public async loadDependencies(): Promise<void> {
    this.error = '';

    await this.loadSystems();
    await this.loadWorkspaces();
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

  public getCachedSystems(): SystemMetadata[] {
    return Array.from(this.systemAliasCache.values());
  }
  
  public getCachedWorkspaces(): Workspace[] {
    return Array.from(this.workspacesCache.values());
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
}
