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

    async getWorkspaces(): Promise<Map<string, Workspace>> {
        return this._workspacesCache ?? await this.loadWorkspaces();
    }

    private async loadWorkspaces(): Promise<Map<string, Workspace>> {
        if (this._workspacesCache) {
            return this._workspacesCache;
        }
        try {
            const workspaces = await this.fetchWorkspaces();
            const workspaceMap = new Map<string, Workspace>();
            if (workspaces) {
                workspaces.forEach(workspace => workspaceMap.set(workspace.id, workspace));
            }
            this._workspacesCache = Promise.resolve(workspaceMap);
            return workspaceMap;
        } catch (error) {
            console.error('Error in loading workspaces:', error);
            const emptyMap = new Map<string, Workspace>();
            this._workspacesCache = Promise.resolve(emptyMap);
            return emptyMap;
        }
    }

    private async fetchWorkspaces(): Promise<Workspace[]> {
        const response = await this.backendSrv.get<{ workspaces: Workspace[] }>(this.queryWorkspacesUrl);
        return response.workspaces;
    }
}
