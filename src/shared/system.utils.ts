import { DataSourceInstanceSettings } from "@grafana/data";
import { BackendSrv } from "@grafana/runtime";
import { QUERY_SYSTEMS_ALIAS_PROJECTION, QUERY_SYSTEMS_MAX_TAKE, QUERY_SYSTEMS_REQUEST_PER_SECOND } from "./constants/QuerySystems.constants";
import { QueryResponse, QuerySystemsResponse } from "core/types";
import { queryUsingSkip } from "core/utils";
import { SystemAlias } from "./types/QuerySystems.types";

export class SystemUtils {
    private static _systemAliasCache?: Promise<Map<string, SystemAlias>>;

    private readonly querySystemsUrl = `${this.instanceSettings.url}/nisysmgmt/v1/query-systems`;

    constructor(
        readonly instanceSettings: DataSourceInstanceSettings,
        readonly backendSrv: BackendSrv
    ) {}

    async getSystemAliases(): Promise<Map<string, SystemAlias>> {
        if (!SystemUtils._systemAliasCache) {
            SystemUtils._systemAliasCache = this.loadSystems();
        }
        return await SystemUtils._systemAliasCache;
    }

    private async loadSystems(): Promise<Map<string, SystemAlias>> {
        const systems = await this.querySystemsInBatches();
        const systemAliasMap = new Map<string, SystemAlias>();
        if (systems) {
            systems.forEach(system => systemAliasMap.set(system.id, system));
        }
        return systemAliasMap;
    }

    private async querySystemsInBatches(): Promise<SystemAlias[]> {
        const queryRecord = async (take: number, skip: number): Promise<QueryResponse<SystemAlias>> => {
            const response = await this.querySystems(take, skip);
            return {
                data: response.data as SystemAlias[],
                totalCount: response.count
            };
        };

        const batchQueryConfig = {
            maxTakePerRequest: QUERY_SYSTEMS_MAX_TAKE,
            requestsPerSecond: QUERY_SYSTEMS_REQUEST_PER_SECOND
        };
        const response = await queryUsingSkip(queryRecord, batchQueryConfig);

        return response.data;
    }

    private async querySystems(
        take?: number,
        skip?: number
    ): Promise<QuerySystemsResponse> {
        try {
            const response = await this.backendSrv.post<QuerySystemsResponse>(this.querySystemsUrl, {
                projection: QUERY_SYSTEMS_ALIAS_PROJECTION,
                skip,
                take
            });
            return response;
        } catch (error) {
            throw new Error(`An error occurred while querying systems: ${error}`);
        }
    }
}
