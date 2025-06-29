import { DataSourceInstanceSettings } from "@grafana/data";
import { BackendSrv } from "@grafana/runtime";
import { Workspace } from "core/types";

export class WorkspaceUtils {
    private static _workspacesCache?: Promise<Map<string, Workspace>>;

    private readonly queryWorkspacesUrl = `${this.instanceSettings.url}/niauth/v1/auth`;

    constructor(
        readonly instanceSettings: DataSourceInstanceSettings,
        readonly backendSrv: BackendSrv
    ) {}

    async getWorkspaces(): Promise<Map<string, Workspace>> {
        if (!WorkspaceUtils._workspacesCache) {
            WorkspaceUtils._workspacesCache = this.loadWorkspaces();
        }
        return await WorkspaceUtils._workspacesCache;
    }

    private async loadWorkspaces(): Promise<Map<string, Workspace>> {
        const workspaces = await this.fetchWorkspaces();
        const workspaceMap = new Map<string, Workspace>();
        if (workspaces) {
            workspaces.forEach(workspace => workspaceMap.set(workspace.id, workspace));
        }
        return workspaceMap;
    }

    private async fetchWorkspaces(): Promise<Workspace[]> {
        const response = await this.backendSrv.get<{ workspaces: Workspace[] }>(
            this.queryWorkspacesUrl,
            undefined,
            undefined,
            { showErrorAlert: false } // suppress default error alert since we handle errors manually
        );
        return response.workspaces;
    }
}
