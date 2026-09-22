import { DataSourceInstanceSettings } from '@grafana/data';
import { BackendSrv } from '@grafana/runtime';
import { QueryBuilderOption } from 'core/types';
import { get } from 'core/utils';
import { GetWorkItemTypesResponse } from './types';

export class WorkItemTypeUtils {
  private static _workItemTypesCache?: Promise<QueryBuilderOption[]>;

  private readonly workItemTypesUrl = `${this.instanceSettings.url}/niworkitem/v1/workitemtypes`;

  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv
  ) {}

  async getWorkItemTypes(): Promise<QueryBuilderOption[]> {
    if (!WorkItemTypeUtils._workItemTypesCache) {
      WorkItemTypeUtils._workItemTypesCache = this.loadWorkItemTypes();
    }
    return await WorkItemTypeUtils._workItemTypesCache;
  }

  private async loadWorkItemTypes(): Promise<QueryBuilderOption[]> {
    const response = await get<GetWorkItemTypesResponse>(
      this.backendSrv,
      this.workItemTypesUrl,
      { showErrorAlert: false }
    );
    const seenTypes = new Set<string>();
    return (response.workItemTypes ?? [])
      .filter(typeConfig => Boolean(typeConfig.type))
      .filter(typeConfig => {
        const type = typeConfig.type!;
        if (seenTypes.has(type)) {
          return false;
        }
        seenTypes.add(type);
        return true;
      })
      .map(typeConfig => ({
        label: typeConfig.description || typeConfig.type!,
        value: typeConfig.type!,
      }));
  }
}
