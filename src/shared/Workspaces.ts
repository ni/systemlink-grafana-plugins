import { DataSourceInstanceSettings } from "@grafana/data";
import { BackendSrv } from "@grafana/runtime";
import { Workspace } from "core/types";

export class Workspaces {
    private static _workspacesCache: Promise<Map<string, Workspace>> | null = null;

    private readonly queryWorkspacesUrl = `${this.instanceSettings.url}/niauth/v1/auth`;

    constructor(
        readonly instanceSettings: DataSourceInstanceSettings,
        readonly backendSrv: BackendSrv
    ) {}

    get workspacesCache(): Promise<Map<string, Workspace>> {
        return this.loadWorkspaces()
    }

    private async loadWorkspaces(): Promise<Map<string, Workspace>> {
        if (Workspaces._workspacesCache) {
            return Workspaces._workspacesCache;
        }

        Workspaces._workspacesCache = this.getWorkspaces()
            .then(workspaces => {
                const workspaceMap = new Map<string, Workspace>();
                if (workspaces) {
                    workspaces.forEach(workspace => workspaceMap.set(workspace.id, workspace));
                }
                return workspaceMap;
            })
            .catch(error => {
                console.error('Error in loading workspaces:', error);
                return new Map<string, Workspace>();
            });

        return Workspaces._workspacesCache;
    }

    private async getWorkspaces(): Promise<Workspace[]> {
        const response = await this.backendSrv.get<{ workspaces: Workspace[] }>(this.queryWorkspacesUrl);
        return response.workspaces;
    }
}
