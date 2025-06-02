import { DataSourceInstanceSettings } from "@grafana/data";
import { BackendSrv } from "@grafana/runtime";
import { QUERY_SYSTEMS_ALIAS_PROJECTION, QUERY_SYSTEMS_MAX_TAKE, QUERY_SYSTEMS_REQUEST_PER_SECOND } from "./constants/QuerySystems.constants";
import { QueryResponse, QuerySystemsResponse } from "core/types";
import { queryUsingSkip } from "core/utils";
import { SystemAlias } from "./types/QuerySystems.types";

export class SystemUtils {
    private _systemAliasCache: Promise<Map<string, SystemAlias>> | null = null;

    private readonly querySystemsUrl = `${this.instanceSettings.url}/nisysmgmt/v1/query-systems`;

    constructor(
        readonly instanceSettings: DataSourceInstanceSettings,
        readonly backendSrv: BackendSrv
    ) {
        this.loadSystems();
    }

    get systemAliasCache(): Promise<Map<string, SystemAlias>> {
        return this._systemAliasCache ?? this.loadSystems();
    }

    private async loadSystems(): Promise<Map<string, SystemAlias>> {
        if (this._systemAliasCache) {
            return this._systemAliasCache;
        }

        this._systemAliasCache = this.querySystemsInBatches()
            .then(systems => {
                const systemMap = new Map<string, SystemAlias>();
                if (systems) {
                    systems.forEach(system => systemMap.set(system.id, system));
                }
                return systemMap;
            })
            .catch(error => {
                console.error('Error in loading systems:', error);
                return new Map<string, SystemAlias>();
            });

        return this._systemAliasCache;
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
