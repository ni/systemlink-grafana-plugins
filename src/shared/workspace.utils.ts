import { DataSourceInstanceSettings } from "@grafana/data";
import { BackendSrv } from "@grafana/runtime";
import { Workspace } from "core/types";

export class WorkspaceUtils {
    private _workspacesCache: Promise<Map<string, Workspace>> | null = null;

    private readonly queryWorkspacesUrl = `${this.instanceSettings.url}/niauth/v1/auth`;

    constructor(
        readonly instanceSettings: DataSourceInstanceSettings,
        readonly backendSrv: BackendSrv
    ) {
        this.loadWorkspaces();
    }

    get workspacesCache(): Promise<Map<string, Workspace>> {
        return this._workspacesCache ?? this.loadWorkspaces();
    }

    private async loadWorkspaces(): Promise<Map<string, Workspace>> {
        if (this._workspacesCache) {
            return this._workspacesCache;
        }

        this._workspacesCache = this.getWorkspaces()
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

        return this._workspacesCache;
    }

    private async getWorkspaces(): Promise<Workspace[]> {
        const response = await this.backendSrv.get<{ workspaces: Workspace[] }>(this.queryWorkspacesUrl);
        return response.workspaces;
    }
}
