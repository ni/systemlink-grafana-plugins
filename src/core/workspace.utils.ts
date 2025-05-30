import { DataSourceInstanceSettings } from "@grafana/data";
import { BackendSrv } from "@grafana/runtime";
import { Workspace } from "./types";

export class WorkspaceUtils {
    readonly workspacesCache = new Map<string, Workspace>([]);
    workspacesPromise: Promise<Map<string, Workspace>> | null = null;

    queryWorkspacesUrl = `${this.instanceSettings.url}/niauth/v1/auth`;

    constructor(
        readonly instanceSettings: DataSourceInstanceSettings,
        readonly backendSrv: BackendSrv
    ) {
        this.loadWorkspaces();
    }

    private static Workspaces: Workspace[] | null = null;

    async loadWorkspaces(): Promise<Map<string, Workspace>> {
        if (this.workspacesCache.size > 0) {
            return this.workspacesCache;
        }

        if (this.workspacesPromise) {
            return this.workspacesPromise;
        }

        this.workspacesPromise = this.getWorkspaces().then(workspaces => {
            if (workspaces) {
                workspaces.forEach(workspace => this.workspacesCache.set(workspace.id, workspace));
            }
            return this.workspacesCache;
        });

        return this.workspacesPromise;
    }

    async getWorkspaces(): Promise<Workspace[]> {
        if (WorkspaceUtils.Workspaces) {
            return WorkspaceUtils.Workspaces;
        }

        const response = await this.backendSrv.get<{ workspaces: Workspace[] }>(this.queryWorkspacesUrl);

        return (WorkspaceUtils.Workspaces = response.workspaces);
    }
}
